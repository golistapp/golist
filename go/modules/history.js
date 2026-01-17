// ==========================================
// MODULE: Settlement History
// ==========================================

import { db } from './firebase-config.js';

let historyQuery = null;

// 1. OPEN MODAL & FETCH DATA
export function openHistoryModal() {
    // Show Modal
    const modal = document.getElementById('historyModal');
    if(modal) {
        modal.classList.remove('hidden');
        fetchHistory(); // Data load shuru karo
    }
}

// 2. FETCH HISTORY LOGIC
export function fetchHistory() {
    const list = document.getElementById('historyList');
    const totalEl = document.getElementById('totalSettledVal');

    if(!list || !window.Ramazone.user) return;

    // Loading State
    list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-gray-400">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
            <p class="text-xs">Loading history...</p>
        </div>
    `;

    // Path: deliveryBoys/{mobile}/settlementHistory
    const userMobile = window.Ramazone.user.mobile;
    const historyRef = db.ref('deliveryBoys/' + userMobile + '/settlementHistory');

    // Optimization: Sirf last 50 transactions mangwao
    historyQuery = historyRef.limitToLast(50);

    historyQuery.on('value', snap => {
        if(!snap.exists()) {
            list.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fa-solid fa-clock-rotate-left text-3xl mb-2 opacity-50"></i>
                    <p class="text-xs">No settlement history found.</p>
                </div>
            `;
            if(totalEl) totalEl.innerText = '0';
            return;
        }

        const entries = [];
        let totalSettled = 0;

        snap.forEach(child => {
            const item = child.val();
            entries.push(item);
            totalSettled += (parseFloat(item.amount) || 0);
        });

        // Reverse to show newest first
        entries.reverse();

        if(totalEl) totalEl.innerText = totalSettled;

        list.innerHTML = '';
        entries.forEach(item => {
            let dateStr = "N/A", timeStr = "";

            if(item.timestamp) {
                const dateObj = new Date(item.timestamp);
                dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            }

            // Design 100% same as original
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
            list.innerHTML += row;
        });
    });
}

// 3. CLEANUP (Memory Leak Prevention)
// Jab modal band hota hai (app.js handle karta hai), listener band karna achi practice hai
export function stopListening() {
    if(historyQuery) {
        historyQuery.off();
        historyQuery = null;
    }
}