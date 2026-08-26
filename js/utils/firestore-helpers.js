// ============================================
// Firestore Helpers — centralized data access
// ============================================

import { db } from "../firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ---------- CLASSES ----------

export async function getTeacherClasses(teacherUid) {
  const q = query(
    collection(db, "classes"),
    where("teacherIds", "array-contains", teacherUid)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllClasses() {
  const snap = await getDocs(collection(db, "classes"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClass(classId) {
  const snap = await getDoc(doc(db, "classes", classId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addClass(name, teacherIds) {
  const ref = await addDoc(collection(db, "classes"), {
    name,
    teacherIds
  });
  return ref.id;
}

export async function updateClassTeachers(classId, teacherIds) {
  await updateDoc(doc(db, "classes", classId), { teacherIds });
}

// ---------- TEACHERS ----------

export async function getApprovedTeachers() {
  const q = query(
    collection(db, "users"),
    where("status", "==", "approved")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Look up a single teacher's profile by UID (for displaying who did what) */
export async function getTeacherProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- STUDENTS ----------

export async function getStudentsInClass(classId) {
  const q = query(
    collection(db, "students"),
    where("classId", "==", classId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, "students", studentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addStudent(name, classId) {
  const ref = await addDoc(collection(db, "students"), {
    name,
    classId,
    starBalance: 0
  });
  return ref.id;
}

// ---------- STAR TRANSACTIONS ----------

export async function applyStarTransaction(studentId, amount, category, reason, teacherUid) {
  const studentRef = doc(db, "students", studentId);
  const txnRef = doc(collection(db, "starTransactions"));

  await runTransaction(db, async (transaction) => {
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error("Student not found");

    const currentBalance = studentSnap.data().starBalance || 0;
    const newBalance = currentBalance + amount;

    transaction.update(studentRef, { starBalance: newBalance });

    transaction.set(txnRef, {
      studentId,
      teacherUid,
      amount,
      type: amount >= 0 ? "give" : "take",
      category,
      reason,
      timestamp: serverTimestamp()
    });
  });
}

export async function getStudentTransactions(studentId) {
  const q = query(
    collection(db, "starTransactions"),
    where("studentId", "==", studentId),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClassTransactions(classId) {
  const students = await getStudentsInClass(classId);
  const studentIds = students.map(s => s.id);
  if (studentIds.length === 0) return [];

  const q = query(
    collection(db, "starTransactions"),
    where("studentId", "in", studentIds.slice(0, 30)),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- REWARDS / STORE ----------

export async function getRewards() {
  const snap = await getDocs(collection(db, "rewards"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addReward(name, description, cost, quantity) {
  await addDoc(collection(db, "rewards"), {
    name,
    description,
    cost,
    quantity,
    available: quantity > 0
  });
}

export async function purchaseReward(studentId, rewardId, teacherUid) {
  const studentRef = doc(db, "students", studentId);
  const rewardRef = doc(db, "rewards", rewardId);
  const purchaseRef = doc(collection(db, "purchases"));

  await runTransaction(db, async (transaction) => {
    const studentSnap = await transaction.get(studentRef);
    const rewardSnap = await transaction.get(rewardRef);

    if (!studentSnap.exists()) throw new Error("Student not found");
    if (!rewardSnap.exists()) throw new Error("Reward not found");

    const reward = rewardSnap.data();
    if (reward.quantity <= 0) throw new Error("Reward out of stock");

    const currentBalance = studentSnap.data().starBalance || 0;
    const newBalance = currentBalance - reward.cost;

    const newQuantity = reward.quantity - 1;

    transaction.update(studentRef, { starBalance: newBalance });
    transaction.update(rewardRef, {
      quantity: newQuantity,
      available: newQuantity > 0
    });

    transaction.set(purchaseRef, {
      studentId,
      rewardId,
      rewardName: reward.name,
      cost: reward.cost,
      teacherUid,
      fulfilled: false,
      timestamp: serverTimestamp()
    });
  });
}

export async function getUnfulfilledPurchases() {
  const q = query(
    collection(db, "purchases"),
    where("fulfilled", "==", false),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function markPurchaseFulfilled(purchaseId) {
  await updateDoc(doc(db, "purchases", purchaseId), { fulfilled: true });
}

// ---------- JOBS ----------

export async function getJobs() {
  const snap = await getDocs(collection(db, "jobs"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getJob(jobId) {
  const snap = await getDoc(doc(db, "jobs", jobId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addJob(title, description, stars, spots, classId) {
  await addDoc(collection(db, "jobs"), {
    title,
    description,
    stars,
    totalSpots: spots,
    filledSpots: 0,
    classId
  });
}

export async function signUpForJob(jobId, studentId) {
  const jobRef = doc(db, "jobs", jobId);
  const appRef = doc(collection(db, "jobApplications"));

  await runTransaction(db, async (transaction) => {
    const jobSnap = await transaction.get(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");

    const job = jobSnap.data();
    if (job.filledSpots >= job.totalSpots) throw new Error("Job is full");

    transaction.update(jobRef, { filledSpots: job.filledSpots + 1 });

    transaction.set(appRef, {
      jobId,
      studentId,
      status: "signed_up",
      timestamp: serverTimestamp()
    });
  });
}

export async function completeJob(applicationId, jobId, studentId, stars, teacherUid) {
  await updateDoc(doc(db, "jobApplications", applicationId), { status: "completed" });
  await applyStarTransaction(studentId, stars, "Job Completed", "Job completion reward", teacherUid);
}

export async function getJobApplications(jobId) {
  const q = query(collection(db, "jobApplications"), where("jobId", "==", jobId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPendingJobCompletions() {
  const q = query(
    collection(db, "jobApplications"),
    where("status", "==", "signed_up"),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  const applications = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const withDetails = await Promise.all(applications.map(async (app) => {
    const [student, job] = await Promise.all([
      getStudent(app.studentId),
      getJob(app.jobId)
    ]);
    return {
      ...app,
      studentName: student ? student.name : "Unknown student",
      jobTitle: job ? job.title : "Unknown job",
      jobStars: job ? job.stars : 0
    };
  }));

  return withDetails;
}

// ---------- DASHBOARD AGGREGATES ----------

export async function getTopStudents(n = 3) {
  const q = query(
    collection(db, "students"),
    orderBy("starBalance", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClassAverages() {
  const classesSnap = await getDocs(collection(db, "classes"));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const results = [];
  for (const cls of classes) {
    const students = await getStudentsInClass(cls.id);
    if (students.length === 0) continue;
    const total = students.reduce((sum, s) => sum + (s.starBalance || 0), 0);
    results.push({
      classId: cls.id,
      className: cls.name,
      average: total / students.length,
      studentCount: students.length
    });
  }

  results.sort((a, b) => b.average - a.average);
  return results;
}

export async function getWeeklyLeaderboard(n = 10) {
  const oneWeekAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const q = query(
    collection(db, "starTransactions"),
    where("timestamp", ">=", oneWeekAgo),
    where("amount", ">", 0)
  );
  const snap = await getDocs(q);
  const txns = snap.docs.map(d => d.data());

  const totals = {};
  for (const txn of txns) {
    totals[txn.studentId] = (totals[txn.studentId] || 0) + txn.amount;
  }

  const studentIds = Object.keys(totals);
  const studentDataPromises = studentIds.map(id => getStudent(id));
  const studentDocs = await Promise.all(studentDataPromises);

  const leaderboard = studentDocs
    .filter(Boolean)
    .map(student => ({
      studentId: student.id,
      name: student.name,
      starsThisWeek: totals[student.id]
    }))
    .sort((a, b) => b.starsThisWeek - a.starsThisWeek)
    .slice(0, n);

  return leaderboard;
}

export async function getWeeklyStarsLost(n = 10) {
  const oneWeekAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const q = query(
    collection(db, "starTransactions"),
    where("timestamp", ">=", oneWeekAgo),
    where("amount", "<", 0)
  );
  const snap = await getDocs(q);
  const txns = snap.docs.map(d => d.data());

  const totals = {};
  for (const txn of txns) {
    totals[txn.studentId] = (totals[txn.studentId] || 0) + Math.abs(txn.amount);
  }

  const studentIds = Object.keys(totals);
  const studentDataPromises = studentIds.map(id => getStudent(id));
  const studentDocs = await Promise.all(studentDataPromises);

  const list = studentDocs
    .filter(Boolean)
    .map(student => ({
      studentId: student.id,
      name: student.name,
      starsLostThisWeek: totals[student.id]
    }))
    .sort((a, b) => b.starsLostThisWeek - a.starsLostThisWeek)
    .slice(0, n);

  return list;
}

/**
 * Most recent N transactions, enriched with both the STUDENT's name
 * and the TEACHER's name who made the change (cached per-call to avoid
 * duplicate lookups when the same teacher/student appears multiple times).
 */
export async function getRecentActivity(n = 8) {
  const q = query(
    collection(db, "starTransactions"),
    orderBy("timestamp", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const studentCache = {};
  const teacherCache = {};

  const withNames = await Promise.all(txns.map(async (txn) => {
    if (!(txn.studentId in studentCache)) {
      const student = await getStudent(txn.studentId);
      studentCache[txn.studentId] = student ? student.name : "Unknown student";
    }
    if (!(txn.teacherUid in teacherCache)) {
      const teacherProfile = await getTeacherProfile(txn.teacherUid);
      teacherCache[txn.teacherUid] = teacherProfile ? (teacherProfile.name || teacherProfile.email) : "Unknown teacher";
    }
    return {
      ...txn,
      studentName: studentCache[txn.studentId],
      teacherName: teacherCache[txn.teacherUid]
    };
  }));

  return withNames;
}

export async function getOpenJobsCount() {
  const jobs = await getJobs();
  return jobs.filter(j => j.filledSpots < j.totalSpots).length;
}

export async function getPendingFulfillmentCount() {
  const purchases = await getUnfulfilledPurchases();
  return purchases.length;
}

// ---------- CHART DATA ----------

export async function getClassDailyAverages(classId) {
  const students = await getStudentsInClass(classId);
  if (students.length === 0) return { days: [], data: [] };

  const transactions = await getClassTransactions(classId);
  if (transactions.length === 0) return { days: [], data: [] };

  const byDate = {};
  transactions.forEach(t => {
    if (!t.timestamp) return;
    const d = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
    const key = d.toISOString().slice(0, 10);
    byDate[key] = (byDate[key] || 0) + t.amount;
  });

  const days = Object.keys(byDate).sort();
  const data = days.map(day => byDate[day] / students.length);
  return { days, data };
}

export async function getStudentDailySeries(classId) {
  const students = await getStudentsInClass(classId);
  if (students.length === 0) return { days: [], series: [] };

  const transactions = await getClassTransactions(classId);
  if (transactions.length === 0) return { days: [], series: [] };

  const dates = transactions
    .filter(t => t.timestamp)
    .map(t => (t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)));

  if (dates.length === 0) return { days: [], series: [] };

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const today = new Date();

  const days = [];
  const cur = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  const byStudentDate = {};
  transactions.forEach(t => {
    if (!t.timestamp) return;
    const d = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
    const key = d.toISOString().slice(0, 10);
    if (!byStudentDate[t.studentId]) byStudentDate[t.studentId] = {};
    byStudentDate[t.studentId][key] = (byStudentDate[t.studentId][key] || 0) + t.amount;
  });

  const series = students.map(s => ({
    studentId: s.id,
    name: s.name,
    data: days.map(day => (byStudentDate[s.id] && byStudentDate[s.id][day]) || 0)
  }));

  return { days, series };
}