// ============================================
// Dashboard Page Logic
// ============================================

import { requireAuth } from "../auth.js";
import { renderNav } from "../nav.js";
import {
  getTopStudents,
  getClassAverages,
  getWeeklyLeaderboard,
  getWeeklyStarsLost,
  getRecentActivity,
  getOpenJobsCount,
  getPendingFulfillmentCount,
  getTeacherClasses,
  getAllClasses,
  getClassDailyAverages,
  getStudentDailySeries
} from "../utils/firestore-helpers.js";
import { formatStars, formatStarAmount, starAmountClass, timeAgo } from "../utils/format.js";

const teacher = await requireAuth();
renderNav();

const isAdmin = teacher.teacherData && teacher.teacherData.role === "admin";

const CHART_COLORS = [
  "#FF6B6B", "#4ECDC4", "#FFD93D", "#6C5CE7", "#00B894",
  "#0984E3", "#E17055", "#FD79A8", "#636E72", "#00CEC9",
  "#F0932B", "#EB4D4B"
];

function formatShortDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

let allVisibleClasses = [];
async function getVisibleClasses() {
  if (allVisibleClasses.length) return allVisibleClasses;
  allVisibleClasses = isAdmin ? await getAllClasses() : await getTeacherClasses(teacher.uid);
  return allVisibleClasses;
}

