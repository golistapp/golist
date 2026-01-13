// ==========================================
// ACTIVE ORDER MANAGEMENT (FIXED SYNTAX)
// ==========================================

import { db, PARTNER_PAY } from '../config.js';
import { getUser, setActiveOrder, getActiveOrder, setDutyStatus, getLocation } from '../core/state.js';
import { calculateOrderWeight, showToast, getDistance, triggerExternalAction } from '../utils.js';
import { toggleDuty } from '../core/duty.service.js';

// DOM Elements
const panelEl = document.getElementById('activeOrderPanel');
const containerEl = document.getElementById('ordersContainer');
const radiusCtrl = document.getElementById('radiusControl');
const statsSec = document.getElementById('statsSection');
const btnAction = document.getElementById('actionBtn');

// Active Order Listener
let activeQuery = null;

// Expose Toggle Function Globally for HTML onclick
window.toggleItemsList = function() {
    const list = document.getElementById('actItems');
    const icon = document.getElementById('toggleItemsIcon');
    if (list.classList.contains('hidden')) {
        list.classList.remove('hidden');
        if(icon) icon.style.transform = "rotate(0deg)";
    } else {
        list.classList.add('hidden');
        if(icon) icon.style.transform = "rotate(180deg)";
    }
}

export function initActiveOrderModule() {
    console.log("Initializing Active Order Module...");
    const user = getUser();
    if (!user) return;

    activeQuery = db.ref('orders').orderByChild('deliveryBoyId').equalTo(user.mobile);

    activeQuery.on('value', (snap) => {
        if (!snap.exists()) {
            clearActiveState();
            return;
        }

        let foundActive = false;
        snap.forEach((child) => {
            const order = { id: child.key, ...child.val() };
            if (order.status !== 'delivered' && order.status !== 'cancelled') {
                foundActive = true;
                loadActiveOrder(order);

                const dutySwitch = document.getElementById('dutySwitch');
                if (dutySwitch && !dutySwitch.checked) {
                    dutySwitch.checked = true;
                    toggleDuty(true);
                }
            }
        });

        if (!foundActive) clearActiveState();
    });

    if(btnAction) btnAction.onclick = handleStatusUpdate;
    setupExternalActions();
}

function setupExternalActions() {
    const btnNav = document.getElementById('btnNav');
    if(btnNav) btnNav.onclick = () => {
        const o = getActiveOrder();
        if(o && o.location) triggerExternalAction('map_dir', o.location);
    };

    const btnWa = document.getElementById('btnWa');
    if(btnWa) btnWa.onclick = () => {
        const o = getActiveOrder();
        if(o && o.user) triggerExternalAction('whatsapp', o.user.mobile);
    };

    const btnCall = document.getElementById('btnCall');
    if(btnCall) btnCall.onclick = () => {
        const o = getActiveOrder();
        if(o && o.user) triggerExternalAction('call', o.user.mobile);
    };
}

function loadActiveOrder(order) {
    setActiveOrder(order);

    if(containerEl) containerEl.classList.add('hidden');
    if(statsSec) statsSec.classList.add('hidden');
    if(radiusCtrl) radiusCtrl.classList.add('hidden');
    const noOrders = document.getElementById('noOrdersState');
    if(noOrders) noOrders.classList.add('hidden');
    const wsStrip = document.getElementById('wholesalerStrip');
    if(wsStrip) wsStrip.classList.add('hidden');

    if(panelEl) panelEl.classList.remove('hidden');

    renderOrderDetails(order);

    const mapSection = document.getElementById('liveMapSection');
    if(mapSection) mapSection.classList.remove('hidden');

    // CRITICAL FIX: Increased Delay to 350ms (Animation takes 300ms)
    if (window.mapManager && window.isOnline) {
        setTimeout(() => {
            window.mapManager.initDeliveryMap();
            setTimeout(() => {
                if(window.mapManager.updateMapVisuals) window.mapManager.updateMapVisuals();
                if(window.mapManager.renderActiveWholesalerWidget) window.mapManager.renderActiveWholesalerWidget();
            }, 50);
        }, 350); 
    }
}

function clearActiveState() {
    setActiveOrder(null);
    if(panelEl) panelEl.classList.add('hidden');

    if (window.isOnline) {
        if(containerEl) containerEl.classList.remove('hidden');
        if(statsSec) statsSec.classList.remove('hidden');
        if(radiusCtrl) radiusCtrl.classList.remove('hidden');
        const wsStrip = document.getElementById('wholesalerStrip');
        if(wsStrip) wsStrip.classList.remove('hidden');
    }
}

