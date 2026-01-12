// ==========================================
// FILE: js/state.js
// (Global State Management)
// ==========================================

export const state = {
    // Current User Session (Loaded from LocalStorage or Login)
    user: null,

    // Active Order Data
    activeOrder: null,

    // GPS Tracking IDs (To stop them when going offline)
    gpsWatchId: null,
    heartbeatInterval: null,

    // Approved Wholesalers List (Cached)
    approvedWholesalers: [],

    // Current Location (Live)
    currentLat: 0,
    currentLng: 0,

    // Map Instance (To prevent re-initializing)
    mapInstance: null,
    mapLayerGroup: null,
    mapRouteControl: null
};

// Function to clear everything on Logout
export function resetState() {
    state.user = null;
    state.activeOrder = null;
    state.approvedWholesalers = [];
    state.currentLat = 0;
    state.currentLng = 0;

    // Stop GPS if running
    if (state.gpsWatchId) {
        navigator.geolocation.clearWatch(state.gpsWatchId);
        state.gpsWatchId = null;
    }

    // Stop Server Heartbeat
    if (state.heartbeatInterval) {
        clearInterval(state.heartbeatInterval);
        state.heartbeatInterval = null;
    }

    // Map cleanup is handled separately in Home Module to avoid memory leaks
    state.mapInstance = null;
    state.mapLayerGroup = null;
    state.mapRouteControl = null;

    console.log("State Reset Complete");
}