async function loadDashboard() {
  loadTopStudents();
  loadBestClass();
  loadWeeklyLeaderboard();
  loadWeeklyStarsLost();
  loadActivityFeed();
  loadBadges();
  initChartWidgets();
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

async function loadWeeklyStarsLost() {
  const el = document.getElementById("weekly-stars-lost-list");
  try {
    const list = await getWeeklyStarsLost(10);
    if (list.length === 0) {
      el.innerHTML = `<p class="empty-state">No stars lost this week.</p>`;
      return;
    }
    el.innerHTML = list.map((s, i) => `
      <li class="leaderboard-item">
        <span class="leaderboard-rank">${i + 1}</span>
        <span class="leaderboard-name">${s.name}</span>
        <span class="text-danger">-${s.starsLostThisWeek} ⭐</span>
      </li>
    `).join("");
  } catch (err) {
    console.error("Weekly stars lost failed:", err);
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

// ---------- Charts ----------

let barChartInstance = null;
let lineChartInstance = null;
let barSelectedClassId = "all";
let barWeekOffset = 0;
let barShowAll = false;
let lineSelectedClassId = null;

async function initChartWidgets() {
  const classes = await getVisibleClasses();

  const barSelect = document.getElementById("bar-class-select");
  const lineSelect = document.getElementById("line-class-select");

  if (classes.length === 0) {
    barSelect.innerHTML = `<option value="all">All Classes</option>`;
    lineSelect.innerHTML = `<option value="">No classes</option>`;
    document.getElementById("bar-chart-empty").hidden = false;
    document.getElementById("bar-chart-wrapper").hidden = true;
    document.getElementById("line-chart-empty").hidden = false;
    document.getElementById("line-chart-wrapper").hidden = true;
    return;
  }

  barSelect.innerHTML = `<option value="all">All Classes</option>` +
    classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  barSelect.addEventListener("change", () => {
    barSelectedClassId = barSelect.value;
    barWeekOffset = 0;
    barShowAll = false;
    document.getElementById("bar-showall-btn").textContent = "Show Full History";
    loadBarChart();
  });

  document.getElementById("bar-prev-btn").addEventListener("click", () => {
    barWeekOffset += 1;
    barShowAll = false;
    document.getElementById("bar-showall-btn").textContent = "Show Full History";
    loadBarChart();
  });
  document.getElementById("bar-next-btn").addEventListener("click", () => {
    barWeekOffset = Math.max(0, barWeekOffset - 1);
    barShowAll = false;
    document.getElementById("bar-showall-btn").textContent = "Show Full History";
    loadBarChart();
  });
  document.getElementById("bar-showall-btn").addEventListener("click", (e) => {
    barShowAll = !barShowAll;
    e.target.textContent = barShowAll ? "Show Last 7 Days" : "Show Full History";
    loadBarChart();
  });

  lineSelect.innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  lineSelectedClassId = classes[0].id;
  lineSelect.addEventListener("change", () => {
    lineSelectedClassId = lineSelect.value;
    loadLineChart();
  });

  await loadBarChart();
  await loadLineChart();
}

async function loadBarChart() {
  const emptyEl = document.getElementById("bar-chart-empty");
  const wrapper = document.getElementById("bar-chart-wrapper");
  const canvas = document.getElementById("bar-chart-canvas");
  const classes = await getVisibleClasses();

  try {
    let days = [];
    let datasets = [];

    if (barSelectedClassId === "all") {
      const results = await Promise.all(classes.map(c => getClassDailyAverages(c.id)));
      const dayUnion = new Set();
      results.forEach(r => r.days.forEach(d => dayUnion.add(d)));
      days = Array.from(dayUnion).sort();

      datasets = classes.map((c, i) => {
        const result = results[i];
        const map = {};
        result.days.forEach((d, idx) => { map[d] = result.data[idx]; });
        return {
          label: c.name,
          data: days.map(d => (d in map ? map[d] : 0)),
          backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
        };
      });
    } else {
      const result = await getClassDailyAverages(barSelectedClassId);
      days = result.days;
      const colorIndex = classes.findIndex(c => c.id === barSelectedClassId);
      const cls = classes.find(c => c.id === barSelectedClassId);
      datasets = [{
        label: cls ? cls.name : "Class",
        data: result.data,
        backgroundColor: CHART_COLORS[Math.max(0, colorIndex) % CHART_COLORS.length]
      }];
    }

    if (days.length === 0) {
      emptyEl.hidden = false;
      wrapper.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    wrapper.hidden = false;

    let visibleDays = days;
    let visibleDatasets = datasets;

    if (!barShowAll) {
      const totalDays = days.length;
      const endIndex = Math.max(0, totalDays - 7 * barWeekOffset);
      const startIndex = Math.max(0, endIndex - 7);
      visibleDays = days.slice(startIndex, endIndex);
      visibleDatasets = datasets.map(ds => ({ ...ds, data: ds.data.slice(startIndex, endIndex) }));

      document.getElementById("bar-prev-btn").disabled = startIndex === 0;
      document.getElementById("bar-next-btn").disabled = barWeekOffset === 0;
    } else {
      document.getElementById("bar-prev-btn").disabled = true;
      document.getElementById("bar-next-btn").disabled = true;
    }

    wrapper.style.width = barShowAll ? Math.max(600, visibleDays.length * 50) + "px" : "100%";

    const labels = visibleDays.map(formatShortDate);

    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(canvas, {
      type: "bar",
      data: { labels, datasets: visibleDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { title: { display: true, text: "Avg ⭐ per student" } }
        },
        plugins: { legend: { display: visibleDatasets.length > 1 } }
      }
    });
  } catch (err) {
    console.error("Bar chart failed:", err);
    emptyEl.textContent = "Couldn't load chart data.";
    emptyEl.hidden = false;
    wrapper.hidden = true;
  }
}

async function loadLineChart() {
  const emptyEl = document.getElementById("line-chart-empty");
  const wrapper = document.getElementById("line-chart-wrapper");
  const canvas = document.getElementById("line-chart-canvas");

  if (!lineSelectedClassId) return;

  try {
    const { days, series } = await getStudentDailySeries(lineSelectedClassId);

    if (days.length === 0) {
      emptyEl.hidden = false;
      wrapper.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    wrapper.hidden = false;

    wrapper.style.width = Math.max(600, days.length * 50) + "px";

    const labels = days.map(formatShortDate);
    const datasets = series.map((s, i) => ({
      label: s.name,
      data: s.data,
      borderColor: CHART_COLORS[i % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
      fill: false,
      tension: 0.25,
      pointRadius: 2
    }));

    if (lineChartInstance) lineChartInstance.destroy();
    lineChartInstance = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { title: { display: true, text: "Net ⭐ that day" } }
        },
        plugins: { legend: { display: true, position: "bottom" } }
      }
    });
  } catch (err) {
    console.error("Line chart failed:", err);
    emptyEl.textContent = "Couldn't load chart data.";
    emptyEl.hidden = false;
    wrapper.hidden = true;
  }
}

loadDashboard();