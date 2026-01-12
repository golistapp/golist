// ==========================================
// FILE: js/utils.js
// (Shared Helper Functions & Map Logic)
// ==========================================

import { state } from './state.js';

// --- 1. UI HELPERS ---

export function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    document.getElementById('toastMsg').innerText = msg;
    t.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => t.classList.add('opacity-0', 'pointer-events-none'), 2500);
}

export function toggleMenu() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('menuOverlay');
    if (sb) sb.classList.toggle('open');
    if (ov) ov.classList.toggle('open');
}

export function triggerCelebration() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    const overlay = document.getElementById('celebrationOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 3000);
    }
}

// --- 2. DATA CALCULATION ---

export function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371; // Earth Radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

export function calculateOrderWeight(cart) {
    if (!cart || !Array.isArray(cart)) return 0;
    let totalKg = 0;
    cart.forEach(item => {
        if (item.qty === 'Special Request') return;
        let txt = item.qty.toLowerCase().replace(/\s/g, '');
        let weight = 0;
        let mul = item.count || 1;
        let match;

        // Regex logic from original file
        if (match = txt.match(/(\d+(\.\d+)?)kg/)) weight = parseFloat(match[1]);
        else if ((match = txt.match(/(\d+)g/)) || (match = txt.match(/(\d+)gm/))) weight = parseFloat(match[1]) / 1000;
        else if ((match = txt.match(/(\d+(\.\d+)?)l/)) || (match = txt.match(/(\d+(\.\d+)?)ltr/))) weight = parseFloat(match[1]);
        else if (match = txt.match(/(\d+)ml/)) weight = parseFloat(match[1]) / 1000;

        totalKg += (weight * mul);
    });
    return totalKg.toFixed(2);
}

// --- 3. MAP LOGIC (Uses global state) ---

export function initDeliveryMap(lat, lng) {
    // If map already exists, just recenter it
    if (state.mapInstance) {
        state.mapInstance.invalidateSize();
        state.mapInstance.setView([lat, lng], 14);
        return;
    }

    // Initialize Leaflet Map
    const map = L.map('deliveryMap', {
        zoomControl: true,
        attributionControl: false
    }).setView([lat, lng], 14);

    // Light Theme Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Save to State
    state.mapInstance = map;
    state.mapLayerGroup = L.layerGroup().addTo(map);

    const loader = document.getElementById('mapLoader');
    if(loader) loader.classList.add('hidden');
}

export function drawRoute(startLat, startLng, endLat, endLng) {
    if (!state.mapInstance) return;

    // Clear old route
    if (state.mapRouteControl) {
        try { state.mapInstance.removeControl(state.mapRouteControl); } catch (e) {}
        state.mapRouteControl = null;
    }

    // Create new route
    state.mapRouteControl = L.Routing.control({
        waypoints: [
            L.latLng(startLat, startLng),
            L.latLng(endLat, endLng)
        ],
        lineOptions: {
            styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }]
        },
        createMarker: function() { return null; }, // Use our custom markers instead
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        containerClassName: 'hidden-routing-container' // Hidden via CSS
    }).on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;

        // Update Dashboard Live Stats
        const distKm = (summary.totalDistance / 1000).toFixed(1);
        const timeMin = Math.round(summary.totalTime / 60);

        const timeBox = document.getElementById('liveTimeBox');
        const distBox = document.getElementById('liveDistBox');

        if(timeBox) timeBox.innerText = timeMin + " min";
        if(distBox) distBox.innerText = distKm + " KM";

    }).addTo(state.mapInstance);
}

export function openMap(type, lat, lng) {
    if (!lat || !lng) return;
    if (type === 'dir') window.open(`https://www.google.com/maps/dir/?api=1&destination=$${lat},${lng}`, '_blank');
    else if (type === 'view') window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=$${lat},${lng}`, '_blank');
}

export function triggerSOS(adminNumber) {
    if(!confirm("⚠️ SEND EMERGENCY SOS? \nLocation will be shared with Admin & Team.")) return;

    // Get current location from state or default
    const lat = state.currentLat || 0;
    const lng = state.currentLng || 0;
    const name = state.user ? state.user.name : "Unknown Partner";
    const mobile = state.user ? state.user.mobile : "Unknown Mobile";

    const message = `🚨 *SOS EMERGENCY* 🚨\n\nPartner: ${name}\nPhone: ${mobile}\nLocation: https://maps.google.com/?q=$${lat},${lng}\n\n*Call Immediately!*`;
    window.open(`https://wa.me/91${adminNumber}?text=${encodeURIComponent(message)}`, '_blank');
}