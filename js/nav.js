// ============================================
// Shared Navigation Bar
// ============================================

import { logoutTeacher } from "./auth.js";

const NAV_ITEMS = [
  { label: "Dashboard", href: "index.html" },
  { label: "Classes", href: "classes.html" },
  { label: "Store", href: "store.html" },
  { label: "Jobs", href: "jobs.html" }
];

/**
 * Builds and injects the nav bar into the element with id="app-nav".
 * Call this once at the top of every protected page.
 */
export function renderNav() {
  const navRoot = document.getElementById("app-nav");
  if (!navRoot) return;

  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const linksHtml = NAV_ITEMS.map(item => {
    const isActive = item.href === currentPage;
    return `
      <a href="${item.href}" class="nav-link${isActive ? " nav-link--active" : ""}">
        ${item.label}
      </a>
    `;
  }).join("");

  navRoot.innerHTML = `
    <nav class="nav-bar">
      <div class="nav-brand">⭐ Star Rewards</div>
      <div class="nav-links">
        ${linksHtml}
      </div>
      <button id="nav-logout-btn" class="nav-logout">Logout</button>
    </nav>
  `;

  document.getElementById("nav-logout-btn").addEventListener("click", async () => {
    await logoutTeacher();
  });
}