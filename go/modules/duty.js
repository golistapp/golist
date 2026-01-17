// ==========================================
// MODULE: Duty & GPS Manager
// ==========================================

import { db } from './firebase-config.js';
import { getDistance } from './helpers.js';
import { showToast } from './ui.js';
import * as Orders from './orders.js'; // Orders refresh karne ke liye jab location badle

// STATE VARIABLES
let watchId = null;
let heartbeatInterval = null;
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
        // UI Updates
        if(statusText) { statusText.innerText = "ONLINE"; statusText.classList.add('text-green-600'); }
        if(switchEl) switchEl.checked = true;

        document.getElementById('offlineState').classList.add('hidden');
        document.getElementById('statsSection').classList.remove('hidden');
        document.getElementById('radiusControl').classList.remove('hidden');

        // Logic Start
        const userMobile = window.Ramazone.user.mobile;
        db.ref('deliveryBoys/' + userMobile + '/status').onDisconnect().set('offline');

        startGPS();
        startHeartbeat();
        Orders.listenOrders(); // Orders scan shuru karo

    } else {
        // UI Updates
        if(statusText) { statusText.innerText = "OFFLINE"; statusText.classList.remove('text-green-600'); }
        if(switchEl) switchEl.checked = false;

        document.getElementById('offlineState').classList.remove('hidden');
        document.getElementById('noOrdersState').classList.add('hidden');
        document.getElementById('ordersContainer').classList.add('hidden');
        document.getElementById('statsSection').classList.add('hidden');
        document.getElementById('radiusControl').classList.add('hidden');
        document.getElementById('wholesalerStrip').classList.add('hidden');

        // Logic Stop
        stopGPS();
        stopHeartbeat();

        const userMobile = window.Ramazone.user.mobile;
        db.ref('deliveryBoys/' + userMobile + '/status').set('offline');
        db.ref('deliveryBoys/' + userMobile + '/status').onDisconnect().cancel();

        // Orders listener band karo taaki memory leak na ho
        db.ref('orders').off();
    }
}

// 2. GPS LOGIC (With Bandwidth Saver)
function startGPS() {
    if ("geolocation" in navigator) {
        // Force Online Status
        db.ref('deliveryBoys/' + window.Ramazone.user.mobile).update({ status: 'online' });

        watchId = navigator.geolocation.watchPosition(
            position => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;

                // Update Local State (Always Live)
                window.Ramazone.location = { lat: newLat, lng: newLng };

                // UI Update
                const locStatus = document.getElementById('locStatus');
                if(locStatus) locStatus.innerText = "GPS Live";

                // --- SMART UPDATE (Server) ---
                const distMoved = parseFloat(getDistance(lastSentLat, lastSentLng, newLat, newLng));

                // Sirf tab update karein jab 30m se jyada move kiya ho ya pehli baar ho
                if (distMoved >= GPS_UPDATE_THRESHOLD_KM || (lastSentLat === 0 && lastSentLng === 0)) {
                    db.ref('deliveryBoys/' + window.Ramazone.user.mobile).update({
                        status: 'online',
                        location: { lat: newLat, lng: newLng },
                        lastUpdated: firebase.database.ServerValue.TIMESTAMP
                    });
                    lastSentLat = newLat;
                    lastSentLng = newLng;
                }

                // Trigger Local Updates (Map, Orders Distance)
                if (window.Ramazone.activeOrder) {
                    // Update Active Order Distance UI
                    // Note: Active order ka specific distance update logic UI module ya Orders module mein hoga
                    // Hum yahan se event trigger kar sakte hain ya direct call
                    const distEl = document.getElementById('actDist');
                    if(distEl && window.Ramazone.activeOrder.location) {
                        const d = getDistance(newLat, newLng, window.Ramazone.activeOrder.location.lat, window.Ramazone.activeOrder.location.lng);
                        distEl.innerText = d + " KM";
                    }
                }

                // Refresh Orders List (taaki distance sort ho sake)
                // Thoda delay dete hain taaki har second refresh na ho
                if(!window.Ramazone.activeOrder) {
                    Orders.listenOrders();
                }
            },
            error => {
                console.warn("GPS Error:", error);
                const locStatus = document.getElementById('locStatus');
                if(locStatus) locStatus.innerText = "GPS Weak";
                showToast("Check GPS Settings");
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );
    }
}

function stopGPS() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
}

// 3. HEARTBEAT (Ping Server Every Minute)
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

    // Increment Online Minutes
    db.ref('deliveryBoys/' + userMobile + '/onlineMinutes').transaction(m => (m || 0) + 1);

    // Earnings bhi refresh kar lete hain
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
    pingServer(); // Immediate ping
    heartbeatInterval = setInterval(pingServer, 60000); // Every 60s
}

function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
}