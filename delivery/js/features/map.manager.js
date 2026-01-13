// ==========================================
// MAP, ROUTING & VISUALIZATION MANAGER
// ==========================================

import { db } from '../config.js';
import { getLocation, getActiveOrder, getRadius } from '../core/state.js';
import { getDistance, showToast, toggleClass } from '../utils.js';

let map = null;
let layerGroup = null;
let routeControl = null;
let approvedWholesalers = []; // Local cache for map markers
let showShopsOnMap = false;

// Wholesaler Widget State
let currentShopIndex = 0;
let nearbyShopsCache = [];

export async function initDeliveryMap() {
    if (map) {
        map.invalidateSize();
        return;
    }

    console.log("Initializing Leaflet Map...");
    const loc = getLocation();
    const startLat = loc.lat || 20.5937;
    const startLng = loc.lng || 78.9629;

    // 1. Create Map
    map = L.map('deliveryMap', { zoomControl: false, attributionControl: false })
           .setView([startLat, startLng], 14);

    // 2. Add Tiles (Light Theme)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    layerGroup = L.layerGroup().addTo(map);
    document.getElementById('mapLoader').classList.add('hidden');

    // 3. Setup Controls & Listeners
    setupMapControls();
    fetchWholesalersForMap(); // Start fetching shops background
}

function setupMapControls() {
    // Recenter Button
    document.getElementById('btnRecenter').onclick = () => {
        const l = getLocation();
        if(l.lat) map.flyTo([l.lat, l.lng], 16, { animate: true, duration: 1.5 });
    };

    // Refresh GPS/Map Button
    document.getElementById('btnRefreshMap').onclick = () => {
        const icon = document.querySelector('#btnRefreshMap i');
        icon.classList.add('spin-anim');
        setTimeout(() => icon.classList.remove('spin-anim'), 1000);
        updateMapVisuals(); // Force re-render
        showToast("Map Synced");
    };

    // Toggle Shops Button
    document.getElementById('btnToggleShops').onclick = toggleShopMarkers;

    // Wholesaler Carousel Next Button
    document.getElementById('btnNextShop').onclick = () => {
        currentShopIndex = (currentShopIndex + 1) % nearbyShopsCache.length;
        renderSingleShopCard(nearbyShopsCache[currentShopIndex]);
    };
}

// ============================
// VISUAL UPDATES (Markers)
// ============================

export function updateMapVisuals() {
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const loc = getLocation();
    const activeOrder = getActiveOrder();

    // 1. RIDER MARKER (Blue Pulse)
    if (loc.lat && loc.lng) {
        const riderIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#3b82f6; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid white; box-shadow:0 0 15px rgba(59,130,246,0.4); animation:pulse-blue 2s infinite;"><i class="fa-solid fa-motorcycle text-white text-sm"></i></div>`,
            iconSize: [36, 36], iconAnchor: [18, 18]
        });
        L.marker([loc.lat, loc.lng], { icon: riderIcon }).addTo(layerGroup);
    }

    // 2. CUSTOMER MARKER & ROUTE
    if (activeOrder && activeOrder.location) {
        const dest = activeOrder.location;
        const custIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#22c55e; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 4px 6px rgba(0,0,0,0.1);"><i class="fa-solid fa-house text-white text-xs"></i></div>`,
            iconSize: [30, 30], iconAnchor: [15, 15]
        });
        L.marker([dest.lat, dest.lng], { icon: custIcon }).addTo(layerGroup);

        // Draw Route
        drawRoute(loc.lat, loc.lng, dest.lat, dest.lng);
    } else {
        // Clear route if no active order
        if (routeControl) { try { map.removeControl(routeControl); } catch(e){} routeControl = null; }
    }

    // 3. WHOLESALER MARKERS (Orange)
    if (showShopsOnMap) renderWholesalerMarkers(loc);
}

