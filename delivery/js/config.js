// ==========================================
// CONFIGURATION & DATABASE CONNECTION
// ==========================================

console.log("Loading Configuration...");

// 1. SAFETY CHECK: Ensure Firebase SDK is loaded from HTML
// Agar internet band hai ya firebase load nahi hua to yahi rok do
if (!window.firebase) {
    console.error("CRITICAL ERROR: Firebase SDK not found!");
    alert("System Error: Firebase SDK load nahi hua. Internet check karein.");
    throw new Error("Firebase SDK missing from window scope");
}

const firebaseConfig = {
    apiKey: "AIzaSyCmgMr4cj7ec1B09eu3xpRhCwsVCeQR9v0",
    authDomain: "tipsplit-e3wes.firebaseapp.com",
    databaseURL: "https://tipsplit-e3wes-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tipsplit-e3wes",
    storageBucket: "tipsplit-e3wes.firebasestorage.app",
    messagingSenderId: "984733883633",
    appId: "1:984733883633:web:adc1e1d22b629a6b631d50"
};

// 2. INITIALIZE FIREBASE (IMPORTANT: Use window.firebase)
// Yahan galti thi, ab 'window.' laga diya hai
if (!window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
}

// 3. EXPORT DATABASE
export const db = window.firebase.database();

// Application Constants
export const PARTNER_PAY = 20; 
export const GPS_UPDATE_THRESHOLD_KM = 0.03; 
export const HEARTBEAT_INTERVAL_MS = 60000;

// Global Flags (Debugging)
window.db = db;
window.isOnline = false;
window.isMapOpen = false;