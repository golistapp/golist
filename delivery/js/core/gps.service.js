// ==========================================
// SMART GPS SERVICE (UPDATED WITH TRIGGERS)
// ==========================================

import { db, GPS_UPDATE_THRESHOLD_KM } from '../config.js';
import { getUser, updateLocation, getLocation, updateLastSentLocation, getActiveOrder } from './state.js';
import { getDistance } from '../utils.js';
import { refreshOrderList } from '../orders/order-list.js'; 

let watchId = null;

export function startGPS() {
    if ("geolocation" in navigator) {
        const user = getUser();
        if (user) {
            db.ref('deliveryBoys/' + user.mobile).update({ status: 'online' });
        }

        watchId = navigator.geolocation.watchPosition(
            handlePositionSuccess,
            handlePositionError,
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );
    } else {
        alert("GPS hardware not found!");
    }
}

export function stopGPS() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

function handlePositionSuccess(pos) {
    const newLat = pos.coords.latitude;
    const newLng = pos.coords.longitude;
    const user = getUser();

    if (!user) return;

    // 1. Update Local State
    updateLocation(newLat, newLng);

    // Update UI Status
    const locStatus = document.getElementById('locStatus');
    if (locStatus) {
        locStatus.innerText = "GPS Live";
        locStatus.className = "text-green-600 font-bold text-xs";
    }

    // 2. Smart Server Update (Bandwidth Saver)
    const locState = getLocation();
    const distMoved = parseFloat(getDistance(locState.lastSentLat, locState.lastSentLng, newLat, newLng));

    if (distMoved >= GPS_UPDATE_THRESHOLD_KM || (locState.lastSentLat === 0 && locState.lastSentLng === 0)) {
        db.ref('deliveryBoys/' + user.mobile).update({
            status: 'online',
            location: { lat: newLat, lng: newLng },
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });
        updateLastSentLocation(newLat, newLng);
    }

    // 3. TRIGGER LIVE UPDATES (CRITICAL FIX)
    triggerLiveUpdates(newLat, newLng);
}

function handlePositionError(err) {
    const locStatus = document.getElementById('locStatus');
    if (locStatus) {
        locStatus.innerText = "GPS Weak";
        locStatus.className = "text-red-500 font-bold text-xs";
    }
    console.warn("GPS Error:", err.message);
}

function triggerLiveUpdates(lat, lng) {
    // A. Refresh Order List (Orders dikhane ke liye)
    if (typeof refreshOrderList === 'function') {
        refreshOrderList();
    }

    // B. Trigger Global Event (Router/Wholesaler update ke liye)
    window.dispatchEvent(new Event('location-updated'));

    // C. Update Active Order Distance
    const activeOrder = getActiveOrder();
    if (activeOrder && activeOrder.location) {
        const d = getDistance(lat, lng, activeOrder.location.lat, activeOrder.location.lng);
        const distEl = document.getElementById('actDist');
        if (distEl) distEl.innerText = d + " KM";

        const liveDistBox = document.getElementById('liveDistBox');
        if (liveDistBox) liveDistBox.innerText = d + " KM";
    }

    // D. Update Map Visuals
    if (window.mapManager && window.isMapOpen) {
        window.mapManager.updateMapVisuals();
        if (window.mapManager.renderActiveWholesalerWidget) {
            window.mapManager.renderActiveWholesalerWidget();
        }
    }
}