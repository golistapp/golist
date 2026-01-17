// ==========================================
// FILE: app.js (Final Version with Settings)
// ==========================================

console.log("🚀 Initializing Ramazone Partner App...");

import { initFirebase, db } from './modules/firebase-config.js';
import * as UI from './modules/ui.js';
import * as Duty from './modules/duty.js';
import * as Orders from './modules/orders.js';
import * as Wholesaler from './modules/wholesaler.js';
import * as MapModule from './modules/map.js'; 
import * as Settings from './modules/settings.js'; // NEW: Settings Module Import

// GLOBAL STATE
window.Ramazone = {
    user: null,
    isOnline: false,
    location: { lat: 0, lng: 0 },
    activeOrder: null,
    serviceRadius: localStorage.getItem('rmz_pref_radius') || 5,
    approvedWholesalers: []
};

// ==========================================
// 1. EVENT LISTENERS (Traffic Police 🚦)
// ==========================================
document.addEventListener('click', async (e) => {
    const target = e.target;

    // --- MENU & NAVIGATION ---
    if (target.closest('#menuBtn') || target.closest('#menuOverlay')) {
        UI.toggleSidebar();
    }

    // LOGOUT (Emergency Exit)
    if (target.closest('#navLogout')) {
        if(confirm("Logout?")) {
            Duty.toggleDuty(false);
            localStorage.removeItem('rmz_delivery_user');
            window.location.href = 'login.html'; 
        }
    }

    // --- NEW: SETTINGS (PIN & VEHICLE) ---
    if (target.closest('#navChangePin')) Settings.openPinModal();
    if (target.closest('#navVehicle')) Settings.openVehicleModal();
    if (target.closest('#btnSavePin')) Settings.saveNewPin();
    if (target.closest('#btnSaveVehicle')) Settings.saveVehicleInfo();

    // --- MAP ACTIONS ---
    if (target.closest('#btnRecenterMap')) MapModule.recenterMap();
    if (target.closest('#btnRefreshMap')) MapModule.refreshMapData();
    if (target.closest('#btnToggleShops')) MapModule.toggleShopMarkers();
    if (target.closest('#btnShowPath')) MapModule.forceRefreshRoute();

    // --- HISTORY ---
    if (target.closest('#navHistory')) {
        const HistoryModule = await import('./modules/history.js');
        HistoryModule.openHistoryModal();
    }
    if (target.closest('#btnCloseHistoryModal')) {
        document.getElementById('historyModal').classList.add('hidden');
    }

    // --- WHOLESALER ---
    if (target.closest('#navWholesaler')) Wholesaler.openModal();
    if (target.closest('#btnCloseWsModal')) document.getElementById('wholesalerModal').classList.add('hidden');
    if (target.closest('#btnConnectLoc')) Wholesaler.connectLocation();
    if (target.closest('#btnWsSubmit')) Wholesaler.submitRequest();

    // --- ORDER ACTIONS ---
    if (target.id === 'actionBtn') Orders.updateOrderStatus();

    // Active Order Buttons
    if(window.Ramazone.activeOrder) {
        if (target.closest('#btnNavDir')) {
            UI.openExternalMap(window.Ramazone.activeOrder.location.lat, window.Ramazone.activeOrder.location.lng);
        }
        if (target.closest('#btnCallCust')) {
            window.open(`tel:${window.Ramazone.activeOrder.user.mobile}`);
        }
        if (target.closest('#btnOpenWA')) {
            window.open(`https://wa.me/91${window.Ramazone.activeOrder.user.mobile}`, '_blank');
        }
    }

    if(target.closest('#sosBtn')) UI.triggerSOS();
});

// SLIDERS & TOGGLES
const dutySwitch = document.getElementById('dutySwitch');
if(dutySwitch) {
    dutySwitch.addEventListener('change', (e) => {
        Duty.toggleDuty(e.target.checked);
    });
}

const radiusSlider = document.getElementById('radiusSlider');
if(radiusSlider) {
    radiusSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('radiusVal').innerText = val;
        window.Ramazone.serviceRadius = val;
        localStorage.setItem('rmz_pref_radius', val);

        if(window.Ramazone.isOnline) {
            Orders.listenOrders(); 
            if(document.getElementById('liveMapSection') && !document.getElementById('liveMapSection').classList.contains('hidden')) {
                 MapModule.updateMapVisuals();
            }
        }
    });
}

// ==========================================
// 2. INITIALIZATION (Engine Start)
// ==========================================
async function initApp() {
    try {
        console.log("Checking session...");

        // A. Session Check
        const savedUser = localStorage.getItem('rmz_delivery_user');
        if (!savedUser) {
            window.location.href = 'login.html';
            return;
        }
        window.Ramazone.user = JSON.parse(savedUser);

        // B. Firebase Start
        initFirebase();

        // C. UI Setup
        UI.renderHeader(window.Ramazone.user);

        // D. Check Account Status
        checkAccountStatus();

        // E. Restore Duty
        const savedDuty = localStorage.getItem('rmz_duty_on') === 'true';
        if(savedDuty) {
            if(dutySwitch) dutySwitch.checked = true;
            Duty.toggleDuty(true);
        }

        // F. Check Active Order
        Orders.checkForActiveOrder();

        // G. Load Shops
        Wholesaler.fetchAllApprovedShops();

    } catch (error) {
        console.error("CRITICAL ERROR IN INIT:", error);
        // alert("App Error: " + error.message + ". Please refresh.");
    }
}

// ACCOUNT CHECK
function checkAccountStatus() {
    if(!window.Ramazone.user) return;
    const mobile = window.Ramazone.user.mobile;
    db.ref('deliveryBoys/' + mobile + '/status').on('value', snap => {
        if(snap.val() === 'disabled') {
            alert("Your account has been disabled by Admin.");
            Duty.toggleDuty(false);
            localStorage.removeItem('rmz_delivery_user');
            window.location.href = 'login.html';
        }
    });
}

// START
window.onload = initApp;