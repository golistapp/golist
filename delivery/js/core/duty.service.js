// ==========================================
// DUTY STATUS MANAGER (AUTO-ONLINE)
// ==========================================

import { db } from '../config.js';
import { getUser, setDutyStatus, getDutyStatus, getLocation } from './state.js';
import { showToast } from '../utils.js';
import { startGPS, stopGPS } from './gps.service.js';

export function initDutyModule() {
    console.log("Initializing Duty Module...");
    const btn = document.getElementById('dutySwitch');
    const statusText = document.getElementById('dutyStatusText');

    if (btn) {
        // 1. FORCE ONLINE ON STARTUP (User Request)
        // Login ke baad humesha Online start hoga
        btn.checked = true;
        toggleDuty(true); // Force True

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
    const offlineState = document.getElementById('offlineState');
    const noOrdersState = document.getElementById('noOrdersState');

    // Update Local State
    setDutyStatus(isOnline);

    if (isOnline) {
        // --- GOING ONLINE ---
        if(statusText) {
            statusText.innerText = "ONLINE";
            statusText.classList.replace('text-gray-500', 'text-green-600');
        }

        // Sync Switch UI (in case called programmatically)
        if(btn && !btn.checked) btn.checked = true;

        // UI Updates
        if(offlineState) offlineState.classList.add('hidden');
        if(noOrdersState) noOrdersState.classList.remove('hidden');

        // Start Services
        startGPS();

        // Firebase Update
        if (user) {
            const loc = getLocation();
            db.ref('deliveryBoys/' + user.mobile).update({
                status: 'online',
                location: loc // Ensure location is sent immediately
            });
        }
        showToast("You are now ONLINE");

    } else {
        // --- GOING OFFLINE ---
        if(statusText) {
            statusText.innerText = "OFFLINE";
            statusText.classList.replace('text-green-600', 'text-gray-500');
        }

        // Sync Switch UI
        if(btn && btn.checked) btn.checked = false;

        // UI Updates
        if(offlineState) offlineState.classList.remove('hidden');
        if(noOrdersState) noOrdersState.classList.add('hidden');

        // Stop Services
        stopGPS();

        // Firebase Update
        if (user) {
            db.ref('deliveryBoys/' + user.mobile).update({
                status: 'offline'
            });
        }
        showToast("You are now OFFLINE");
    }
}