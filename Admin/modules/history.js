// modules/history.js

let historyRef = null;

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="space-y-6 fade-in pb-20">
                <div class="flex justify-between items-end border-b border-slate-800 pb-4">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Order History</h2>
                        <p class="text-xs text-slate-400">Delivered & Completed Orders</p>
                    </div>
                </div>

                <div id="history-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="col-span-full text-center py-20 text-slate-500">
                        <i class="fa-solid fa-circle-notch fa-spin mr-2 text-blue-500"></i> Loading History...
                    </div>
                </div>
            </div>
        `;

        const grid = document.getElementById('history-grid');

        // Last 100 orders fetch karo
        historyRef = db.ref('orders').limitToLast(100);

        historyRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">History is empty.</div>`;
                return;
            }

            const orders = snapshot.val();
            let html = '';

            Object.entries(orders).reverse().forEach(([id, order]) => {
                // 🔥 LOGIC: Sirf Delivered ya Cancelled dikhao
                if (order.status === 'delivered' || order.status === 'cancelled') {
                    html += this.createHistoryCard(id, order);
                }
            });

            if(html === '') {
                 grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">No completed orders yet.</div>`;
            } else {
                grid.innerHTML = html;
            }
        });
    },

    cleanup() {
        if (historyRef) historyRef.off();
    },

    formatTime(timestamp) {
        const d = new Date(timestamp);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    },

    createHistoryCard(id, order) {
        // Status Badge
        let statusBadge = '';
        if(order.status === 'delivered') statusBadge = `<span class="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">DELIVERED</span>`;
        else if(order.status === 'cancelled') statusBadge = `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">CANCELLED</span>`;

        // Items
        let productsHTML = '';
        if(order.cart) {
            order.cart.forEach(i => {
                productsHTML += `
                    <div class="flex justify-between items-center py-1 text-xs border-b border-slate-800/50 last:border-0">
                        <span class="text-slate-400">${i.count}x ${i.name}</span>
                        <span class="text-slate-600">${i.qty}</span>
                    </div>`;
            });
        }

        const orderTime = this.formatTime(order.timestamp);

        // Partner Info
        let deliveredBy = '';
        if(order.deliveryBoyName && order.status === 'delivered') {
            deliveredBy = `<div class="mt-3 text-xs text-slate-500 bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-user-check text-green-500"></i> Delivered by <span class="text-white font-bold">${order.deliveryBoyName}</span>
            </div>`;
        }

        return `
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 opacity-80 hover:opacity-100 transition">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-slate-300 text-base">${order.user.name}</h3>
                        <p class="text-[10px] text-slate-500 font-mono">#${id.slice(-6)}</p>
                    </div>
                    ${statusBadge}
                </div>

                <div class="text-[10px] text-slate-500 flex items-center gap-2">
                    <i class="fa-solid fa-calendar-days"></i> ${orderTime}
                </div>

                <div class="bg-slate-950/30 rounded p-2 max-h-20 overflow-y-auto custom-scrollbar border border-slate-800/30">
                    ${productsHTML}
                </div>

                ${deliveredBy}

                <div class="mt-auto pt-3 border-t border-slate-800 flex justify-between items-center">
                    <span class="font-bold text-slate-400 text-sm">Fee: ₹${order.payment?.deliveryFee || 0}</span>
                    <span class="text-[10px] text-slate-600">${order.user.shopName}</span>
                </div>
            </div>
        `;
    }
};