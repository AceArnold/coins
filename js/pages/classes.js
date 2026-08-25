// ============================================
// Class List Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import { getTeacherClasses, getStudentsInClass } from "../utils/firestore-helpers.js";

const teacher = await requireAuth();
renderNav();

async function loadClasses() {
  const listEl = document.getElementById("classes-list");
  const classes = await getTeacherClasses(teacher.uid);

  if (classes.length === 0) {
    listEl.innerHTML = `<p class="empty-state">You have no classes assigned yet.</p>`;
    return;
  }

  // Get student counts + average balance for each class
  const classesWithStats = await Promise.all(
    classes.map(async (cls) => {
      const students = await getStudentsInClass(cls.id);
      const total = students.reduce((sum, s) => sum + (s.starBalance || 0), 0);
      const average = students.length > 0 ? total / students.length : 0;
      return { ...cls, studentCount: students.length, average };
    })
  );

  listEl.innerHTML = classesWithStats.map(cls => `
    <a href="class.html?classId=${cls.id}" class="class-card">
      <div class="class-card-name">${cls.name}</div>
      <div class="class-card-meta">
        <span>${cls.studentCount} student${cls.studentCount === 1 ? "" : "s"}</span>
        <span class="text-star">${cls.average.toFixed(1)} ⭐ avg</span>
      </div>
    </a>
  `).join("");
}

loadClasses();