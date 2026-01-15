// ==========================================
// DUTY STATUS MANAGER (FINAL FIX - ORDERS CONNECTED)
// ==========================================

import { db } from '../config.js';
import { getUser, setDutyStatus, getLocation } from './state.js';
import { showToast } from '../utils.js';
import { startGPS, stopGPS } from './gps.service.js';
// [NEW IMPORT] Order Listener ko import kiya
import { startListeningOrders, stopListeningOrders } from '../orders/order-list.js';

export function initDutyModule() {
    console.log("Initializing Duty Module...");
    const btn = document.getElementById('dutySwitch');

    if (btn) {
        // 1. FORCE ONLINE ON STARTUP
        btn.checked = true;
        toggleDuty(true); 

        // 2. Setup Manual Toggle Listener
        btn.onchange = (e) => {
            toggleDuty(e.target.checked);
        };
    }
}

export function toggleDuty(isOnline) {
    const user = getUser();
    const btn = document.getElementById('dutySwitch');
    const statusText = document.getElementById('dutyStatusText');

    // UI Elements
    const offlineState = document.getElementById('offlineState');
    const noOrdersState = document.getElementById('noOrdersState');
    const statsSection = document.getElementById('statsSection');
    const radiusControl = document.getElementById('radiusControl');
    const wholesalerStrip = document.getElementById('wholesalerStrip');
    const ordersContainer = document.getElementById('ordersContainer');

    // Update Local State
    setDutyStatus(isOnline);
    window.isOnline = isOnline;

    if (isOnline) {
        // --- GOING ONLINE ---
        if(statusText) {
            statusText.innerText = "ONLINE";
            statusText.classList.replace('text-gray-500', 'text-green-600');
        }

        if(btn && !btn.checked) btn.checked = true;

        // UI Updates: SHOW Dashboard
        if(offlineState) offlineState.classList.add('hidden');
        if(noOrdersState) noOrdersState.classList.remove('hidden'); // Default scanning state

        if(statsSection) statsSection.classList.remove('hidden');
        if(radiusControl) radiusControl.classList.remove('hidden');
        // wholesalerStrip router.js handle karega, par yahan remove 'hidden' safe hai
        if(wholesalerStrip && !document.getElementById('activeOrderPanel').classList.contains('hidden') === false) {
             // Sirf tab dikhao agar active order nahi hai (router.js logic is stronger, but simple fallback here)
        }

        // 1. Start GPS
        startGPS();

        // 2. [CRITICAL FIX] Start Order Listening
        startListeningOrders();

        // Firebase Update
        if (user) {
            const loc = getLocation();
            db.ref('deliveryBoys/' + user.mobile).update({
                status: 'online',
                location: loc 
            });
            db.ref('deliveryBoys/' + user.mobile + '/status').onDisconnect().set('offline');
        }
        showToast("You are now ONLINE");

    } else {
        // --- GOING OFFLINE ---
        if(statusText) {
            statusText.innerText = "OFFLINE";
            statusText.classList.replace('text-green-600', 'text-gray-500');
        }

        if(btn && btn.checked) btn.checked = false;

        // UI Updates: HIDE Dashboard
        if(offlineState) offlineState.classList.remove('hidden');
        if(noOrdersState) noOrdersState.classList.add('hidden');

        if(statsSection) statsSection.classList.add('hidden');
        if(radiusControl) radiusControl.classList.add('hidden');
        if(wholesalerStrip) wholesalerStrip.classList.add('hidden');
        if(ordersContainer) ordersContainer.classList.add('hidden');

        // 1. Stop GPS
        stopGPS();

        // 2. [CRITICAL FIX] Stop Order Listening
        stopListeningOrders();

        // Firebase Update
        if (user) {
            db.ref('deliveryBoys/' + user.mobile).update({
                status: 'offline'
            });
            db.ref('deliveryBoys/' + user.mobile + '/status').onDisconnect().cancel();
        }
        showToast("You are now OFFLINE");
    }
}
