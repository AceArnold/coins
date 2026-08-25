// ============================================
// Firebase Initialization
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDycFMVyilWjJNOMBxZO1DooanqynaRg6s",
  authDomain: "coins-822be.firebaseapp.com",
  projectId: "coins-822be",
  storageBucket: "coins-822be.firebasestorage.app",
  messagingSenderId: "113674728239",
  appId: "1:113674728239:web:dc272f949fc06a8e8be7da"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
};