// ==========================================
// MAP MANAGER (FIXED: GHOST MAP & LOADER ISSUE)
// ==========================================

import { db } from '../config.js';
import { getLocation, getActiveOrder, getRadius } from '../core/state.js';
import { getDistance, showToast } from '../utils.js';

let map = null;
let layerGroup = null;
let routeControl = null;
let approvedWholesalers = []; 
let showShopsOnMap = false;

// Widget State
let currentShopIndex = 0;
let nearbyShopsCache = [];

export async function initDeliveryMap() {
    const container = document.getElementById('deliveryMap');
    const loader = document.getElementById('mapLoader');

    // 1. Safety Check: Agar container hi nahi hai to ruk jao
    if (!container) return; 

    console.log("Initializing Leaflet Map...");

    // 2. CRITICAL FIX: Ghost Map Cleanup
    // Agar map pehle se memory mein hai, use destroy karo taaki naye container pe bind ho sake
    if (map) {
        map.remove(); // Leaflet memory cleanup
        map = null;
        layerGroup = null;
        routeControl = null;
    }

    // 3. Reset Container ID (Leaflet requirement for re-init)
    // Yeh ensure karta hai ki Leaflet isse naya div samjhe
    container._leaflet_id = null; 

    // 4. Default Location (India Center or Current Loc)
    const loc = getLocation();
    const startLat = loc.lat || 20.5937;
    const startLng = loc.lng || 78.9629;

    try {
        // 5. Create Fresh Map Instance
        map = L.map('deliveryMap', { 
            zoomControl: false, // UI Clean rakhne ke liye zoom button hataya
            attributionControl: false 
        }).setView([startLat, startLng], 14);

        // 6. Light Theme Tiles (Matching your working file)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        layerGroup = L.layerGroup().addTo(map);

        // 7. FORCE HIDE LOADER (Ab map ban gaya hai)
        if(loader) loader.classList.add('hidden');

        // 8. Listeners Setup
        setupMapControls();
        fetchWholesalersForMap();

        // 9. Render Markers Immediately
        updateMapVisuals();

    } catch (e) {
        console.error("Map Init Error:", e);
        // Error aaye tab bhi loader hata do taaki user blank screen na dekhe
        if(loader) loader.classList.add('hidden');
    }
}

function setupMapControls() {
    const btnRecenter = document.getElementById('btnRecenter');
    // Purane listeners hatane ki zaroorat nahi kyunki element naya hai active-order se
    if (btnRecenter) {
        btnRecenter.onclick = () => {
            const l = getLocation();
            if(l.lat && map) map.flyTo([l.lat, l.lng], 16, { animate: true, duration: 1.5 });
            else showToast("Waiting for GPS...");
        };
    }

    const btnRefresh = document.getElementById('btnRefreshMap');
    if (btnRefresh) {
        btnRefresh.onclick = () => {
            const icon = btnRefresh.querySelector('i');
            if(icon) {
                icon.classList.add('spin-anim');
                setTimeout(() => icon.classList.remove('spin-anim'), 1000);
            }
            updateMapVisuals(); 
            showToast("Map Synced");
        };
    }

    const btnToggle = document.getElementById('btnToggleShops');
    if (btnToggle) btnToggle.onclick = toggleShopMarkers;

    const btnNext = document.getElementById('btnNextShop');
    if (btnNext) {
        btnNext.onclick = () => {
            if(nearbyShopsCache.length > 0) {
                currentShopIndex = (currentShopIndex + 1) % nearbyShopsCache.length;
                renderSingleShopCard(nearbyShopsCache[currentShopIndex]);
            }
        };
    }
}

// ============================
// VISUAL UPDATES (Markers)
// ============================

export function updateMapVisuals() {
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const loc = getLocation();
    const activeOrder = getActiveOrder();

    // 1. RIDER MARKER (Blue Pulse Animation)
    if (loc.lat && loc.lng) {
        const riderIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#3b82f6; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid white; box-shadow:0 0 15px rgba(59,130,246,0.4); animation:pulse-blue 2s infinite;"><i class="fa-solid fa-motorcycle text-white text-sm"></i></div>`,
            iconSize: [36, 36], iconAnchor: [18, 18]
        });
        L.marker([loc.lat, loc.lng], { icon: riderIcon }).addTo(layerGroup);
    }

    // 2. CUSTOMER / DESTINATION
    if (activeOrder && activeOrder.location) {
        const dest = activeOrder.location;
        const custIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#22c55e; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 4px 6px rgba(0,0,0,0.1);"><i class="fa-solid fa-house text-white text-xs"></i></div>`,
            iconSize: [30, 30], iconAnchor: [15, 15]
        });
        L.marker([dest.lat, dest.lng], { icon: custIcon }).addTo(layerGroup);

        // Draw Route Logic
        if(loc.lat && loc.lng) {
            drawRoute(loc.lat, loc.lng, dest.lat, dest.lng);
        }
    } else {
        if (routeControl) { 
            try { map.removeControl(routeControl); } catch(e){} 
            routeControl = null; 
        }
    }

    if (showShopsOnMap) renderWholesalerMarkers(loc);
}

