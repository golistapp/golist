// modules/map.js

let map = null;
let markersLayer = null;
let partnersRef = null;

// Admin ki location store karne ke liye variables
let adminLat = null;
let adminLng = null;

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="h-full flex flex-col space-y-4 fade-in">
                <div class="flex justify-between items-center shrink-0">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Live Map</h2>
                        <p class="text-xs text-slate-400">Realtime Rider Tracking</p>
                    </div>
                    <div id="map-status" class="text-xs text-slate-500 font-mono flex items-center gap-2">
                        <span id="gps-status" class="text-amber-500"><i class="fa-solid fa-location-crosshairs fa-spin"></i> Locating You...</span>
                    </div>
                </div>

                <div class="flex-1 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden shadow-2xl">
                    <div id="map" class="w-full h-full z-10"></div>
                    <div id="map-loader" class="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
                        <div class="text-center">
                            <i class="fa-solid fa-map-location-dot text-4xl text-blue-600 mb-3 animate-bounce"></i>
                            <p class="text-slate-400 text-sm">Initializing Satellite Uplink...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 1. Admin ki Location nikalo (Browser GPS)
        this.getAdminLocation();

        // 2. Load Leaflet Library
        if (!window.L) {
            await this.loadLeafletLib();
        }

        // 3. Initialize Map
        this.initMap();

        // 4. Start Tracking
        this.startTracking(db);
    },

    cleanup() {
        if (partnersRef) partnersRef.off();
        if (map) {
            map.remove();
            map = null;
        }
        // Reset variables
        adminLat = null;
        adminLng = null;
        console.log("🗺️ Map Cleanup: Resources Freed");
    },

    // --- NEW: Admin GPS Location Function ---
    getAdminLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    adminLat = position.coords.latitude;
                    adminLng = position.coords.longitude;

                    const statusEl = document.getElementById('gps-status');
                    if(statusEl) {
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> HQ Located`;
                        statusEl.className = "text-green-500";
                    }
                    console.log("📍 Admin Location Found:", adminLat, adminLng);
                },
                (error) => {
                    console.error("GPS Error:", error);
                    const statusEl = document.getElementById('gps-status');
                    if(statusEl) statusEl.innerText = "GPS Denied";
                }
            );
        }
    },

    // --- NEW: Distance Calculation Formula (Haversine) ---
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return "?";

        const R = 6371; // Earth radius in KM
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c; // Distance in KM

        return dist.toFixed(1); // 1 decimal place (e.g., 5.2)
    },

    loadLeafletLib() {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    initMap() {
        map = L.map('map').setView([20.5937, 78.9629], 5);

        // Dark Mode Map Tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CartoDB',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);
        document.getElementById('map-loader').classList.add('hidden');
    },

    startTracking(db) {
        partnersRef = db.ref('deliveryBoys');

        partnersRef.on('value', snap => {
            if (!map || !markersLayer) return;

            markersLayer.clearLayers();
            const bounds = [];
            let onlineCount = 0;

            if (snap.exists()) {
                Object.values(snap.val()).forEach(p => {
                    if (p.location && p.location.lat && p.location.lng) {
                        const isOnline = p.status === 'online';
                        if(isOnline) onlineCount++;

                        const color = isOnline ? '#4ade80' : '#ef4444';

                        // Distance Calculate karo (Agar Admin Location mil gayi hai to)
                        let distanceBadge = '';
                        if (adminLat && adminLng) {
                            const km = this.calculateDistance(adminLat, adminLng, p.location.lat, p.location.lng);
                            distanceBadge = `<div style="margin-top:4px; font-weight:bold; color:#3b82f6;">
                                <i class="fa-solid fa-route"></i> ${km} KM away
                            </div>`;
                        } else {
                            distanceBadge = `<div style="margin-top:4px; font-size:10px; color:#64748b;">
                                (Locating HQ...)
                            </div>`;
                        }

                        const iconHtml = `<div style="background:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px ${color};"></div>`;

                        const customIcon = L.divIcon({ 
                            className: 'custom-map-icon', 
                            html: iconHtml, 
                            iconSize: [12, 12] 
                        });

                        const marker = L.marker([p.location.lat, p.location.lng], {icon: customIcon})
                            .bindPopup(`
                                <div style="text-align:center; min-width: 120px;">
                                    <b style="font-size:14px; color:#0f172a;">${p.name}</b><br>
                                    <span style="font-size:11px; font-weight:bold; color:${isOnline ? '#16a34a' : '#dc2626'}">
                                        ${p.status.toUpperCase()}
                                    </span>
                                    <div style="font-size:11px; color:#475569; margin-top:2px;">
                                        🔋 ${p.battery || '?'}% Battery
                                    </div>
                                    ${distanceBadge}
                                </div>
                            `);

                        markersLayer.addLayer(marker);
                        if (isOnline) bounds.push([p.location.lat, p.location.lng]);
                    }
                });
            }

            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
        });
    }
};