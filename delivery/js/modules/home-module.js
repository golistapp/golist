// ==========================================
// FILE: js/modules/home-module.js
// (UI Layout & Event Binding)
// ==========================================

import { state } from '../state.js';
import { toggleMenu, showToast } from '../utils.js';
import { HomeActions } from './home-actions.js'; // Logic Import

export const HomeModule = {
    // 1. HTML TEMPLATE (View)
    render: () => {
        const user = state.user || {};
        return `
        <header class="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3">
                <button id="menuBtn" class="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 transition active:scale-95 bg-gray-100 rounded-full">
                    <i class="fa-solid fa-bars text-lg"></i>
                </button>
                <div>
                    <h1 class="text-sm font-bold leading-none text-gray-900">${user.name || 'Partner'}</h1>
                    <p class="text-[10px] text-gray-500 mt-1 uppercase font-bold" id="vehicleType">${user.vehicle || 'Bike'}</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button id="sosBtn" class="w-9 h-9 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-600 hover:text-white transition shadow-sm animate-pulse">
                    <i class="fa-solid fa-bell text-xs"></i>
                </button>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500" id="dutyStatusText">OFFLINE</span>
                    <div class="relative inline-block w-12 mr-1 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" name="toggle" id="dutySwitch" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 left-0 top-0 z-10 shadow-sm"/>
                        <label for="dutySwitch" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer transition-colors duration-300"></label>
                    </div>
                </div>
            </div>
        </header>

        <div id="menuOverlay" class="overlay fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"></div>
        <div id="sidebar" class="sidebar fixed top-0 left-0 h-full w-[80%] max-w-[280px] bg-white z-50 shadow-2xl flex flex-col border-r border-gray-200">
            <div class="p-6 bg-gray-50 border-b border-gray-200">
                <div class="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-3 border-2 border-amber-500 shadow-sm overflow-hidden">
                    <i class="fa-solid fa-user text-2xl text-gray-400"></i>
                </div>
                <h2 class="font-bold text-lg text-gray-900">${user.name}</h2>
                <p class="text-xs text-gray-500 font-mono">+91 ${user.mobile}</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <button id="changePinBtn" class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold text-sm flex items-center gap-3 transition"><i class="fa-solid fa-key text-amber-500 w-5"></i> Change PIN</button>
                <button id="historyBtn" class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold text-sm flex items-center gap-3 transition"><i class="fa-solid fa-clock-rotate-left text-amber-500 w-5"></i> Settlement History</button>
                <button id="vehInfoBtn" class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold text-sm flex items-center gap-3 transition"><i class="fa-solid fa-motorcycle text-amber-500 w-5"></i> Vehicle Info</button>
                <button id="addWsBtn" class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-semibold text-sm flex items-center gap-3 transition"><i class="fa-solid fa-store text-amber-500 w-5"></i> Add Wholesaler Shop</button>
                <div class="h-px bg-gray-200 my-2"></div>
                <button id="logoutBtn" class="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 font-semibold text-sm flex items-center gap-3 transition"><i class="fa-solid fa-power-off w-5"></i> Logout</button>
            </nav>
        </div>

        <div class="px-4 mt-20 pb-24">

            <div id="wholesalerStrip" class="hidden mb-4">
                <div class="flex justify-between items-end mb-2 px-1">
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest"><i class="fa-solid fa-shop text-amber-600 mr-1"></i> Nearby Wholesalers</h3>
                    <span class="text-[9px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded font-bold">Verified</span>
                </div>
                <div id="wsListContainer" class="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x w-full"></div>
            </div>

            <div id="radiusControl" class="hidden bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest"><i class="fa-solid fa-crosshairs text-amber-600 mr-1"></i> Scanning Range</h3>
                    <span class="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200"><span id="radiusVal">5</span> KM</span>
                </div>
                <input type="range" min="1" max="10" value="5" class="w-full accent-amber-500" id="radiusSlider">
                <p class="text-[10px] text-gray-400 mt-1 text-center font-medium">Showing orders within this circle.</p>
            </div>

            <div id="statsSection" class="hidden grid grid-cols-2 gap-3 mb-6">
                <div class="bg-white rounded-xl p-3 border border-gray-200 flex flex-col items-center shadow-sm">
                    <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Earnings</span>
                    <span class="text-xl font-bold text-green-600 mt-1">₹<span id="earnings">0</span></span>
                </div>
                <div class="bg-white rounded-xl p-3 border border-gray-200 flex flex-col items-center shadow-sm">
                    <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Trips</span>
                    <span class="text-xl font-bold text-amber-600 mt-1" id="trips">0</span>
                </div>
            </div>

            <div id="offlineState" class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400 shadow-inner"><i class="fa-solid fa-power-off text-3xl"></i></div>
                <h2 class="text-lg font-bold text-gray-700">You are Offline</h2>
                <p class="text-sm text-gray-500 mt-1">Go Online to start your shift</p>
            </div>

            <div id="noOrdersState" class="hidden flex flex-col items-center justify-center py-12 text-center">
                <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4 relative border border-amber-100">
                    <span class="absolute w-full h-full rounded-full animate-ping bg-amber-400/30"></span>
                    <i class="fa-solid fa-radar text-3xl text-amber-500"></i>
                </div>
                <h2 class="text-lg font-bold text-gray-700">Scanning <span id="scanKm">5</span> KM Area...</h2>
                <p class="text-xs text-gray-500 mt-4 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm"><i class="fa-solid fa-location-dot mr-1 text-blue-500"></i> <span id="locStatus">GPS Waiting...</span></p>
            </div>

            <div id="ordersContainer" class="hidden space-y-4 pb-20">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Nearby Tasks</span>
                    <span id="orderCount" class="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px]">0</span>
                </h3>
                <div id="ordersList" class="space-y-4"></div>
            </div>

            <div id="activeOrderPanel" class="hidden fixed inset-0 z-50 bg-gray-50 flex flex-col animate-[slideUp_0.3s_ease-out]">
                <div class="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                    <h2 class="font-bold text-amber-600">Live Task</h2>
                    <span class="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded uppercase font-bold" id="activeStatus">Processing</span>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-4">
                    <div id="liveMapSection" class="hidden animate-[fadeIn_0.5s_ease-out]">
                        <div class="flex justify-between items-end mb-2">
                            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest"><i class="fa-solid fa-map text-blue-500 mr-1"></i> Smart Route</h3>
                            <button id="recenterBtn" class="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-bold hover:bg-blue-600 hover:text-white transition flex items-center gap-1"><i class="fa-solid fa-location-crosshairs"></i> Recenter</button>
                        </div>
                        <div class="map-container shadow-md bg-white">
                            <div id="deliveryMap"></div>
                            <div id="mapLoader" class="absolute inset-0 bg-gray-50/90 flex flex-col items-center justify-center z-[1000]">
                                <i class="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500 mb-2"></i>
                                <span class="text-gray-600 text-xs font-bold">Connecting GPS...</span>
                            </div>
                        </div>
                        <div id="smartDashboard" class="flex gap-2 mt-3 h-20">
                            <div class="w-[75%] bg-white rounded-xl border border-gray-200 p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-center">
                                <div id="activeWholesalerCard"><p class="text-[10px] text-gray-400 text-center">Loading Shops...</p></div>
                            </div>
                            <div class="w-[25%] bg-blue-50 rounded-xl border border-blue-100 p-2 shadow-sm flex flex-col items-center justify-center text-center">
                                <p class="text-[9px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Time</p>
                                <h3 class="text-lg font-extrabold text-blue-700 leading-none" id="liveTimeBox">--</h3>
                                <p class="text-[8px] text-blue-400 mt-1" id="liveDistBox">--</p>
                            </div>
                        </div>
                    </div>

                    <div class="relative pl-6 border-l-2 border-gray-200 ml-1">
                        <span class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></span>
                        <h3 class="text-xs font-bold text-gray-400 uppercase">Partner (You)</h3>
                        <p class="text-lg font-bold text-gray-900 mt-0.5" id="actShop">You</p>
                        <p class="text-xs text-green-600 font-bold flex items-center gap-1" id="actShopLoc"><span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live Tracking Active</p>
                    </div>
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h4 class="text-xs font-bold text-gray-400 uppercase mb-3 border-b border-gray-100 pb-2">Order Items</h4>
                        <ul id="actItems" class="text-sm text-gray-700 space-y-2 font-medium"></ul>
                    </div>
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h4 class="text-xs font-bold text-gray-400 uppercase mb-3 border-b border-gray-100 pb-2">Trip & Preferences</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><p class="text-[10px] text-gray-400 font-bold uppercase">Pref. Time</p><p class="text-sm font-bold text-blue-600" id="actPrefTime">--</p></div>
                            <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><p class="text-[10px] text-gray-400 font-bold uppercase">Budget</p><p class="text-sm font-bold text-pink-600" id="actPrefBudget">--</p></div>
                            <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><p class="text-[10px] text-gray-400 font-bold uppercase">Order Time</p><p class="text-sm font-bold text-gray-800" id="actOrderTime">--:--</p></div>
                            <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><p class="text-[10px] text-gray-400 font-bold uppercase">Distance</p><p class="text-sm font-bold text-amber-600" id="actDist">Calc...</p></div>
                        </div>
                        <div id="actExtraDetails" class="mt-3 space-y-2"></div>
                    </div>
                    <div class="relative pl-6 border-l-2 border-gray-200 ml-1">
                        <span class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></span>
                        <h3 class="text-xs font-bold text-gray-400 uppercase">Deliver To</h3>
                        <p class="text-lg font-bold text-gray-900 mt-0.5" id="actCust">Customer Name</p>
                        <p class="text-sm text-gray-500" id="actAddr">Address</p>
                        <div class="flex gap-2 mt-3">
                            <button id="navBtn" class="flex-1 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-2 shadow-sm"><i class="fa-solid fa-location-arrow"></i> Navigate</button>
                            <button id="waBtn" class="bg-green-50 text-green-600 border border-green-200 px-3 py-2.5 rounded-lg text-xs hover:bg-green-600 hover:text-white shadow-sm transition"><i class="fa-brands fa-whatsapp text-lg"></i></button>
                            <button id="callBtn" class="bg-gray-100 border border-gray-200 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-200 shadow-sm transition"><i class="fa-solid fa-phone text-lg"></i></button>
                        </div>
                    </div>

                    <!-- UPDATED LABEL FOR TOTAL CASH COLLECTION -->
                    <div class="bg-white p-4 rounded-xl flex justify-between items-center border border-gray-200 shadow-sm">
                        <span class="text-sm text-gray-500 font-bold">Total Bill (Collect Cash)</span>
                        <span class="text-2xl font-bold text-gray-900">₹<span id="actFee">0</span></span>
                    </div>

                </div>
                <div class="p-5 bg-white border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                    <button id="actionBtn" class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition">UPDATE STATUS</button>
                </div>
            </div>

            <!-- HISTORY MODAL -->
            <div id="historyModal" class="hidden fixed inset-0 z-[100] bg-gray-50 flex flex-col w-full h-full modal-animate">
                <div class="bg-white p-4 border-b border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-lg text-gray-900">Settlement History</h3>
                        <p class="text-[10px] text-gray-400 font-bold uppercase">Past Payouts</p>
                    </div>
                    <button id="closeHistModal" class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="settlementList" class="flex-1 overflow-y-auto p-4 space-y-3">
                    <div class="text-center py-10 opacity-50">
                        <i class="fa-solid fa-clock-rotate-left text-3xl text-gray-300 mb-2"></i>
                        <p class="text-xs text-gray-400 font-bold">Loading records...</p>
                    </div>
                </div>
            </div>

            <div id="wholesalerModal" class="hidden fixed inset-0 z-[100] bg-gray-50 flex flex-col w-full h-full modal-animate">
                <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-center relative shadow-md shrink-0">
                    <button id="closeWsModal" class="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-white hover:bg-white/30 transition"><i class="fa-solid fa-arrow-left"></i></button>
                    <h3 class="font-extrabold text-white text-base uppercase tracking-wide mt-1"><i class="fa-solid fa-sack-dollar mr-1"></i> Earn Incentive</h3>
                    <p class="text-xs text-white/90 mt-2 font-bold leading-tight px-8">Add and verify wholesalers to earn extra incentives on every order!</p>
                </div>
                <div class="p-5 overflow-y-auto space-y-6 flex-1 bg-gray-50 pb-20">
                    <div class="bg-white p-5 rounded-xl border border-gray-200 relative shadow-sm">
                        <input type="hidden" id="wsEditId" value="">
                        <h4 class="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><i class="fa-solid fa-shop text-amber-500"></i> Add New Shop</h4>
                        <div class="space-y-4">
                            <button id="btnConnectLoc" class="w-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm"><i class="fa-solid fa-location-crosshairs text-lg"></i> Connect Live Location</button>
                            <div class="grid grid-cols-1 gap-4">
                                <input type="text" id="wsName" placeholder="Wholesaler Shop Name" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3.5 text-gray-900 text-sm focus:outline-none focus:border-amber-500 font-bold placeholder-gray-400">
                                <input type="tel" id="wsMobile" placeholder="Owner Mobile Number" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3.5 text-gray-900 text-sm focus:outline-none focus:border-amber-500 font-bold placeholder-gray-400">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Shop Address</label>
                                <textarea id="wsAddress" placeholder="Address will auto-fill from location..." class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-xs mt-1 h-24 focus:outline-none focus:border-amber-500 resize-none leading-relaxed placeholder-gray-400"></textarea>
                                <input type="hidden" id="wsLat"><input type="hidden" id="wsLng">
                            </div>
                            <button id="btnWsSubmit" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl text-sm shadow-md shadow-amber-200 transition mt-2 transform active:scale-95">SUBMIT FOR VERIFICATION</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase mb-3 border-b border-gray-200 pb-2">My Added Shops</h4>
                        <div id="myWholesalerList" class="space-y-3 pb-10"></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // 2. CONNECT HTML TO ACTIONS
    init: (onLogout) => {
        // --- Sidebar & General Toggles ---
        document.getElementById('menuBtn').onclick = toggleMenu;
        document.getElementById('menuOverlay').onclick = toggleMenu;
        document.getElementById('sosBtn').onclick = () => window.open(`https://wa.me/917903698180?text=SOS_EMERGENCY`, '_blank');

        document.getElementById('logoutBtn').onclick = () => { if(confirm("Logout?")) onLogout(); };

        // --- Connect Logic from HomeActions ---
        HomeActions.initListeners(onLogout);

        // Duty Toggle
        const dutySwitch = document.getElementById('dutySwitch');
        dutySwitch.onchange = () => HomeActions.toggleDuty();

        // Restore previous duty state
        if(localStorage.getItem('rmz_duty_on') === 'true') { 
            dutySwitch.checked = true; 
            HomeActions.toggleDuty(); 
        }

        // Radius Slider
        document.getElementById('radiusSlider').oninput = (e) => { 
            localStorage.setItem('rmz_pref_radius', e.target.value);
            document.getElementById('radiusVal').innerText = e.target.value; 
            HomeActions.listenOrders(); 
        };

        // --- Sidebar Actions ---
        document.getElementById('changePinBtn').onclick = () => { toggleMenu(); HomeActions.changePin(); };
        document.getElementById('historyBtn').onclick = () => { toggleMenu(); HomeActions.openSettlementHistory(); };
        document.getElementById('vehInfoBtn').onclick = () => { toggleMenu(); HomeActions.updateVehicle(); };

        // --- History Modal Actions ---
        document.getElementById('closeHistModal').onclick = () => document.getElementById('historyModal').classList.add('hidden');

        // --- Wholesaler Modal Actions ---
        const wsModal = document.getElementById('wholesalerModal');
        document.getElementById('addWsBtn').onclick = () => { 
            toggleMenu(); 
            wsModal.classList.remove('hidden'); 
            HomeActions.loadMyRequests(); 
        };
        document.getElementById('closeWsModal').onclick = () => wsModal.classList.add('hidden');

        document.getElementById('btnConnectLoc').onclick = () => {
            if(!navigator.geolocation) return alert("No GPS");
            navigator.geolocation.getCurrentPosition(p => {
                document.getElementById('wsLat').value = p.coords.latitude; 
                document.getElementById('wsLng').value = p.coords.longitude;
                document.getElementById('btnConnectLoc').innerHTML = '<i class="fa-solid fa-check"></i> Connected';
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.coords.latitude}&lon=${p.coords.longitude}`)
                    .then(r=>r.json())
                    .then(d => document.getElementById('wsAddress').value = d.display_name)
                    .catch(()=>document.getElementById('wsAddress').value = `Lat: ${p.coords.latitude}, Lng: ${p.coords.longitude}`);
            });
        };

        document.getElementById('btnWsSubmit').onclick = HomeActions.submitWholesalerRequest;
    }
};
