// modules/map.js

let map = null;
let ridersLayer = null; // Layer for Riders
let shopsLayer = null;  // Layer for Wholesalers
let partnersRef = null;
let shopsRef = null;
let watchId = null; 

// State Management
let partnersData = {};
let shopsData = {};
let currentFilter = 'ALL'; // 'ALL', 'ONLINE', 'OFFLINE'
let isShopsVisible = false;

// Variables
let adminLat = null;
let adminLng = null;
let adminMarker = null;
let allBounds = []; // For auto-centering

export default {
    async render(container, db) {
        // 🔥 UI Updated: Interactive Buttons & Shop Toggle
        container.innerHTML = `
            <div class="h-full flex flex-col fade-in">

                <div class="flex justify-between items-center shrink-0 border-b border-slate-800 pb-2 mb-1 px-1">
                    <div>
                        <h2 class="text-lg font-bold text-white leading-none">Live Map</h2>
                    </div>

                    <div class="flex items-center gap-2">

                        <!-- Filter Buttons (iPhone Style Pill) -->
                        <div class="flex items-center bg-slate-900 rounded-lg border border-slate-800 h-8 overflow-hidden select-none">
                            <!-- Total / All -->
                            <button id="filter-all" class="flex items-center gap-1.5 px-3 h-full border-r border-slate-700 hover:bg-slate-800 transition group active-filter bg-slate-800">
                                <i class="fa-solid fa-users text-slate-400 text-[10px] group-hover:text-white"></i>
                                <span id="stat-total" class="text-xs font-bold text-blue-400">0</span>
                            </button>

                            <!-- Online -->
                            <button id="filter-online" class="flex items-center gap-1.5 px-3 h-full border-r border-slate-700 hover:bg-slate-800 transition group">
                                <span class="relative flex h-2 w-2">
                                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span id="stat-online" class="text-xs font-bold text-white">0</span>
                            </button>

                            <!-- Offline -->
                            <button id="filter-offline" class="flex items-center gap-1.5 px-3 h-full hover:bg-slate-800 transition group">
                                <span class="h-2 w-2 rounded-full bg-slate-600"></span>
                                <span id="stat-offline" class="text-xs font-bold text-slate-500 group-hover:text-slate-300">0</span>
                            </button>
                        </div>

                        <!-- Shop Toggle Button -->
                        <button id="btn-toggle-shops" class="h-8 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition flex items-center gap-2 shadow-sm">
                            <i class="fa-solid fa-store"></i>
                            <span class="text-[10px] font-bold uppercase hidden sm:inline">Shops</span>
                        </button>

                        <!-- Recenter Button -->
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

                <style>
                    .active-filter { background-color: #1e293b !important; }
                    .active-filter i, .active-filter span { color: white !important; }
                    .shop-btn-active { background-color: #451a03 !important; border-color: #f59e0b !important; color: #f59e0b !important; }
                </style>
            </div>
        `;

        if (!window.L) await this.loadLeafletLib();
        this.initMap();
        this.startFastGPS(); 
        this.startTracking(db);
        this.attachEvents(db);
    },

    cleanup() {
        if (partnersRef) partnersRef.off();
        if (shopsRef) shopsRef.off();
        if (map) { map.remove(); map = null; }
        if (watchId) navigator.geolocation.clearWatch(watchId); 
        partnersData = {};
        shopsData = {};
        allBounds = [];
    },

    attachEvents(db) {
        // Filter Buttons
        document.getElementById('filter-all').addEventListener('click', () => this.setFilter('ALL'));
        document.getElementById('filter-online').addEventListener('click', () => this.setFilter('ONLINE'));
        document.getElementById('filter-offline').addEventListener('click', () => this.setFilter('OFFLINE'));

        // Toggle Shops
        document.getElementById('btn-toggle-shops').addEventListener('click', () => {
            isShopsVisible = !isShopsVisible;
            const btn = document.getElementById('btn-toggle-shops');

            if(isShopsVisible) {
                btn.classList.add('shop-btn-active');
                if(!shopsRef) this.loadShops(db); // Load data if not already loaded
                else this.renderShops(); // Just render if data exists
            } else {
                btn.classList.remove('shop-btn-active');
                if(shopsLayer) shopsLayer.clearLayers();
            }
        });

        // Recenter
        document.getElementById('btn-recenter').addEventListener('click', () => {
            if (allBounds.length > 0) {
                map.fitBounds(allBounds, { padding: [50, 50], maxZoom: 16 });
            } else if(adminLat) {
                map.setView([adminLat, adminLng], 15);
            } else {
                alert("No active locations to track.");
            }
        });
    },

    setFilter(filterType) {
        currentFilter = filterType;

        // Update UI
        ['filter-all', 'filter-online', 'filter-offline'].forEach(id => document.getElementById(id).classList.remove('active-filter'));

        if(filterType === 'ALL') document.getElementById('filter-all').classList.add('active-filter');
        else if(filterType === 'ONLINE') document.getElementById('filter-online').classList.add('active-filter');
        else if(filterType === 'OFFLINE') document.getElementById('filter-offline').classList.add('active-filter');

        this.renderRiders(); // Re-render markers based on new filter
    },

    // --- Core Logic ---

    initMap() {
        map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);

        // Initialize Layers
        ridersLayer = L.layerGroup().addTo(map);
        shopsLayer = L.layerGroup().addTo(map);

        document.getElementById('map-loader').classList.add('hidden');
    },

    // 1. RIDERS LOGIC
    startTracking(db) {
        partnersRef = db.ref('deliveryBoys');
        partnersRef.on('value', snap => {
            if (!snap.exists()) {
                partnersData = {};
                this.updateStats(0, 0, 0);
                return;
            }
            partnersData = snap.val();
            this.renderRiders();
        });
    },

    renderRiders() {
        if (!map || !ridersLayer) return;
        ridersLayer.clearLayers();
        allBounds = [];

        if(adminLat) allBounds.push([adminLat, adminLng]);

        let countTotal = 0;
        let countOnline = 0;
        let countOffline = 0;

        Object.values(partnersData).forEach(p => {
            // Stats Calculation
            countTotal++;
            const isOnline = p.status === 'online';
            if (isOnline) countOnline++; else countOffline++;

            // FILTER LOGIC
            if (currentFilter === 'ONLINE' && !isOnline) return;
            if (currentFilter === 'OFFLINE' && isOnline) return;

            if (p.location && p.location.lat && p.location.lng) {
                // Determine Color
                const color = isOnline ? '#22c55e' : '#64748b'; 

                // Distance Logic
                let distBadge = '';
                if(adminLat) {
                    const km = this.calculateDistance(adminLat, adminLng, p.location.lat, p.location.lng);
                    if(km) distBadge = `<div style="margin-top:6px; font-weight:bold; color:#2563eb; font-size:11px; border-top:1px solid #e2e8f0; padding-top:4px;"><i class="fa-solid fa-route"></i> ${km} KM from HQ</div>`;
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

                ridersLayer.addLayer(marker);
                allBounds.push([p.location.lat, p.location.lng]);
            }
        });

        this.updateStats(countTotal, countOnline, countOffline);
    },

    updateStats(total, online, offline) {
        if(document.getElementById('stat-total')) {
            document.getElementById('stat-total').innerText = total;
            document.getElementById('stat-online').innerText = online;
            document.getElementById('stat-offline').innerText = offline;
        }
    },

    // 2. SHOPS LOGIC
    loadShops(db) {
        shopsRef = db.ref('wholesalerRequests');
        shopsRef.on('value', snap => {
            if(!snap.exists()) {
                shopsData = {};
                return;
            }
            shopsData = snap.val();
            if(isShopsVisible) this.renderShops();
        });
    },

    renderShops() {
        if (!map || !shopsLayer) return;
        shopsLayer.clearLayers();

        Object.values(shopsData).forEach(s => {
            if (s.location && s.location.lat && s.location.lng && s.status !== 'disabled') {

                const shopIcon = L.divIcon({ 
                    className: 'custom-map-icon', 
                    html: `<div style="background:#f59e0b; width:28px; height:28px; border-radius:6px; border:2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-store text-white text-[10px]"></i></div>`, 
                    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14]
                });

                const marker = L.marker([s.location.lat, s.location.lng], {icon: shopIcon})
                    .bindPopup(`
                        <div style="text-align:center; min-width: 140px; font-family: sans-serif;">
                            <h3 style="font-weight:bold; color:#d97706; font-size:13px; margin-bottom:2px;">${s.shopName}</h3>
                            <p style="font-size:10px; color:#64748b; margin-bottom:6px;">${s.ownerMobile}</p>
                            <div style="font-size:10px; background:#fef3c7; color:#d97706; padding:2px 4px; border-radius:4px; display:inline-block; font-weight:bold;">
                                WHOLESALER
                            </div>
                        </div>
                    `);

                shopsLayer.addLayer(marker);
            }
        });
    },

    // --- Helpers ---

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

                const adminIcon = L.divIcon({ 
                    className: 'custom-map-icon', 
                    html: `<div style="background:#2563eb; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow: 0 0 0 4px rgba(37,99,235,0.2);"></div>` 
                });

                if(adminMarker) map.removeLayer(adminMarker);
                adminMarker = L.marker([adminLat, adminLng], {icon: adminIcon, zIndexOffset: 1000})
                    .addTo(map)
                    .bindPopup('<b style="color:#2563eb">HQ (You)</b>');

                // First time recenter only if no bounds exist
                if(allBounds.length === 0 && map.getZoom() < 10) {
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
            if(window.L) return resolve();
            const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
            const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = resolve; document.head.appendChild(script);
        });
    }
};
