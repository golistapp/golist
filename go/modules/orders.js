// ==========================================
// MODULE: Orders Management
// ==========================================

import { db } from './firebase-config.js';
import { getDistance, calculateOrderWeight } from './helpers.js';
import { showToast, triggerCelebration } from './ui.js';
import { toggleDuty } from './duty.js';

let ordersListener = null;
const PARTNER_PAY = 20; // Fixed earning per order

// 1. LISTEN FOR NEARBY ORDERS
export function listenOrders() {
    // Agar offline hain to listener band rakho
    if (!window.Ramazone.isOnline) {
        if (ordersListener) { db.ref('orders').off(); ordersListener = null; }
        return;
    }

    const list = document.getElementById('ordersList');
    if (!list) return;

    ordersListener = db.ref('orders').on('value', snap => {
        if (!window.Ramazone.isOnline) return; // Double check

        list.innerHTML = '';
        let count = 0;
        const radius = parseFloat(window.Ramazone.serviceRadius);
        const myLat = window.Ramazone.location.lat;
        const myLng = window.Ramazone.location.lng;

        if (snap.exists()) {
            Object.entries(snap.val()).forEach(([id, o]) => {
                // 1. Distance Calculation
                const dist = parseFloat(getDistance(myLat, myLng, o.location.lat, o.location.lng));

                // 2. Filter Logic (Radius & Status)
                const isInRange = dist <= radius;
                const isMyOrder = (o.status === 'accepted' && o.deliveryBoyId === window.Ramazone.user.mobile);
                const isPending = (o.status === 'placed');

                // Sirf tab dikhao agar range mein hai aur pending hai, YA mera apna accepted order hai
                if ((isPending && isInRange) || isMyOrder) {
                    count++;
                    renderOrderCard(id, o, dist, isMyOrder, list);
                }
            });
        }

        updateOrderCounts(count);
    });
}

// Helper: UI Update for Counts
function updateOrderCounts(count) {
    const oc = document.getElementById('orderCount');
    if (oc) oc.innerText = count;

    // Agar koi active order nahi hai, to scanning UI manage karo
    if (!window.Ramazone.activeOrder) {
        if (count > 0) {
            document.getElementById('noOrdersState').classList.add('hidden');
            document.getElementById('ordersContainer').classList.remove('hidden');
            // Wholesaler Strip bhi update kar sakte hain yahan (future scope)
        } else {
            document.getElementById('noOrdersState').classList.remove('hidden');
            document.getElementById('ordersContainer').classList.add('hidden');
            document.getElementById('wholesalerStrip').classList.add('hidden');
        }
    }
}

