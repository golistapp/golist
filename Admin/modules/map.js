// modules/map.js

let map = null;
let markersLayer = null;
let partnersRef = null;
let watchId = null; 

// Variables
let adminLat = null;
let adminLng = null;
let adminMarker = null;
let allRiderBounds = [];

export default {
    async render(container, db) {
        // 🔥 Layout Updated: Header compact & Map Maximized
        container.innerHTML = `
            <div class="h-full flex flex-col fade-in">

                <div class="flex justify-between items-center shrink-0 border-b border-slate-800 pb-2 mb-1 px-1">
                    <div>
                        <h2 class="text-lg font-bold text-white leading-none">Live Map</h2>
                    </div>

                    <div class="flex items-center gap-2">

                        <div class="flex items-center bg-slate-900 rounded-lg border border-slate-800 h-8 px-2">
                            <div class="flex items-center gap-1.5 pr-2 border-r border-slate-700">
                                <i class="fa-solid fa-users text-slate-400 text-[10px]"></i>
                                <span id="stat-total" class="text-xs font-bold text-blue-400">0</span>
                            </div>
                            <div class="flex items-center gap-1.5 px-2 border-r border-slate-700">
                                <span class="relative flex h-2 w-2">
                                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span id="stat-online" class="text-xs font-bold text-white">0</span>
                            </div>
                            <div class="flex items-center gap-1.5 pl-2">
                                <span class="h-2 w-2 rounded-full bg-slate-600"></span>
                                <span id="stat-offline" class="text-xs font-bold text-slate-500">0</span>
                            </div>
                        </div>

                        <button id="btn-recenter" class="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-900/20 transition active:scale-95">
                            <i class="fa-solid fa-crosshairs text-sm"></i>
                        </button>
                    </div>
                </div>

                <div class="flex-1 bg-slate-900 sm:rounded-xl border-x border-b sm:border border-slate-800 relative overflow-hidden shadow-2xl -mx-4 sm:mx-0 mb-[-20px] sm:mb-0">

                    <div id="map" class="w-full h-full z-10 bg-slate-100"></div>

                    <div id="map-loader" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50">
                        <i class="fa-solid fa-map-location-dot text-4xl text-blue-500 mb-3 animate-bounce"></i>
                        <p class="text-slate-400 text-sm font-bold animate-pulse">Initializing Satellites...</p>
                    </div>

                    <div class="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur text-slate-800 px-3 py-1.5 rounded-lg shadow-lg border border-slate-200 text-[10px] font-bold">
                        <span id="gps-status" class="flex items-center gap-1 text-amber-600">
                            <i class="fa-solid fa-circle-notch fa-spin"></i> GPS Starting...
                        </span>
                    </div>
                </div>
            </div>
        `;

        if (!window.L) await this.loadLeafletLib();
        this.initMap();
        this.startFastGPS(); 
        this.startTracking(db);
        this.attachEvents();
    },

    cleanup() {
        if (partnersRef) partnersRef.off();
        if (map) { map.remove(); map = null; }
        if (watchId) navigator.geolocation.clearWatch(watchId); 
        allRiderBounds = [];
    },

    attachEvents() {
        // Track All Button (Icon Only)
        document.getElementById('btn-recenter').addEventListener('click', () => {
            if (allRiderBounds.length > 0) {
                map.fitBounds(allRiderBounds, { padding: [50, 50], maxZoom: 16 });
            } else {
                // Agar koi rider nahi hai, to Admin location par focus karo
                if(adminLat && map) {
                    map.setView([adminLat, adminLng], 15);
                } else {
                    alert("No riders found to track.");
                }
            }
        });
    },

    // --- Fast GPS Logic ---
    startFastGPS() {
        if (!navigator.geolocation) {
            this.updateGPSStatus("No GPS", "red");
            return;
        }

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                adminLat = position.coords.latitude;
                adminLng = position.coords.longitude;

                this.updateGPSStatus("GPS Live", "green");

                // Update Admin Marker
                const adminIcon = L.divIcon({ 
                    className: 'custom-map-icon', 
                    html: `<div style="background:#2563eb; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow: 0 0 0 4px rgba(37,99,235,0.2);"></div>` 
                });

                if(adminMarker) map.removeLayer(adminMarker);
                adminMarker = L.marker([adminLat, adminLng], {icon: adminIcon, zIndexOffset: 1000})
                    .addTo(map)
                    .bindPopup('<b style="color:#2563eb">HQ (You)</b>');

                // First time recenter
                if(allRiderBounds.length === 0 && map.getZoom() < 10) {
                    map.setView([adminLat, adminLng], 14);
                }
            },
            (err) => {
                this.updateGPSStatus("Weak Signal", "red");
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
    },

    updateGPSStatus(msg, color) {
        const el = document.getElementById('gps-status');
        if(!el) return;
        const colorClass = color === 'green' ? 'text-green-600' : 'text-red-500';
        const icon = color === 'green' ? 'fa-circle-check' : 'fa-triangle-exclamation';
        el.className = `flex items-center gap-1 ${colorClass}`;
        el.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
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

            // Stats Counters
            let countTotal = 0;
            let countOnline = 0;
            let countOffline = 0;

            if(adminLat) allRiderBounds.push([adminLat, adminLng]);

            if (snap.exists()) {
                Object.values(snap.val()).forEach(p => {
                    countTotal++;
                    if(p.status === 'online') countOnline++; else countOffline++;

                    if (p.location && p.location.lat && p.location.lng) {
                        const isOnline = p.status === 'online';
                        const color = isOnline ? '#22c55e' : '#64748b'; 

                        // Distance Logic (Works for ALL riders)
                        let distBadge = '';
                        if(adminLat) {
                            const km = this.calculateDistance(adminLat, adminLng, p.location.lat, p.location.lng);
                            if(km) distBadge = `<div style="margin-top:6px; font-weight:bold; color:#2563eb; font-size:11px; border-top:1px solid #e2e8f0; padding-top:4px;"><i class="fa-solid fa-route"></i> ${km} KM from HQ</div>`;
                        } else {
                            distBadge = `<div style="margin-top:6px; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:4px;">Wait for HQ GPS...</div>`;
                        }

                        // Last Seen Logic
                        let lastSeen = 'Never';
                        if(p.lastHeartbeat) {
                            const diff = Date.now() - p.lastHeartbeat;
                            const mins = Math.floor(diff / 60000);
                            lastSeen = mins < 1 ? 'Just now' : (mins > 60 ? `${Math.floor(mins/60)}h ago` : `${mins}m ago`);
                        }

                        const customIcon = L.divIcon({ 
                            className: 'custom-map-icon', 
                            html: `<div style="background:${color}; width:32px; height:32px; border-radius:50%; border:3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-motorcycle text-white text-[10px]"></i></div>`, 
                            iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
                        });

                        const marker = L.marker([p.location.lat, p.location.lng], {icon: customIcon})
                            .bindPopup(`
                                <div style="text-align:center; min-width: 160px; font-family: sans-serif;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                        <h3 style="font-weight:bold; color:#1e293b; font-size:14px; margin:0;">${p.name}</h3>
                                        <span style="font-size:10px; color:#64748b;">${lastSeen}</span>
                                    </div>
                                    <div style="display:flex; justify-content:center; gap:8px; margin-bottom:8px;">
                                        <span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; background:${isOnline?'#dcfce7':'#f1f5f9'}; color:${isOnline?'#166534':'#64748b'};">${p.status.toUpperCase()}</span>
                                        <span style="font-size:10px; color:#475569;"><i class="fa-solid fa-battery-half"></i> ${parseInt(p.battery)||0}%</span>
                                    </div>
                                    ${distBadge}
                                    <a href="tel:${p.mobile}" style="display:block; width:100%; background-color:#2563eb; color:#ffffff; font-weight:bold; font-size:12px; padding:8px 0; border-radius:6px; text-decoration:none; margin-top:8px;">
                                        CALL RIDER
                                    </a>
                                </div>
                            `);

                        markersLayer.addLayer(marker);
                        allRiderBounds.push([p.location.lat, p.location.lng]);
                    }
                });
            }

            // Update UI Stats
            if(document.getElementById('stat-total')) {
                document.getElementById('stat-total').innerText = countTotal;
                document.getElementById('stat-online').innerText = countOnline;
                document.getElementById('stat-offline').innerText = countOffline;
            }
        });
    }
};
