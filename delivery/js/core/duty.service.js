// ==========================================
// DUTY STATUS & HEARTBEAT MANAGER
// ==========================================

import { db, HEARTBEAT_INTERVAL_MS } from '../config.js';
import { getUser, getDutyStatus, setDutyStatus } from './state.js';
import { startGPS, stopGPS } from './gps.service.js';
import { showToast, toggleClass } from '../utils.js';
import { startListeningOrders, stopListeningOrders } from '../orders/order-list.js';

let heartbeatInterval = null;

export async function initDutyModule() {
    console.log("Initializing Duty Module...");

    const switchEl = document.getElementById('dutySwitch');
    const savedStatus = getDutyStatus();

    // Restore UI state
    if (switchEl) {
        switchEl.checked = savedStatus;
        switchEl.addEventListener('change', () => toggleDuty(switchEl.checked));
    }

    // If was online, re-trigger online logic
    if (savedStatus) {
        await goOnline();
    }
}

export async function toggleDuty(isOnline) {
    setDutyStatus(isOnline);
    if (isOnline) {
        await goOnline();
    } else {
        goOffline();
    }
}

async function goOnline() {
    const user = getUser();
    if (!user) return;

    // 1. UI Updates
    updateUI(true);
    showToast("You are now ONLINE");

    // 2. Firebase Presence (Disconnect Hook)
    const statusRef = db.ref(`deliveryBoys/${user.mobile}/status`);
    statusRef.onDisconnect().set('offline');
    statusRef.set('online');

    // 3. Start Core Services
    startGPS(); // Start Tracking
    startHeartbeat(); // Start Pinging Server
    startListeningOrders(); // Start Fetching Orders

    // 4. LAZY LOAD MAP (Heavy Feature)
    // Map code is only loaded when user actually goes online
    if (!window.mapManager) {
        try {
            console.log("Lazy Loading Map Manager...");
            const module = await import('../features/map.manager.js');
            window.mapManager = module;
            // Initialize map if the container is visible (Active Order)
            // or just prepare it.
        } catch (e) {
            console.error("Failed to load Map Module", e);
        }
    }
}

function goOffline() {
    const user = getUser();
    if (!user) return;

    // 1. UI Updates
    updateUI(false);
    showToast("You are now OFFLINE");

    // 2. Stop Services
    stopGPS();
    stopHeartbeat();
    stopListeningOrders();

    // 3. Firebase Update
    const statusRef = db.ref(`deliveryBoys/${user.mobile}/status`);
    statusRef.set('offline');
    statusRef.onDisconnect().cancel();
}

function updateUI(isOnline) {
    const statusText = document.getElementById('dutyStatusText');
    const offlineState = document.getElementById('offlineState');
    const noOrdersState = document.getElementById('noOrdersState');
    const ordersContainer = document.getElementById('ordersContainer');
    const statsSection = document.getElementById('statsSection');
    const radiusControl = document.getElementById('radiusControl');
    const wholesalerStrip = document.getElementById('wholesalerStrip');

    if (isOnline) {
        if (statusText) { statusText.innerText = "ONLINE"; statusText.classList.add('text-green-600'); }
        if (offlineState) offlineState.classList.add('hidden');
        if (statsSection) statsSection.classList.remove('hidden');
        if (radiusControl) radiusControl.classList.remove('hidden');
        // Note: noOrdersState and ordersContainer visibility is handled by order-list.js based on count

        // Trigger Wholesaler Refresh (Legacy Helper)
        if(window.updateWholesalerDisplay) window.updateWholesalerDisplay();
    } else {
        if (statusText) { statusText.innerText = "OFFLINE"; statusText.classList.remove('text-green-600'); }
        if (offlineState) offlineState.classList.remove('hidden');
        if (noOrdersState) noOrdersState.classList.add('hidden');
        if (ordersContainer) ordersContainer.classList.add('hidden');
        if (statsSection) statsSection.classList.add('hidden');
        if (radiusControl) radiusControl.classList.add('hidden');
        if (wholesalerStrip) wholesalerStrip.classList.add('hidden');
    }
}

// ============================
// SERVER HEARTBEAT (Ping)
// ============================

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    pingServer(); // Immediate ping
    heartbeatInterval = setInterval(pingServer, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
}

async function pingServer() {
    const user = getUser();
    if (!user) return;

    let batteryLevel = 'Unknown';
    try {
        if (navigator.getBattery) {
            const battery = await navigator.getBattery();
            batteryLevel = Math.round(battery.level * 100) + '%';
        }
    } catch (e) { /* Ignore battery API errors */ }

    const updates = {
        lastHeartbeat: firebase.database.ServerValue.TIMESTAMP,
        status: 'online',
        battery: batteryLevel
    };

    // Update Heartbeat
    db.ref(`deliveryBoys/${user.mobile}`).update(updates);

    // Track Online Minutes (Atomic Increment)
    db.ref(`deliveryBoys/${user.mobile}/onlineMinutes`).transaction(m => (m || 0) + 1);
}