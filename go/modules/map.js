// ==========================================
// MODULE: Map Service (Updated: Instant Route Fix)
// ==========================================

import { getDistance } from './helpers.js';
import { showToast } from './ui.js';

let deliveryMap = null;
let deliveryLayerGroup = null;
let routeControl = null;
let showShops = false; 

let currentShopIndex = 0;
let nearbyShopsCache = [];

// 1. INITIALIZE MAP (With Resize Fix)
export function initMap() {
    const mapContainer = document.getElementById('deliveryMap');

    // Resize Fix: Agar map pehle se hai, to bas resize karo
    if(deliveryMap) {
        setTimeout(() => {
            deliveryMap.invalidateSize(); // Force Map to fit container
            updateMapVisuals(); // Redraw everything
        }, 300); // 300ms animation delay
        return;
    }

    const startLat = window.Ramazone.location.lat || 20.5937;
    const startLng = window.Ramazone.location.lng || 78.9629;

    deliveryMap = L.map('deliveryMap', {
        zoomControl: true, 
        attributionControl: false,
        preferCanvas: true, 
        fadeAnimation: false, 
        markerZoomAnimation: false
    }).setView([startLat, startLng], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(deliveryMap);

    deliveryLayerGroup = L.layerGroup().addTo(deliveryMap);

    // UI Cleanup
    const loader = document.getElementById('mapLoader');
    if(loader) loader.classList.add('hidden');

    const section = document.getElementById('liveMapSection');
    if(section) section.classList.remove('hidden');

    // IMPORTANT: Wait for modal animation to finish, then resize
    setTimeout(() => {
        deliveryMap.invalidateSize();
    }, 400);

    renderActiveWholesalerWidget();
}

// 2. RECENTER MAP
export function recenterMap() {
    if(deliveryMap && window.Ramazone.location.lat) {
        deliveryMap.invalidateSize(); // Safety Resize
        deliveryMap.flyTo([window.Ramazone.location.lat, window.Ramazone.location.lng], 16, { animate: true, duration: 0.5 });
    } else {
        showToast("Waiting for GPS...");
    }
}

// 3. FORCE ROUTE (Manual Button)
export function forceRefreshRoute() {
    if(!window.Ramazone.activeOrder || !window.Ramazone.activeOrder.location) {
        return showToast("No active destination");
    }

    const myLat = window.Ramazone.location.lat;
    const myLng = window.Ramazone.location.lng;
    const custLat = window.Ramazone.activeOrder.location.lat;
    const custLng = window.Ramazone.activeOrder.location.lng;

    if(!myLat || myLat === 0) return showToast("Waiting for GPS...");

    showToast("Redrawing Path...");

    // Clear old route explicitly
    if(routeControl) {
        try { deliveryMap.removeControl(routeControl); } catch(e) {}
        routeControl = null;
    }

    // Small delay to ensure clean state
    setTimeout(() => {
        drawRoute(myLat, myLng, custLat, custLng);
        const bounds = L.latLngBounds([ [myLat, myLng], [custLat, custLng] ]);
        deliveryMap.fitBounds(bounds, { padding: [50, 50] });
    }, 100);
}

// 4. REFRESH DATA
export function refreshMapData() {
    const icon = document.getElementById('refreshIcon');
    if(icon) icon.classList.add('spin-anim');

    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            window.Ramazone.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };

            recenterMap();
            updateMapVisuals();
            renderActiveWholesalerWidget();

            setTimeout(() => {
                if(icon) icon.classList.remove('spin-anim');
                showToast("GPS Synced");
            }, 500);
        }, err => {
            if(icon) icon.classList.remove('spin-anim');
            showToast("GPS Error");
        }, {enableHighAccuracy: true});
    }
}

