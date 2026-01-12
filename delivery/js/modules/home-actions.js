// ==========================================
// FILE: js/modules/home-actions.js
// (Final Fix: Special Requests, Global Wholesalers, Auto-Online)
// ==========================================

import { db, firebase } from '../firebase.js';
import { state } from '../state.js';
import { 
    showToast, toggleMenu, getDistance, calculateOrderWeight, 
    initDeliveryMap, drawRoute, openMap, triggerCelebration 
} from '../utils.js';

// Constants
const GPS_UPDATE_THRESHOLD_KM = 0.03; // 30 Meters
const PARTNER_PAY = 20;

// Local Variables
let lastSentLat = 0;
let lastSentLng = 0;

export const HomeActions = {

    // --- 1. GLOBAL BINDING (Buttons ke liye zaroori) ---
    exposeToWindow: () => {
        window.toggleDuty = HomeActions.toggleDuty;
        window.updateRadius = HomeActions.updateRadius;
        window.acceptOrder = HomeActions.acceptOrder;
        window.changeStatus = HomeActions.changeStatus;
        window.callCust = HomeActions.callCust;
        window.openWhatsApp = HomeActions.openWhatsApp;
        window.callShop = HomeActions.callShop; // New

        window.openWholesalerModal = HomeActions.openWholesalerModal;
        window.closeWholesalerModal = HomeActions.closeWholesalerModal;
        window.connectWholesalerLocation = HomeActions.connectWholesalerLocation;
        window.submitWholesalerRequest = HomeActions.submitWholesalerRequest;
        window.changePin = HomeActions.changePin;
        window.updateVehicle = HomeActions.updateVehicle;
        window.recenterMap = () => {
            if(state.currentLat && state.currentLng) initDeliveryMap(state.currentLat, state.currentLng);
        };
    },

    // --- 2. INITIALIZATION & LISTENERS ---
    initListeners: (onLogout) => {
        HomeActions.exposeToWindow(); 

        // A. Earnings Listener
        db.ref('deliveryBoys/' + state.user.mobile).on('value', s => {
            const d = s.val();
            if(d) {
                if(d.status === 'disabled') { alert("Account Disabled"); onLogout(); }
                const earnEl = document.getElementById('earnings');
                const tripEl = document.getElementById('trips');
                if(earnEl) earnEl.innerText = d.earnings || 0;
                if(tripEl) tripEl.innerText = d.trips || 0;
            }
        });

        // B. GLOBAL WHOLESALER LISTENER (Sabhi ke approved stores)
        db.ref('wholesalerRequests').orderByChild('status').equalTo('approved').on('value', snap => {
            state.approvedWholesalers = [];
            if(snap.exists()) {
                snap.forEach(c => {
                    // Store ID and Data push kar rahe hain
                    state.approvedWholesalers.push({ id: c.key, ...c.val() });
                });
            }
            // Jaise hi data aaye, list update karo
            HomeActions.updateWholesalerDisplay();
        });

        // C. AUTO-ONLINE & ACTIVE ORDER CHECK
        setTimeout(() => {
            const dutySwitch = document.getElementById('dutySwitch');

            // Active Order Check
            db.ref('orders').orderByChild('deliveryBoyId').equalTo(state.user.mobile).once('value', snap => {
                let foundActive = false;
                if(snap.exists()) {
                    snap.forEach(c => {
                        const o = c.val();
                        if(o.status !== 'delivered' && o.status !== 'cancelled') {
                            state.activeOrder = { id: c.key, ...o };
                            foundActive = true;
                            HomeActions.renderActiveOrderUI(); // Panel Kholo
                        }
                    });
                }

                // Force Auto-Online if not active order or if offline
                if(dutySwitch && !dutySwitch.checked) {
                    dutySwitch.checked = true;
                    HomeActions.toggleDuty(true); // Automatically Go Online
                }
            });
        }, 1000);
    },

    // --- 3. DUTY TOGGLE (Online/Offline) ---
    toggleDuty: (forceOn = false) => {
        const switchEl = document.getElementById('dutySwitch');
        if(forceOn && switchEl) switchEl.checked = true;

        const isOnline = switchEl ? switchEl.checked : false;
        const statusTxt = document.getElementById('dutyStatusText');

        if(isOnline) {
            // ONLINE STATUS
            if(statusTxt) { statusTxt.innerText = "ONLINE"; statusTxt.className = "text-[10px] font-bold uppercase tracking-wider text-green-600"; }
            document.getElementById('offlineState').classList.add('hidden');

            if(!state.activeOrder) {
                document.getElementById('statsSection').classList.remove('hidden');
                document.getElementById('radiusControl').classList.remove('hidden');
                document.getElementById('ordersContainer').classList.remove('hidden');
                document.getElementById('wholesalerStrip').classList.remove('hidden');
            }

            db.ref('deliveryBoys/'+state.user.mobile+'/status').onDisconnect().set('offline');
            HomeActions.startGPS();
            HomeActions.listenOrders();
            HomeActions.updateWholesalerDisplay();
        } else {
            // OFFLINE STATUS
            if(statusTxt) { statusTxt.innerText = "OFFLINE"; statusTxt.className = "text-[10px] font-bold uppercase tracking-wider text-gray-500"; }

            document.getElementById('offlineState').classList.remove('hidden');
            document.getElementById('noOrdersState').classList.add('hidden');
            document.getElementById('ordersContainer').classList.add('hidden');
            document.getElementById('statsSection').classList.add('hidden');
            document.getElementById('radiusControl').classList.add('hidden');
            document.getElementById('wholesalerStrip').classList.add('hidden');

            HomeActions.stopGPS();
            db.ref('deliveryBoys/'+state.user.mobile+'/status').set('offline');
            db.ref('orders').off(); 
        }
    },

    // --- 4. GPS LOGIC ---
    startGPS: () => {
        if("geolocation" in navigator) {
            db.ref('deliveryBoys/'+state.user.mobile).update({status:'online'});

            state.gpsWatchId = navigator.geolocation.watchPosition(p => {
                state.currentLat = p.coords.latitude;
                state.currentLng = p.coords.longitude;

                const locEl = document.getElementById('locStatus');
                if(locEl) locEl.innerText = "GPS Live";

                // Server Update (Throttled)
                const distMoved = parseFloat(getDistance(lastSentLat, lastSentLng, state.currentLat, state.currentLng));
                if(distMoved >= GPS_UPDATE_THRESHOLD_KM || lastSentLat === 0) {
                    db.ref('deliveryBoys/'+state.user.mobile).update({
                        status:'online',
                        location:{lat:state.currentLat, lng:state.currentLng},
                        lastUpdated: firebase.database.ServerValue.TIMESTAMP
                    });
                    lastSentLat = state.currentLat; lastSentLng = state.currentLng;
                }

                // Live Updates
                if(state.activeOrder) {
                    HomeActions.updateActiveDistance();
                    const mapSec = document.getElementById('liveMapSection');
                    if(mapSec && !mapSec.classList.contains('hidden')) {
                       initDeliveryMap(state.currentLat, state.currentLng); 
                    }
                }

                // IMPORTANT: Location change hote hi Wholesaler list RE-SORT karo
                HomeActions.updateWholesalerDisplay();

            }, null, { enableHighAccuracy: true, maximumAge: 10000 });
        }
    },

    stopGPS: () => {
        if(state.gpsWatchId) navigator.geolocation.clearWatch(state.gpsWatchId);
    },

    startHeartbeat: () => {
        state.heartbeatInterval = setInterval(async () => {
            let battery = 'Unknown';
            try { if(navigator.getBattery) { const b = await navigator.getBattery(); battery = Math.round(b.level * 100) + '%'; } } catch(e){}
            db.ref('deliveryBoys/'+state.user.mobile).update({ lastHeartbeat: firebase.database.ServerValue.TIMESTAMP, battery });
        }, 60000);
    },

    // --- 5. ORDERS LIST (Dashboard) ---
    listenOrders: () => {
        if(!document.getElementById('dutySwitch').checked || state.activeOrder) return;

        const serviceRadius = document.getElementById('radiusSlider').value;
        const listEl = document.getElementById('ordersList');

        db.ref('orders').on('value', snap => {
            if(!listEl) return;
            listEl.innerHTML = '';
            let count = 0;

            if(snap.exists()) {
                Object.entries(snap.val()).forEach(([id, o]) => {
                    const dist = parseFloat(getDistance(state.currentLat, state.currentLng, o.location.lat, o.location.lng));
                    if(o.status === 'placed' && dist <= parseFloat(serviceRadius)) {
                        count++;
                        HomeActions.renderOrderCard(id, o, dist, listEl);
                    }
                });
            }

            document.getElementById('orderCount').innerText = count;
            if(count > 0) {
                document.getElementById('noOrdersState').classList.add('hidden');
                document.getElementById('ordersContainer').classList.remove('hidden');
                HomeActions.updateWholesalerDisplay();
            } else {
                document.getElementById('noOrdersState').classList.remove('hidden');
                document.getElementById('ordersContainer').classList.add('hidden');
            }
        });
    },

    renderOrderCard: (id, o, dist, container) => {
        const div = document.createElement('div');
        div.className = "glass-card p-4 rounded-xl relative mb-4 bg-white border border-gray-100 shadow-sm";

        let totalBill = o.totalAmount || (o.payment ? o.payment.grandTotal : 0);
        let shopName = o.user ? o.user.shopName : "New Order";

        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-gray-900 text-lg">${shopName}</h4>
                <span class="bg-slate-900 text-white border border-slate-700 text-xs font-bold px-3 py-1 rounded">Bill: ₹${totalBill}</span>
            </div>
            <div class="text-xs text-gray-500 space-y-1 mb-3">
                <p class="truncate"><i class="fa-solid fa-box mr-1"></i> ${o.cart ? o.cart.length : 0} Items</p>
                <p class="truncate"><i class="fa-solid fa-location-dot mr-1"></i> ${o.location.address}</p>
                <div class="grid grid-cols-2 gap-2 mt-3 mb-2">
                     <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><span class="text-[9px] uppercase font-bold text-gray-400">Dist</span><span class="text-xs font-bold text-amber-600">${dist} KM</span></div>
                     <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><span class="text-[9px] uppercase font-bold text-gray-400">Time</span><span class="text-xs font-bold text-blue-600">${o.preferences.deliveryTime}</span></div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${o.location.lat},${o.location.lng}', '_blank')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm"><i class="fa-solid fa-location-arrow"></i></button>
                <button onclick="acceptOrder('${id}')" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-sm active:scale-95 transition">ACCEPT ORDER</button>
            </div>
        `;
        container.appendChild(div);
    },

    acceptOrder: (id) => {
        if(!confirm("Accept this order?")) return;
        db.ref('orders/'+id).transaction(o => {
            if(o && o.status === 'placed') {
                o.status = 'accepted'; 
                o.deliveryBoyId = state.user.mobile;
                o.deliveryBoyName = state.user.name; 
                o.deliveryBoyMobile = state.user.mobile;
                return o;
            }
        }, (err, comm) => {
            if(comm) showToast("Order Accepted!"); 
            else showToast("Order already taken.");
        });
    },

    // --- 6. ACTIVE ORDER UI (Detailed View + Special Request) ---
    renderActiveOrderUI: () => {
        const o = state.activeOrder;
        if(!o) return;

        // Hide Dashboard Elements
        document.getElementById('ordersContainer').classList.add('hidden');
        document.getElementById('noOrdersState').classList.add('hidden');
        document.getElementById('radiusControl').classList.add('hidden');
        document.getElementById('wholesalerStrip').classList.add('hidden');

        // Show Active Panel
        document.getElementById('activeOrderPanel').classList.remove('hidden');
        document.getElementById('liveMapSection').classList.remove('hidden');

        // 1. Order ID & Date
        const orderIdDisp = o.orderId || o.id.slice(-6).toUpperCase();
        const dateObj = new Date(o.timestamp || Date.now());
        document.getElementById('actOrderId').innerText = "#" + orderIdDisp;
        document.getElementById('actOrderDate').innerText = dateObj.toLocaleDateString('en-IN', {day:'numeric', month:'short'}) + " " + dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});

        // 2. Shop Info (Pickup)
        document.getElementById('actShop').innerText = o.user && o.user.shopName ? o.user.shopName : "Unknown Shop";
        const locStatus = document.getElementById('actShopLoc');
        locStatus.innerHTML = o.status === 'accepted' 
            ? `<span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Go to Pickup` 
            : `<span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Picked Up`;

        // 3. Customer Info (Drop)
        const custName = o.location.title || (o.user ? o.user.name : "Customer");
        document.getElementById('actCust').innerText = custName;
        document.getElementById('actAddr').innerText = o.location.address;

        // 4. Payment Info
        let totalCollect = o.totalAmount || (o.payment ? o.payment.grandTotal : 0);
        document.getElementById('actFee').innerText = totalCollect;

        const pMode = (o.payment && o.payment.mode) ? o.payment.mode : 'COD';
        document.getElementById('actPayMode').innerText = pMode;

        // 5. Trip Preferences (Budget & Time)
        document.getElementById('actPrefTime').innerText = o.preferences.deliveryTime;
        document.getElementById('actPrefBudget').innerText = o.preferences.budget + " Budget";

        // 6. ITEM LIST with SPECIAL REQUEST HANDLING
        const ul = document.getElementById('actItems');
        if(o.cart) {
            ul.innerHTML = o.cart.map(i => {
                const price = parseFloat(i.price) || 0;
                const count = i.count || 1;
                const lineTotal = price * count;

                // Logic: Extract Special Request from Quantity (bracket text or long text)
                // Example: "1kg (Mix karke lana)"
                let specialNote = "";
                let displayQty = i.qty;

                // Check for bracket content
                const noteMatch = i.qty.match(/\((.*?)\)/);
                if (noteMatch) {
                    specialNote = noteMatch[1]; // "Mix karke lana"
                    displayQty = i.qty.replace(noteMatch[0], "").trim(); // "1kg"
                } 
                // Fallback: If no bracket but text is very long, assume it's a note
                else if (i.qty.length > 15) {
                    specialNote = i.qty;
                }

                return `
                <li class="border-b border-gray-100 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
                    <div class="flex justify-between items-start">
                        <div class="flex-1 pr-2">
                            <span class="text-sm text-gray-800 font-bold block leading-tight">${i.name}</span>
                            <span class="text-[10px] text-gray-500 font-bold bg-gray-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                ${displayQty} <span class="text-gray-300 mx-1">x</span> ${count}
                            </span>
                        </div>
                        <div class="text-right">
                            <span class="text-sm font-bold text-gray-900 block">₹${lineTotal}</span>
                            ${price > 0 ? `<span class="text-[9px] text-gray-400 block">(${price}/unit)</span>` : ''}
                        </div>
                    </div>

                    <!-- SPECIAL REQUEST HIGHLIGHT -->
                    ${specialNote ? `
                    <div class="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 flex gap-2 items-start animate-pulse">
                        <i class="fa-solid fa-note-sticky text-amber-500 text-xs mt-0.5"></i>
                        <div>
                            <p class="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Special Request</p>
                            <p class="text-xs text-slate-700 font-medium leading-tight">${specialNote}</p>
                        </div>
                    </div>` : ''}
                </li>`;
            }).join('');

            // Weight
            document.getElementById('actExtraDetails').innerHTML = `<div class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 mt-2"><span class="text-[10px] text-gray-400 font-bold uppercase">Estimated Weight</span><span class="text-sm font-bold text-gray-800">${calculateOrderWeight(o.cart)} KG</span></div>`;
        }

        // 7. Map & Routing
        setTimeout(() => {
            initDeliveryMap(state.currentLat, state.currentLng);
            if(o.status === 'accepted') drawRoute(state.currentLat, state.currentLng, o.location.lat, o.location.lng);
            else drawRoute(state.currentLat, state.currentLng, o.location.lat, o.location.lng);
            HomeActions.renderWholesalerWidget();
        }, 500);

        HomeActions.updateBtnUI(o.status);
    },

    updateBtnUI: (status) => {
        const b = document.getElementById('actionBtn');
        const s = document.getElementById('activeStatus');

        if(status === 'accepted') {
            s.innerText = "Going to Shop"; 
            s.className = "text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase font-bold";
            b.innerText = "PICKED UP ORDER"; 
            b.className = "w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200";
            b.onclick = () => HomeActions.updateStatus('out_for_delivery');
        } else if(status === 'out_for_delivery') {
            s.innerText = "Out for Delivery"; 
            s.className = "text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase font-bold";
            b.innerText = "DELIVERED & CASH COLLECTED"; 
            b.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200";
            b.onclick = () => HomeActions.updateStatus('delivered');
        }
    },

    changeStatus: () => { if(state.activeOrder) HomeActions.updateBtnUI(state.activeOrder.status); },

    updateStatus: (st) => {
        if(st === 'delivered' && !confirm("Cash Collected?")) return;

        const updates = { status: st };
        if(st === 'out_for_delivery') updates.pickupLocation = { lat: state.currentLat, lng: state.currentLng };

        db.ref('orders/'+state.activeOrder.id).update(updates).then(() => {
            if(st === 'delivered') {
                db.ref('deliveryBoys/'+state.user.mobile+'/earnings').transaction(c => (c || 0) + PARTNER_PAY);
                db.ref('deliveryBoys/'+state.user.mobile+'/trips').transaction(c => (c || 0) + 1);

                db.ref('orders/'+state.activeOrder.id).update({ 
                    completedAt: firebase.database.ServerValue.TIMESTAMP, 
                    partnerPay: PARTNER_PAY 
                });

                triggerCelebration(); 
                showToast("Order Completed!");
            } else {
                state.activeOrder.status = st;
                HomeActions.updateBtnUI(st);
            }
        });
    },

    updateActiveDistance: () => {
        if(!state.activeOrder) return;
        const d = getDistance(state.currentLat, state.currentLng, state.activeOrder.location.lat, state.activeOrder.location.lng);
        document.getElementById('actDist').innerText = d + " KM";
    },

    callCust: () => window.open(`tel:${state.activeOrder.user.mobile}`),
    openWhatsApp: () => window.open(`https://wa.me/91${state.activeOrder.user.mobile}`, '_blank'),
    callShop: () => {
        const num = state.activeOrder.user.shopMobile || state.activeOrder.user.mobile;
        window.open(`tel:${num}`);
    },

    // --- 7. WHOLESALER LOGIC (GLOBAL + NEAREST) ---
    updateWholesalerDisplay: () => {
        const container = document.getElementById('wsListContainer');
        const strip = document.getElementById('wholesalerStrip');
        const dutySwitch = document.getElementById('dutySwitch');

        // Hide if offline or active order
        if(!state.approvedWholesalers.length || !dutySwitch.checked || state.activeOrder) { 
            strip.classList.add('hidden'); return; 
        }

        strip.classList.remove('hidden'); container.innerHTML = '';

        // 1. Calculate Distance for ALL global approved shops
        const shops = state.approvedWholesalers.map(ws => ({
            ...ws,
            dist: parseFloat(getDistance(state.currentLat, state.currentLng, ws.location.lat, ws.location.lng))
        }));

        // 2. Sort: Nearest First
        shops.sort((a,b) => a.dist - b.dist);

        // 3. Limit to Top 5
        const topShops = shops.slice(0, 5);

        // 4. Render
        topShops.forEach(ws => {
            const div = document.createElement('div');
            div.className = "flex-shrink-0 w-64 bg-white border border-gray-200 rounded-xl p-3 relative snap-center shadow-sm";
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-gray-900 text-sm truncate w-3/4">${ws.shopName}</h4>
                    <span class="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-bold">${ws.dist} KM</span>
                </div>
                <p class="text-[10px] text-gray-500 mb-3 truncate"><i class="fa-solid fa-location-dot mr-1"></i>${ws.address}</p>
                <div class="flex gap-2">
                    <button onclick="window.open('tel:${ws.ownerMobile}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-phone text-xs"></i></button>
                    <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${ws.location.lat},${ws.location.lng}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-location-arrow text-xs"></i></button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    renderWholesalerWidget: () => {
        const container = document.getElementById('activeWholesalerCard');
        if(!state.approvedWholesalers.length) { container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-400 text-xs gap-2"><i class="fa-solid fa-store-slash"></i> No shops</div>`; return; }
        const nearest = state.approvedWholesalers.map(ws => ({...ws, d: parseFloat(getDistance(state.currentLat, state.currentLng, ws.location.lat, ws.location.lng))})).sort((a,b)=>a.d - b.d)[0];
        container.innerHTML = `
            <div class="flex justify-between items-start mb-1"><h4 class="font-bold text-gray-800 text-xs truncate w-[85%]">${nearest.shopName}</h4><span class="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-bold">${nearest.d}KM</span></div>
            <div class="flex gap-1.5 mt-auto"><button onclick="window.open('tel:${nearest.ownerMobile}')" class="bg-gray-100 text-gray-600 w-6 h-6 rounded flex items-center justify-center"><i class="fa-solid fa-phone text-[10px]"></i></button></div>
        `;
    },

    // --- 8. MODAL & PROFILE ACTIONS ---
    openWholesalerModal: () => {
        toggleMenu();
        document.getElementById('wholesalerModal').classList.remove('hidden');
        HomeActions.loadMyRequests();
    },
    closeWholesalerModal: () => document.getElementById('wholesalerModal').classList.add('hidden'),

    connectWholesalerLocation: () => {
        const btn = document.getElementById('btnConnectLoc');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting...';
        navigator.geolocation.getCurrentPosition(p => {
            document.getElementById('wsLat').value = p.coords.latitude;
            document.getElementById('wsLng').value = p.coords.longitude;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Connected';
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.coords.latitude}&lon=${p.coords.longitude}`)
                .then(r=>r.json()).then(d => document.getElementById('wsAddress').value = d.display_name);
        });
    },

    submitWholesalerRequest: () => {
        const name = document.getElementById('wsName').value;
        const mobile = document.getElementById('wsMobile').value;
        const addr = document.getElementById('wsAddress').value;
        const lat = document.getElementById('wsLat').value;
        const lng = document.getElementById('wsLng').value;
        const editId = document.getElementById('wsEditId').value;

        if(!name || !lat) return showToast("Details incomplete");

        const data = {
            partnerMobile: state.user.mobile, partnerName: state.user.name,
            shopName: name, ownerMobile: mobile, address: addr,
            location: { lat: parseFloat(lat), lng: parseFloat(lng) },
            status: 'pending', timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        if(editId) db.ref('wholesalerRequests/'+editId).update(data).then(() => showToast("Updated!"));
        else db.ref('wholesalerRequests').push(data).then(() => showToast("Submitted!"));

        HomeActions.loadMyRequests();
        document.getElementById('wsName').value = ''; 
    },

    loadMyRequests: () => {
        const list = document.getElementById('myWholesalerList');
        list.innerHTML = 'Loading...';
        db.ref('wholesalerRequests').orderByChild('partnerMobile').equalTo(state.user.mobile).on('value', snap => {
            list.innerHTML = '';
            if(snap.exists()) snap.forEach(c => {
                const r = c.val();
                list.innerHTML += `<div class="bg-white p-3 rounded-xl border border-gray-200 mb-2"><h4 class="font-bold text-sm">${r.shopName}</h4><p class="text-[10px] text-gray-500">${r.status.toUpperCase()}</p></div>`;
            });
        });
    },

    changePin: () => {
        const p = prompt("Enter New PIN (4 Digits):");
        if(p && p.length === 4) db.ref('deliveryBoys/'+state.user.mobile).update({pin:p}).then(() => showToast("PIN Changed"));
    },
    updateVehicle: () => {
        const v = prompt("Vehicle (Bike/Cycle):");
        if(v) {
            db.ref('deliveryBoys/'+state.user.mobile).update({vehicle:v});
            state.user.vehicle = v;
            localStorage.setItem('rmz_delivery_user', JSON.stringify(state.user));
            document.getElementById('vehicleType').innerText = v;
        }
    },

    openSettlementHistory: () => {
        toggleMenu();
        const modal = document.getElementById('historyModal');
        const list = document.getElementById('settlementList');
        if(!modal || !list) return;
        modal.classList.remove('hidden');
        list.innerHTML = "Loading...";

        db.ref('deliveryBoys/' + state.user.mobile + '/settlementHistory').once('value', snap => {
            list.innerHTML = '';
            if(snap.exists()) {
                const h = [];
                snap.forEach(c => {
                    const v = c.val();
                    if(typeof v === 'object' && v !== null) h.push(v);
                });
                h.reverse().forEach(item => {
                    const amt = item.amount || item.Amount || 0;
                    const sts = item.status || 'completed';
                    const date = new Date(item.timestamp || Date.now()).toLocaleDateString();
                    list.innerHTML += `<div class="bg-white p-3 rounded-xl border mb-2 flex justify-between shadow-sm">
                        <div><p class="font-bold">₹${amt}</p><p class="text-xs text-gray-500">${date}</p></div>
                        <span class="text-xs font-bold uppercase bg-gray-100 px-2 py-1 rounded text-gray-600">${sts}</span>
                    </div>`;
                });
            } else {
                list.innerHTML = `<div class="text-center py-10 opacity-50"><i class="fa-solid fa-box-open text-3xl text-gray-300 mb-2"></i><p class="text-xs text-gray-400 font-bold">No history found</p></div>`;
            }
        });
    }
};


