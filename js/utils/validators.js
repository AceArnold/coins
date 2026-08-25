// ============================================
// Input validation helpers
// ============================================

/**
 * Validates a star transaction amount.
 * Must be a positive whole number (sign is applied separately by give/take action).
 */
export function validateStarAmount(amount) {
  const num = Number(amount);
  if (isNaN(num)) return { valid: false, error: "Amount must be a number." };
  if (num <= 0) return { valid: false, error: "Amount must be greater than 0." };
  if (!Number.isInteger(num)) return { valid: false, error: "Amount must be a whole number." };
  return { valid: true, value: num };
}

/** Validates that a category has been selected */
export function validateCategory(category) {
  if (!category || category.trim() === "") {
    return { valid: false, error: "Please select a category." };
  }
  return { valid: true, value: category };
}

/** Validates that a reason/note has been entered */
export function validateReason(reason) {
  if (!reason || reason.trim().length === 0) {
    return { valid: false, error: "Please provide a reason." };
  }
  if (reason.trim().length > 300) {
    return { valid: false, error: "Reason must be under 300 characters." };
  }
  return { valid: true, value: reason.trim() };
}

/** Validates reward fields when adding a new reward */
export function validateReward(name, cost, quantity) {
  if (!name || name.trim() === "") return { valid: false, error: "Reward name is required." };
  if (isNaN(cost) || cost <= 0) return { valid: false, error: "Cost must be a positive number." };
  if (isNaN(quantity) || quantity < 0) return { valid: false, error: "Quantity must be 0 or more." };
  return { valid: true };
}

/** Validates job fields when adding a new job */
export function validateJob(title, stars, spots) {
  if (!title || title.trim() === "") return { valid: false, error: "Job title is required." };
  if (isNaN(stars) || stars <= 0) return { valid: false, error: "Star reward must be a positive number." };
  if (isNaN(spots) || spots <= 0) return { valid: false, error: "Spots must be at least 1." };
  return { valid: true };
}