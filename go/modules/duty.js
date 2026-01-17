// ==========================================
// MODULE: Duty & GPS Manager (Updated for Widget Refresh)
// ==========================================

import { db } from './firebase-config.js';
import { getDistance } from './helpers.js';
import { showToast } from './ui.js';
import * as Orders from './orders.js';

// STATE VARIABLES
let watchId = null;
let heartbeatInterval = null;
let burstModeTimer = null;
let isBurstMode = false;

let lastSentLat = 0;
let lastSentLng = 0;
const GPS_UPDATE_THRESHOLD_KM = 0.03; // 30 Meters

// 1. MAIN TOGGLE FUNCTION
export function toggleDuty(isOnline) {
    window.Ramazone.isOnline = isOnline;
    localStorage.setItem('rmz_duty_on', isOnline);

    const statusText = document.getElementById('dutyStatusText');
    const switchEl = document.getElementById('dutySwitch');

    if (isOnline) {
        if(statusText) { statusText.innerText = "ONLINE"; statusText.classList.add('text-green-600'); }
        if(switchEl) switchEl.checked = true;

        document.getElementById('offlineState').classList.add('hidden');
        document.getElementById('statsSection').classList.remove('hidden');
        document.getElementById('radiusControl').classList.remove('hidden');

        const userMobile = window.Ramazone.user.mobile;
        db.ref('deliveryBoys/' + userMobile + '/status').onDisconnect().set('offline');

        // BURST MODE
        isBurstMode = true;
        showToast("High Performance GPS Active (100s)");
        if(burstModeTimer) clearTimeout(burstModeTimer);
        burstModeTimer = setTimeout(() => {
            isBurstMode = false;
        }, 100000); 

        startGPS();
        startHeartbeat();
        Orders.listenOrders(); 

    } else {
        if(statusText) { statusText.innerText = "OFFLINE"; statusText.classList.remove('text-green-600'); }
        if(switchEl) switchEl.checked = false;

        document.getElementById('offlineState').classList.remove('hidden');
        document.getElementById('noOrdersState').classList.add('hidden');
        document.getElementById('ordersContainer').classList.add('hidden');
        document.getElementById('statsSection').classList.add('hidden');
        document.getElementById('radiusControl').classList.add('hidden');
        document.getElementById('wholesalerStrip').classList.add('hidden');

        stopGPS();
        stopHeartbeat();
        if(burstModeTimer) clearTimeout(burstModeTimer);
        isBurstMode = false;

        const userMobile = window.Ramazone.user.mobile;
        db.ref('deliveryBoys/' + userMobile + '/status').set('offline');
        db.ref('deliveryBoys/' + userMobile + '/status').onDisconnect().cancel();
        db.ref('orders').off();
    }
}

// 2. GPS LOGIC (Fixed to Refresh Widget)
function startGPS() {
    if ("geolocation" in navigator) {
        db.ref('deliveryBoys/' + window.Ramazone.user.mobile).update({ status: 'online' });

        watchId = navigator.geolocation.watchPosition(
            position => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;

                // Update Local State
                window.Ramazone.location = { lat: newLat, lng: newLng };

                const locStatus = document.getElementById('locStatus');
                if(locStatus) locStatus.innerText = "GPS Live";

                // Server Update Logic
                const distMoved = parseFloat(getDistance(lastSentLat, lastSentLng, newLat, newLng));

                if (isBurstMode || distMoved >= GPS_UPDATE_THRESHOLD_KM || (lastSentLat === 0 && lastSentLng === 0)) {
                    db.ref('deliveryBoys/' + window.Ramazone.user.mobile).update({
                        status: 'online',
                        location: { lat: newLat, lng: newLng },
                        lastUpdated: firebase.database.ServerValue.TIMESTAMP
                    });
                    lastSentLat = newLat;
                    lastSentLng = newLng;
                }

                // --- FIX: Refresh Map & Box on Every Move ---
                if (window.Ramazone.activeOrder) {
                    const distEl = document.getElementById('actDist');
                    if(distEl && window.Ramazone.activeOrder.location) {
                        const d = getDistance(newLat, newLng, window.Ramazone.activeOrder.location.lat, window.Ramazone.activeOrder.location.lng);
                        distEl.innerText = d + " KM";
                    }

                    // Check if Map is visible, then update Visuals & Box
                    const mapSec = document.getElementById('liveMapSection');
                    if(mapSec && !mapSec.classList.contains('hidden')) {
                        // Dynamic import to avoid circular dependency
                        import('./map.js').then(m => {
                            m.updateMapVisuals(); // Update Rider Marker
                            m.renderActiveWholesalerWidget(); // FIX: Update Bottom Box List
                        });
                    }
                }

                if(!window.Ramazone.activeOrder) {
                    Orders.listenOrders();
                }
            },
            error => {
                const locStatus = document.getElementById('locStatus');
                if(locStatus) locStatus.innerText = "GPS Weak";
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    }
}

function stopGPS() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
}

// 3. HEARTBEAT
async function pingServer() {
    if (!window.Ramazone.isOnline) return;
    let batteryLevel = 'Unknown';
    try {
        if (navigator.getBattery) {
            const battery = await navigator.getBattery();
            batteryLevel = Math.round(battery.level * 100) + '%';
        }
    } catch (e) { console.log(e); }

    const updates = {
        lastHeartbeat: firebase.database.ServerValue.TIMESTAMP,
        status: 'online',
        battery: batteryLevel
    };

    const userMobile = window.Ramazone.user.mobile;
    db.ref('deliveryBoys/' + userMobile).update(updates);
    db.ref('deliveryBoys/' + userMobile + '/onlineMinutes').transaction(m => (m || 0) + 1);

    db.ref('deliveryBoys/'+ userMobile).once('value', s => {
        const d = s.val();
        if(d) {
            if(document.getElementById('earnings')) document.getElementById('earnings').innerText = d.earnings || 0;
            if(document.getElementById('trips')) document.getElementById('trips').innerText = d.trips || 0;
        }
    });
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    pingServer(); 
    heartbeatInterval = setInterval(pingServer, 60000); 
}

function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
}