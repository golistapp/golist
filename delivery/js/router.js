// ==========================================
// VIEW ROUTER & UI LOGIC (WITH WHOLESALER STRIP)
// ==========================================

import { db } from './config.js';
import { initSession, getUser, clearSession, saveSession, setRadius, getLocation } from './core/state.js';
import { toggleClass, showToast, getDistance } from './utils.js';
import { refreshOrderList } from './orders/order-list.js';

// DOM Elements
const viewAuth = document.getElementById('view-auth');
const viewDash = document.getElementById('view-dashboard');

export async function initApp() {
    console.log("Initializing App Router...");
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

    viewAuth.classList.add('hidden');
    viewDash.classList.remove('hidden');

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

    // Header Info
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

    // --- RADIUS SLIDER ---
    if (els.slider) {
        els.slider.value = 5;
        if(els.sliderVal) els.sliderVal.innerText = "5";
        setRadius(5);

        els.slider.oninput = function() {
            const km = this.value;
            if(els.sliderVal) els.sliderVal.innerText = km;
            if(els.scanKm) els.scanKm.innerText = km;
            setRadius(km);
            refreshOrderList();
        };
    }

    // --- LOAD WHOLESALER STRIP ---
    loadWholesalerStrip();

    // --- SIDEBAR ACTIONS ---
    setupSidebarActions(user);
}

// === NEW FUNCTION: FETCH & SHOW WHOLESALERS ===
function loadWholesalerStrip() {
    const container = document.getElementById('wsListContainer');
    const strip = document.getElementById('wholesalerStrip');

    if(!container || !strip) return;

    db.ref('wholesalerRequests').orderByChild('status').equalTo('approved').on('value', (snap) => {
        if (!snap.exists()) {
            strip.classList.add('hidden');
            return;
        }

        container.innerHTML = '';
        const myLoc = getLocation();
        let count = 0;

        snap.forEach(child => {
            const ws = child.val();
            // Simple Distance Calc (if loc exists)
            let distTag = '';
            if(myLoc.lat && ws.location) {
                const d = getDistance(myLoc.lat, myLoc.lng, ws.location.lat, ws.location.lng);
                distTag = `<span class="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-bold">${d} KM</span>`;
            }

            const card = `
            <div class="snap-start shrink-0 w-64 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-bold text-gray-800 text-sm truncate w-40">${ws.shopName}</h4>
                    ${distTag}
                </div>
                <p class="text-[10px] text-gray-500 truncate mb-2"><i class="fa-solid fa-map-pin mr-1"></i>${ws.address}</p>
                <div class="flex gap-2 mt-auto">
                    <a href="tel:${ws.ownerMobile}" class="flex-1 bg-gray-50 text-gray-600 text-[10px] font-bold py-2 rounded text-center border border-gray-100"><i class="fa-solid fa-phone"></i> Call</a>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${ws.location.lat},${ws.location.lng}" target="_blank" class="flex-1 bg-blue-50 text-blue-600 text-[10px] font-bold py-2 rounded text-center border border-blue-100"><i class="fa-solid fa-location-arrow"></i> Map</a>
                </div>
            </div>`;

            container.insertAdjacentHTML('beforeend', card);
            count++;
        });

        if(count > 0) strip.classList.remove('hidden');
        else strip.classList.add('hidden');
    });
}

function setupSidebarActions(user) {
    // Change PIN
    const btnPin = document.getElementById('navChangePin');
    if (btnPin) {
        btnPin.onclick = async () => {
            closeSidebar();
            const newPin = prompt("Enter new 4-digit PIN:");
            if (newPin && newPin.length === 4 && /^\d+$/.test(newPin)) {
                await db.ref('deliveryBoys/' + user.mobile).update({ pin: newPin });
                user.pin = newPin;
                saveSession(user);
                showToast("PIN Changed Successfully!");
            } else if (newPin) alert("Invalid PIN");
        };
    }

    // Vehicle Change (Modal)
    const btnVeh = document.getElementById('navVehicle');
    const modalVeh = document.getElementById('modal-vehicle');
    const btnCloseVeh = document.getElementById('btnCloseVehModal');

    if (btnVeh && modalVeh) {
        btnVeh.onclick = () => { closeSidebar(); modalVeh.classList.remove('hidden'); };
    }
    if (btnCloseVeh) btnCloseVeh.onclick = () => modalVeh.classList.add('hidden');

    document.querySelectorAll('.btn-vehicle-select').forEach(btn => {
        btn.onclick = async () => {
            const newVeh = btn.dataset.type;
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-green-600"></i> Updating...`;
            try {
                await db.ref('deliveryBoys/' + user.mobile).update({ vehicle: newVeh });
                user.vehicle = newVeh;
                saveSession(user);
                if(document.getElementById('vehicleType')) document.getElementById('vehicleType').innerText = newVeh;
                showToast(`Vehicle set to ${newVeh}`);
                setTimeout(() => { modalVeh.classList.add('hidden'); btn.innerHTML = originalText; }, 500);
            } catch (e) { showToast("Update Failed"); btn.innerHTML = originalText; }
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
