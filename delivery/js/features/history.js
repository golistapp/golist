// ==========================================
// SETTLEMENT HISTORY MANAGER
// ==========================================

import { db } from '../config.js';
import { getUser } from '../core/state.js';
import { toggleClass } from '../utils.js';

let historyQuery = null;

// DOM Elements
const els = {
    modal: document.getElementById('modal-history'),
    btnClose: document.querySelector('#modal-history .btn-close-modal'),
    btnOpen: document.getElementById('navHistory'),
    list: document.getElementById('historyList'),
    totalVal: document.getElementById('totalSettledVal')
};

// ============================
// INITIALIZATION
// ============================

export function initHistoryFeature() {
    console.log("Initializing History Module...");

    // Bind Events
    if (els.btnOpen) els.btnOpen.onclick = openModal;
    if (els.btnClose) els.btnClose.onclick = closeModal;
}

function openModal() {
    els.modal.classList.remove('hidden');
    fetchHistory();

    // Close sidebar if open
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('menuOverlay').classList.remove('open');
}

function closeModal() {
    els.modal.classList.add('hidden');
    if (historyQuery) {
        historyQuery.off();
        historyQuery = null;
    }
}

// ============================
// DATA FETCHING & RENDERING
// ============================

function fetchHistory() {
    const user = getUser();
    if (!user || !els.list) return;

    // Loading State
    els.list.innerHTML = '<div class="flex flex-col items-center justify-center py-8 text-gray-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><p class="text-xs">Loading history...</p></div>';

    // Query: Last 50 entries
    const historyRef = db.ref(`deliveryBoys/${user.mobile}/settlementHistory`);
    historyQuery = historyRef.limitToLast(50);

    historyQuery.on('value', (snap) => {
        if (!snap.exists()) {
            renderEmpty();
            return;
        }

        const entries = [];
        let totalSettled = 0;

        snap.forEach((child) => {
            const item = child.val();
            entries.push(item);
            totalSettled += (parseFloat(item.amount) || 0);
        });

        // Show Total
        if (els.totalVal) els.totalVal.innerText = totalSettled;

        // Render List (Newest First)
        renderList(entries.reverse());
    });
}

function renderList(entries) {
    els.list.innerHTML = '';

    entries.forEach(item => {
        let dateStr = "N/A";
        let timeStr = "";

        if (item.timestamp) {
            const dateObj = new Date(item.timestamp);
            dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }

        const row = `
            <div class="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-gray-800">Payout Received</p>
                        <p class="text-[10px] text-gray-500 font-medium">${dateStr}, ${timeStr}</p>
                    </div>
                </div>
                <span class="text-green-600 font-bold text-lg">+₹${item.amount}</span>
            </div>
        `;
        els.list.insertAdjacentHTML('beforeend', row);
    });
}

function renderEmpty() {
    els.list.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fa-solid fa-clock-rotate-left text-3xl mb-2 opacity-50"></i><p class="text-xs">No settlement history found.</p></div>';
    if (els.totalVal) els.totalVal.innerText = '0';
}