
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXvvy-gl0uFy0eo_niXeZyLb5FjEpX74k",
  authDomain: "ticketbooking-59a4e.firebaseapp.com",
  projectId: "ticketbooking-59a4e",
  storageBucket: "ticketbooking-59a4e.firebasestorage.app",
  messagingSenderId: "159038496182",
  appId: "1:159038496182:web:4970e1b32e63194e5e7517"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
