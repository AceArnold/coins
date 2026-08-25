// ============================================
// Reward Store Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import { openModal } from "../components/modal.js";
import {
  getRewards,
  addReward,
  purchaseReward,
  getUnfulfilledPurchases,
  markPurchaseFulfilled,
  getTeacherClasses,
  getStudentsInClass
} from "../utils/firestore-helpers.js";
import { validateReward } from "../utils/validators.js";
import { formatStars, formatDate } from "../utils/format.js";

const teacher = await requireAuth();
renderNav();

let allStudentsCache = null; // lazy-loaded for the purchase modal's student picker

async function getAllTeacherStudents() {
  if (allStudentsCache) return allStudentsCache;
  const classes = await getTeacherClasses(teacher.uid);
  const studentLists = await Promise.all(classes.map(c => getStudentsInClass(c.id)));
  allStudentsCache = studentLists.flat().sort((a, b) => a.name.localeCompare(b.name));
  return allStudentsCache;
}

// ---------- Load & render rewards ----------

async function loadRewards() {
  const rewards = await getRewards();
  const gridEl = document.getElementById("reward-grid");

  if (rewards.length === 0) {
    gridEl.innerHTML = `<p class="empty-state">No rewards yet. Add one to get started.</p>`;
    return;
  }

  gridEl.innerHTML = rewards.map(r => `
    <div class="reward-card ${!r.available ? "reward-card--unavailable" : ""}">
      <div class="reward-card-name">${r.name}</div>
      <div class="reward-card-desc">${r.description || ""}</div>
      <div class="reward-card-footer">
        <span class="reward-card-cost">${formatStars(r.cost)}</span>
        ${r.available
          ? `<button class="btn btn-primary btn-sm" data-reward-id="${r.id}" data-reward-name="${r.name}" data-reward-cost="${r.cost}">Sell</button>`
          : `<span class="badge badge-warning">Unavailable</span>`}
      </div>
    </div>
  `).join("");

  gridEl.querySelectorAll("[data-reward-id]").forEach(btn => {
    btn.addEventListener("click", () => openPurchaseModal(
      btn.dataset.rewardId,
      btn.dataset.rewardName,
      Number(btn.dataset.rewardCost)
    ));
  });
}

// ---------- Purchase modal ----------

async function openPurchaseModal(rewardId, rewardName, rewardCost) {
  const students = await getAllTeacherStudents();
  const options = students.map(s => `<option value="${s.id}">${s.name} (${s.starBalance} ⭐)</option>`).join("");

  openModal({
    title: `Sell "${rewardName}"`,
    confirmLabel: "Confirm Sale",
    bodyHtml: `
      <p class="modal-subtext">Cost: <strong>${formatStars(rewardCost)}</strong></p>
      <label class="form-label" for="purchase-student-select">Student</label>
      <select id="purchase-student-select" class="form-input">
        <option value="">Select a student…</option>
        ${options}
      </select>
    `,
    onConfirm: async (body) => {
      const studentId = body.querySelector("#purchase-student-select").value;
      if (!studentId) throw new Error("Please select a student.");

      await purchaseReward(studentId, rewardId, teacher.uid);
      allStudentsCache = null; // invalidate cache so balances refresh next open
      await loadRewards();
      await loadFulfillment();
    }
  });
}

// ---------- Add reward modal ----------

function openAddRewardModal() {
  openModal({
    title: "Add Reward",
    confirmLabel: "Add Reward",
    bodyHtml: `
      <label class="form-label" for="reward-name-input">Name</label>
      <input type="text" id="reward-name-input" class="form-input" placeholder="e.g. Homework Pass" />

      <label class="form-label" for="reward-desc-input">Description</label>
      <textarea id="reward-desc-input" class="form-input" rows="2" placeholder="Optional details"></textarea>

      <label class="form-label" for="reward-cost-input">Cost (⭐)</label>
      <input type="number" id="reward-cost-input" class="form-input" min="1" />

      <label class="form-label" for="reward-qty-input">Quantity Available</label>
      <input type="number" id="reward-qty-input" class="form-input" min="0" />
    `,
    onConfirm: async (body) => {
      const name = body.querySelector("#reward-name-input").value.trim();
      const description = body.querySelector("#reward-desc-input").value.trim();
      const cost = Number(body.querySelector("#reward-cost-input").value);
      const quantity = Number(body.querySelector("#reward-qty-input").value);

      const check = validateReward(name, cost, quantity);
      if (!check.valid) throw new Error(check.error);

      await addReward(name, description, cost, quantity);
      await loadRewards();
    }
  });
}

document.getElementById("add-reward-btn").addEventListener("click", openAddRewardModal);

// ---------- Fulfillment tracker ----------

async function loadFulfillment() {
  const purchases = await getUnfulfilledPurchases();
  const listEl = document.getElementById("fulfillment-list");

  if (purchases.length === 0) {
    listEl.innerHTML = `<p class="empty-state">Nothing awaiting pickup.</p>`;
    return;
  }

  const withStudentNames = await Promise.all(purchases.map(async (p) => {
    const students = await getAllTeacherStudents();
    const student = students.find(s => s.id === p.studentId);
    return { ...p, studentName: student ? student.name : "Unknown student" };
  }));

  listEl.innerHTML = withStudentNames.map(p => `
    <div class="fulfillment-item">
      <div class="fulfillment-info">
        <div class="fulfillment-student">${p.studentName}</div>
        <div>${p.rewardName} — ${formatStars(p.cost)}</div>
        <div class="text-muted">${formatDate(p.timestamp)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" data-purchase-id="${p.id}">Mark Fulfilled</button>
    </div>
  `).join("");

  listEl.querySelectorAll("[data-purchase-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Marking…";
      await markPurchaseFulfilled(btn.dataset.purchaseId);
      await loadFulfillment();
    });
  });
}

loadRewards();
loadFulfillment();