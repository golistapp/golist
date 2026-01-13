// ==========================================
// SMART GPS SERVICE
// ==========================================

import { db, GPS_UPDATE_THRESHOLD_KM } from '../config.js';
import { getUser, updateLocation, getLocation, updateLastSentLocation, getActiveOrder } from './state.js';
import { getDistance } from '../utils.js';
import { refreshOrderList } from '../orders/order-list.js'; // Will be created next

let watchId = null;

export function startGPS() {
    if ("geolocation" in navigator) {
        // Force online status immediately on start
        const user = getUser();
        if (user) {
            db.ref('deliveryBoys/' + user.mobile).update({ status: 'online' });
        }

        // Watch Position (High Accuracy)
        watchId = navigator.geolocation.watchPosition(
            handlePositionSuccess,
            handlePositionError,
            {
                enableHighAccuracy: true,
                maximumAge: 10000, // Accept cached positions up to 10s old
                timeout: 10000
            }
        );
    } else {
        console.error("Geolocation not supported");
        alert("GPS hardware not found!");
    }
}

export function stopGPS() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

// ============================
// POSITION HANDLER
// ============================

function handlePositionSuccess(pos) {
    const newLat = pos.coords.latitude;
    const newLng = pos.coords.longitude;
    const user = getUser();

    if (!user) return;

    // 1. Update Local State (Always keep this live)
    updateLocation(newLat, newLng);

    // Update UI Status
    const locStatus = document.getElementById('locStatus');
    if (locStatus) locStatus.innerText = "GPS Live";

    // 2. SMART GPS LOGIC (Bandwidth Saver)
    const locState = getLocation();

    // Calculate distance from last SENT location
    const distMoved = parseFloat(getDistance(locState.lastSentLat, locState.lastSentLng, newLat, newLng));

    // Only update Firebase if moved > 30 meters (0.03 KM) OR if it's the first update
    if (distMoved >= GPS_UPDATE_THRESHOLD_KM || (locState.lastSentLat === 0 && locState.lastSentLng === 0)) {

        db.ref('deliveryBoys/' + user.mobile).update({
            status: 'online',
            location: { lat: newLat, lng: newLng },
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });

        // Update "Last Sent" coordinates to current
        updateLastSentLocation(newLat, newLng);
    }

    // 3. TRIGGER LIVE UI UPDATES
    triggerLiveUpdates(newLat, newLng);
}

function handlePositionError(err) {
    const locStatus = document.getElementById('locStatus');
    if (locStatus) locStatus.innerText = "GPS Weak";
    console.warn("GPS Error:", err.message);
}

// ============================
// LIVE UI UPDATER
// ============================

function triggerLiveUpdates(lat, lng) {
    // A. Update Active Order Distance
    const activeOrder = getActiveOrder();
    if (activeOrder && activeOrder.location) {
        const d = getDistance(lat, lng, activeOrder.location.lat, activeOrder.location.lng);

        // Update Order Panel UI
        const distEl = document.getElementById('actDist');
        if (distEl) distEl.innerText = d + " KM";

        // Update Dashboard Widget (Fallback if Map Routing is loading)
        const liveDistBox = document.getElementById('liveDistBox');
        if (liveDistBox) liveDistBox.innerText = d + " KM";
    }

    // B. Update Map Visuals (Only if Map Module is Loaded & Open)
    if (window.mapManager && window.isMapOpen) {
        // Move Rider Marker
        window.mapManager.updateMapVisuals();

        // Update Wholesaler Carousel based on new location
        if (window.mapManager.renderActiveWholesalerWidget) {
            window.mapManager.renderActiveWholesalerWidget();
        }
    }

    // C. Re-sort Available Orders (Nearest first)
    // Yeh function hum 'orders/order-list.js' mein banayenge
    if (typeof refreshOrderList === 'function') {
        refreshOrderList();
    }
}