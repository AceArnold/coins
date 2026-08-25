// ============================================
// Give / Take Stars Modal Logic
// ============================================

import { openModal, closeModal } from "./modal.js";
import { applyStarTransaction } from "../utils/firestore-helpers.js";
import { validateStarAmount, validateCategory, validateReason } from "../utils/validators.js";

const GIVE_CATEGORIES = [
  "Good Behaviour",
  "Exam/Test Reward",
  "Extra Credit",
  "Job Completed"
];

const TAKE_CATEGORIES = [
  "Bad Behaviour",
  "Missed Responsibility",
  "Other"
];

const QUICK_AMOUNTS = [1, 5, 10];

/**
 * Opens the Give Stars or Take Stars modal for a student.
 * @param {Object} student - { id, name, starBalance }
 * @param {"give"|"take"} mode
 * @param {string} teacherUid
 * @param {Function} onSuccess - called after a successful transaction (e.g. to refresh UI)
 */
export function openStarActionModal(student, mode, teacherUid, onSuccess) {
  const isGive = mode === "give";
  const categories = isGive ? GIVE_CATEGORIES : TAKE_CATEGORIES;
  const title = `${isGive ? "Give" : "Take"} Stars — ${student.name}`;
  const confirmLabel = isGive ? "Give Stars" : "Take Stars";

  const categoryOptions = categories
    .map(c => `<option value="${c}">${c}</option>`)
    .join("");

  const quickButtons = QUICK_AMOUNTS
    .map(n => `<button type="button" class="quick-amount-btn" data-amount="${n}">${n}</button>`)
    .join("");

  const bodyHtml = `
    <p class="modal-subtext">Current balance: <strong>${student.starBalance} ⭐</strong></p>

    <label class="form-label" for="star-amount-input">Amount</label>
    <div class="quick-amount-row">
      ${quickButtons}
    </div>
    <input type="number" id="star-amount-input" class="form-input" placeholder="Or enter a custom amount" min="1" />

    <label class="form-label" for="star-category-select">Category</label>
    <select id="star-category-select" class="form-input">
      <option value="">Select a category…</option>
      ${categoryOptions}
    </select>

    <label class="form-label" for="star-reason-input">Reason</label>
    <textarea id="star-reason-input" class="form-input" rows="3" placeholder="What happened?"></textarea>
  `;

  openModal({
    title,
    bodyHtml,
    confirmLabel,
    onConfirm: async (modalBody) => {
      const amountInput = modalBody.querySelector("#star-amount-input");
      const categorySelect = modalBody.querySelector("#star-category-select");
      const reasonInput = modalBody.querySelector("#star-reason-input");

      const amountCheck = validateStarAmount(amountInput.value);
      if (!amountCheck.valid) throw new Error(amountCheck.error);

      const categoryCheck = validateCategory(categorySelect.value);
      if (!categoryCheck.valid) throw new Error(categoryCheck.error);

      const reasonCheck = validateReason(reasonInput.value);
      if (!reasonCheck.valid) throw new Error(reasonCheck.error);

      const signedAmount = isGive ? amountCheck.value : -amountCheck.value;

      await applyStarTransaction(
        student.id,
        signedAmount,
        categoryCheck.value,
        reasonCheck.value,
        teacherUid
      );

      if (onSuccess) onSuccess();
    }
  });

  // Wire up quick-amount buttons after modal is in the DOM
  setTimeout(() => {
    const overlay = document.getElementById("active-modal-overlay");
    if (!overlay) return;

    const amountInput = overlay.querySelector("#star-amount-input");
    overlay.querySelectorAll(".quick-amount-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        amountInput.value = btn.dataset.amount;
        overlay.querySelectorAll(".quick-amount-btn").forEach(b => b.classList.remove("quick-amount-btn--active"));
        btn.classList.add("quick-amount-btn--active");
      });
    });

    // Typing a custom amount clears the quick-button highlight
    amountInput.addEventListener("input", () => {
      overlay.querySelectorAll(".quick-amount-btn").forEach(b => b.classList.remove("quick-amount-btn--active"));
    });
  }, 0);
}