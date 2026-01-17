// ==========================================
// MODULE: Map Service & Routing
// ==========================================

import { getDistance } from './helpers.js';
import { showToast } from './ui.js';

let deliveryMap = null;
let deliveryLayerGroup = null;
let routeControl = null;
let showShops = false;

// 1. INITIALIZE MAP (Lazy Load)
export function initMap() {
    // Agar map pehle se bana hai, to wapis mat banao
    if(deliveryMap) {
        deliveryMap.invalidateSize(); // Resize fix
        return;
    }

    const startLat = window.Ramazone.location.lat || 20.5937;
    const startLng = window.Ramazone.location.lng || 78.9629;

    deliveryMap = L.map('deliveryMap', {
        zoomControl: true, 
        attributionControl: false
    }).setView([startLat, startLng], 14);

    // LIGHT THEME TILES
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(deliveryMap);

    deliveryLayerGroup = L.layerGroup().addTo(deliveryMap);

    // Loader hatao
    const loader = document.getElementById('mapLoader');
    if(loader) loader.classList.add('hidden');

    // Visible Map Section
    const section = document.getElementById('liveMapSection');
    if(section) section.classList.remove('hidden');

    // Initial render
    renderActiveWholesalerWidget();
}

// 2. RECENTER MAP
export function recenterMap() {
    if(deliveryMap && window.Ramazone.location.lat) {
        deliveryMap.flyTo([window.Ramazone.location.lat, window.Ramazone.location.lng], 16, { animate: true, duration: 1.5 });
    } else {
        showToast("Waiting for GPS...");
    }
}

// 3. REFRESH DATA (GPS Sync Button)
export function refreshMapData() {
    const icon = document.getElementById('refreshIcon');
    if(icon) icon.classList.add('spin-anim');

    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            window.Ramazone.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };

            recenterMap();
            updateMapVisuals();

            setTimeout(() => {
                if(icon) icon.classList.remove('spin-anim');
                showToast("GPS Synced & Refreshed");
            }, 1000);
        }, err => {
            if(icon) icon.classList.remove('spin-anim');
            showToast("GPS Error");
        }, {enableHighAccuracy: true});
    }
}

// 4. MAIN VISUAL UPDATER (Markers & Route)
export function updateMapVisuals() {
    if(!deliveryMap || !deliveryLayerGroup) return;

    deliveryLayerGroup.clearLayers();

    // Clear old route
    if(routeControl) {
        try { deliveryMap.removeControl(routeControl); } catch(e) {}
        routeControl = null;
    }

    const myLat = window.Ramazone.location.lat;
    const myLng = window.Ramazone.location.lng;

    // A. RIDER MARKER (Blue Pulse)
    if(myLat && myLng) {
        const riderIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#3b82f6; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); animation: pulse-blue 2s infinite;">
                    <i class="fa-solid fa-motorcycle text-white text-sm"></i>
                   </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
        L.marker([myLat, myLng], {icon: riderIcon}).addTo(deliveryLayerGroup);
    }

    // B. CUSTOMER MARKER & ROUTE
    if(window.Ramazone.activeOrder && window.Ramazone.activeOrder.location) {
        const custLat = window.Ramazone.activeOrder.location.lat;
        const custLng = window.Ramazone.activeOrder.location.lng;

        const custIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#22c55e; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-house text-white text-xs"></i>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        L.marker([custLat, custLng], {icon: custIcon})
            .bindPopup(`<b style="color:#111827">Customer</b>`)
            .addTo(deliveryLayerGroup);

        // Draw Route
        if(myLat && myLng) {
            drawRoute(myLat, myLng, custLat, custLng);
        }
    }

    // C. WHOLESALER MARKERS (If Toggled ON)
    if(showShops && window.Ramazone.approvedWholesalers.length > 0) {
        window.Ramazone.approvedWholesalers.forEach(ws => {
            if(ws.location) {
                const dist = parseFloat(getDistance(myLat, myLng, ws.location.lat, ws.location.lng));

                // Radius Filter
                if(dist <= parseFloat(window.Ramazone.serviceRadius || 5)) { 
                    const shopIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color:#f59e0b; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <i class="fa-solid fa-shop text-white text-[10px]"></i>
                               </div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });

                    L.marker([ws.location.lat, ws.location.lng], {icon: shopIcon})
                        .bindPopup(`
                            <div class="text-center p-1">
                                <b style="color:#d97706; font-size:12px;">${ws.shopName}</b><br>
                                <span style="font-size:10px; color:#6b7280;">${dist} KM Away</span><br>
                                <a href="tel:${ws.ownerMobile}" style="color:#2563eb; font-weight:bold; font-size:10px; text-decoration:none;">📞 CALL</a>
                            </div>
                        `)
                        .addTo(deliveryLayerGroup);
                }
            }
        });
    }
}

