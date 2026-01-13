// ==========================================
// AUTHENTICATION CONTROLLER (FINAL FIX)
// ==========================================

import { db } from '../config.js';
import { saveSession } from '../core/state.js';
import { showToast } from '../utils.js';

console.log("Loading Auth Module...");

let typingTimer;
let isNewUser = false;
let recoveryData = null;

// Is function ko Router call karega
export function initAuth() {
    console.log("Initializing Auth Listeners...");

    const els = {
        form: document.getElementById('loginForm'),
        mobile: document.getElementById('mobile'),
        pin: document.getElementById('pin'),
        pinSec: document.getElementById('pinSection'),
        newFields: document.getElementById('newFields'),
        btn: document.getElementById('submitBtn'),
        btnText: document.getElementById('btnText'),
        forgotLink: document.getElementById('forgotLink'),

        // Recovery Elements
        modalRec: document.getElementById('modal-recovery'),
        btnForgot: document.getElementById('btnForgotPin'),
        btnCloseRec: document.getElementById('btnCloseRec'),
        recMobile: document.getElementById('recMobile'),
        btnCheckRec: document.getElementById('btnCheckRec'),
        stepRecMobile: document.getElementById('stepRecMobile'),
        stepRecQ: document.getElementById('stepRecQ'),
        dispSecQ: document.getElementById('dispSecQ'),
        recAnswer: document.getElementById('recAnswer'),
        btnVerifyAns: document.getElementById('btnVerifyAns'),
        stepRecFinal: document.getElementById('stepRecFinal'),
        recoveredPin: document.getElementById('recoveredPin')
    };

    if (!els.mobile) {
        console.error("Critical: Login elements not found in DOM");
        return;
    }

    // 1. MOBILE INPUT LISTENER
    els.mobile.oninput = function() {
        clearTimeout(typingTimer);
        const val = this.value;

        // Reset UI if deleted
        if (val.length !== 10) {
            if(els.pinSec) els.pinSec.classList.add('hidden');
            if(els.newFields) els.newFields.classList.add('hidden', 'opacity-0');
            if(els.btn) els.btn.classList.add('hidden');
            if(els.forgotLink) els.forgotLink.classList.add('hidden');
            return;
        }

        // Check DB
        typingTimer = setTimeout(async () => {
            try {
                console.log("Checking user:", val);
                const snap = await db.ref('deliveryBoys/' + val).once('value');

                // Show PIN Box
                if(els.pinSec) els.pinSec.classList.remove('hidden');
                if(els.btn) els.btn.classList.remove('hidden');
                if(els.pin) els.pin.focus();

                if (snap.exists()) {
                    // OLD USER
                    isNewUser = false;
                    if(els.newFields) els.newFields.classList.add('hidden', 'opacity-0');
                    if(els.btnText) els.btnText.innerText = "LOGIN SECURELY";
                    if(els.forgotLink) els.forgotLink.classList.remove('hidden');

                    if(document.getElementById('regSecQ')) document.getElementById('regSecQ').required = false;
                    if(document.getElementById('regSecA')) document.getElementById('regSecA').required = false;
                } else {
                    // NEW USER
                    isNewUser = true;
                    if(els.newFields) els.newFields.classList.remove('hidden');
                    setTimeout(() => els.newFields.classList.remove('opacity-0'), 50);
                    if(els.btnText) els.btnText.innerText = "REGISTER & LOGIN";
                    if(els.forgotLink) els.forgotLink.classList.add('hidden');

                    if(document.getElementById('regSecQ')) document.getElementById('regSecQ').required = true;
                    if(document.getElementById('regSecA')) document.getElementById('regSecA').required = true;
                    showToast("New Partner? Set up profile.");
                }
            } catch (error) {
                console.error("Firebase Error:", error);
                showToast("Connection Error. Check Internet.");
            }
        }, 300);
    };

    // 2. VEHICLE SELECTION
    const vehBtns = document.querySelectorAll('.vehicle-option');
    vehBtns.forEach(btn => {
        btn.onclick = () => {
            vehBtns.forEach(b => b.classList.remove('selected', 'border-green-600', 'bg-green-50'));
            btn.classList.add('selected', 'border-green-600', 'bg-green-50'); 
            document.getElementById('selectedVehicle').value = btn.dataset.veh;
        };
    });

    // 3. FORM SUBMIT
    els.form.onsubmit = async (e) => {
        e.preventDefault();
        const mobile = els.mobile.value;
        const pin = els.pin.value;

        if (pin.length !== 4) return showToast("PIN must be 4 digits");

        if (isNewUser) {
            await handleRegister(mobile, pin);
        } else {
            await handleLogin(mobile, pin);
        }
    };

    // 4. RECOVERY SETUP
    if(els.btnForgot) els.btnForgot.onclick = () => {
        els.modalRec.classList.remove('hidden');
        els.stepRecMobile.classList.remove('hidden');
        els.stepRecQ.classList.add('hidden');
        els.stepRecFinal.classList.add('hidden');
        if(els.mobile.value.length === 10) els.recMobile.value = els.mobile.value;
    };
    if(els.btnCloseRec) els.btnCloseRec.onclick = () => els.modalRec.classList.add('hidden');
    if(els.btnCheckRec) els.btnCheckRec.onclick = async () => {
        const mob = els.recMobile.value;
        if(mob.length !== 10) return showToast("Invalid Mobile");

        const snap = await db.ref('deliveryBoys/' + mob).once('value');
        if(!snap.exists()) return showToast("User not found");

        recoveryData = snap.val();
        if(recoveryData.securityQ) {
            const qMap = {'bike': 'Dream Bike?', 'school': 'First School?', 'pet': 'Pet Name?', 'city': 'Birth City?'};
            els.dispSecQ.innerText = qMap[recoveryData.securityQ] || "Secret Question";
            els.stepRecMobile.classList.add('hidden');
            els.stepRecQ.classList.remove('hidden');
        } else {
            alert("Security setup missing. Contact Admin.");
        }
    };
    if(els.btnVerifyAns) els.btnVerifyAns.onclick = () => {
        const ans = els.recAnswer.value.trim().toLowerCase();
        if(ans === recoveryData.securityA) {
            els.stepRecQ.classList.add('hidden');
            els.stepRecFinal.classList.remove('hidden');
            els.recoveredPin.innerText = recoveryData.pin;
        } else {
            showToast("Wrong Answer!");
        }
    };
}

