// ============================================
// ELECTRA MAN — Firebase initialization
// Loaded via CDN as an ES module (no npm/build tools needed).
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, onSnapshot,
  getDocs, updateDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDegE0Y_NtN2T2yO20jhxfVrLHhVon5BnY",
  authDomain: "electraman.firebaseapp.com",
  projectId: "electraman",
  storageBucket: "electraman.firebasestorage.app",
  messagingSenderId: "608975227719",
  appId: "1:608975227719:web:70a70f61f3c0185ed15a62"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { collection, doc, setDoc, addDoc, onSnapshot, getDocs, updateDoc, query, where, orderBy, serverTimestamp };
export { signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail };
