// ============================================
// Dashboard Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import {
  getTopStudents,
  getClassAverages,
  getWeeklyLeaderboard,
  getRecentActivity,
  getOpenJobsCount,
  getPendingFulfillmentCount
} from "../utils/firestore-helpers.js";
import { formatStars, formatStarAmount, starAmountClass, timeAgo } from "../utils/format.js";

await requireAuth();
renderNav();

async function loadDashboard() {
  // Each widget loads independently — one failing query (e.g. a missing
  // Firestore index) won't blank out the others.
  loadTopStudents();
  loadBestClass();
  loadWeeklyLeaderboard();
  loadActivityFeed();
  loadBadges();
}

async function loadTopStudents() {
  const el = document.getElementById("top-students-card");
  try {
    const students = await getTopStudents(3);
    if (students.length === 0) {
      el.innerHTML = `<p class="stat-card-label">🏆 Top Students</p><p class="empty-state">No data yet</p>`;
      return;
    }
    const rows = students.map((s, i) =>
      `<div class="stat-card-sub">${i + 1}. ${s.name} — ${formatStars(s.starBalance)}</div>`
    ).join("");
    el.innerHTML = `
      <p class="stat-card-label">🏆 Top Students</p>
      <p class="stat-card-value">${students[0].name}</p>
      ${rows}
    `;
  } catch (err) {
    console.error("Top students failed:", err);
    el.innerHTML = `<p class="stat-card-label">🏆 Top Students</p><p class="empty-state">Couldn't load right now</p>`;
  }
}

async function loadBestClass() {
  const el = document.getElementById("best-class-card");
  try {
    const classAverages = await getClassAverages();
    if (classAverages.length === 0) {
      el.innerHTML = `<p class="stat-card-label">📊 Best Class Average</p><p class="empty-state">No data yet</p>`;
      return;
    }
    const best = classAverages[0];
    el.innerHTML = `
      <p class="stat-card-label">📊 Best Class Average</p>
      <p class="stat-card-value">${best.className}</p>
      <p class="stat-card-sub">${best.average.toFixed(1)} ⭐ avg per student</p>
    `;
  } catch (err) {
    console.error("Class averages failed:", err);
    el.innerHTML = `<p class="stat-card-label">📊 Best Class Average</p><p class="empty-state">Couldn't load right now</p>`;
  }
}

async function loadWeeklyLeaderboard() {
  const el = document.getElementById("weekly-leaderboard-list");
  try {
    const leaderboard = await getWeeklyLeaderboard(10);
    if (leaderboard.length === 0) {
      el.innerHTML = `<p class="empty-state">No stars earned this week yet.</p>`;
      return;
    }
    el.innerHTML = leaderboard.map((s, i) => `
      <li class="leaderboard-item">
        <span class="leaderboard-rank ${i < 3 ? "leaderboard-rank--top" : ""}">${i + 1}</span>
        <span class="leaderboard-name">${s.name}</span>
        <span class="text-success">+${s.starsThisWeek} ⭐</span>
      </li>
    `).join("");
  } catch (err) {
    console.error("Weekly leaderboard failed:", err);
    el.innerHTML = `<p class="empty-state">Couldn't load right now — check console for a Firestore index link.</p>`;
  }
}

async function loadActivityFeed() {
  const el = document.getElementById("activity-feed-list");
  try {
    const activity = await getRecentActivity(8);
    if (activity.length === 0) {
      el.innerHTML = `<p class="empty-state">No recent activity.</p>`;
      return;
    }
    el.innerHTML = activity.map(txn => `
      <div class="activity-feed-item">
        <strong>${txn.studentName}</strong>
        <span class="${starAmountClass(txn.amount)}">${formatStarAmount(txn.amount)}</span>
        — ${txn.category}
        <span class="activity-feed-time">${timeAgo(txn.timestamp)}</span>
      </div>
    `).join("");
  } catch (err) {
    console.error("Activity feed failed:", err);
    el.innerHTML = `<p class="empty-state">Couldn't load right now</p>`;
  }
}

async function loadBadges() {
  const el = document.getElementById("dashboard-badges");
  try {
    const [openJobsCount, pendingFulfillmentCount] = await Promise.all([
      getOpenJobsCount(),
      getPendingFulfillmentCount()
    ]);
    el.innerHTML = `
      <a href="jobs.html" class="badge badge-warning">${openJobsCount} open job${openJobsCount === 1 ? "" : "s"}</a>
      <a href="store.html" class="badge badge-success">${pendingFulfillmentCount} pending pickup${pendingFulfillmentCount === 1 ? "" : "s"}</a>
    `;
  } catch (err) {
    console.error("Badges failed:", err);
    el.innerHTML = `<p class="empty-state">Couldn't load right now — check console for a Firestore index link.</p>`;
  }
}

loadDashboard();