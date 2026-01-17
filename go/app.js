// ==========================================
// FILE: app.js (Final Polish: Wiring & Login Fix)
// ==========================================

console.log("🚀 Initializing Ramazone Partner App...");

import { initFirebase, db } from './modules/firebase-config.js';
import * as UI from './modules/ui.js';
import * as Duty from './modules/duty.js';
import * as Orders from './modules/orders.js';
import * as Wholesaler from './modules/wholesaler.js';
import * as MapModule from './modules/map.js'; // Import Map for Button Wiring

// GLOBAL STATE
window.Ramazone = {
    user: null,
    isOnline: false,
    location: { lat: 0, lng: 0 },
    activeOrder: null,
    serviceRadius: localStorage.getItem('rmz_pref_radius') || 5,
    approvedWholesalers: []
};

// INITIALIZATION
async function initApp() {
    try {
        // A. Session Check
        const savedUser = localStorage.getItem('rmz_delivery_user');
        if (!savedUser) {
            window.location.href = 'login.html'; // FIX: Correct Page Name
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
            document.getElementById('dutySwitch').checked = true;
            Duty.toggleDuty(true);
        }

        // F. Check Active Order
        Orders.checkForActiveOrder();

        // G. Load Shops
        Wholesaler.fetchAllApprovedShops();

    } catch (error) {
        console.error("Init Failed:", error);
        UI.showToast("Error loading app data");
    }
}

// ACCOUNT CHECK
function checkAccountStatus() {
    const mobile = window.Ramazone.user.mobile;
    db.ref('deliveryBoys/' + mobile + '/status').on('value', snap => {
        if(snap.val() === 'disabled') {
            alert("Your account has been disabled by Admin.");
            Duty.toggleDuty(false);
            localStorage.removeItem('rmz_delivery_user');
            window.location.href = 'login.html'; // FIX: Correct Page Name
        }
    });
}

// EVENT LISTENERS (Traffic Police 🚦)
document.addEventListener('click', async (e) => {
    const target = e.target;

    // --- MENU & NAVIGATION ---
    if (target.closest('#menuBtn') || target.closest('#menuOverlay')) {
        UI.toggleSidebar();
    }

    if (target.closest('#navLogout')) {
        if(confirm("Logout?")) {
            Duty.toggleDuty(false);
            localStorage.removeItem('rmz_delivery_user');
            window.location.href = 'login.html'; // FIX: Correct Page Name
        }
    }

    // --- MAP ACTIONS (Using MapModule directly) ---

    // 1. RECENTER
    if (target.closest('#btnRecenterMap')) {
        MapModule.recenterMap();
    }

    // 2. REFRESH GPS
    if (target.closest('#btnRefreshMap')) {
        MapModule.refreshMapData();
    }

    // 3. TOGGLE SHOPS
    if (target.closest('#btnToggleShops')) {
        MapModule.toggleShopMarkers();
    }

    // 4. SHOW PATH (The Fix Button)
    if (target.closest('#btnShowPath')) {
        MapModule.forceRefreshRoute();
    }

    // --- HISTORY ---
    if (target.closest('#navHistory')) {
        const HistoryModule = await import('./modules/history.js');
        HistoryModule.openHistoryModal();
    }
    if (target.closest('#btnCloseHistoryModal')) {
        document.getElementById('historyModal').classList.add('hidden');
    }

    // --- WHOLESALER ---
    if (target.closest('#navWholesaler')) {
        Wholesaler.openModal();
    }
    if (target.closest('#btnCloseWsModal')) {
        document.getElementById('wholesalerModal').classList.add('hidden');
    }
    if (target.closest('#btnConnectLoc')) {
        Wholesaler.connectLocation();
    }
    if (target.closest('#btnWsSubmit')) {
        Wholesaler.submitRequest();
    }

    // --- ORDER ACTIONS ---
    if (target.id === 'actionBtn') {
        Orders.updateOrderStatus();
    }
    if (target.closest('#btnNavDir')) {
        UI.openExternalMap(window.Ramazone.activeOrder.location.lat, window.Ramazone.activeOrder.location.lng);
    }
    if (target.closest('#btnCallCust')) {
        window.open(`tel:${window.Ramazone.activeOrder.user.mobile}`);
    }
    if (target.closest('#btnOpenWA')) {
        window.open(`https://wa.me/91${window.Ramazone.activeOrder.user.mobile}`, '_blank');
    }

    if(target.closest('#sosBtn')) {
        UI.triggerSOS();
    }
});

// SLIDERS & TOGGLES
document.getElementById('dutySwitch').addEventListener('change', (e) => {
    Duty.toggleDuty(e.target.checked);
});

document.getElementById('radiusSlider').addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('radiusVal').innerText = val;
    window.Ramazone.serviceRadius = val;
    localStorage.setItem('rmz_pref_radius', val);

    if(window.Ramazone.isOnline) {
        Orders.listenOrders(); 

        // Update Map Radius Visuals
        if(document.getElementById('liveMapSection').classList.contains('hidden') === false) {
             MapModule.updateMapVisuals();
        }
    }
});

// START
window.onload = initApp;