function drawRoute(startLat, startLng, endLat, endLng) {
    // Agar routing library load nahi hui to error mat phenko
    if (!L.Routing) return;

    // Purana route hatao
    if (routeControl) { try { map.removeControl(routeControl); } catch(e){} }

    try {
        routeControl = L.Routing.control({
            waypoints: [L.latLng(startLat, startLng), L.latLng(endLat, endLng)],
            lineOptions: { styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6, className: 'blink-route' }] },
            createMarker: () => null, // Default markers mat banao, humne custom banaye hain
            addWaypoints: false, 
            draggableWaypoints: false, 
            fitSelectedRoutes: true, 
            showAlternatives: false,
            containerClassName: 'hidden-routing-container' // CSS se instructions hide karo
        }).on('routesfound', (e) => {
            // Stats Update karo
            const summary = e.routes[0].summary;
            const timeBox = document.getElementById('liveTimeBox');
            const distBox = document.getElementById('liveDistBox');

            if (timeBox) timeBox.innerText = Math.round(summary.totalTime / 60) + " min";
            if (distBox) distBox.innerText = (summary.totalDistance / 1000).toFixed(1) + " KM";
        }).addTo(map);
    } catch(e) {
        console.warn("Routing Error (Ignoring):", e);
    }
}

// ============================
// WHOLESALER LOGIC (Same as before)
// ============================

function fetchWholesalersForMap() {
    db.ref('wholesalerRequests').orderByChild('status').equalTo('approved').on('value', snap => {
        approvedWholesalers = [];
        if (snap.exists()) {
            snap.forEach(c => approvedWholesalers.push({ id: c.key, ...c.val() }));
        }
        updateMapVisuals();
        renderActiveWholesalerWidget();
    });
}

function toggleShopMarkers() {
    showShopsOnMap = !showShopsOnMap;
    const btn = document.getElementById('btnToggleShops');
    const ind = document.getElementById('shopIndicator');

    if(!btn) return;

    if (showShopsOnMap) {
        btn.classList.replace('text-gray-400', 'text-amber-600');
        if(ind) ind.classList.remove('hidden');
        showToast("Shops Visible");
    } else {
        btn.classList.replace('text-amber-600', 'text-gray-400');
        if(ind) ind.classList.add('hidden');
        showToast("Shops Hidden");
    }
    updateMapVisuals();
}

function renderWholesalerMarkers(myLoc) {
    const radius = getRadius();
    approvedWholesalers.forEach(ws => {
        if(!ws.location) return;
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

export function renderActiveWholesalerWidget() {
    const container = document.getElementById('activeWholesalerCard');
    const nextBtn = document.getElementById('btnNextShop');
    const loc = getLocation();

    if (!container) return;

    nearbyShopsCache = approvedWholesalers.map(ws => {
        if(!ws.location) return null;
        return {
            ...ws,
            dist: parseFloat(getDistance(loc.lat, loc.lng, ws.location.lat, ws.location.lng))
        };
    }).filter(ws => ws !== null).sort((a, b) => a.dist - b.dist).slice(0, 5);

    if (nearbyShopsCache.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400 text-xs gap-2"><i class="fa-solid fa-store-slash"></i> No shops nearby</div>`;
        if (nextBtn) nextBtn.classList.add('hidden');
        return;
    }

    if (nearbyShopsCache.length > 1) {
        if(nextBtn) nextBtn.classList.remove('hidden');
    } else {
        if(nextBtn) nextBtn.classList.add('hidden');
    }

    renderSingleShopCard(nearbyShopsCache[currentShopIndex] || nearbyShopsCache[0]);
}

function renderSingleShopCard(shop) {
    if(!shop) return;
    const container = document.getElementById('activeWholesalerCard');
    if(!container) return;

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

// Global Export
window.mapManager = {
    initDeliveryMap,
    updateMapVisuals,
    renderActiveWholesalerWidget
};