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
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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
    let totalGm = 0;
    if (cart && Array.isArray(cart)) {
        cart.forEach(item => {
            // Extract numbers from "500 gm", "1 kg" etc.
            const match = item.qty.match(/(\d+)\s*(g|gm|kg|l|ml)/i);
            if (match) {
                let val = parseInt(match[1]);
                let unit = match[2].toLowerCase();
                if (unit === 'kg' || unit === 'l') val *= 1000;
                totalGm += (val * (item.count || 1));
            }
        });
    }
    return (totalGm / 1000).toFixed(1); // Return in KG
}

// --- 3. MAP & ROUTING LOGIC (Leaflet) ---

export function initDeliveryMap(lat, lng) {
    const mapDiv = document.getElementById('deliveryMap');
    if (!mapDiv) return;

    // 1. Cleanup existing map instance
    if (state.mapInstance) {
        state.mapInstance.off();
        state.mapInstance.remove();
        state.mapInstance = null;
    }

    // 2. Initialize Map
    state.mapInstance = L.map('deliveryMap', { zoomControl: false }).setView([lat, lng], 15);

    // 3. Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(state.mapInstance);

    // 4. Add Current Location Marker (Pulse Effect)
    const pulseIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="width:15px;height:15px;background:#3b82f6;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });
    L.marker([lat, lng], { icon: pulseIcon }).addTo(state.mapInstance);

    // Hide Loader
    const loader = document.getElementById('mapLoader');
    if(loader) loader.classList.add('hidden');
}

export function drawRoute(startLat, startLng, endLat, endLng) {
    if (!state.mapInstance) return;

    // Remove previous routing control
    if (state.mapRouteControl) {
        state.mapInstance.removeControl(state.mapRouteControl);
    }

    // Define Destination Icon
    const destIcon = L.divIcon({
        html: '<i class="fa-solid fa-location-dot text-3xl text-red-600 drop-shadow-md"></i>',
        className: 'bg-transparent',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });

    L.marker([endLat, endLng], { icon: destIcon }).addTo(state.mapInstance);

    // Draw Route using Leaflet Routing Machine
    state.mapRouteControl = L.Routing.control({
        waypoints: [
            L.latLng(startLat, startLng),
            L.latLng(endLat, endLng)
        ],
        lineOptions: {
            styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }]
        },
        createMarker: function() { return null; }, // We added custom markers manually
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false // Hide default text instructions
    }).on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;

        // --- SMART DASHBOARD UPDATE ---
        // Update Time & Distance boxes in the UI
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
    if (type === 'dir') window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    else if (type === 'view') window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`, '_blank');
}

