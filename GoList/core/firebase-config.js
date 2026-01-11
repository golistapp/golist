// --- FILE: /core/firebase-config.js ---
// Purpose: Centralized Firebase Configuration

const firebaseConfig = {
    apiKey: "AIzaSyCmgMr4cj7ec1B09eu3xpRhCwsVCeQR9v0",
    authDomain: "tipsplit-e3wes.firebaseapp.com",
    databaseURL: "https://tipsplit-e3wes-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tipsplit-e3wes",
    storageBucket: "tipsplit-e3wes.firebasestorage.app",
    messagingSenderId: "984733883633",
    appId: "1:984733883633:web:adc1e1d22b629a6b631d50"
};

// Initialize Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Make DB global so other modules can use it
window.db = db;
console.log("🔥 Firebase Config Loaded");