// Helper: Render Single Card (Design Preserved)
function renderOrderCard(id, o, dist, isMyOrder, container) {
    const shopName = o.user && o.user.shopName ? o.user.shopName : "Unknown Shop";
    const address = o.location && o.location.address ? o.location.address : "Address Hidden";
    const grandTotal = o.payment && o.payment.grandTotal ? o.payment.grandTotal : 0;
    const prefTime = o.preferences?.deliveryTime || "Standard";
    const prefBudg = o.preferences?.budget || "Standard";

    let orderTime = "N/A";
    if(o.timestamp) {
        orderTime = new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const weight = calculateOrderWeight(o.cart);
    let specialReqHTML = '';
    if(o.cart) o.cart.forEach(item => {
        if(item.qty === 'Special Request') {
            specialReqHTML = `
                <div class="mt-3 bg-amber-50 border border-amber-200 p-2 rounded text-xs flex items-start gap-2">
                    <i class="fa-solid fa-star text-amber-500 mt-0.5"></i>
                    <div><p class="font-bold text-amber-600 uppercase text-[9px]">Special Request</p><p class="text-gray-700">${item.name}</p></div>
                </div>`;
        }
    });

    let prodTxt = o.cart ? o.cart.filter(i=>i.qty!=='Special Request').map(i => `${i.count}x ${i.name}`).join(', ') : 'Items';

    // Logic for Buttons
    const isActive = window.Ramazone.activeOrder && window.Ramazone.activeOrder.id === id;
    const btnText = isActive ? 'CONTINUE TASK' : (window.Ramazone.activeOrder ? 'Finish Current' : 'ACCEPT ORDER');
    const bgClass = isActive ? 'bg-blue-600 hover:bg-blue-500' : (window.Ramazone.activeOrder ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-500');

    // IMPORTANT: Event handling is tricky in modules. We attach ID to button and handle in app.js or here.
    // Better Approach: Add onclick directly to element but pointing to window wrapper (created below)
    // OR: Use event listeners in render. Since we are in module, let's use a temporary global wrapper for the button action.

    // Making wrapper for button actions
    window.tempOrderAction = function(actionId) {
        if(window.Ramazone.activeOrder && window.Ramazone.activeOrder.id === actionId) {
            // Already active, just reload UI
            loadActiveOrder(actionId, window.Ramazone.activeOrder);
        } else {
            acceptOrder(actionId);
        }
    };

    window.tempMapAction = function(lat, lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    const div = document.createElement('div');
    div.className = `${isMyOrder ? "bg-blue-50 border border-blue-200 shadow-sm" : "glass-card"} p-4 rounded-xl relative mb-4`;

    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <h4 class="font-bold text-gray-900 text-lg">${shopName}</h4>
            <span class="bg-gray-800 text-white border border-gray-900 text-xs font-bold px-3 py-1 rounded">₹${grandTotal}</span>
        </div>
        <div class="text-xs text-gray-500 space-y-1 mb-3">
            <p class="truncate"><i class="fa-solid fa-box mr-1"></i> ${prodTxt}</p>
            <p class="truncate"><i class="fa-solid fa-location-dot mr-1"></i> ${address}</p>
            <div class="grid grid-cols-2 gap-2 mt-3 mb-2">
                <div class="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col items-center justify-center">
                    <span class="text-[9px] text-gray-400 uppercase font-bold">Pref. Time</span><span class="text-xs font-bold text-blue-600 truncate">${prefTime}</span>
                </div>
                <div class="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col items-center justify-center">
                    <span class="text-[9px] text-gray-400 uppercase font-bold">Budget</span><span class="text-xs font-bold text-pink-600 truncate">${prefBudg}</span>
                </div>
                <div class="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col items-center justify-center">
                    <span class="text-[9px] text-gray-400 uppercase font-bold">Details</span>
                    <div class="text-xs font-bold text-gray-700 truncate flex items-center gap-2"><span>${orderTime}</span><span class="bg-gray-200 px-1 rounded text-[10px] text-gray-600">${weight}kg</span></div>
                </div>
                <div class="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col items-center justify-center">
                    <span class="text-[9px] text-gray-400 uppercase font-bold">Distance</span><span class="text-xs font-bold text-amber-600 truncate">${dist} KM</span>
                </div>
            </div>
            ${specialReqHTML}
            ${isMyOrder ? `<div class="mt-2 text-center bg-blue-600 text-white text-xs font-bold py-1 rounded">ASSIGNED TO YOU</div>` : ''}
        </div>
        <div class="flex gap-2">
            <button onclick="tempMapAction(${o.location.lat},${o.location.lng})" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm transition"><i class="fa-solid fa-location-arrow"></i></button>
            <button onclick="tempOrderAction('${id}')" class="flex-1 ${bgClass} text-white font-bold py-3 rounded-lg shadow-sm active:scale-95 transition" ${window.Ramazone.activeOrder && !isActive ? 'disabled style="opacity:0.5"' : ''}>${btnText}</button>
        </div>
    `;
    container.appendChild(div);
}

// 2. ACCEPT ORDER LOGIC
export function acceptOrder(id) {
    if(window.Ramazone.activeOrder) return showToast("Finish current order first!");
    if(!confirm("Are you sure you want to accept?")) return;

    db.ref('orders/'+id).transaction(o => {
        if(o && (o.status === 'placed')) {
            o.status = 'accepted'; 
            o.deliveryBoyId = window.Ramazone.user.mobile; 
            o.deliveryBoyName = window.Ramazone.user.name; 
            o.deliveryBoyMobile = window.Ramazone.user.mobile;
            return o;
        }
    }, (err, committed, snap) => {
        if(committed) { 
            showToast("Accepted! Task Started."); 
            loadActiveOrder(id, snap.val()); 
        } else { 
            showToast("Taken by others or deleted!"); 
        }
    });
}

// 3. CHECK FOR ACTIVE ORDER (On Load)
export function checkForActiveOrder() {
    const myMobile = window.Ramazone.user.mobile;
    db.ref('orders').orderByChild('deliveryBoyId').equalTo(myMobile).once('value', snap => {
        if(snap.exists()) {
            const orders = snap.val();
            let found = false;
            Object.keys(orders).forEach(key => {
                const o = orders[key];
                if(o.status !== 'delivered') {
                    found = true;
                    // Force Duty ON if active order exists
                    if(!window.Ramazone.isOnline) {
                        toggleDuty(true);
                    }
                    loadActiveOrder(key, o);
                }
            });

            if(!found) {
                // Reset UI if no active order
                document.getElementById('activeOrderPanel').classList.add('hidden');
                document.getElementById('ordersContainer').classList.remove('hidden');
                document.getElementById('statsSection').classList.remove('hidden');
                document.getElementById('radiusControl').classList.remove('hidden');
                window.Ramazone.activeOrder = null;
            }
        }
    });
}

// 4. LOAD ACTIVE ORDER UI
export async function loadActiveOrder(id, o) {
    window.Ramazone.activeOrder = {id, ...o};

    // Toggle Screens
    document.getElementById('ordersContainer').classList.add('hidden');
    document.getElementById('noOrdersState').classList.add('hidden');
    document.getElementById('statsSection').classList.add('hidden');
    document.getElementById('radiusControl').classList.add('hidden');
    document.getElementById('activeOrderPanel').classList.remove('hidden');
    document.getElementById('wholesalerStrip').classList.add('hidden');

    // Fill Data
    document.getElementById('actCust').innerText = o.user?.name || "Customer";
    document.getElementById('actAddr').innerText = o.location?.address || "Unknown";
    document.getElementById('actPrefTime').innerText = o.preferences?.deliveryTime || "Standard";
    document.getElementById('actPrefBudget').innerText = o.preferences?.budget || "Standard";

    // Order Time
    if(o.timestamp) {
        document.getElementById('actOrderTime').innerText = new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Bill Details
    document.getElementById('billItemTotal').innerText = o.payment?.itemTotal || 0;
    document.getElementById('billDeliveryFee').innerText = o.payment?.deliveryFee || 0;
    document.getElementById('billGrandTotal').innerText = o.payment?.grandTotal || 0;

    // Items List
    const ul = document.getElementById('actItems');
    if(ul) {
        ul.innerHTML = o.cart ? o.cart.filter(i=>i.qty!=='Special Request').map(i => {
            const price = parseFloat(i.price) || 0;
            const count = parseInt(i.count) || 1;
            const quantityText = i.qty ? `<span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">${i.qty} x ${count}</span>` : `<span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">x ${count}</span>`;
            return `
            <li class="flex justify-between border-b border-gray-100 pb-1 last:border-0 items-center">
                <div>
                    <div class="flex items-center">
                        <span class="text-gray-800 font-medium">${i.name}</span>
                        ${quantityText}
                    </div>
                    <span class="text-[10px] text-gray-500 block">₹${price} x ${count}</span>
                </div>
                <span class="text-gray-900 font-bold">₹${price * count}</span>
            </li>
        `}).join('') : '';
    }

    // Special Requests & Weight
    const weight = calculateOrderWeight(o.cart);
    let specialReqHTML = '';
    if(o.cart) o.cart.forEach(item => {
        if(item.qty === 'Special Request') {
            specialReqHTML = `
                <div class="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3">
                    <i class="fa-solid fa-wand-magic-sparkles text-amber-500 mt-1"></i>
                    <div><p class="font-bold text-amber-600 uppercase text-xs">Special Request</p><p class="text-gray-700 text-sm font-bold">${item.name}</p></div>
                </div>`;
        }
    });

    const extraEl = document.getElementById('actExtraDetails');
    if(extraEl) {
        extraEl.innerHTML = `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 mt-2">
                <span class="text-[10px] text-gray-400 font-bold uppercase">Total Weight</span>
                <span class="text-sm font-bold text-gray-800"><i class="fa-solid fa-weight-hanging text-gray-500 mr-1"></i>${weight} KG</span>
            </div>
            ${specialReqHTML}
        `;
    }

    updateBtnUI(o.status);

    // ⚡ LAZY LOAD MAP MODULE
    // Hum map tabhi load karenge jab order active ho.
    const MapModule = await import('./map.js');
    MapModule.initMap(); // Map container initialize karo
    MapModule.updateMapVisuals(); // Route draw karo

    // Wholesaler Widget logic bhi yahan trigger kar sakte ho agar chahiye
}

// 5. UPDATE ORDER STATUS (Button Click)
export function updateOrderStatus() {
    if(!window.Ramazone.activeOrder) return;

    const currentStatus = window.Ramazone.activeOrder.status;
    let nextStatus = '';

    if(currentStatus === 'accepted') nextStatus = 'out_for_delivery';
    else if(currentStatus === 'out_for_delivery') nextStatus = 'delivered';
    else return;

    if(nextStatus === 'delivered' && !confirm("Confirm Cash Collected & Parcel Given?")) return;

    const updates = { status: nextStatus };
    const myLat = window.Ramazone.location.lat;
    const myLng = window.Ramazone.location.lng;

    if (nextStatus === 'out_for_delivery') {
        updates.pickupLocation = { lat: myLat, lng: myLng };
    }

    if (nextStatus === 'delivered') {
        // Distance Calculation for Analytics
        if(window.Ramazone.activeOrder.pickupLocation) {
            const pick = window.Ramazone.activeOrder.pickupLocation;
            const dist = getDistance(pick.lat, pick.lng, myLat, myLng);
            if(dist && !isNaN(dist)) {
                db.ref('deliveryBoys/' + window.Ramazone.user.mobile + '/totalDistance').transaction(d => (d || 0) + parseFloat(dist));
            }
        }

        updates.completedAt = firebase.database.ServerValue.TIMESTAMP;
        updates.partnerPay = PARTNER_PAY;
    }

    db.ref('orders/' + window.Ramazone.activeOrder.id).update(updates).then(() => {
        window.Ramazone.activeOrder.status = nextStatus; // Local update

        if (nextStatus === 'delivered') {
            triggerCelebration();
            showToast("Order Completed! Great Job!");

            // Update Earnings
            const userRef = db.ref('deliveryBoys/' + window.Ramazone.user.mobile);
            userRef.child('earnings').transaction(c => (c || 0) + PARTNER_PAY);
            userRef.child('trips').transaction(c => (c || 0) + 1);
            userRef.child('lifetimeEarnings').transaction(c => (c || 0) + PARTNER_PAY);

            // Clean up UI after 3 seconds
            setTimeout(() => {
                window.Ramazone.activeOrder = null;
                document.getElementById('activeOrderPanel').classList.add('hidden');
                document.getElementById('statsSection').classList.remove('hidden');
                document.getElementById('radiusControl').classList.remove('hidden');
                document.getElementById('ordersContainer').classList.remove('hidden');
                listenOrders();
            }, 3000);
        } else {
            updateBtnUI(nextStatus);
        }
    });
}

// Helper: Button Styling based on Status
function updateBtnUI(status) {
    const b = document.getElementById('actionBtn');
    const s = document.getElementById('activeStatus');

    if(status === 'accepted') {
        s.innerText = "Going to Shop"; 
        s.className = "text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase font-bold";
        b.innerText = "PICKED UP ORDER"; 
        b.className = "w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200";
    } else if(status === 'out_for_delivery') {
        s.innerText = "Out for Delivery"; 
        s.className = "text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase font-bold";
        b.innerText = "DELIVERED & CASH COLLECTED"; 
        b.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200";
    }
}