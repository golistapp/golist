// core/firebase-config.js

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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Connected via Config Module");
}

export const db = firebase.database();

// --- IMAGEKIT CONFIGURATION (NEW) ---
// Isse inventory.js import karega
export const imageKitConfig = {
    publicKey: "public_Nf7wxZyGD34X18W6o9HtFezad2o=", 
    privateKey: "private_qGMqr1FlHKO3mNudtWbgqwxtQvU=", // ⚠️ Yahan apni Private Key paste karo
    urlEndpoint: "https://ik.imagekit.io/nsyr92pse"
};