function drawRoute(startLat, startLng, endLat, endLng) {
    if (routeControl) { try { map.removeControl(routeControl); } catch(e){} }

    routeControl = L.Routing.control({
        waypoints: [L.latLng(startLat, startLng), L.latLng(endLat, endLng)],
        lineOptions: { styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6, className: 'blink-route' }] },
        createMarker: () => null,
        addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: true, showAlternatives: false,
        containerClassName: 'hidden-routing-container'
    }).on('routesfound', (e) => {
        const summary = e.routes[0].summary;
        // Update Dashboard Stats
        const timeBox = document.getElementById('liveTimeBox');
        const distBox = document.getElementById('liveDistBox');
        if (timeBox) timeBox.innerText = Math.round(summary.totalTime / 60) + " min";
        if (distBox) distBox.innerText = (summary.totalDistance / 1000).toFixed(1) + " KM";
    }).addTo(map);
}

// ============================
// WHOLESALER LOGIC
// ============================

function fetchWholesalersForMap() {
    db.ref('wholesalerRequests').orderByChild('status').equalTo('approved').on('value', snap => {
        approvedWholesalers = [];
        if (snap.exists()) {
            snap.forEach(c => approvedWholesalers.push({ id: c.key, ...c.val() }));
        }
        updateMapVisuals(); // Refresh markers
        renderActiveWholesalerWidget(); // Refresh carousel
    });
}

function toggleShopMarkers() {
    showShopsOnMap = !showShopsOnMap;
    const btn = document.getElementById('btnToggleShops');
    const ind = document.getElementById('shopIndicator');

    if (showShopsOnMap) {
        btn.classList.replace('text-gray-400', 'text-amber-600');
        ind.classList.remove('hidden');
        showToast("Shops Visible");
    } else {
        btn.classList.replace('text-amber-600', 'text-gray-400');
        ind.classList.add('hidden');
        showToast("Shops Hidden");
    }
    updateMapVisuals();
}

function renderWholesalerMarkers(myLoc) {
    const radius = getRadius();
    approvedWholesalers.forEach(ws => {
        const dist = parseFloat(getDistance(myLoc.lat, myLoc.lng, ws.location.lat, ws.location.lng));
        if (dist <= radius) {
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:#f59e0b; width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; border:1px solid white;"><i class="fa-solid fa-shop text-white text-[10px]"></i></div>`,
                iconSize: [24, 24]
            });
            L.marker([ws.location.lat, ws.location.lng], { icon }).bindPopup(ws.shopName).addTo(layerGroup);
        }
    });
}

// ============================
// SMART WIDGET (Carousel)
// ============================

export function renderActiveWholesalerWidget() {
    const container = document.getElementById('activeWholesalerCard');
    const nextBtn = document.getElementById('btnNextShop');
    const loc = getLocation();

    if (!container || !approvedWholesalers.length) return;

    // Filter & Sort Nearby
    nearbyShopsCache = approvedWholesalers.map(ws => ({
        ...ws,
        dist: parseFloat(getDistance(loc.lat, loc.lng, ws.location.lat, ws.location.lng))
    })).sort((a, b) => a.dist - b.dist).slice(0, 5);

    if (nearbyShopsCache.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400 text-xs gap-2"><i class="fa-solid fa-store-slash"></i> No shops nearby</div>`;
        if (nextBtn) nextBtn.classList.add('hidden');
        return;
    }

    if (nearbyShopsCache.length > 1) nextBtn.classList.remove('hidden');
    else nextBtn.classList.add('hidden');

    renderSingleShopCard(nearbyShopsCache[currentShopIndex] || nearbyShopsCache[0]);
}

function renderSingleShopCard(shop) {
    if(!shop) return;
    const container = document.getElementById('activeWholesalerCard');
    container.innerHTML = `
        <div class="flex justify-between items-center mb-1 gap-2">
            <h4 class="font-bold text-gray-800 text-xs truncate flex-1">${shop.shopName}</h4>
            <span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">${shop.dist}KM</span>
        </div>
        <p class="text-[9px] text-gray-500 truncate mb-1"><i class="fa-solid fa-map-pin mr-1"></i>${shop.address}</p>
        <div class="flex gap-1.5 mt-auto">
             <button onclick="window.open('tel:${shop.ownerMobile}')" class="bg-gray-100 text-gray-600 w-6 h-6 rounded flex items-center justify-center"><i class="fa-solid fa-phone text-[10px]"></i></button>
             <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${shop.location.lat},${shop.location.lng}')" class="bg-blue-50 text-blue-600 w-6 h-6 rounded flex items-center justify-center"><i class="fa-solid fa-location-arrow text-[10px]"></i></button>
        </div>`;
}