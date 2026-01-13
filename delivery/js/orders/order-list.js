// ==========================================
// ORDER LISTING & ACCEPTANCE
// ==========================================

import { db } from '../config.js';
import { getUser, getLocation, getRadius, getActiveOrder } from '../core/state.js';
import { getDistance, calculateOrderWeight, showToast } from '../utils.js';

let ordersRef = null;
let lastSnapshot = null;

// DOM Elements
const listEl = document.getElementById('ordersList');
const countEl = document.getElementById('orderCount');
const containerEl = document.getElementById('ordersContainer');
const noOrdersEl = document.getElementById('noOrdersState');

export function startListeningOrders() {
    if (ordersRef) return; // Already listening

    ordersRef = db.ref('orders');
    ordersRef.on('value', (snap) => {
        lastSnapshot = snap;
        renderOrders(snap);
    });

    // Setup Event Delegation for Buttons (Accept & Map)
    if (listEl) {
        listEl.onclick = handleListClicks;
    }
}

export function stopListeningOrders() {
    if (ordersRef) {
        ordersRef.off();
        ordersRef = null;
    }
    lastSnapshot = null;
}

// Called by GPS Service when location changes
export function refreshOrderList() {
    if (lastSnapshot) renderOrders(lastSnapshot);
}

function renderOrders(snap) {
    // If Active Order exists, hide this list entirely (handled by active-order.js mostly, but safety check)
    if (getActiveOrder()) {
        toggleListVisibility(false);
        return;
    }

    if (!snap.exists()) {
        renderEmptyState();
        return;
    }

    const orders = snap.val();
    const myLoc = getLocation();
    const radius = getRadius();
    const user = getUser();

    listEl.innerHTML = '';
    let count = 0;

    Object.entries(orders).forEach(([id, o]) => {
        // FILTER: Status 'placed' AND within Radius
        if (o.status !== 'placed') return;

        const dist = parseFloat(getDistance(myLoc.lat, myLoc.lng, o.location.lat, o.location.lng));
        const isInRange = dist <= parseFloat(radius);

        if (isInRange) {
            count++;
            const card = createOrderCard(id, o, dist);
            listEl.insertAdjacentHTML('beforeend', card);
        }
    });

    if (countEl) countEl.innerText = count;

    if (count > 0) {
        toggleListVisibility(true);
    } else {
        renderEmptyState();
    }
}

function createOrderCard(id, o, dist) {
    const shopName = o.user?.shopName || "Unknown Shop";
    const address = o.location?.address || "Address Hidden";
    const grandTotal = o.payment?.grandTotal || 0;
    const time = o.timestamp ? new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "N/A";
    const weight = calculateOrderWeight(o.cart);

    // Products Text
    const prodTxt = o.cart ? o.cart.filter(i=>i.qty!=='Special Request').map(i => `${i.count}x ${i.name}`).join(', ') : 'Items';

    // Special Request Badge
    let specialReqHTML = '';
    if (o.cart && o.cart.some(i => i.qty === 'Special Request')) {
        specialReqHTML = `<div class="mt-3 bg-amber-50 border border-amber-200 p-2 rounded text-xs flex items-start gap-2"><i class="fa-solid fa-star text-amber-500 mt-0.5"></i><div><p class="font-bold text-amber-600 uppercase text-[9px]">Special Request</p></div></div>`;
    }

    return `
    <div class="glass-card bg-white border border-slate-200 p-4 rounded-xl relative mb-4 shadow-sm">
        <div class="flex justify-between items-start mb-2">
            <h4 class="font-bold text-gray-900 text-lg">${shopName}</h4>
            <span class="bg-gray-800 text-white border border-gray-900 text-xs font-bold px-3 py-1 rounded">₹${grandTotal}</span>
        </div>
        <div class="text-xs text-gray-500 space-y-1 mb-3">
            <p class="truncate"><i class="fa-solid fa-box mr-1"></i> ${prodTxt}</p>
            <p class="truncate"><i class="fa-solid fa-location-dot mr-1"></i> ${address}</p>
            <div class="grid grid-cols-2 gap-2 mt-3 mb-2">
                <div class="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col items-center"><span class="text-[9px] text-gray-400 uppercase font-bold">Time</span><span class="text-xs font-bold text-blue-600">${time}</span></div>
                <div class="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col items-center"><span class="text-[9px] text-gray-400 uppercase font-bold">Dist</span><span class="text-xs font-bold text-amber-600">${dist} KM</span></div>
            </div>
            ${specialReqHTML}
        </div>
        <div class="flex gap-2">
            <button data-action="map" data-lat="${o.location.lat}" data-lng="${o.location.lng}" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm transition"><i class="fa-solid fa-location-arrow pointer-events-none"></i></button>
            <button data-action="accept" data-id="${id}" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-sm active:scale-95 transition">ACCEPT ORDER</button>
        </div>
    </div>`;
}

// ============================
// EVENT HANDLERS
// ============================

function handleListClicks(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === 'accept') {
        const id = btn.dataset.id;
        acceptOrder(id);
    }
    if (action === 'map') {
        const lat = btn.dataset.lat;
        const lng = btn.dataset.lng;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
}

function acceptOrder(id) {
    if (getActiveOrder()) return showToast("Finish current order first!");
    if (!confirm("Are you sure you want to accept?")) return;

    const user = getUser();

    // Firebase Transaction to prevent double booking
    db.ref('orders/' + id).transaction((o) => {
        if (o && (o.status === 'placed')) {
            o.status = 'accepted';
            o.deliveryBoyId = user.mobile;
            o.deliveryBoyName = user.name;
            o.deliveryBoyMobile = user.mobile;
            return o;
        }
    }, (error, committed, snapshot) => {
        if (committed) {
            showToast("Accepted! Task Started.");
            // Active order logic will be picked up by active-order.js listener
        } else {
            showToast("Missed it! Taken by another partner.");
        }
    });
}

// ============================
// UI HELPERS
// ============================

function toggleListVisibility(hasOrders) {
    if (hasOrders) {
        noOrdersEl.classList.add('hidden');
        containerEl.classList.remove('hidden');
    } else {
        renderEmptyState();
    }
}

function renderEmptyState() {
    noOrdersEl.classList.remove('hidden');
    containerEl.classList.add('hidden');
    if (countEl) countEl.innerText = "0";
}