// 5. VISUAL UPDATER
export function updateMapVisuals() {
    if(!deliveryMap || !deliveryLayerGroup) return;

    deliveryLayerGroup.clearLayers();

    // Remove old route logic moved inside drawRoute to avoid flickering

    const myLat = window.Ramazone.location.lat;
    const myLng = window.Ramazone.location.lng;

    // A. RIDER
    if(myLat && myLng && myLat !== 0) {
        const riderIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">
                    <i class="fa-solid fa-motorcycle text-white text-xs"></i>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        L.marker([myLat, myLng], {icon: riderIcon}).addTo(deliveryLayerGroup);
    }

    // B. CUSTOMER & ROUTE
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

        L.marker([custLat, custLng], {icon: custIcon}).addTo(deliveryLayerGroup);

        // Draw Route ONLY if we have valid Rider Coordinates
        if(myLat && myLng && myLat !== 0) {
            drawRoute(myLat, myLng, custLat, custLng);
        }
    }

    // C. SHOPS
    if(showShops && window.Ramazone.approvedWholesalers.length > 0) {
        window.Ramazone.approvedWholesalers.forEach(ws => {
            if(ws.location) {
                const dist = parseFloat(getDistance(myLat, myLng, ws.location.lat, ws.location.lng));
                if(dist > 10) return; 

                const isSelected = (nearbyShopsCache[currentShopIndex] && nearbyShopsCache[currentShopIndex].id === ws.id);
                const bgColor = isSelected ? '#ea580c' : '#f59e0b';
                const size = isSelected ? 30 : 24;
                const zIndex = isSelected ? 1000 : 1;

                const shopIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color:${bgColor}; width: ${size}px; height: ${size}px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s;">
                            <i class="fa-solid fa-shop text-white text-[10px]"></i>
                           </div>`,
                    iconSize: [size, size],
                    iconAnchor: [size/2, size/2]
                });

                const marker = L.marker([ws.location.lat, ws.location.lng], {icon: shopIcon, zIndexOffset: zIndex}).addTo(deliveryLayerGroup);

                marker.on('click', () => {
                    const idx = nearbyShopsCache.findIndex(s => s.id === ws.id);
                    if(idx !== -1) {
                        currentShopIndex = idx;
                        renderActiveWholesalerWidget(); 
                        updateMapVisuals();

                        const card = document.getElementById('activeWholesalerCard');
                        if(card) {
                            card.parentElement.classList.add('pulse-border');
                            setTimeout(() => card.parentElement.classList.remove('pulse-border'), 1000);
                        }
                    }
                });
            }
        });
    }
}

// 6. DRAW ROUTE
function drawRoute(startLat, startLng, endLat, endLng) {
    if(!deliveryMap) return;

    // Prevent duplicate routes: Clear existing if endpoints are same (Optional optimization)
    if(routeControl) {
        try { deliveryMap.removeControl(routeControl); } catch(e) {}
    }

    routeControl = L.Routing.control({
        waypoints: [ L.latLng(startLat, startLng), L.latLng(endLat, endLng) ],
        lineOptions: { styles: [{color: '#3b82f6', opacity: 0.8, weight: 6, className: 'blink-route'}] },
        createMarker: function() { return null; },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }), // Explicit Router
        containerClassName: 'hidden-routing-container'
    }).on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;

        const distKm = (summary.totalDistance / 1000).toFixed(1);
        const timeMin = Math.round(summary.totalTime / 60);

        const timeBox = document.getElementById('liveTimeBox');
        const distBox = document.getElementById('liveDistBox');

        if(timeBox) timeBox.innerText = timeMin + " min";
        if(distBox) distBox.innerText = distKm + " KM";
    }).addTo(deliveryMap);
}

// 7. WIDGET
export function renderActiveWholesalerWidget() {
    const container = document.getElementById('activeWholesalerCard');
    const nextBtn = document.getElementById('btnNextShop');

    if(!container || !window.Ramazone.approvedWholesalers) return;

    const myLat = window.Ramazone.location.lat;
    const myLng = window.Ramazone.location.lng;

    nearbyShopsCache = window.Ramazone.approvedWholesalers.map(ws => {
        const d = parseFloat(getDistance(myLat, myLng, ws.location.lat, ws.location.lng));
        return { ...ws, dist: d };
    }).filter(ws => ws.dist <= 10).sort((a, b) => a.dist - b.dist).slice(0, 5);

    if(nearbyShopsCache.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400 text-xs gap-2"><i class="fa-solid fa-store-slash"></i> No shops in 10KM</div>`;
        if(nextBtn) nextBtn.classList.add('hidden');
        return;
    }

    if(currentShopIndex >= nearbyShopsCache.length) currentShopIndex = 0;

    if(nearbyShopsCache.length > 1 && nextBtn) {
        nextBtn.classList.remove('hidden');
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            currentShopIndex = (currentShopIndex + 1) % nearbyShopsCache.length;
            renderActiveWholesalerWidget();
            updateMapVisuals();
        };
    } else if (nextBtn) {
        nextBtn.classList.add('hidden');
    }

    const shop = nearbyShopsCache[currentShopIndex];

    window.zoomToShop = (lat, lng) => {
        if(deliveryMap) {
            deliveryMap.invalidateSize(); // Fix before flying
            deliveryMap.flyTo([lat, lng], 17, { animate: true, duration: 1 });
        }
    };

    container.innerHTML = `
        <div onclick="window.zoomToShop(${shop.location.lat}, ${shop.location.lng})" class="cursor-pointer">
            <div class="flex justify-between items-center mb-1 gap-2">
                <h4 class="font-bold text-gray-800 text-xs truncate flex-1 ${currentShopIndex === 0 ? 'text-amber-700' : ''}">${shop.shopName}</h4>
                <span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">${shop.dist}KM</span>
            </div>
            <p class="text-[9px] text-gray-500 truncate mb-1"><i class="fa-solid fa-map-pin mr-1"></i>${shop.address}</p>
        </div>
        <div class="flex gap-1.5 mt-auto">
             <button onclick="window.open('tel:${shop.ownerMobile}')" class="bg-gray-100 hover:bg-gray-200 text-gray-600 w-6 h-6 rounded flex items-center justify-center"><i class="fa-solid fa-phone text-[10px]"></i></button>
             <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${shop.location.lat},${shop.location.lng}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 w-6 h-6 rounded flex items-center justify-center"><i class="fa-solid fa-location-arrow text-[10px]"></i></button>
        </div>
    `;
}

// 8. HELPERS
export function setShowShops(isVisible) {
    showShops = isVisible;
    const btn = document.getElementById('btnToggleShops');
    const ind = document.getElementById('shopIndicator');

    if(showShops) {
        if(btn) btn.classList.replace('text-gray-400', 'text-amber-600');
        if(ind) ind.classList.remove('hidden');
    } else {
        if(btn) btn.classList.replace('text-amber-600', 'text-gray-400');
        if(ind) ind.classList.add('hidden');
    }
    updateMapVisuals(); 
}

export function toggleShopMarkers() {
    setShowShops(!showShops); 
    showToast(showShops ? "Showing Shops" : "Shops Hidden");
}