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
  const [topStudents, classAverages, weeklyLeaderboard, recentActivity, openJobs, pendingFulfillment] =
    await Promise.all([
      getTopStudents(3),
      getClassAverages(),
      getWeeklyLeaderboard(10),
      getRecentActivity(8),
      getOpenJobsCount(),
      getPendingFulfillmentCount()
    ]);

  renderTopStudents(topStudents);
  renderBestClass(classAverages);
  renderWeeklyLeaderboard(weeklyLeaderboard);
  renderActivityFeed(recentActivity);
  renderBadges(openJobs, pendingFulfillment);
}

function renderTopStudents(students) {
  const el = document.getElementById("top-students-card");
  if (students.length === 0) {
    el.innerHTML = `<p class="stat-card-label">Top Students</p><p class="empty-state">No data yet</p>`;
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
}

function renderBestClass(classAverages) {
  const el = document.getElementById("best-class-card");
  if (classAverages.length === 0) {
    el.innerHTML = `<p class="stat-card-label">Best Class Average</p><p class="empty-state">No data yet</p>`;
    return;
  }
  const best = classAverages[0];
  el.innerHTML = `
    <p class="stat-card-label">📊 Best Class Average</p>
    <p class="stat-card-value">${best.className}</p>
    <p class="stat-card-sub">${best.average.toFixed(1)} ⭐ avg per student</p>
  `;
}

function renderWeeklyLeaderboard(leaderboard) {
  const el = document.getElementById("weekly-leaderboard-list");
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
}

function renderActivityFeed(activity) {
  const el = document.getElementById("activity-feed-list");
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
}

function renderBadges(openJobsCount, pendingFulfillmentCount) {
  const el = document.getElementById("dashboard-badges");
  el.innerHTML = `
    <a href="jobs.html" class="badge badge-warning">${openJobsCount} open job${openJobsCount === 1 ? "" : "s"}</a>
    <a href="store.html" class="badge badge-success">${pendingFulfillmentCount} pending pickup${pendingFulfillmentCount === 1 ? "" : "s"}</a>
  `;
}

loadDashboard();