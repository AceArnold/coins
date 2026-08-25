// ============================================
// Class View Page Logic (Student List)
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import { getClass, getStudentsInClass } from "../utils/firestore-helpers.js";
import { renderStudentList, attachStudentSearch } from "../components/studentCard.js";

await requireAuth();
renderNav();

const params = new URLSearchParams(window.location.search);
const classId = params.get("classId");

async function loadClassView() {
  if (!classId) {
    document.getElementById("class-view-title").textContent = "Class not found";
    return;
  }

  const cls = await getClass(classId);
  if (!cls) {
    document.getElementById("class-view-title").textContent = "Class not found";
    return;
  }

  document.getElementById("class-view-title").textContent = cls.name;

  const students = await getStudentsInClass(classId);
  // Sort alphabetically by default
  students.sort((a, b) => a.name.localeCompare(b.name));

  const listEl = document.getElementById("student-list");
  renderStudentList(listEl, students);

  const searchInput = document.getElementById("student-search-input");
  attachStudentSearch(searchInput, listEl, students);

  document.getElementById("view-history-link").href = `history.html?classId=${classId}`;
}

loadClassView();