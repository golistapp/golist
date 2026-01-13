// ==========================================
// CENTRAL STATE MANAGEMENT
// ==========================================

const STATE_KEY = 'ramazone_partner_session';

// Global State Variables
let currentUser = null;
let currentLocation = { lat: 0, lng: 0, lastSentLat: 0, lastSentLng: 0 };
let currentActiveOrder = null;
let isDutyOn = false;
let serviceRadius = 5; // DEFAULT: 5 KM

// ============================
// SESSION MANAGEMENT
// ============================

export function initSession() {
    try {
        const stored = localStorage.getItem(STATE_KEY);
        if (stored) {
            currentUser = JSON.parse(stored);
            return true;
        }
    } catch (e) {
        console.error("Session Load Error", e);
    }
    return false;
}

export function saveSession(user) {
    currentUser = user;
    localStorage.setItem(STATE_KEY, JSON.stringify(user));
}

export function clearSession() {
    currentUser = null;
    localStorage.removeItem(STATE_KEY);
}

export function getUser() {
    return currentUser;
}

// ============================
// LOCATION STATE
// ============================

export function updateLocation(lat, lng) {
    currentLocation.lat = lat;
    currentLocation.lng = lng;
}

export function updateLastSentLocation(lat, lng) {
    currentLocation.lastSentLat = lat;
    currentLocation.lastSentLng = lng;
}

export function getLocation() {
    return currentLocation;
}

// ============================
// ORDER STATE
// ============================

export function setActiveOrder(order) {
    currentActiveOrder = order;
}

export function getActiveOrder() {
    return currentActiveOrder;
}

// ============================
// DUTY STATUS
// ============================

export function setDutyStatus(status) {
    isDutyOn = status;
}

export function getDutyStatus() {
    return isDutyOn;
}

// ============================
// RADIUS STATE (NEW)
// ============================

export function setRadius(km) {
    serviceRadius = parseInt(km);
}

export function getRadius() {
    return serviceRadius;
}