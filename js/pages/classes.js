// ============================================
// Class List Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import { openModal } from "../components/modal.js";
import {
  getTeacherClasses,
  getAllClasses,
  getStudentsInClass,
  addClass,
  addStudent,
  getApprovedTeachers,
  updateClassTeachers
} from "../utils/firestore-helpers.js";

const teacher = await requireAuth();
renderNav();

const isAdmin = teacher.teacherData && teacher.teacherData.role === "admin";

if (isAdmin) {
  document.getElementById("admin-actions").hidden = false;
}

async function loadClasses() {
  const listEl = document.getElementById("classes-list");
  const classes = isAdmin ? await getAllClasses() : await getTeacherClasses(teacher.uid);

  if (classes.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${isAdmin ? "No classes yet. Create one below." : "You have no classes assigned yet."}</p>`;
    return;
  }

  const classesWithStats = await Promise.all(
    classes.map(async (cls) => {
      const students = await getStudentsInClass(cls.id);
      const total = students.reduce((sum, s) => sum + (s.starBalance || 0), 0);
      const average = students.length > 0 ? total / students.length : 0;
      return { ...cls, studentCount: students.length, average };
    })
  );

  listEl.innerHTML = classesWithStats.map(cls => `
    <div class="class-card-row">
      <a href="class.html?classId=${cls.id}" class="class-card">
        <div class="class-card-name">${cls.name}</div>
        <div class="class-card-meta">
          <span>${cls.studentCount} student${cls.studentCount === 1 ? "" : "s"}</span>
          <span class="text-star">${cls.average.toFixed(1)} ⭐ avg</span>
        </div>
      </a>
      ${isAdmin ? `<button class="btn btn-secondary btn-sm edit-teachers-btn" data-class-id="${cls.id}" data-class-name="${cls.name}">Edit Teachers</button>` : ""}
    </div>
  `).join("");

  if (isAdmin) {
    listEl.querySelectorAll(".edit-teachers-btn").forEach(btn => {
      btn.addEventListener("click", () => openEditTeachersModal(btn.dataset.classId, btn.dataset.className));
    });
  }
}

// ---------- Add Class modal (admin only) ----------

async function openAddClassModal() {
  const teachers = await getApprovedTeachers();

  if (teachers.length === 0) {
    openModal({
      title: "Add Class",
      confirmLabel: "Close",
      bodyHtml: `<p class="empty-state">No approved teachers found yet. Approve at least one teacher account first.</p>`,
      onConfirm: async () => {}
    });
    return;
  }

  const checkboxes = teachers.map(t => `
    <label style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
      <input type="checkbox" value="${t.id}" class="teacher-checkbox" />
      <span>${t.name || t.email}</span>
    </label>
  `).join("");

  openModal({
    title: "Add Class",
    confirmLabel: "Create Class",
    bodyHtml: `
      <label class="form-label" for="class-name-input">Class Name</label>
      <input type="text" id="class-name-input" class="form-input" placeholder="e.g. Room 102" />

      <label class="form-label" style="margin-top: var(--space-md);">Assign Teacher(s)</label>
      <div style="margin-top: var(--space-sm);">
        ${checkboxes}
      </div>
    `,
    onConfirm: async (body) => {
      const name = body.querySelector("#class-name-input").value.trim();
      const checked = Array.from(body.querySelectorAll(".teacher-checkbox:checked"));
      const teacherIds = checked.map(cb => cb.value);

      if (!name) throw new Error("Please enter a class name.");
      if (teacherIds.length === 0) throw new Error("Please select at least one teacher.");

      await addClass(name, teacherIds);
      await loadClasses();
    }
  });
}

// ---------- Edit Teachers modal (admin only) ----------

async function openEditTeachersModal(classId, className) {
  const [teachers, cls] = await Promise.all([
    getApprovedTeachers(),
    getAllClasses().then(classes => classes.find(c => c.id === classId))
  ]);

  const currentTeacherIds = cls ? cls.teacherIds || [] : [];

  const checkboxes = teachers.map(t => `
    <label style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
      <input type="checkbox" value="${t.id}" class="teacher-checkbox" ${currentTeacherIds.includes(t.id) ? "checked" : ""} />
      <span>${t.name || t.email}</span>
    </label>
  `).join("");

  openModal({
    title: `Edit Teachers — ${className}`,
    confirmLabel: "Save Changes",
    bodyHtml: `
      <div>
        ${checkboxes}
      </div>
    `,
    onConfirm: async (body) => {
      const checked = Array.from(body.querySelectorAll(".teacher-checkbox:checked"));
      const teacherIds = checked.map(cb => cb.value);

      if (teacherIds.length === 0) throw new Error("A class must have at least one teacher.");

      await updateClassTeachers(classId, teacherIds);
      await loadClasses();
    }
  });
}

// ---------- Add Student modal (admin only) ----------

async function openAddStudentModal() {
  const classes = await getAllClasses();
  const options = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  openModal({
    title: "Add Student",
    confirmLabel: "Add Student",
    bodyHtml: `
      <label class="form-label" for="student-name-input">Student Name</label>
      <input type="text" id="student-name-input" class="form-input" placeholder="Full name" />

      <label class="form-label" for="student-class-select">Class</label>
      <select id="student-class-select" class="form-input">
        <option value="">Select a class…</option>
        ${options}
      </select>
    `,
    onConfirm: async (body) => {
      const name = body.querySelector("#student-name-input").value.trim();
      const classId = body.querySelector("#student-class-select").value;

      if (!name) throw new Error("Please enter a student name.");
      if (!classId) throw new Error("Please select a class.");

      await addStudent(name, classId);
      await loadClasses();
    }
  });
}

if (isAdmin) {
  document.getElementById("add-class-btn").addEventListener("click", openAddClassModal);
  document.getElementById("add-student-btn").addEventListener("click", openAddStudentModal);
}

loadClasses();