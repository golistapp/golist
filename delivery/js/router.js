// ==========================================
// VIEW ROUTER & UI LOGIC (FINAL UPDATE)
// ==========================================

import { db } from './config.js';
import { initSession, getUser, clearSession, saveSession, setRadius } from './core/state.js';
import { toggleClass, showToast } from './utils.js';
import { refreshOrderList } from './orders/order-list.js'; // Slider change par list refresh karne ke liye

// DOM Elements
const viewAuth = document.getElementById('view-auth');
const viewDash = document.getElementById('view-dashboard');

export async function initApp() {
    console.log("Initializing App Router...");

    // 1. Check Session
    const hasSession = initSession();

    if (hasSession) {
        await loadDashboard();
    } else {
        await loadAuth();
    }
}

// ============================
// ROUTE: DASHBOARD
// ============================
async function loadDashboard() {
    console.log("Route: Dashboard");

    // 1. UI Switch
    viewAuth.classList.add('hidden');
    viewDash.classList.remove('hidden');

    // 2. Load Dashboard Modules (Lazy Load)
    try {
        await import('./core/gps.service.js');
        await import('./core/duty.service.js');
        await import('./orders/order-list.js');
        await import('./orders/active-order.js');

        setupDashboardUI();

        const dutyModule = await import('./core/duty.service.js');
        dutyModule.initDutyModule();

        const activeModule = await import('./orders/active-order.js');
        activeModule.initActiveOrderModule();

    } catch (e) {
        console.error("Failed to load Dashboard modules", e);
    }
}

function setupDashboardUI() {
    const user = getUser();
    if (!user) return;

    // Header & Sidebar Info
    const els = {
        headerName: document.getElementById('headerName'),
        vehicleType: document.getElementById('vehicleType'),
        menuName: document.getElementById('menuName'),
        menuMobile: document.getElementById('menuMobile'),
        slider: document.getElementById('radiusSlider'),
        sliderVal: document.getElementById('radiusVal'),
        scanKm: document.getElementById('scanKm')
    };

    if(els.headerName) els.headerName.innerText = user.name;
    if(els.vehicleType) els.vehicleType.innerText = user.vehicle;
    if(els.menuName) els.menuName.innerText = user.name;
    if(els.menuMobile) els.menuMobile.innerText = '+91 ' + user.mobile;

    // --- 1. RADIUS SLIDER LOGIC ---
    if (els.slider) {
        // Set Default 5KM
        els.slider.value = 5;
        if(els.sliderVal) els.sliderVal.innerText = "5";
        if(els.scanKm) els.scanKm.innerText = "5";
        setRadius(5);

        // Listener
        els.slider.oninput = function() {
            const km = this.value;
            if(els.sliderVal) els.sliderVal.innerText = km;
            if(els.scanKm) els.scanKm.innerText = km;

            // Update Global State
            setRadius(km);

            // Refresh List Immediately
            refreshOrderList();
        };
    }

    // --- 2. SIDEBAR ACTIONS ---

    // Change PIN (Existing Logic)
    const btnPin = document.getElementById('navChangePin');
    if (btnPin) {
        btnPin.onclick = async () => {
            closeSidebar();
            const newPin = prompt("Enter new 4-digit PIN:");
            if (newPin && newPin.length === 4 && /^\d+$/.test(newPin)) {
                try {
                    await db.ref('deliveryBoys/' + user.mobile).update({ pin: newPin });
                    user.pin = newPin;
                    saveSession(user);
                    showToast("PIN Changed Successfully!");
                } catch (e) {
                    showToast("Failed to update PIN");
                }
            } else if (newPin) {
                alert("Invalid PIN");
            }
        };
    }

    // VEHICLE CHANGE (NEW MODAL LOGIC)
    const btnVeh = document.getElementById('navVehicle');
    const modalVeh = document.getElementById('modal-vehicle');
    const btnCloseVeh = document.getElementById('btnCloseVehModal');

    if (btnVeh && modalVeh) {
        btnVeh.onclick = () => {
            closeSidebar();
            modalVeh.classList.remove('hidden');
        };
    }

    if (btnCloseVeh) {
        btnCloseVeh.onclick = () => modalVeh.classList.add('hidden');
    }

    // Handle Vehicle Selection (3 Options)
    document.querySelectorAll('.btn-vehicle-select').forEach(btn => {
        btn.onclick = async () => {
            const newVeh = btn.dataset.type; // Bike, Scooter, Cycle

            // UI Feedback (Loading)
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-green-600"></i> Updating...`;

            try {
                // Firebase Update
                await db.ref('deliveryBoys/' + user.mobile).update({ vehicle: newVeh });

                // Local Update
                user.vehicle = newVeh;
                saveSession(user);

                // UI Update
                if(els.vehicleType) els.vehicleType.innerText = newVeh;

                showToast(`Vehicle set to ${newVeh}`);

                // Close Modal
                setTimeout(() => {
                    modalVeh.classList.add('hidden');
                    btn.innerHTML = originalText; // Reset button
                }, 500);

            } catch (e) {
                console.error(e);
                showToast("Update Failed");
                btn.innerHTML = originalText;
            }
        };
    });

    // Logout
    const btnLogout = document.getElementById('navLogout');
    if(btnLogout) {
        btnLogout.onclick = () => {
            if(confirm("Are you sure you want to Logout?")) {
                clearSession();
                window.location.reload(); 
            }
        };
    }
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('menuOverlay').classList.remove('open');
}

// ============================
// ROUTE: AUTHENTICATION
// ============================
async function loadAuth() {
    console.log("Route: Auth");
    viewDash.classList.add('hidden');
    viewAuth.classList.remove('hidden');

    try {
        const module = await import('./auth/auth.controller.js');
        if (module.initAuth) module.initAuth();
    } catch (e) {
        console.error("Failed to load Auth module", e);
    }
}