// 5. DRAW ROUTE (Leaflet Routing Machine)
function drawRoute(startLat, startLng, endLat, endLng) {
    if(!deliveryMap) return;

    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(startLat, startLng),
            L.latLng(endLat, endLng)
        ],
        lineOptions: {
            styles: [{color: '#3b82f6', opacity: 0.8, weight: 6, className: 'blink-route'}]
        },
        createMarker: function() { return null; }, // Hide default markers
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        containerClassName: 'hidden-routing-container'
    }).on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;

        // Update Dashboard Stats with Real Data
        const distKm = (summary.totalDistance / 1000).toFixed(1);
        const timeMin = Math.round(summary.totalTime / 60);

        const timeBox = document.getElementById('liveTimeBox');
        const distBox = document.getElementById('liveDistBox');

        if(timeBox) timeBox.innerText = timeMin + " min";
        if(distBox) distBox.innerText = distKm + " KM";

    }).addTo(deliveryMap);
}

// 6. TOGGLE SHOPS
export function toggleShopMarkers() {
    showShops = !showShops;
    const btn = document.getElementById('btnToggleShops');
    const ind = document.getElementById('shopIndicator');

    if(showShops) {
        if(btn) btn.classList.replace('text-gray-400', 'text-amber-600');
        if(ind) ind.classList.remove('hidden');
        showToast(`Showing Shops`);
    } else {
        if(btn) btn.classList.replace('text-amber-600', 'text-gray-400');
        if(ind) ind.classList.add('hidden');
        showToast("Shops Hidden");
    }
    updateMapVisuals();
}

// 7. WIDGET: NEARBY SHOPS CAROUSEL (Inside Map Panel)
let currentShopIndex = 0;
let nearbyShopsCache = [];

export function renderActiveWholesalerWidget() {
    const container = document.getElementById('activeWholesalerCard');
    const nextBtn = document.getElementById('btnNextShop');

    if(!container || !window.Ramazone.approvedWholesalers) return;

    // Filter Nearby Shops
    const myLat = window.Ramazone.location.lat;
    const myLng = window.Ramazone.location.lng;

    nearbyShopsCache = window.Ramazone.approvedWholesalers.map(ws => {
        const d = parseFloat(getDistance(myLat, myLng, ws.location.lat, ws.location.lng));
        return { ...ws, dist: d };
    }).sort((a, b) => a.dist - b.dist).slice(0, 5); // Top 5 closest

    if(nearbyShopsCache.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400 text-xs gap-2"><i class="fa-solid fa-store-slash"></i> No shops nearby</div>`;
        if(nextBtn) nextBtn.classList.add('hidden');
        return;
    }

    // Toggle Button
    if(nearbyShopsCache.length > 1 && nextBtn) {
        nextBtn.classList.remove('hidden');
        nextBtn.onclick = () => {
            currentShopIndex = (currentShopIndex + 1) % nearbyShopsCache.length;
            renderSingleShopCard(nearbyShopsCache[currentShopIndex]);
        };
    } else if (nextBtn) {
        nextBtn.classList.add('hidden');
    }

    renderSingleShopCard(nearbyShopsCache[currentShopIndex]);
}

function renderSingleShopCard(shop) {
    const container = document.getElementById('activeWholesalerCard');
    if(!container) return;

    container.innerHTML = `
        <div class="flex justify-between items-center mb-1 gap-2">
            <h4 class="font-bold text-gray-800 text-xs truncate flex-1" title="${shop.shopName}">${shop.shopName}</h4>
            <span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0 whitespace-nowrap">${shop.dist}KM</span>
        </div>
        <p class="text-[9px] text-gray-500 truncate mb-1"><i class="fa-solid fa-map-pin mr-1"></i>${shop.address}</p>
        <div class="flex gap-1.5 mt-auto">
             <button onclick="window.open('tel:${shop.ownerMobile}')" class="bg-gray-100 hover:bg-gray-200 text-gray-600 w-6 h-6 rounded flex items-center justify-center transition"><i class="fa-solid fa-phone text-[10px]"></i></button>
             <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${shop.location.lat},${shop.location.lng}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 w-6 h-6 rounded flex items-center justify-center transition"><i class="fa-solid fa-location-arrow text-[10px]"></i></button>
        </div>
    `;
}