// ============================
// LOGIC: WEIGHT PARSING
// ============================
function getWeightInKg(qtyString) {
    if(!qtyString) return 0;
    let txt = qtyString.toLowerCase().replace(/\s/g, '');
    let match;
    if (match = txt.match(/(\d+(\.\d+)?)kg/)) return parseFloat(match[1]);
    if (match = txt.match(/(\d+)g/)) return parseFloat(match[1]) / 1000;
    if (match = txt.match(/(\d+)gm/)) return parseFloat(match[1]) / 1000;
    if (match = txt.match(/(\d+(\.\d+)?)l/)) return parseFloat(match[1]); // Liter as Kg
    if (match = txt.match(/(\d+)ml/)) return parseFloat(match[1]) / 1000;
    return 0;
}

// ============================
// RENDERING LOGIC
// ============================

function renderOrderDetails(o) {
    // Basic Info
    document.getElementById('actShop').innerText = "You (Partner)";
    document.getElementById('actShop').classList.add('text-blue-600');
    document.getElementById('actShopLoc').innerHTML = '<span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1"></span> Live Tracking Active';
    document.getElementById('actCust').innerText = o.user?.name || "Customer";
    document.getElementById('actAddr').innerText = o.location?.address || "Unknown";

    const prefTime = o.preferences?.deliveryTime || "Standard";
    const prefBudg = o.preferences?.budget || "Standard";

    let orderTime = "N/A";
    if(o.timestamp) {
        orderTime = new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    if(document.getElementById('actPrefTime')) document.getElementById('actPrefTime').innerText = prefTime;
    if(document.getElementById('actPrefBudget')) document.getElementById('actPrefBudget').innerText = prefBudg;
    if(document.getElementById('actOrderTime')) document.getElementById('actOrderTime').innerText = orderTime;

    // --- ITEM LIST HEADER (With Toggle) ---
    const itemsContainer = document.getElementById('actItems').parentNode;
    if(itemsContainer) {
        // Find header inside
        let header = itemsContainer.querySelector('h4');
        if(!header) {
             itemsContainer.innerHTML = `<h4 class="text-xs font-bold text-gray-400 uppercase mb-2 border-b border-gray-100 pb-2 flex justify-between items-center cursor-pointer" onclick="window.toggleItemsList()"><span>Order Items</span> <i class="fa-solid fa-chevron-up transition-transform duration-300" id="toggleItemsIcon"></i></h4><ul id="actItems" class="text-sm space-y-2 font-medium"></ul>`;
        } else {
             header.className = "text-xs font-bold text-gray-400 uppercase mb-2 border-b border-gray-100 pb-2 flex justify-between items-center cursor-pointer";
             header.setAttribute('onclick', 'window.toggleItemsList()');
             header.innerHTML = `<span>Order Items</span> <i class="fa-solid fa-chevron-up transition-transform duration-300" id="toggleItemsIcon"></i>`;
        }
    }

    // --- ITEM LIST LOOP ---
    const itemsList = document.getElementById('actItems');
    itemsList.innerHTML = '';

    let specialReqHTML = '';

    if (o.cart) {
        o.cart.forEach(i => {
            if (i.qty === 'Special Request') {
                specialReqHTML = `
                <div class="mt-2 bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-start gap-2 animate-pulse">
                    <div class="bg-amber-100 p-1.5 rounded-full text-amber-600"><i class="fa-solid fa-wand-magic-sparkles text-xs"></i></div>
                    <div>
                        <p class="font-bold text-amber-700 uppercase text-[9px] tracking-wide">Special Request</p>
                        <p class="text-gray-800 text-xs font-bold leading-tight mt-0.5">${i.name}</p>
                    </div>
                </div>`;
                return;
            }

            const price = parseFloat(i.price) || 0;
            const count = parseInt(i.count) || 1;
            const total = price * count;

            let weightLabel = '';
            let rawUnit = i.qty || '';
            const weightPerUnit = getWeightInKg(rawUnit); 

            if(weightPerUnit > 0) {
                const totalWeightKg = weightPerUnit * count;
                if(totalWeightKg >= 1) {
                    weightLabel = `${parseFloat(totalWeightKg.toFixed(2))} kg`; 
                } else {
                    weightLabel = `${Math.round(totalWeightKg * 1000)} g`;
                }
            } else {
                weightLabel = rawUnit;
            }

            const priceUnitText = rawUnit ? `/${rawUnit}` : '/unit';

            const li = document.createElement('li');
            li.className = "flex items-center justify-between py-2 border-b border-gray-100 last:border-0";

            li.innerHTML = `
                <div class="flex items-center gap-2 flex-1 overflow-hidden">
                    <div class="bg-blue-50 text-blue-700 text-xs font-extrabold px-1.5 py-1 rounded-md border border-blue-100 min-w-[28px] text-center shadow-sm">
                        ${count}x
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="text-[13px] font-bold text-gray-800 truncate">${i.name}</span>
                            <span class="bg-gray-100 text-gray-600 text-[9px] px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap font-bold">${weightLabel}</span>
                        </div>
                        <p class="text-[10px] text-gray-400 font-medium">₹${price}${priceUnitText}</p>
                    </div>
                </div>

                <div class="text-right pl-2 whitespace-nowrap">
                    <span class="text-sm font-extrabold text-gray-900">₹${total}</span>
                </div>`;
            itemsList.appendChild(li);
        });
    }

    const extraDetails = document.getElementById('actExtraDetails');
    const weight = calculateOrderWeight(o.cart);

    if(extraDetails) {
        extraDetails.innerHTML = `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200 mt-2">
                <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Load</span>
                <span class="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm"><i class="fa-solid fa-weight-hanging text-gray-400 mr-1"></i>${weight} KG</span>
            </div>
            ${specialReqHTML}
        `;
    }

    const pay = o.payment || {};
    document.getElementById('billItemTotal').innerText = pay.itemTotal || 0;
    document.getElementById('billDeliveryFee').innerText = pay.deliveryFee || 0;
    document.getElementById('billGrandTotal').innerText = pay.grandTotal || 0;

    updateBtnUI(o.status);
    updateActiveDistance(o);
}

function updateActiveDistance(o) {
    if(!o) o = getActiveOrder();
    const myLoc = getLocation(); 
    if (o && o.location && myLoc.lat) {
         const d = getDistance(myLoc.lat, myLoc.lng, o.location.lat, o.location.lng);
         const distEl = document.getElementById('actDist');
         if(distEl) distEl.innerText = d + " KM";
    }
}

function updateBtnUI(status) {
    const statusLabel = document.getElementById('activeStatus');

    if (status === 'accepted') {
        statusLabel.innerText = "Going to Shop";
        statusLabel.className = "text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase font-bold tracking-wide";

        btnAction.innerText = "PICKED UP ORDER";
        btnAction.className = "w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition active:scale-95";
        btnAction.dataset.nextStatus = 'out_for_delivery';
    } 
    else if (status === 'out_for_delivery') {
        statusLabel.innerText = "Out for Delivery";
        statusLabel.className = "text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase font-bold tracking-wide";

        btnAction.innerText = "DELIVERED & CASH COLLECTED";
        btnAction.className = "w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition active:scale-95";
        btnAction.dataset.nextStatus = 'delivered';
    }
}

async function handleStatusUpdate() {
    const order = getActiveOrder();
    if (!order) return;

    const nextStatus = btnAction.dataset.nextStatus;

    if (nextStatus === 'delivered') {
        if (!confirm("Confirm Cash Collected? This will finish the order.")) return;
    }

    const updates = { status: nextStatus };
    const user = getUser();

    if (nextStatus === 'out_for_delivery') {
         const loc = getLocation();
         updates.pickupLocation = { lat: loc.lat, lng: loc.lng };
         await db.ref('orders/' + order.id).update(updates);
    }
    else if (nextStatus === 'delivered') {
        updates.completedAt = firebase.database.ServerValue.TIMESTAMP;
        updates.partnerPay = PARTNER_PAY;

        const driverRef = db.ref('deliveryBoys/' + user.mobile);
        driverRef.child('earnings').transaction(val => (val || 0) + PARTNER_PAY);
        driverRef.child('trips').transaction(val => (val || 0) + 1);

        triggerCelebration();
        showToast("Order Completed! ₹20 Added.");

        await db.ref('orders/' + order.id).update(updates);
    } 
    else {
         await db.ref('orders/' + order.id).update(updates);
    }
}

function triggerCelebration() {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    const overlay = document.getElementById('celebrationOverlay');
    if(overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 3000);
    }
}