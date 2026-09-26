import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- PASTE YOUR KEYS INSIDE THESE CURLY BRACKETS ---
const firebaseConfig = {
  apiKey: "AIzaSyAL__y_q-2kawwaiAuguKrLje0omiVvZd8",
  authDomain: "team-ghost-da544.firebaseapp.com",
  projectId: "team-ghost-da544",
  storageBucket: "team-ghost-da544.firebasestorage.app",
  messagingSenderId: "84655226606",
  appId: "1:84655226606:web:39274bd2dba1f05c873dff",
  measurementId: "G-K8R557X1HH"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
