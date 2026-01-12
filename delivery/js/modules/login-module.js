// ==========================================
// FILE: js/modules/login-module.js
// (Login UI & Logic)
// ==========================================

import { db, firebase } from '../firebase.js';
import { showToast } from '../utils.js';

let typingTimer;
let isNewUser = false;
let recoveryMobile = '';
let recoveredUserData = null;
let wrongAttempts = 0;
const MAX_ATTEMPTS = 3;

export const LoginModule = {
    // 1. HTML TEMPLATE (Identical to original)
    render: () => {
        return `
        <div class="flex flex-col min-h-screen justify-center p-6 fade-in">
            <div class="text-center mb-8">
                <img src="https://ik.imagekit.io/kdtvm0r78/1000125748_Qc0zZNIFs.png" alt="GoList Logo" class="h-10 mx-auto drop-shadow-sm mb-3">
                <h1 class="text-xl font-extrabold tracking-tight text-slate-800">Delivery Fleet</h1>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-wide">Partner App</p>
            </div>

            <div class="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-golist to-green-400"></div>

                <form id="loginForm" class="space-y-5">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Mobile Number</label>
                        <div class="relative">
                            <span class="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">+91</span>
                            <input type="tel" id="mobile" required maxlength="10" pattern="[0-9]{10}" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-golist focus:bg-white transition" placeholder="XXXXXXXXXX">
                        </div>
                    </div>

                    <div id="pinSection" class="hidden animate-[fadeIn_0.3s_ease-out]">
                        <label class="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Security PIN</label>
                        <input type="password" id="pin" required maxlength="4" pattern="[0-9]*" inputmode="numeric" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-800 text-center tracking-[0.5em] text-lg focus:outline-none focus:ring-2 focus:ring-golist focus:bg-white transition" placeholder="••••">
                    </div>

                    <div id="newFields" class="space-y-5 hidden opacity-0 transition-opacity duration-500">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Full Name</label>
                            <input type="text" id="fullName" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-golist focus:bg-white transition" placeholder="Enter your name">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">Vehicle Type</label>
                            <div class="grid grid-cols-3 gap-2">
                                <button type="button" data-veh="bike" class="vehicle-option py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95"><i class="fa-solid fa-motorcycle"></i> <span class="text-[10px] font-bold">Bike</span></button>
                                <button type="button" data-veh="scooter" class="vehicle-option py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95"><i class="fa-solid fa-moped"></i> <span class="text-[10px] font-bold">Scooter</span></button>
                                <button type="button" data-veh="cycle" class="vehicle-option py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95"><i class="fa-solid fa-bicycle"></i> <span class="text-[10px] font-bold">Cycle</span></button>
                            </div>
                            <input type="hidden" id="selectedVehicle" value="">
                        </div>

                        <div class="p-3 bg-green-50 rounded-xl border border-green-100">
                            <h4 class="text-xs font-bold text-golistDark mb-2 flex items-center gap-1"><i class="fa-solid fa-shield-cat"></i> Recovery Setup</h4>
                            <div class="space-y-2">
                                <select id="regSecQ" class="w-full bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-golist">
                                    <option value="" disabled selected>Select Secret Question</option>
                                    <option value="bike">What is your dream bike?</option>
                                    <option value="school">First school name?</option>
                                    <option value="pet">Pet's name?</option>
                                    <option value="city">Birth city?</option>
                                </select>
                                <input type="text" id="regSecA" class="w-full bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-golist" placeholder="Your Answer (Gupt Jawab)">
                            </div>
                        </div>
                    </div>

                    <button type="submit" id="submitBtn" class="w-full bg-golist hover:bg-golistDark text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 flex items-center justify-center gap-2 mt-4 hidden transition active:scale-95">
                        <span id="btnText">LOGIN</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </form>

                <div id="forgotLink" class="hidden mt-6 text-center border-t border-slate-100 pt-4">
                    <button id="openForgotBtn" class="text-xs font-bold text-slate-400 hover:text-golist transition px-4 py-2">
                        <i class="fa-solid fa-key mr-1"></i> Forgot PIN?
                    </button>
                </div>
            </div>
        </div>

        <div id="verificationModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center modal-overlay p-6">
            <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-[slideUp_0.3s_ease-out]">
                <div class="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse border border-orange-100">
                    <i class="fa-solid fa-hourglass-half text-4xl text-orange-500"></i>
                </div>
                <h2 class="text-xl font-bold text-slate-800 mb-2">Verification Pending</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed font-medium">
                    Registration successful! Your profile is under review. You will be eligible for <b>GoList Delivery</b> once verified.
                    <br><br>
                    <span class="text-orange-500 font-bold">Our team will contact you soon.</span>
                </p>
                <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
                    <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Status</p>
                    <p class="text-lg font-bold text-orange-500 tracking-wider">WAITING APPROVAL</p>
                </div>
                <button onclick="window.location.reload()" class="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl transition shadow-lg">OK, I'll Wait</button>
            </div>
        </div>

        <div id="blockedModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center modal-overlay p-6">
            <div class="bg-white w-full max-w-sm rounded-2xl border-2 border-red-50 shadow-2xl p-6 text-center animate-[shake_0.5s_ease-in-out]">
                <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <i class="fa-solid fa-ban text-4xl text-red-500"></i>
                </div>
                <h2 class="text-xl font-bold text-slate-800 mb-2">Account Disabled</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed font-medium">Your partner account has been disabled by the Admin.</p>
                <button onclick="window.location.reload()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-200">Close App</button>
            </div>
        </div>

        <div id="forgotPinModal" class="fixed inset-0 z-50 hidden flex items-center justify-center modal-overlay p-4">
            <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                <div class="bg-slate-900 p-4 flex justify-between items-center">
                    <h3 class="text-white font-bold text-lg"><i class="fa-solid fa-user-lock mr-2 text-golist"></i>Partner Recovery</h3>
                    <button id="closeForgotBtn" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <div class="p-6">
                    <div id="stepCheckMobile" class="space-y-4">
                        <p class="text-xs text-slate-500 font-medium">Enter your registered mobile number.</p>
                        <div class="relative">
                            <span class="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">+91</span>
                            <input type="tel" id="recMobile" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-800 tracking-widest focus:ring-2 focus:ring-golist focus:outline-none" placeholder="9876543210" maxlength="10">
                        </div>
                        <button id="btnCheckRec" class="w-full bg-golist hover:bg-golistDark text-white font-bold py-3 rounded-xl shadow-lg transition">Proceed</button>
                    </div>
                    <div id="stepSecQuestion" class="hidden space-y-4">
                        <div class="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                            <p class="text-[10px] font-bold text-green-600 uppercase">Security Question</p>
                            <p class="text-sm font-bold text-slate-800 mt-1" id="dispSecQ">Loading...</p>
                        </div>
                        <div id="attemptContainer">
                            <input type="text" id="recAnswer" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 text-center focus:ring-2 focus:ring-golist focus:outline-none" placeholder="Enter Your Answer">
                            <p id="attemptsLeft" class="text-[10px] text-right text-slate-400 font-bold mt-1">3 attempts left</p>
                        </div>
                        <button id="btnVerifyAns" class="w-full bg-golist hover:bg-golistDark text-white font-bold py-3 rounded-xl shadow-lg transition">Verify & Show PIN</button>
                        <div id="wrongAnsFallback" class="hidden pt-4 border-t border-slate-100">
                             <button id="contactAdminBtn" class="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm hover:bg-slate-200 transition">
                                <i class="fa-brands fa-whatsapp text-lg text-golist"></i> Contact Admin
                            </button>
                        </div>
                    </div>
                    <div id="stepManualRec" class="hidden text-center space-y-4">
                        <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 text-2xl mb-2 border border-amber-100"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <h4 class="text-sm font-bold text-slate-800">Security Setup Not Found</h4>
                        <button id="contactAdminBtn2" class="w-full bg-golist text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><i class="fa-brands fa-whatsapp text-lg"></i> Contact Admin</button>
                    </div>
                    <div id="stepShowPin" class="hidden text-center space-y-4 py-4">
                        <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-golist text-2xl mb-2 border border-green-100"><i class="fa-solid fa-unlock-keyhole"></i></div>
                        <h4 class="text-lg font-bold text-slate-800">Identity Verified!</h4>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4"><p class="text-xs text-slate-500 uppercase font-bold mb-1">Your Current PIN</p><p class="text-3xl font-mono font-extrabold text-slate-900 tracking-widest" id="recoveredPin">----</p></div>
                        <button id="closeForgotSuccess" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-2 shadow-lg">Login Now</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // 2. LOGIC (Event Listeners)
    init: (onLoginSuccess) => {

        // --- Input Helper: Check Mobile ---
        const mobileInput = document.getElementById('mobile');
        mobileInput.addEventListener('input', () => {
            clearTimeout(typingTimer);
            const val = mobileInput.value;
            const pinSec = document.getElementById('pinSection');
            const newFields = document.getElementById('newFields');
            const btn = document.getElementById('submitBtn');
            const forgotLink = document.getElementById('forgotLink');

            if (val.length === 10) {
                typingTimer = setTimeout(() => {
                    db.ref('deliveryBoys/' + val).once('value', s => {
                        pinSec.classList.remove('hidden');
                        btn.classList.remove('hidden');

                        if (s.exists()) {
                            isNewUser = false;
                            newFields.classList.add('hidden', 'opacity-0');
                            document.getElementById('regSecQ').required = false;
                            document.getElementById('regSecA').required = false;
                            document.getElementById('btnText').innerText = "LOGIN SECURELY";
                            forgotLink.classList.remove('hidden'); 
                        } else {
                            isNewUser = true;
                            newFields.classList.remove('hidden');
                            setTimeout(() => newFields.classList.remove('opacity-0'), 50);
                            document.getElementById('regSecQ').required = true;
                            document.getElementById('regSecA').required = true;
                            document.getElementById('btnText').innerText = "SET PIN & REGISTER";
                            forgotLink.classList.add('hidden'); 
                            showToast("New Partner? Set up profile.");
                        }
                    });
                }, 500);
            } else {
                pinSec.classList.add('hidden');
                newFields.classList.add('hidden', 'opacity-0');
                btn.classList.add('hidden');
                forgotLink.classList.add('hidden');
            }
        });

        // --- Vehicle Selection Logic ---
        document.querySelectorAll('.vehicle-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.getAttribute('data-veh');
                document.querySelectorAll('.vehicle-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('selectedVehicle').value = type;
            });
        });

        // --- Form Submission (Login / Register) ---
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const mobile = document.getElementById('mobile').value;
            const pin = document.getElementById('pin').value;

            if (pin.length !== 4) return showToast("PIN must be 4 digits");

            if (isNewUser) {
                // REGISTRATION
                const name = document.getElementById('fullName').value;
                const vehicle = document.getElementById('selectedVehicle').value;
                const secQ = document.getElementById('regSecQ').value;
                const secA = document.getElementById('regSecA').value.trim().toLowerCase();

                if (!name || !vehicle) return showToast("Fill all details");
                if (!secQ || !secA) return showToast("Set Security Question");

                const profile = { 
                    name, mobile, vehicle, pin, 
                    securityQ: secQ, securityA: secA,
                    status: 'pending',
                    earnings: 0, trips: 0,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP 
                };

                await db.ref('deliveryBoys/' + mobile).set(profile);
                document.getElementById('verificationModal').classList.remove('hidden');
            } else {
                // LOGIN
                db.ref('deliveryBoys/' + mobile).once('value', s => {
                    const data = s.val();
                    if(data.pin === pin) {
                        if(data.status === 'disabled') {
                            document.getElementById('blockedModal').classList.remove('hidden');
                            return; 
                        }
                        if(data.status === 'pending') {
                            document.getElementById('verificationModal').classList.remove('hidden');
                            return;
                        }
                        // SUCCESS: Save User & Call Callback
                        localStorage.setItem('rmz_delivery_user', JSON.stringify(data));
                        showToast("Success! Entering Hub...");
                        onLoginSuccess(data); // <--- Router Switch Here
                    } else {
                        showToast("Wrong PIN!");
                    }
                });
            }
        });

        // --- Recovery Logic Helpers ---
        const openRecModal = () => {
            document.getElementById('forgotPinModal').classList.remove('hidden');
            const m = document.getElementById('mobile').value;
            if(m.length === 10) document.getElementById('recMobile').value = m;
        };
        const closeRecModal = () => {
            document.getElementById('forgotPinModal').classList.add('hidden');
            document.getElementById('stepCheckMobile').classList.remove('hidden');
            document.getElementById('stepSecQuestion').classList.add('hidden');
            document.getElementById('stepManualRec').classList.add('hidden');
            document.getElementById('stepShowPin').classList.add('hidden');
            document.getElementById('wrongAnsFallback').classList.add('hidden');
            document.getElementById('recAnswer').value = '';
            document.getElementById('recAnswer').disabled = false;
            document.getElementById('btnVerifyAns').classList.remove('hidden');
            wrongAttempts = 0;
            document.getElementById('attemptsLeft').innerText = "3 attempts left";
        };

        // Event Listeners for Recovery
        document.getElementById('openForgotBtn').onclick = openRecModal;
        document.getElementById('closeForgotBtn').onclick = closeRecModal;
        document.getElementById('closeForgotSuccess').onclick = closeRecModal;

        document.getElementById('btnCheckRec').onclick = () => {
            recoveryMobile = document.getElementById('recMobile').value;
            if(recoveryMobile.length !== 10) return showToast("Enter Valid Mobile");
            const btn = document.getElementById('btnCheckRec');
            btn.innerHTML = 'Checking...'; btn.disabled = true;

            db.ref('deliveryBoys/' + recoveryMobile).once('value').then(snap => {
                btn.innerHTML = 'Proceed'; btn.disabled = false;
                if(snap.exists()) {
                    recoveredUserData = snap.val();
                    if(recoveredUserData.securityQ && recoveredUserData.securityA) {
                        document.getElementById('stepCheckMobile').classList.add('hidden');
                        document.getElementById('stepSecQuestion').classList.remove('hidden');
                        const qMap = {'bike': 'What is your dream bike?', 'school': 'First school name?', 'pet': 'Pet\'s name?', 'city': 'Birth city?'};
                        document.getElementById('dispSecQ').innerText = qMap[recoveredUserData.securityQ] || "Secret Question";
                    } else {
                        document.getElementById('stepCheckMobile').classList.add('hidden');
                        document.getElementById('stepManualRec').classList.remove('hidden');
                    }
                } else showToast("Partner not found!");
            });
        };

        document.getElementById('btnVerifyAns').onclick = () => {
            const inputAns = document.getElementById('recAnswer').value.trim().toLowerCase();
            const inputField = document.getElementById('recAnswer');

            if(!inputAns) return showToast("Enter Answer");
            if(inputAns === recoveredUserData.securityA) {
                document.getElementById('stepSecQuestion').classList.add('hidden');
                document.getElementById('stepShowPin').classList.remove('hidden');
                document.getElementById('recoveredPin').innerText = recoveredUserData.pin;
            } else {
                wrongAttempts++;
                inputField.classList.add('shake'); setTimeout(() => inputField.classList.remove('shake'), 500);
                if(wrongAttempts >= MAX_ATTEMPTS) {
                    document.getElementById('attemptsLeft').innerHTML = "<span class='text-red-500'>Locked! Contact Admin</span>";
                    inputField.disabled = true; inputField.value = "LOCKED";
                    document.getElementById('btnVerifyAns').classList.add('hidden');
                    document.getElementById('wrongAnsFallback').classList.remove('hidden');
                    showToast("Security Locked!");
                } else {
                    document.getElementById('attemptsLeft').innerText = `${MAX_ATTEMPTS - wrongAttempts} attempts left`;
                    showToast("Wrong Answer!");
                }
            }
        };

        const contactAdmin = () => {
            const text = `Hi Admin, Partner (${recoveryMobile}) forgot PIN & Locked.`;
            window.open(`https://wa.me/917903698180?text=${encodeURIComponent(text)}`, '_blank');
        };
        document.getElementById('contactAdminBtn').onclick = contactAdmin;
        document.getElementById('contactAdminBtn2').onclick = contactAdmin;
    }
};