// ==========================================
// FILE: js/modules/home-actions.js
// (Core Logic: GPS, Database, Orders, Actions)
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

    // --- 1. INITIALIZATION & LISTENERS ---
    initListeners: (onLogout) => {
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

        // B. Approved Wholesalers Listener
        db.ref('wholesalerRequests').orderByChild('status').equalTo('approved').on('value', snap => {
            state.approvedWholesalers = [];
            if(snap.exists()) snap.forEach(c => state.approvedWholesalers.push({ id: c.key, ...c.val() }));
            // Refresh UI if online
            const dutySwitch = document.getElementById('dutySwitch');
            if(dutySwitch && dutySwitch.checked) HomeActions.updateWholesalerDisplay();
        });

        // C. Active Order Monitor
        db.ref('orders').orderByChild('deliveryBoyId').equalTo(state.user.mobile).on('value', snap => {
            if(snap.exists()) {
                let foundActive = false;
                snap.forEach(c => {
                    const o = c.val();
                    // If order is active (not delivered), load it
                    if(o.status !== 'delivered') {
                        state.activeOrder = { id: c.key, ...o };
                        HomeActions.renderActiveOrderUI();
                        foundActive = true;

                        // Auto-Switch Duty ON
                        const dutySwitch = document.getElementById('dutySwitch');
                        if(dutySwitch && !dutySwitch.checked) { 
                            dutySwitch.checked = true; 
                            HomeActions.toggleDuty(true); 
                        }
                    }
                });
                // If no active order found, reset UI
                if(!foundActive) {
                    state.activeOrder = null;
                    document.getElementById('activeOrderPanel').classList.add('hidden');
                    document.getElementById('statsSection').classList.remove('hidden');
                    document.getElementById('ordersContainer').classList.remove('hidden');
                    document.getElementById('radiusControl').classList.remove('hidden');
                }
            }
        });
    },

    // --- 2. DUTY & GPS LOGIC ---
    toggleDuty: (forceOn = false) => {
        const switchEl = document.getElementById('dutySwitch');
        const isOnline = forceOn || (switchEl ? switchEl.checked : false);
        const statusTxt = document.getElementById('dutyStatusText');

        if(isOnline) {
            // UI Updates
            if(statusTxt) { statusTxt.innerText = "ONLINE"; statusTxt.classList.add('text-green-600'); }
            document.getElementById('offlineState').classList.add('hidden');
            document.getElementById('statsSection').classList.remove('hidden');
            document.getElementById('radiusControl').classList.remove('hidden');

            // Logic Updates
            db.ref('deliveryBoys/'+state.user.mobile+'/status').onDisconnect().set('offline');
            HomeActions.startGPS();
            HomeActions.startHeartbeat();
            HomeActions.listenOrders();
        } else {
            // UI Updates
            if(statusTxt) { statusTxt.innerText = "OFFLINE"; statusTxt.classList.remove('text-green-600'); }
            document.getElementById('offlineState').classList.remove('hidden');
            document.getElementById('noOrdersState').classList.add('hidden');
            document.getElementById('ordersContainer').classList.add('hidden');
            document.getElementById('statsSection').classList.add('hidden');
            document.getElementById('radiusControl').classList.add('hidden');
            document.getElementById('wholesalerStrip').classList.add('hidden');

            // Logic Updates
            HomeActions.stopGPS();
            if(state.heartbeatInterval) clearInterval(state.heartbeatInterval);
            db.ref('deliveryBoys/'+state.user.mobile+'/status').set('offline');
            db.ref('orders').off(); // Stop listening
        }
    },

    startGPS: () => {
        if("geolocation" in navigator) {
            db.ref('deliveryBoys/'+state.user.mobile).update({status:'online'});

            state.gpsWatchId = navigator.geolocation.watchPosition(p => {
                state.currentLat = p.coords.latitude;
                state.currentLng = p.coords.longitude;

                const locEl = document.getElementById('locStatus');
                if(locEl) locEl.innerText = "GPS Live";

                // Smart Update (Only update DB if moved 30 meters)
                const distMoved = parseFloat(getDistance(lastSentLat, lastSentLng, state.currentLat, state.currentLng));
                if(distMoved >= GPS_UPDATE_THRESHOLD_KM || lastSentLat === 0) {
                    db.ref('deliveryBoys/'+state.user.mobile).update({
                        status:'online',
                        location:{lat:state.currentLat, lng:state.currentLng},
                        lastUpdated: firebase.database.ServerValue.TIMESTAMP
                    });
                    lastSentLat = state.currentLat; lastSentLng = state.currentLng;
                }

                if(state.activeOrder) HomeActions.updateActiveDistance();
                HomeActions.listenOrders(); // Re-sort orders based on new location
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

    // --- 3. ORDER MANAGEMENT ---
    listenOrders: () => {
        const switchEl = document.getElementById('dutySwitch');
        if(!switchEl || !switchEl.checked || state.activeOrder) return;

        const serviceRadius = document.getElementById('radiusSlider').value;

        db.ref('orders').on('value', snap => {
            const listEl = document.getElementById('ordersList');
            if(!listEl) return;

            listEl.innerHTML = '';
            let count = 0;

            if(snap.exists()) {
                Object.entries(snap.val()).forEach(([id, o]) => {
                    const dist = parseFloat(getDistance(state.currentLat, state.currentLng, o.location.lat, o.location.lng));

                    // Filter: Status 'placed' AND within Radius
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
        div.className = "glass-card p-4 rounded-xl relative mb-4 bg-white";

        // Dynamic IDs for buttons
        const btnId = `btn-accept-${id}`;
        const mapId = `btn-map-${id}`;

        // --- Show Total Bill Amount ---
        let totalBill = 0;
        if(o.totalAmount) totalBill = o.totalAmount;
        else if(o.payment && o.payment.grandTotal) totalBill = o.payment.grandTotal;

        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-gray-900 text-lg">${o.user.shopName}</h4>
                <span class="bg-slate-900 text-white border border-slate-700 text-xs font-bold px-3 py-1 rounded">Bill: ₹${totalBill}</span>
            </div>
            <div class="text-xs text-gray-500 space-y-1 mb-3">
                <p class="truncate"><i class="fa-solid fa-box mr-1"></i> ${o.cart.length} Items</p>
                <p class="truncate"><i class="fa-solid fa-location-dot mr-1"></i> ${o.location.address}</p>
                <div class="grid grid-cols-2 gap-2 mt-3 mb-2">
                     <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><span class="text-[9px] uppercase font-bold text-gray-400">Dist</span><span class="text-xs font-bold text-amber-600">${dist} KM</span></div>
                     <div class="bg-gray-50 p-2 rounded border border-gray-200 text-center"><span class="text-[9px] uppercase font-bold text-gray-400">Time</span><span class="text-xs font-bold text-blue-600">${o.preferences.deliveryTime}</span></div>
                </div>
            </div>
            <div class="flex gap-2">
                <button id="${mapId}" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm"><i class="fa-solid fa-location-arrow"></i></button>
                <button id="${btnId}" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-sm active:scale-95 transition">ACCEPT ORDER</button>
            </div>
        `;
        container.appendChild(div);

        // Bind Events Directly
        document.getElementById(btnId).onclick = () => HomeActions.acceptOrder(id);
        document.getElementById(mapId).onclick = () => openMap('dir', o.location.lat, o.location.lng);
    },

    acceptOrder: (id) => {
        if(!confirm("Are you sure you want to accept this order?")) return;

        db.ref('orders/'+id).transaction(o => {
            if(o && o.status === 'placed') {
                o.status = 'accepted'; 
                o.deliveryBoyId = state.user.mobile;
                o.deliveryBoyName = state.user.name; 
                o.deliveryBoyMobile = state.user.mobile;
                return o;
            }
        }, (err, comm) => {
            if(comm) showToast("Order Accepted Successfully!"); 
            else showToast("Order already taken by someone else.");
        });
    },

    // --- 4. ACTIVE ORDER UI ---
    renderActiveOrderUI: () => {
        const o = state.activeOrder;
        if(!o) return;

        // Hide Order List, Show Active Panel
        document.getElementById('ordersContainer').classList.add('hidden');
        document.getElementById('noOrdersState').classList.add('hidden');
        document.getElementById('radiusControl').classList.add('hidden');
        document.getElementById('wholesalerStrip').classList.add('hidden');
        document.getElementById('activeOrderPanel').classList.remove('hidden');
        document.getElementById('liveMapSection').classList.remove('hidden');

        // Populate Data
        document.getElementById('actCust').innerText = o.user.name;
        document.getElementById('actAddr').innerText = o.location.address;

        // --- Show Total Collectable Amount ---
        let totalCollect = 0;
        if(o.totalAmount) totalCollect = o.totalAmount;
        else if(o.payment && o.payment.grandTotal) totalCollect = o.payment.grandTotal;

        document.getElementById('actFee').innerText = totalCollect;

        document.getElementById('actPrefTime').innerText = o.preferences.deliveryTime;
        document.getElementById('actPrefBudget').innerText = o.preferences.budget;

        // --- Order Items List with Prices ---
        const ul = document.getElementById('actItems');
        ul.innerHTML = o.cart.map(i => {
            const price = parseFloat(i.price) || 0;
            const count = i.count || 1;
            const lineTotal = price * count;

            return `
            <li class="flex justify-between items-start border-b border-gray-100 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
                <div class="flex-1 pr-2">
                    <span class="text-sm text-gray-800 font-medium block leading-tight">${i.name}</span>
                    <span class="text-[10px] text-gray-500 font-bold bg-gray-50 px-1.5 py-0.5 rounded mt-1 inline-block">${i.qty} <span class="text-gray-300">x</span> ${count}</span>
                </div>
                <div class="text-right">
                    <span class="text-sm font-bold text-gray-900 block">₹${lineTotal}</span>
                    ${price > 0 ? `<span class="text-[9px] text-gray-400 block">(${price}/unit)</span>` : ''}
                </div>
            </li>`;
        }).join('');

        // Weight Calculation
        document.getElementById('actExtraDetails').innerHTML = `<div class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 mt-2"><span class="text-[10px] text-gray-400 font-bold uppercase">Total Weight</span><span class="text-sm font-bold text-gray-800">${calculateOrderWeight(o.cart)} KG</span></div>`;

        // Map Setup (Delayed slightly to ensure DOM is ready)
        setTimeout(() => {
            initDeliveryMap(state.currentLat, state.currentLng);
            drawRoute(state.currentLat, state.currentLng, o.location.lat, o.location.lng);
            HomeActions.renderWholesalerWidget();
        }, 500);

        // Configure Main Action Button
        const btn = document.getElementById('actionBtn');
        const status = document.getElementById('activeStatus');

        if(o.status === 'accepted') {
            status.innerText = "Going to Shop"; 
            status.className = "text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase font-bold";
            btn.innerText = "PICKED UP ORDER"; 
            btn.className = "w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200";
            btn.onclick = () => HomeActions.updateStatus('out_for_delivery');
        } else if(o.status === 'out_for_delivery') {
            status.innerText = "Out for Delivery"; 
            status.className = "text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase font-bold";
            btn.innerText = "DELIVERED & CASH COLLECTED"; 
            btn.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200";
            btn.onclick = () => HomeActions.updateStatus('delivered');
        }

        // Bind Nav Buttons
        document.getElementById('navBtn').onclick = () => openMap('dir', o.location.lat, o.location.lng);
        document.getElementById('waBtn').onclick = () => window.open(`https://wa.me/91${o.user.mobile}`, '_blank');
        document.getElementById('callBtn').onclick = () => window.open(`tel:${o.user.mobile}`);
        document.getElementById('recenterBtn').onclick = () => initDeliveryMap(state.currentLat, state.currentLng);
    },

    updateStatus: (st) => {
        if(st === 'delivered' && !confirm("Have you collected the cash?")) return;

        const updates = { status: st };
        if(st === 'out_for_delivery') updates.pickupLocation = { lat: state.currentLat, lng: state.currentLng };

        db.ref('orders/'+state.activeOrder.id).update(updates).then(() => {
            if(st === 'delivered') {
                // Update Earnings
                db.ref('deliveryBoys/'+state.user.mobile+'/earnings').transaction(c => (c || 0) + PARTNER_PAY);
                db.ref('deliveryBoys/'+state.user.mobile+'/trips').transaction(c => (c || 0) + 1);

                // Close Order
                db.ref('orders/'+state.activeOrder.id).update({ 
                    completedAt: firebase.database.ServerValue.TIMESTAMP, 
                    partnerPay: PARTNER_PAY 
                });

                triggerCelebration(); 
                showToast("Order Completed! Great Job!");
            }
        });
    },

    updateActiveDistance: () => {
        if(!state.activeOrder) return;
        const d = getDistance(state.currentLat, state.currentLng, state.activeOrder.location.lat, state.activeOrder.location.lng);
        document.getElementById('actDist').innerText = d + " KM";
    },

    // --- 5. SIDEBAR, HISTORY & WHOLESALER ACTIONS ---
    changePin: () => {
        const p = prompt("Enter New PIN (4 Digits):");
        if(p && p.length === 4) {
            db.ref('deliveryBoys/'+state.user.mobile).update({pin:p})
              .then(() => showToast("PIN Changed Successfully"));
        } else if(p) {
            showToast("Invalid PIN. Must be 4 digits.");
        }
    },

    updateVehicle: () => {
        const v = prompt("Enter Vehicle Type (Bike/Scooter/Cycle):");
        if(v) {
            db.ref('deliveryBoys/'+state.user.mobile).update({vehicle:v});
            state.user.vehicle = v;
            localStorage.setItem('rmz_delivery_user', JSON.stringify(state.user));
            document.getElementById('vehicleType').innerText = v;
            showToast("Vehicle Info Updated");
        }
    },

    openSettlementHistory: () => {
        const modal = document.getElementById('historyModal');
        const list = document.getElementById('settlementList');
        if(!modal || !list) return;

        modal.classList.remove('hidden');
        list.innerHTML = `<div class="text-center py-10 opacity-50"><i class="fa-solid fa-clock-rotate-left text-3xl text-gray-300 mb-2"></i><p class="text-xs text-gray-400 font-bold">Loading records...</p></div>`;

        db.ref('deliveryBoys/' + state.user.mobile + '/settlementHistory').once('value', snap => {
            if(snap.exists()) {
                list.innerHTML = '';
                const history = [];

                snap.forEach(c => {
                    // SAFE CHECK: Ensure data is an object before using it
                    const val = c.val();
                    if(typeof val === 'object' && val !== null) {
                        history.push(val);
                    } else {
                        // Fallback for simple data
                        console.log("Found raw data:", val); 
                    }
                });

                // Sort: Latest First
                if(history.length > 0) history.reverse();

                history.forEach(item => {
                    // SAFE CHECKS: Fallback values if database keys are different
                    const amount = item.amount || item.Amount || 0;
                    const status = item.status || item.Status || 'completed';
                    const timeVal = item.timestamp || item.Timestamp || item.date || Date.now();

                    const date = new Date(timeVal).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
                    });

                    const isPaid = status.toLowerCase() === 'completed';
                    const colorClass = isPaid ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100';
                    const icon = isPaid ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-clock"></i>';

                    const div = document.createElement('div');
                    div.className = `flex justify-between items-center p-3 rounded-xl border ${colorClass} mb-2 shadow-sm`;
                    div.innerHTML = `
                        <div>
                            <p class="font-bold text-sm">Amount: ₹${amount}</p>
                            <p class="text-[10px] opacity-70 font-medium">${date}</p>
                        </div>
                        <div class="text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                            ${icon} ${status}
                        </div>
                    `;
                    list.appendChild(div);
                });

                if(history.length === 0) {
                     list.innerHTML = `<div class="text-center py-10 opacity-50"><i class="fa-solid fa-circle-exclamation text-3xl text-gray-300 mb-2"></i><p class="text-xs text-gray-400 font-bold">Data format mismatch.</p></div>`;
                }

            } else {
                list.innerHTML = `<div class="text-center py-10 opacity-50"><i class="fa-solid fa-box-open text-3xl text-gray-300 mb-2"></i><p class="text-xs text-gray-400 font-bold">No history found</p></div>`;
            }
        });
    },

    updateWholesalerDisplay: () => {
        const strip = document.getElementById('wholesalerStrip');
        const container = document.getElementById('wsListContainer');
        const dutySwitch = document.getElementById('dutySwitch');

        if(!state.approvedWholesalers.length || !dutySwitch.checked || state.activeOrder) { 
            strip.classList.add('hidden'); return; 
        }

        strip.classList.remove('hidden'); container.innerHTML = '';
        state.approvedWholesalers.forEach(ws => {
            const d = getDistance(state.currentLat, state.currentLng, ws.location.lat, ws.location.lng);
            const div = document.createElement('div');
            div.className = "flex-shrink-0 w-64 bg-white border border-gray-200 rounded-xl p-3 relative snap-center shadow-sm";
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2"><h4 class="font-bold text-gray-900 text-sm truncate w-3/4">${ws.shopName}</h4><span class="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-bold">${d} KM</span></div>
                <p class="text-[10px] text-gray-500 mb-3 truncate"><i class="fa-solid fa-location-dot mr-1"></i>${ws.address}</p>
                <div class="flex gap-2"><button onclick="window.open('tel:${ws.ownerMobile}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-phone text-xs"></i></button><button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${ws.location.lat},${ws.location.lng}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-location-arrow text-xs"></i></button></div>
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

    submitWholesalerRequest: () => {
        const els = {
            name: document.getElementById('wsName'),
            mobile: document.getElementById('wsMobile'),
            addr: document.getElementById('wsAddress'),
            lat: document.getElementById('wsLat'),
            lng: document.getElementById('wsLng'),
            id: document.getElementById('wsEditId')
        };

        const data = {
            partnerMobile: state.user.mobile, partnerName: state.user.name,
            shopName: els.name.value, ownerMobile: els.mobile.value, address: els.addr.value,
            location: { lat: parseFloat(els.lat.value), lng: parseFloat(els.lng.value) },
            status: 'pending', timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        if(!data.shopName || !data.location.lat) return showToast("Please Fill All Details & Connect Location");

        if(els.id.value) db.ref('wholesalerRequests/'+els.id.value).update(data);
        else db.ref('wholesalerRequests').push(data);

        showToast("Request Submitted!"); 
        els.name.value = ''; els.id.value = ''; 
        HomeActions.loadMyRequests();
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
    }
};

