// ============================================
// Student Detail Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import { getStudent, getStudentTransactions } from "../utils/firestore-helpers.js";
import { openStarActionModal } from "../components/starActions.js";
import { formatStars, formatStarAmount, starAmountClass, formatDate } from "../utils/format.js";

const teacher = await requireAuth();
renderNav();

const params = new URLSearchParams(window.location.search);
const studentId = params.get("studentId");

let currentStudent = null;

async function loadStudent() {
  if (!studentId) {
    document.getElementById("student-header-name").textContent = "Student not found";
    return;
  }

  currentStudent = await getStudent(studentId);
  if (!currentStudent) {
    document.getElementById("student-header-name").textContent = "Student not found";
    return;
  }

  renderHeader();
  await loadTransactions();
}

function renderHeader() {
  document.getElementById("student-header-name").textContent = currentStudent.name;
  document.getElementById("student-header-balance").textContent = formatStars(currentStudent.starBalance);
}

async function loadTransactions() {
  const listEl = document.getElementById("transaction-list");
  const transactions = await getStudentTransactions(studentId);

  if (transactions.length === 0) {
    listEl.innerHTML = `<p class="empty-state">No star activity yet.</p>`;
    return;
  }

  listEl.innerHTML = transactions.map(txn => `
    <div class="transaction-item">
      <div class="transaction-info">
        <div class="transaction-category">${txn.category}</div>
        <div class="transaction-reason">${txn.reason || ""}</div>
        <div class="transaction-meta">${formatDate(txn.timestamp)}</div>
      </div>
      <div class="transaction-amount ${starAmountClass(txn.amount)}">
        ${formatStarAmount(txn.amount)}
      </div>
    </div>
  `).join("");
}

async function refreshAfterTransaction() {
  currentStudent = await getStudent(studentId);
  renderHeader();
  await loadTransactions();
}

document.getElementById("give-stars-btn").addEventListener("click", () => {
  openStarActionModal(currentStudent, "give", teacher.uid, refreshAfterTransaction);
});

document.getElementById("take-stars-btn").addEventListener("click", () => {
  openStarActionModal(currentStudent, "take", teacher.uid, refreshAfterTransaction);
});

loadStudent();