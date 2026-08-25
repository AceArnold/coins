// ============================================
// Jobs Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import { openModal } from "../components/modal.js";
import {
  getJobs,
  addJob,
  signUpForJob,
  completeJob,
  getJobApplications,
  getPendingJobCompletions,
  getTeacherClasses,
  getStudentsInClass
} from "../utils/firestore-helpers.js";
import { validateJob } from "../utils/validators.js";
import { formatStars, formatDate } from "../utils/format.js";

const teacher = await requireAuth();
renderNav();

let teacherClassesCache = null;
let allStudentsCache = null;

async function getTeacherClassesList() {
  if (!teacherClassesCache) teacherClassesCache = await getTeacherClasses(teacher.uid);
  return teacherClassesCache;
}

async function getAllTeacherStudents() {
  if (allStudentsCache) return allStudentsCache;
  const classes = await getTeacherClassesList();
  const lists = await Promise.all(classes.map(c => getStudentsInClass(c.id)));
  allStudentsCache = lists.flat().sort((a, b) => a.name.localeCompare(b.name));
  return allStudentsCache;
}

// ---------- Load & render open jobs ----------

async function loadJobs() {
  const jobs = await getJobs();
  const openJobs = jobs.filter(j => j.filledSpots < j.totalSpots);
  const gridEl = document.getElementById("job-grid");

  if (openJobs.length === 0) {
    gridEl.innerHTML = `<p class="empty-state">No open jobs right now. Add one below.</p>`;
    return;
  }

  gridEl.innerHTML = openJobs.map(job => `
    <div class="job-card">
      <div class="job-card-title">${job.title}</div>
      <div class="job-card-desc">${job.description || ""}</div>
      <div class="job-card-meta">
        <span class="job-card-reward">${formatStars(job.stars)}</span>
        <span class="job-card-spots">${job.totalSpots - job.filledSpots} of ${job.totalSpots} spots open</span>
      </div>
      <div class="job-card-actions">
        <button class="btn btn-secondary btn-sm" data-signup-job-id="${job.id}" data-job-title="${job.title}">Sign Up Student</button>
      </div>
    </div>
  `).join("");

  gridEl.querySelectorAll("[data-signup-job-id]").forEach(btn => {
    btn.addEventListener("click", () => openSignUpModal(btn.dataset.signupJobId, btn.dataset.jobTitle));
  });
}

// ---------- Add job modal ----------

function openAddJobModal() {
  getTeacherClassesList().then(classes => {
    const classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

    openModal({
      title: "Add Job",
      confirmLabel: "Add Job",
      bodyHtml: `
        <label class="form-label" for="job-title-input">Title</label>
        <input type="text" id="job-title-input" class="form-input" placeholder="e.g. Classroom Assistant" />

        <label class="form-label" for="job-desc-input">Description</label>
        <textarea id="job-desc-input" class="form-input" rows="2" placeholder="Optional details"></textarea>

        <label class="form-label" for="job-stars-input">Star Reward</label>
        <input type="number" id="job-stars-input" class="form-input" min="1" />

        <label class="form-label" for="job-spots-input">Number of Spots</label>
        <input type="number" id="job-spots-input" class="form-input" min="1" />

        <label class="form-label" for="job-class-select">Class</label>
        <select id="job-class-select" class="form-input">
          <option value="">Select a class…</option>
          ${classOptions}
        </select>
      `,
      onConfirm: async (body) => {
        const title = body.querySelector("#job-title-input").value.trim();
        const description = body.querySelector("#job-desc-input").value.trim();
        const stars = Number(body.querySelector("#job-stars-input").value);
        const spots = Number(body.querySelector("#job-spots-input").value);
        const classId = body.querySelector("#job-class-select").value;

        const check = validateJob(title, stars, spots);
        if (!check.valid) throw new Error(check.error);
        if (!classId) throw new Error("Please select a class.");

        await addJob(title, description, stars, spots, classId);
        await loadJobs();
      }
    });
  });
}

document.getElementById("add-job-btn").addEventListener("click", openAddJobModal);

// ---------- Sign-up modal ----------

async function openSignUpModal(jobId, jobTitle) {
  const students = await getAllTeacherStudents();
  const options = students.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  openModal({
    title: `Sign Up — ${jobTitle}`,
    confirmLabel: "Sign Up",
    bodyHtml: `
      <label class="form-label" for="signup-student-select">Student</label>
      <select id="signup-student-select" class="form-input">
        <option value="">Select a student…</option>
        ${options}
      </select>
    `,
    onConfirm: async (body) => {
      const studentId = body.querySelector("#signup-student-select").value;
      if (!studentId) throw new Error("Please select a student.");

      await signUpForJob(jobId, studentId);
      await loadJobs();
      await loadPendingCompletions();
    }
  });
}

// ---------- Pending Completions (mirrors store's fulfillment tracker) ----------

async function loadPendingCompletions() {
  const pending = await getPendingJobCompletions();
  const listEl = document.getElementById("pending-completions-list");

  if (pending.length === 0) {
    listEl.innerHTML = `<p class="empty-state">No jobs awaiting completion.</p>`;
    return;
  }

  listEl.innerHTML = pending.map(app => `
    <div class="fulfillment-item">
      <div class="fulfillment-info">
        <div class="fulfillment-student">${app.studentName}</div>
        <div>${app.jobTitle} — ${formatStars(app.jobStars)}</div>
        <div class="text-muted">${formatDate(app.timestamp)}</div>
      </div>
      <button class="btn btn-primary btn-sm" data-app-id="${app.id}" data-job-id="${app.jobId}" data-student-id="${app.studentId}" data-stars="${app.jobStars}">Mark Complete</button>
    </div>
  `).join("");

  listEl.querySelectorAll("[data-app-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Awarding…";
      try {
        await completeJob(
          btn.dataset.appId,
          btn.dataset.jobId,
          btn.dataset.studentId,
          Number(btn.dataset.stars),
          teacher.uid
        );
        await loadPendingCompletions();
        await loadJobs(); // spot count may free up visually elsewhere if needed
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Mark Complete";
        alert(err.message || "Something went wrong.");
      }
    });
  });
}

loadJobs();
loadPendingCompletions();