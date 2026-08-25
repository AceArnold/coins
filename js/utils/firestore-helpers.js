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
  Timestamp
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

// ---------- TEACHERS ----------

/** Admin only — get every approved teacher (for dropdowns) */
export async function getApprovedTeachers() {
  const q = query(
    collection(db, "users"),
    where("status", "==", "approved")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

  await runTransaction(db, async (transaction) => {
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error("Student not found");

    const currentBalance = studentSnap.data().starBalance || 0;
    const newBalance = currentBalance + amount;

    transaction.update(studentRef, { starBalance: newBalance });

    const txnRef = doc(collection(db, "starTransactions"));
    transaction.set(txnRef, {
      studentId,
      teacherUid,
      amount,
      type: amount >= 0 ? "give" : "take",
      category,
      reason,
      timestamp: Timestamp.now()
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

    const purchaseRef = doc(collection(db, "purchases"));
    transaction.set(purchaseRef, {
      studentId,
      rewardId,
      rewardName: reward.name,
      cost: reward.cost,
      teacherUid,
      fulfilled: false,
      timestamp: Timestamp.now()
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

  await runTransaction(db, async (transaction) => {
    const jobSnap = await transaction.get(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");

    const job = jobSnap.data();
    if (job.filledSpots >= job.totalSpots) throw new Error("Job is full");

    transaction.update(jobRef, { filledSpots: job.filledSpots + 1 });

    const appRef = doc(collection(db, "jobApplications"));
    transaction.set(appRef, {
      jobId,
      studentId,
      status: "signed_up",
      timestamp: Timestamp.now()
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

export async function getRecentActivity(n = 8) {
  const q = query(
    collection(db, "starTransactions"),
    orderBy("timestamp", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const withNames = await Promise.all(txns.map(async (txn) => {
    const student = await getStudent(txn.studentId);
    return { ...txn, studentName: student ? student.name : "Unknown student" };
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