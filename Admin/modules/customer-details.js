// modules/customer-details.js

export default {
    async show(db, customerId, customerData) {
        const overlay = document.createElement('div');
        overlay.id = 'cust-detail-overlay';
        overlay.className = 'fixed inset-0 z-[60] bg-slate-950 animate-slide-in flex flex-col';

        // Header
        overlay.innerHTML = `
            <div class="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 safe-area-top">
                <div class="flex items-center gap-3">
                    <button id="close-details" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="font-bold text-white text-lg leading-none">${customerData.name}</h2>
                        <p class="text-[10px] text-slate-400 font-mono mt-0.5">${customerData.mobile}</p>
                    </div>
                </div>
            </div>
            <div class="flex-1 flex items-center justify-center text-slate-500 gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-blue-500"></i> Scanning History...
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('close-details').addEventListener('click', () => {
            overlay.classList.add('animate-slide-out');
            setTimeout(() => overlay.remove(), 200);
        });

        // 🔥 Fetch & Filter Orders
        try {
            const ordersRef = db.ref('orders').limitToLast(500);

            ordersRef.once('value', snapshot => {
                const customerOrders = [];
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        const o = child.val();
                        // Match User
                        const oUserId = o.userId || (o.user ? o.user.id : null);
                        const oMobile = o.user ? o.user.mobile : null;

                        if (String(oUserId) === String(customerId) || String(oMobile) === String(customerData.mobile)) {
                            // 🔥 Fix Amount Calculation here
                            const calculatedTotal = this.calculateOrderTotal(o);
                            customerOrders.push({ 
                                id: child.key, 
                                ...o, 
                                finalAmount: calculatedTotal // Store calculated amount
                            });
                        }
                    });
                }
                const stats = this.calculateStats(customerOrders);
                this.renderContent(overlay, customerData, stats, customerOrders);
            });
        } catch (error) {
            console.error(error);
        }
    },

    // 💰 New Helper: Calculate Total if missing in DB
    calculateOrderTotal(order) {
        // Agar DB mein totalAmount hai to wahi use karo
        if(order.totalAmount && !isNaN(order.totalAmount)) return parseFloat(order.totalAmount);

        // Agar nahi hai, to Cart se calculate karo
        let total = 0;
        const items = order.cart || order.items || [];

        if (Array.isArray(items)) {
            items.forEach(i => {
                // Price keys alag alag ho sakti hain (price, dprice, offerPrice)
                const price = parseFloat(i.price || i.dprice || i.offerPrice || 0);
                const qty = parseInt(i.count || i.quantity || i.qty || 1);
                total += (price * qty);
            });
        }

        // Delivery Fee add karo
        const fee = parseFloat(order.payment?.deliveryFee || 0);
        return total + fee;
    },

    calculateStats(orders) {
        let totalSpent = 0;
        let deliveredCount = 0;
        let cancelledCount = 0;
        let itemsMap = {};
        let partnerMap = {};

        orders.forEach(o => {
            if (o.status === 'delivered') {
                totalSpent += o.finalAmount; // Use calculated amount
                deliveredCount++;
                if(o.deliveryBoyName) partnerMap[o.deliveryBoyName] = (partnerMap[o.deliveryBoyName] || 0) + 1;
            } else if (o.status === 'cancelled') cancelledCount++;

            const itemList = o.cart || o.items || [];
            if (Array.isArray(itemList)) {
                itemList.forEach(item => {
                    const cleanName = (item.name || 'Unknown').trim();
                    const qty = item.count || item.quantity || 1;
                    itemsMap[cleanName] = (itemsMap[cleanName] || 0) + qty;
                });
            }
        });

        let topItem = "No orders"; let maxItem = 0;
        for (const [k, v] of Object.entries(itemsMap)) { if(v > maxItem) { maxItem = v; topItem = k; } }

        let topPartner = "N/A"; let maxPartner = 0;
        for (const [k, v] of Object.entries(partnerMap)) { if(v > maxPartner) { maxPartner = v; topPartner = k; } }

        return { totalSpent, deliveredCount, cancelledCount, topItem, topPartner };
    },

    renderContent(overlay, user, stats, orders) {
        const fmtMoney = (amount) => "₹" + amount.toLocaleString('en-IN');

        // Recovery Messages
        const waMsg = `Hello ${user.name},\n\nYour Login PIN for *${user.shopName}* is: *${user.pin}*\n\nPlease keep it safe.\n- Team Ramazone`;
        const smsMsg = `Hello ${user.name}, Your PIN is: ${user.pin}`;

        const contentHTML = `
            <div class="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 safe-area-top">
                <div class="flex items-center gap-3">
                    <button id="close-details-btn" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="font-bold text-white text-lg leading-none flex items-center gap-2">${user.name}</h2>
                        <p class="text-[10px] text-slate-400 font-mono mt-0.5">${user.mobile}</p>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-20">

                <div class="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            <i class="fa-solid fa-user-shield text-blue-500"></i> Security & PIN
                        </h4>
                        <div class="bg-slate-950 px-3 py-1 rounded border border-slate-800 text-sm font-mono text-white tracking-widest font-bold">
                            ${user.pin || '----'}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <a href="https://wa.me/91${user.mobile}?text=${encodeURIComponent(waMsg)}" target="_blank" 
                           class="bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-600/30 py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition active:scale-95">
                            <i class="fa-brands fa-whatsapp text-sm"></i> Send PIN
                        </a>
                        <a href="sms:${user.mobile}?body=${encodeURIComponent(smsMsg)}" 
                           class="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/30 py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition active:scale-95">
                            <i class="fa-solid fa-comment-sms text-sm"></i> Text SMS
                        </a>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Total Spent</p>
                        <h3 class="text-2xl font-bold text-white mt-1">${fmtMoney(stats.totalSpent)}</h3>
                    </div>
                    <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Orders</p>
                        <h3 class="text-2xl font-bold text-white mt-1">${stats.deliveredCount} <span class="text-xs text-slate-500">/ ${orders.length}</span></h3>
                    </div>
                </div>

                <div class="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4">
                    <h4 class="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 border-b border-slate-800 pb-2">
                        <i class="fa-solid fa-microchip text-blue-500"></i> Intelligence
                    </h4>
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded bg-amber-900/20 text-amber-500 flex items-center justify-center"><i class="fa-solid fa-trophy"></i></div>
                        <div><p class="text-[10px] text-slate-500 font-bold uppercase">Favorite</p><p class="text-sm text-white">${stats.topItem}</p></div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded bg-purple-900/20 text-purple-500 flex items-center justify-center"><i class="fa-solid fa-handshake"></i></div>
                        <div><p class="text-[10px] text-slate-500 font-bold uppercase">Partner</p><p class="text-sm text-white">${stats.topPartner}</p></div>
                    </div>
                </div>

                <div class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                     <h4 class="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 p-4 border-b border-slate-800 bg-slate-950">
                        <i class="fa-solid fa-clock-rotate-left"></i> Recent Activity
                    </h4>
                    <div class="divide-y divide-slate-800 max-h-60 overflow-y-auto">
                        ${orders.length === 0 ? '<p class="p-4 text-center text-xs text-slate-500">No orders found.</p>' : ''}
                        ${orders.slice().reverse().map(o => `
                            <div class="p-3 hover:bg-slate-800/50 flex justify-between items-center">
                                <div><p class="text-xs text-white font-bold">#${o.id.slice(-5)}</p><p class="text-[10px] text-slate-500">${new Date(o.timestamp).toDateString()}</p></div>
                                <div class="text-right">
                                    <p class="text-xs font-bold text-white">${fmtMoney(o.finalAmount)}</p>
                                    <span class="text-[9px] text-slate-500 uppercase">${o.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const container = document.querySelector('#cust-detail-overlay');
        if(container) {
            container.innerHTML = contentHTML;
            document.getElementById('close-details-btn').addEventListener('click', () => {
                container.classList.add('animate-slide-out');
                setTimeout(() => container.remove(), 200);
            });
        }
    }
};