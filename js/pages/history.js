// ============================================
// Class-wide Transaction History Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import { getClass, getClassTransactions, getStudent } from "../utils/firestore-helpers.js";
import { formatStarAmount, starAmountClass, formatDate } from "../utils/format.js";

await requireAuth();
renderNav();

const params = new URLSearchParams(window.location.search);
const classId = params.get("classId");

async function loadHistory() {
  if (!classId) {
    document.getElementById("history-title").textContent = "Class not found";
    return;
  }

  const cls = await getClass(classId);
  if (!cls) {
    document.getElementById("history-title").textContent = "Class not found";
    return;
  }

  document.getElementById("history-title").textContent = `${cls.name} — Transaction History`;
  document.getElementById("back-to-class-link").href = `class.html?classId=${classId}`;

  const transactions = await getClassTransactions(classId);
  const listEl = document.getElementById("history-list");

  if (transactions.length === 0) {
    listEl.innerHTML = `<p class="empty-state">No star activity for this class yet.</p>`;
    return;
  }

  // Attach student names (cache lookups to avoid duplicate fetches)
  const studentCache = {};
  const withNames = await Promise.all(transactions.map(async (txn) => {
    if (!studentCache[txn.studentId]) {
      const student = await getStudent(txn.studentId);
      studentCache[txn.studentId] = student ? student.name : "Unknown student";
    }
    return { ...txn, studentName: studentCache[txn.studentId] };
  }));

  listEl.innerHTML = withNames.map(txn => `
    <div class="transaction-item">
      <div class="transaction-info">
        <div class="transaction-category">${txn.studentName} — ${txn.category}</div>
        <div class="transaction-reason">${txn.reason || ""}</div>
        <div class="transaction-meta">${formatDate(txn.timestamp)}</div>
      </div>
      <div class="transaction-amount ${starAmountClass(txn.amount)}">
        ${formatStarAmount(txn.amount)}
      </div>
    </div>
  `).join("");
}

loadHistory();