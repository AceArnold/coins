// ============================================
// Auth — signup, login, logout, route protection
// ============================================

import {
  auth,
  db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "./firebase-config.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

export async function signUpTeacher(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  await setDoc(doc(db, "users", uid), {
    name,
    email,
    role: "teacher",
    status: "pending"
  });

  return userCredential.user;
}

export async function loginTeacher(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutTeacher() {
  await signOut(auth);
  window.location.href = "login.html";
}

export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }

      const teacherDoc = await getDoc(doc(db, "users", user.uid));
      const teacherData = teacherDoc.exists() ? teacherDoc.data() : null;

      if (!teacherData || teacherData.status !== "approved") {
        window.location.href = "pending.html";
        return;
      }

      resolve({
        uid: user.uid,
        email: user.email,
        teacherData
      });
    });
  });
}

export function redirectIfLoggedIn() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const teacherDoc = await getDoc(doc(db, "users", user.uid));
    const teacherData = teacherDoc.exists() ? teacherDoc.data() : null;

    if (teacherData && teacherData.status === "approved") {
      window.location.href = "index.html";
    } else {
      window.location.href = "pending.html";
    }
  });
}