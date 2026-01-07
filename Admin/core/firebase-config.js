// core/firebase-config.js

// 1. Tumhari original configuration
const firebaseConfig = {
    apiKey: "AIzaSyCmgMr4cj7ec1B09eu3xpRhCwsVCeQR9v0",
    authDomain: "tipsplit-e3wes.firebaseapp.com",
    databaseURL: "https://tipsplit-e3wes-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tipsplit-e3wes",
    storageBucket: "tipsplit-e3wes.firebasestorage.app",
    messagingSenderId: "984733883633",
    appId: "1:984733883633:web:adc1e1d22b629a6b631d50"
};

// 2. Initialize Firebase (Check karta hai ki pehle se connect to nahi hai)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Connected via Config Module");
}

// 3. Database Reference Export karo
// Iska faida ye hai ki humein baar-baar 'firebase.database()' nahi likhna padega.
// Hum bas doosri files mein 'import { db }' karenge.
export const db = firebase.database();