// ==========================================
// VIEW ROUTER (FIXED VISIBILITY LOGIC)
// ==========================================

import { db } from './config.js';
import { initSession, getUser, clearSession, saveSession, setRadius, getLocation, getDutyStatus } from './core/state.js';
import { showToast, getDistance } from './utils.js';
import { refreshOrderList } from './orders/order-list.js';

// DOM Elements
const viewAuth = document.getElementById('view-auth');
const viewDash = document.getElementById('view-dashboard');

let wholesalerSnapshot = null; // Store data locally

export async function initApp() {
    const hasSession = initSession();
    if (hasSession) {
        await loadDashboard();
    } else {
        await loadAuth();
    }
}

async function loadDashboard() {
    viewAuth.classList.add('hidden');
    viewDash.classList.remove('hidden');

    try {
        // 1. Load Essential Services
        await import('./core/gps.service.js');
        await import('./core/duty.service.js');

        // 2. Load Map Manager
        await import('./features/map.manager.js');

        // 3. Load Order Logic
        await import('./orders/order-list.js');
        await import('./orders/active-order.js');

        setupDashboardUI();

        // 4. Start Modules
        const dutyModule = await import('./core/duty.service.js');
        dutyModule.initDutyModule(); // This starts GPS -> Triggers updates

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

    // Radius Slider
    if (els.slider) {
        // Load saved radius or default to 5
        let savedRadius = 5;
        try { savedRadius = parseInt(localStorage.getItem('rmz_pref_radius')) || 5; } catch(e){}

        els.slider.value = savedRadius;
        if(els.sliderVal) els.sliderVal.innerText = savedRadius;
        setRadius(savedRadius);

        els.slider.oninput = function() {
            const km = this.value;
            if(els.sliderVal) els.sliderVal.innerText = km;
            if(els.scanKm) els.scanKm.innerText = km;
            setRadius(km);
            localStorage.setItem('rmz_pref_radius', km);
            refreshOrderList(); 

            // Map update trigger
            if(window.mapManager && window.mapManager.updateMapVisuals) {
                window.mapManager.updateMapVisuals();
            }
        };
    }

    // --- WHOLESALER LOGIC ---
    setupWholesalerListener();

    // Listen for GPS Updates (To refresh distances)
    window.addEventListener('location-updated', () => {
        renderWholesalerStrip(); 
    });

    // Sidebar Actions
    setupSidebarActions(user);
}

// 1. Fetch Data Once (Live Listener)
function setupWholesalerListener() {
    db.ref('wholesalerRequests').orderByChild('status').equalTo('approved').on('value', (snap) => {
        wholesalerSnapshot = snap; // Save data
        renderWholesalerStrip();   // Render immediately
    });
}

// 2. Render Function (Called on Data Change OR GPS Change)
function renderWholesalerStrip() {
    const container = document.getElementById('wsListContainer');
    const strip = document.getElementById('wholesalerStrip');

    // [FIX] Visibility Checks
    // 1. Agar switch off hai (Offline) -> Hide
    const isOnline = document.getElementById('dutySwitch')?.checked;
    // 2. Agar Active Order panel khula hai -> Hide
    const isActive = !document.getElementById('activeOrderPanel')?.classList.contains('hidden');

    if (!isOnline || isActive) {
        if(strip) strip.classList.add('hidden');
        return;
    }

    // Data Check
    if(!container || !wholesalerSnapshot || !wholesalerSnapshot.exists()) {
        if(strip) strip.classList.add('hidden');
        return;
    }

    container.innerHTML = '';
    const myLoc = getLocation();
    let count = 0;

    // Convert Snapshot to Array for Sorting (Optional but good)
    const shops = [];
    wholesalerSnapshot.forEach(child => {
        shops.push({ ...child.val() });
    });

    // Sort by distance (Najdeek pehle)
    shops.sort((a, b) => {
        const da = myLoc.lat && a.location ? getDistance(myLoc.lat, myLoc.lng, a.location.lat, a.location.lng) : 9999;
        const db = myLoc.lat && b.location ? getDistance(myLoc.lat, myLoc.lng, b.location.lat, b.location.lng) : 9999;
        return da - db;
    });

    shops.forEach(ws => {
        let distTag = '';

        // Calculate Distance
        if(myLoc.lat && ws.location) {
            const d = getDistance(myLoc.lat, myLoc.lng, ws.location.lat, ws.location.lng);
            distTag = `<span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">${d} KM</span>`;
        }

        const card = `
        <div class="snap-start shrink-0 w-64 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col relative">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-gray-800 text-sm truncate w-40">${ws.shopName}</h4>
                ${distTag}
            </div>
            <p class="text-[10px] text-gray-500 truncate mb-3"><i class="fa-solid fa-location-dot mr-1"></i>${ws.address}</p>
            <div class="flex gap-2 mt-auto">
                <a href="tel:${ws.ownerMobile}" class="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"><i class="fa-solid fa-phone text-xs"></i></a>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${ws.location.lat},${ws.location.lng}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><i class="fa-solid fa-location-arrow text-xs"></i></a>
                <button class="flex-1 bg-gray-100 text-gray-700 text-[10px] font-bold py-1.5 rounded-lg border border-gray-200 hover:bg-gray-200" onclick="alert('Shop: ${ws.shopName}\\nMobile: ${ws.ownerMobile}\\nAddress: ${ws.address}')">View</button>
            </div>
        </div>`;

        container.insertAdjacentHTML('beforeend', card);
        count++;
    });

    if(count > 0 && strip) strip.classList.remove('hidden');
    else if (strip) strip.classList.add('hidden');
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

    // Vehicle Change
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
    const sb = document.getElementById('sidebar');
    const ol = document.getElementById('menuOverlay');
    if(sb) sb.classList.remove('open');
    if(ol) ol.classList.remove('open');
}

async function loadAuth() {
    viewDash.classList.add('hidden');
    viewAuth.classList.remove('hidden');
    try {
        const module = await import('./auth/auth.controller.js');
        if (module.initAuth) module.initAuth();
    } catch (e) { console.error(e); }
}
