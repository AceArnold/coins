// ============================================
// Reusable Modal Component
// ============================================

let currentOnClose = null;

/**
 * Opens a modal with custom content.
 * @param {Object} options
 * @param {string} options.title - Modal heading
 * @param {string} options.bodyHtml - Inner HTML for the modal body (form fields etc.)
 * @param {string} [options.confirmLabel] - Label for the confirm button (default "Confirm")
 * @param {Function} options.onConfirm - Called when confirm is clicked. Receives the modal body element.
 *                                        Can be async. Throw an Error to show it as an inline error.
 * @param {Function} [options.onClose] - Called when modal closes (cancel or after success)
 */
export function openModal({ title, bodyHtml, confirmLabel = "Confirm", onConfirm, onClose }) {
  closeModal(); // ensure only one modal at a time
  currentOnClose = onClose || null;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "active-modal-overlay";

  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close-btn" id="modal-close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body" id="modal-body">
        ${bodyHtml}
      </div>
      <p class="modal-error" id="modal-error" hidden></p>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm-btn">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const modalBody = overlay.querySelector("#modal-body");
  const errorEl = overlay.querySelector("#modal-error");
  const confirmBtn = overlay.querySelector("#modal-confirm-btn");

  overlay.querySelector("#modal-close-btn").addEventListener("click", closeModal);
  overlay.querySelector("#modal-cancel-btn").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  confirmBtn.addEventListener("click", async () => {
    errorEl.hidden = true;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Please wait…";

    try {
      await onConfirm(modalBody);
      closeModal();
    } catch (err) {
      errorEl.textContent = err.message || "Something went wrong. Please try again.";
      errorEl.hidden = false;
      confirmBtn.disabled = false;
      confirmBtn.textContent = confirmLabel;
    }
  });

  // Close on Escape
  document.addEventListener("keydown", handleEscape);
}

function handleEscape(e) {
  if (e.key === "Escape") closeModal();
}

export function closeModal() {
  const overlay = document.getElementById("active-modal-overlay");
  if (overlay) {
    overlay.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleEscape);
    if (currentOnClose) {
      currentOnClose();
      currentOnClose = null;
    }
  }
}