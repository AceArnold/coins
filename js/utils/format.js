// ============================================
// Formatting helpers
// ============================================

/** Formats a Firestore Timestamp (or Date) into a readable string */
export function formatDate(timestamp) {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

/** Formats a relative time like "2 min ago", "3 hours ago", "5 days ago" */
export function timeAgo(timestamp) {
  if (!timestamp) return "just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const intervals = [
    { label: "year", secs: 31536000 },
    { label: "month", secs: 2592000 },
    { label: "day", secs: 86400 },
    { label: "hour", secs: 3600 },
    { label: "min", secs: 60 }
  ];

  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

/** Formats a star amount with sign and star icon, e.g. "+10 ⭐" or "-5 ⭐" */
export function formatStarAmount(amount) {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}${amount} ⭐`;
}

/** Formats a plain star balance/price, e.g. "125 ⭐" (no sign) */
export function formatStars(amount) {
  return `${amount} ⭐`;
}

/** Returns "give" (green) or "take" (red) css class based on amount sign */
export function starAmountClass(amount) {
  return amount >= 0 ? "text-success" : "text-danger";
}