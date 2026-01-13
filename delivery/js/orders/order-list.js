// ==========================================
// ORDER LISTING (RICH UI RESTORED)
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
    if (ordersRef) return; 

    ordersRef = db.ref('orders');
    ordersRef.on('value', (snap) => {
        lastSnapshot = snap;
        renderOrders(snap);
    });

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

export function refreshOrderList() {
    if (lastSnapshot) renderOrders(lastSnapshot);
}

function renderOrders(snap) {
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

    listEl.innerHTML = '';
    let count = 0;

    Object.entries(orders).forEach(([id, o]) => {
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

// --- RICH CARD DESIGN ---
function createOrderCard(id, o, dist) {
    const shopName = o.user?.shopName || "Unknown Shop";
    const address = o.location?.address || "Address Hidden";
    const grandTotal = o.payment?.grandTotal || 0;

    // Preferences & Time
    const prefTime = o.preferences?.deliveryTime || "Standard";
    const prefBudg = o.preferences?.budget || "Standard";
    const orderTime = o.timestamp ? new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "N/A";

    // Weight Calculation
    const weight = calculateOrderWeight(o.cart);

    // Items Summary
    const prodTxt = o.cart ? o.cart.filter(i=>i.qty!=='Special Request').map(i => `${i.count}x ${i.name}`).join(', ') : 'Items';

    // Special Request Badge
    let specialReqHTML = '';
    if (o.cart && o.cart.some(i => i.qty === 'Special Request')) {
        specialReqHTML = `
        <div class="mt-3 bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-start gap-2">
            <i class="fa-solid fa-wand-magic-sparkles text-amber-500 mt-1"></i>
            <div>
                <p class="font-bold text-amber-600 uppercase text-[10px]">Special Request</p>
                <p class="text-xs text-gray-700 font-bold">Customer added custom items</p>
            </div>
        </div>`;
    }

    return `
    <div class="bg-white border border-gray-200 p-4 rounded-xl relative mb-4 shadow-sm transition hover:shadow-md">
        <div class="flex justify-between items-start mb-3">
            <div>
                <h4 class="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <span class="text-red-500">❤️</span> ${shopName} <span class="text-red-500">❤️</span>
                </h4>
                <p class="text-[10px] text-gray-500 truncate mt-1"><i class="fa-solid fa-location-dot mr-1"></i> ${address}</p>
            </div>
            <span class="bg-gray-900 text-white text-sm font-bold px-3 py-1 rounded">₹${grandTotal}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3">
            <div class="bg-blue-50 p-2 rounded border border-blue-100 flex flex-col items-center">
                <span class="text-[9px] text-blue-400 uppercase font-bold">Pref. Time</span>
                <span class="text-xs font-bold text-blue-700">${prefTime}</span>
            </div>
            <div class="bg-pink-50 p-2 rounded border border-pink-100 flex flex-col items-center">
                <span class="text-[9px] text-pink-400 uppercase font-bold">Budget</span>
                <span class="text-xs font-bold text-pink-700">${prefBudg}</span>
            </div>
            <div class="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col items-center">
                <span class="text-[9px] text-gray-400 uppercase font-bold">Details</span>
                <span class="text-xs font-bold text-gray-700">${orderTime} <span class="bg-gray-200 px-1 rounded text-[9px] ml-1">${weight}kg</span></span>
            </div>
            <div class="bg-amber-50 p-2 rounded border border-amber-100 flex flex-col items-center">
                <span class="text-[9px] text-amber-500 uppercase font-bold">Distance</span>
                <span class="text-xs font-bold text-amber-700">${dist} KM</span>
            </div>
        </div>

        ${specialReqHTML}

        <div class="flex gap-2 mt-4">
            <button data-action="map" data-lat="${o.location.lat}" data-lng="${o.location.lng}" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm transition"><i class="fa-solid fa-location-arrow pointer-events-none"></i></button>
            <button data-action="accept" data-id="${id}" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-sm active:scale-95 transition">ACCEPT ORDER</button>
        </div>
    </div>`;
}

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

    db.ref('orders/' + id).transaction((o) => {
        if (o && (o.status === 'placed')) {
            o.status = 'accepted';
            o.deliveryBoyId = user.mobile;
            o.deliveryBoyName = user.name;
            o.deliveryBoyMobile = user.mobile;
            return o;
        }
    }, (error, committed) => {
        if (committed) {
            showToast("Accepted! Task Started.");
        } else {
            showToast("Missed it! Taken by another partner.");
        }
    });
}

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