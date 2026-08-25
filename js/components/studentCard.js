// ============================================
// Student Card Component (list item)
// ============================================

import { formatStars } from "../utils/format.js";

/**
 * Builds the HTML string for a single student card.
 * @param {Object} student - { id, name, starBalance }
 * @returns {string} HTML string
 */
export function renderStudentCard(student) {
  const balanceClass = student.starBalance < 0 ? "text-danger" : "text-star";

  return `
    <a href="student.html?studentId=${student.id}" class="student-card">
      <span class="student-card-name">${student.name}</span>
      <span class="student-card-balance ${balanceClass}">${formatStars(student.starBalance)}</span>
    </a>
  `;
}

/**
 * Renders a full list of students into a container element.
 * @param {HTMLElement} container
 * @param {Array} students
 */
export function renderStudentList(container, students) {
  if (students.length === 0) {
    container.innerHTML = `<p class="empty-state">No students found.</p>`;
    return;
  }

  container.innerHTML = students.map(renderStudentCard).join("");
}

/**
 * Sets up a search input to filter a list of students by name in real time.
 * @param {HTMLInputElement} searchInput
 * @param {HTMLElement} container
 * @param {Array} allStudents - full unfiltered list
 */
export function attachStudentSearch(searchInput, container, allStudents) {
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = allStudents.filter(s =>
      s.name.toLowerCase().includes(term)
    );
    renderStudentList(container, filtered);
  });
}