// HELPERS
async function handleRegister(mobile, pin) {
    const name = document.getElementById('fullName').value;
    const vehicle = document.getElementById('selectedVehicle').value;
    const secQ = document.getElementById('regSecQ').value;
    const secA = document.getElementById('regSecA').value.trim().toLowerCase();

    if (!name || !vehicle || !secQ || !secA) return showToast("Fill all details");

    const profile = {
        name, mobile, vehicle, pin,
        securityQ: secQ, securityA: secA,
        status: 'pending',
        earnings: 0, trips: 0,
        // FIX: Using Date.now() instead of firebase global to avoid errors
        joinedAt: Date.now() 
    };

    await db.ref('deliveryBoys/' + mobile).set(profile);
    alert("Registration Successful! Please wait for Admin Approval.");
    window.location.reload();
}

async function handleLogin(mobile, pin) {
    document.getElementById('btnText').innerText = "VERIFYING...";
    try {
        const snap = await db.ref('deliveryBoys/' + mobile).once('value');
        const user = snap.val();
        document.getElementById('btnText').innerText = "LOGIN SECURELY";

        if (user.pin !== pin) return showToast("Wrong PIN!");
        if (user.status === 'disabled') return alert("Account Disabled by Admin");
        if (user.status === 'pending') return alert("Verification Pending. Contact Admin.");

        // Success
        saveSession(user);
        showToast("Login Success!");
        setTimeout(() => window.location.reload(), 500);
    } catch(e) {
        console.error(e);
        showToast("Login Error");
        document.getElementById('btnText').innerText = "LOGIN";
    }
}