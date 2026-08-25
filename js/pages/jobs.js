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
  getTeacherClasses,
  getStudentsInClass
} from "../utils/firestore-helpers.js";
import { validateJob } from "../utils/validators.js";
import { formatStars } from "../utils/format.js";

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

// ---------- Load & render jobs ----------

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
        <button class="btn btn-primary btn-sm" data-complete-job-id="${job.id}" data-job-title="${job.title}" data-job-stars="${job.stars}">Mark Complete</button>
      </div>
    </div>
  `).join("");

  gridEl.querySelectorAll("[data-signup-job-id]").forEach(btn => {
    btn.addEventListener("click", () => openSignUpModal(btn.dataset.signupJobId, btn.dataset.jobTitle));
  });

  gridEl.querySelectorAll("[data-complete-job-id]").forEach(btn => {
    btn.addEventListener("click", () => openCompleteModal(
      btn.dataset.completeJobId,
      btn.dataset.jobTitle,
      Number(btn.dataset.jobStars)
    ));
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
    }
  });
}

// ---------- Mark complete modal ----------

async function openCompleteModal(jobId, jobTitle, jobStars) {
  const applications = await getJobApplications(jobId);
  const signedUp = applications.filter(a => a.status === "signed_up");

  if (signedUp.length === 0) {
    openModal({
      title: `Mark Complete — ${jobTitle}`,
      confirmLabel: "Close",
      bodyHtml: `<p class="empty-state">No students are signed up for this job yet.</p>`,
      onConfirm: async () => {}
    });
    return;
  }

  const students = await getAllTeacherStudents();
  const options = signedUp.map(app => {
    const student = students.find(s => s.id === app.studentId);
    return `<option value="${app.id}" data-student-id="${app.studentId}">${student ? student.name : "Unknown"}</option>`;
  }).join("");

  openModal({
    title: `Mark Complete — ${jobTitle}`,
    confirmLabel: `Award ${jobStars} ⭐`,
    bodyHtml: `
      <label class="form-label" for="complete-application-select">Student</label>
      <select id="complete-application-select" class="form-input">
        <option value="">Select a student…</option>
        ${options}
      </select>
    `,
    onConfirm: async (body) => {
      const select = body.querySelector("#complete-application-select");
      const applicationId = select.value;
      if (!applicationId) throw new Error("Please select a student.");

      const studentId = select.selectedOptions[0].dataset.studentId;

      await completeJob(applicationId, jobId, studentId, jobStars, teacher.uid);
      await loadJobs();
    }
  });
}

loadJobs();