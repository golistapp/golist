// modules/map.js

let map = null;
let markersLayer = null;
let partnersRef = null;
let allRiderBounds = [];
let adminLat = null;
let adminLng = null;
let adminMarker = null;

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="h-full flex flex-col space-y-4 fade-in relative">
                <div class="flex justify-between items-end shrink-0 border-b border-slate-800 pb-4">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Live Map</h2>
                        <p class="text-xs text-slate-400">Realtime Rider Tracking</p>
                    </div>
                    <button id="btn-recenter" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-blue-900/20 transition flex items-center gap-2">
                        <i class="fa-solid fa-users-viewfinder"></i> Track Team
                    </button>
                </div>

                <div class="flex-1 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden shadow-2xl">
                    <div id="map" class="w-full h-full z-10 bg-slate-100"></div>

                    <div id="map-loader" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50">
                        <i class="fa-solid fa-map-location-dot text-4xl text-blue-500 mb-3 animate-bounce"></i>
                        <p class="text-slate-400 text-sm font-bold animate-pulse">Connecting Satellites...</p>
                    </div>

                    <div class="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur text-slate-800 px-3 py-1.5 rounded-lg shadow-lg border border-slate-200 text-[10px] font-bold">
                        <span id="gps-status" class="flex items-center gap-1 text-amber-600">
                            <i class="fa-solid fa-circle-notch fa-spin"></i> Locating Admin...
                        </span>
                    </div>
                </div>
            </div>
        `;

        if (!window.L) await this.loadLeafletLib();
        this.initMap();
        this.getAdminLocation();
        this.startTracking(db);
        this.attachEvents();
    },

    cleanup() {
        if (partnersRef) partnersRef.off();
        if (map) { map.remove(); map = null; }
        allRiderBounds = [];
    },

    attachEvents() {
        document.getElementById('btn-recenter').addEventListener('click', () => {
            if (allRiderBounds.length > 0) {
                map.fitBounds(allRiderBounds, { padding: [50, 50], maxZoom: 16 });
            } else {
                alert("No online riders to track.");
            }
        });
    },

    getAdminLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    adminLat = position.coords.latitude;
                    adminLng = position.coords.longitude;
                    const statusEl = document.getElementById('gps-status');
                    if(statusEl) {
                        statusEl.innerHTML = `<i class="fa-solid fa-check-circle text-green-600"></i> Admin GPS Active`;
                        statusEl.className = "flex items-center gap-1 text-slate-700";
                    }
                    // Admin Marker
                    if(adminMarker) map.removeLayer(adminMarker);
                    const adminIcon = L.divIcon({ className: 'custom-map-icon', html: `<div style="background:#2563eb; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>` });
                    adminMarker = L.marker([adminLat, adminLng], {icon: adminIcon}).addTo(map).bindPopup('<b style="color:#2563eb">HQ (You)</b>');

                    if(allRiderBounds.length === 0) map.setView([adminLat, adminLng], 14);
                },
                (err) => {
                    const statusEl = document.getElementById('gps-status');
                    if(statusEl) statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-500"></i> GPS Permission Denied`;
                },
                { enableHighAccuracy: true }
            );
        }
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return (R * c).toFixed(1);
    },

    loadLeafletLib() {
        return new Promise((resolve) => {
            const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
            const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = resolve; document.head.appendChild(script);
        });
    },

    initMap() {
        map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        // Light Theme Tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
        document.getElementById('map-loader').classList.add('hidden');
    },

    startTracking(db) {
        partnersRef = db.ref('deliveryBoys');
        partnersRef.on('value', snap => {
            if (!map || !markersLayer) return;
            markersLayer.clearLayers();
            allRiderBounds = [];
            if(adminLat) allRiderBounds.push([adminLat, adminLng]);

            if (snap.exists()) {
                Object.values(snap.val()).forEach(p => {
                    if (p.location && p.location.lat && p.location.lng) {
                        const isOnline = p.status === 'online';
                        const color = isOnline ? '#22c55e' : '#94a3b8';

                        // 🔥 BATTERY FIX: Parse Int to remove existing % symbol
                        const batteryVal = parseInt(p.battery) || 0;

                        // 🔥 DISTANCE CALCULATION
                        let distBadge = '';
                        if(adminLat) {
                            const km = this.calculateDistance(adminLat, adminLng, p.location.lat, p.location.lng);
                            if(km) distBadge = `<div style="margin-top:4px; font-weight:bold; color:#2563eb; font-size:11px;"><i class="fa-solid fa-route"></i> ${km} KM from HQ</div>`;
                        }

                        // 🔥 CALL BUTTON FIX: Text White color force kiya
                        const customIcon = L.divIcon({ 
                            className: 'custom-map-icon', 
                            html: `<div style="background:${color}; width:32px; height:32px; border-radius:50%; border:3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-motorcycle text-white text-[10px]"></i></div>`, 
                            iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
                        });

                        const marker = L.marker([p.location.lat, p.location.lng], {icon: customIcon})
                            .bindPopup(`
                                <div style="text-align:center; min-width: 150px; font-family: sans-serif;">
                                    <h3 style="font-weight:bold; color:#1e293b; font-size:14px; margin-bottom:4px;">${p.name}</h3>
                                    <div style="display:flex; justify-content:center; gap:8px; margin-bottom:8px;">
                                        <span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; background:${isOnline?'#dcfce7':'#f1f5f9'}; color:${isOnline?'#166534':'#64748b'};">${p.status.toUpperCase()}</span>
                                        <span style="font-size:10px; color:#475569;"><i class="fa-solid fa-battery-half"></i> ${batteryVal}%</span>
                                    </div>
                                    ${distBadge}
                                    <a href="tel:${p.mobile}" style="display:block; width:100%; background-color:#2563eb; color:#ffffff; font-weight:bold; font-size:12px; padding:8px 0; border-radius:6px; text-decoration:none; margin-top:8px;">
                                        CALL RIDER
                                    </a>
                                </div>
                            `);

                        markersLayer.addLayer(marker);
                        if (isOnline) allRiderBounds.push([p.location.lat, p.location.lng]);
                    }
                });
            }
        });
    }
};
