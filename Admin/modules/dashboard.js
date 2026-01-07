// modules/dashboard.js

let ordersRef = null;
let adminLat = null;
let adminLng = null;

export default {
    async render(container, db) {
        this.getAdminLocation();

        container.innerHTML = `
            <div class="space-y-6 fade-in pb-20">
                <div class="flex justify-between items-end border-b border-slate-800 pb-4">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Live Activity</h2>
                        <p class="text-xs text-slate-400">Pending & Active Orders</p>
                    </div>
                    <span id="active-count" class="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full hidden animate-pulse">0 Active</span>
                </div>

                <div id="orders-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="col-span-full text-center py-20 text-slate-500">
                        <i class="fa-solid fa-circle-notch fa-spin mr-2 text-blue-500"></i> Loading Feed...
                    </div>
                </div>
            </div>
        `;

        const grid = document.getElementById('orders-grid');
        grid.addEventListener('click', (e) => this.handleGridClicks(e, db));

        ordersRef = db.ref('orders').limitToLast(50);

        ordersRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">No active orders.</div>`;
                document.getElementById('active-count').classList.add('hidden');
                return;
            }

            const orders = snapshot.val();
            let html = '';
            let activeCount = 0;

            Object.entries(orders).reverse().forEach(([id, order]) => {
                // 🔥 CHANGE: Sirf Active Orders dikhao (Delivered/Cancelled hata do)
                if (order.status !== 'delivered' && order.status !== 'cancelled') {
                    activeCount++;
                    html += this.createDetailedCard(id, order); // Function niche same rahega
                }
            });

            if(html === '') {
                 grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">No active orders right now. Check History.</div>`;
            } else {
                grid.innerHTML = html;
            }

            const badge = document.getElementById('active-count');
            if(activeCount > 0) {
                badge.innerText = `${activeCount} Active`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    },

    cleanup() {
        if (ordersRef) ordersRef.off();
    },

    // --- HELPER FUNCTIONS ---
    getAdminLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(p => {
                adminLat = p.coords.latitude;
                adminLng = p.coords.longitude;
            });
        }
    },

    getDistance(lat1, lon1, lat2, lon2) {
        if(!lat1 || !lon1 || !lat2 || !lon2) return "?";
        if(!adminLat || !adminLng) return "?"; 
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return (R * c).toFixed(1); 
    },

    calculateWeight(cart) {
        if (!cart || !Array.isArray(cart)) return 0;
        let totalKg = 0;
        cart.forEach(item => {
            if (item.qty === 'Special Request') return; 
            let txt = item.qty.toLowerCase().replace(/\s/g, ''); 
            let weight = 0; 
            let mul = item.count || 1; 
            let match;
            if (match = txt.match(/(\d+(\.\d+)?)kg/)) weight = parseFloat(match[1]);
            else if ((match = txt.match(/(\d+)g/)) || (match = txt.match(/(\d+)gm/))) weight = parseFloat(match[1]) / 1000;
            else if ((match = txt.match(/(\d+(\.\d+)?)l/)) || (match = txt.match(/(\d+(\.\d+)?)ltr/))) weight = parseFloat(match[1]);
            else if (match = txt.match(/(\d+)ml/)) weight = parseFloat(match[1]) / 1000;
            totalKg += (weight * mul);
        });
        return totalKg.toFixed(2); 
    },

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    },

    createDetailedCard(id, order) {
        // Status Logic
        let statusBadge = '';
        if(order.status === 'placed') statusBadge = `<span class="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">PLACED</span>`;
        else if(order.status === 'accepted') statusBadge = `<span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">ACCEPTED</span>`;
        else statusBadge = `<span class="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${order.status}</span>`;

        // Products
        let productsHTML = '';
        let waItems = '';
        if(order.cart) {
            order.cart.forEach(i => {
                productsHTML += `
                    <div class="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                        <div class="text-sm text-slate-300 font-medium"><span class="text-slate-500 mr-2">${i.count}x</span> ${i.name}</div>
                        <div class="text-xs text-slate-500 font-mono">${i.qty}</div>
                    </div>
                `;
                waItems += `${i.name} (${i.qty}) x${i.count}\n`;
            });
        }

        const totalWeight = this.calculateWeight(order.cart);
        const orderTime = this.formatTime(order.timestamp);

        let distBadge = `<span class="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700"><i class="fa-solid fa-spinner fa-spin"></i></span>`;
        if(adminLat && order.location && order.location.lat) {
            const dist = this.getDistance(adminLat, adminLng, order.location.lat, order.location.lng);
            distBadge = `<span class="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-900/50 font-bold"><i class="fa-solid fa-route"></i> ${dist} KM</span>`;
        }

        const prefTime = order.preferences?.deliveryTime || 'Standard';
        const prefBudg = order.preferences?.budget || 'Standard';

        let partnerDisplay = '';
        let mainBtn = '';

        if(order.status === 'placed') {
            mainBtn = `<button class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg transition btn-assign" data-id="${id}">ASSIGN PARTNER <i class="fa-solid fa-user-plus ml-1"></i></button>`;
        } else if(order.deliveryBoyName) {
            partnerDisplay = `<div class="text-xs text-blue-400 font-bold mt-2 flex items-center gap-2"><i class="fa-solid fa-motorcycle"></i> ${order.deliveryBoyName}</div>`;
            mainBtn = `<button class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg text-xs mt-2 transition border border-slate-700 btn-assign" data-id="${id}">RE-ASSIGN (Check KM)</button>`;
        }

        const waLink = `https://wa.me/?text=${encodeURIComponent(`*Customer:* ${order.user.name}\n*Order ID:* #${id}\n*Phone:* ${order.user.mobile}\n\n*Items:*\n${waItems}`)}`;
        const mapLink = order.location ? `https://maps.google.com/?q=$${order.location.lat},${order.location.lng}` : '#';

        return `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700 transition group relative overflow-hidden">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-white text-lg leading-tight">${order.user.name}</h3>
                        <a href="tel:${order.user.mobile}" class="text-sm text-blue-500 font-mono font-bold mt-1 block hover:underline"><i class="fa-solid fa-phone mr-1"></i> ${order.user.mobile}</a>
                    </div>
                    ${statusBadge}
                </div>
                <div class="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-store text-pink-500"></i>
                    <span class="text-xs text-slate-300 font-bold">Shop: <span class="text-slate-400 font-normal">${order.user.shopName || 'N/A'}</span></span>
                </div>
                <div class="bg-slate-950/50 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar border border-slate-800/50">
                    ${productsHTML || '<span class="text-xs text-slate-500">No items</span>'}
                </div>
                <div class="flex flex-wrap gap-2">
                    <span class="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-[10px] font-bold border border-purple-900/50 flex items-center gap-1"><i class="fa-regular fa-clock"></i> ${prefTime}</span>
                    <span class="bg-pink-900/30 text-pink-300 px-2 py-1 rounded text-[10px] font-bold border border-pink-900/50 flex items-center gap-1"><i class="fa-solid fa-wallet"></i> ${prefBudg}</span>
                    <span class="bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-bold border border-slate-700 flex items-center gap-1"><i class="fa-solid fa-hourglass-half"></i> ${orderTime}</span>
                    <span class="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] font-bold border border-slate-700 flex items-center gap-1"><i class="fa-solid fa-weight-hanging"></i> ${totalWeight} KG</span>
                </div>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div class="flex items-start gap-2 overflow-hidden">
                        <i class="fa-solid fa-location-dot text-slate-500 mt-0.5 shrink-0"></i>
                        <p class="text-xs text-slate-400 truncate w-full" title="${order.location?.address}">${order.location?.address || 'No Address'}</p>
                    </div>
                    <div class="shrink-0 ml-2">${distBadge}</div>
                </div>
                ${partnerDisplay}
                ${mainBtn}
                <div class="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
                    <div>
                        <span class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">FEE</span>
                        <span class="font-bold text-white text-xl">₹${order.payment?.deliveryFee || 0}</span>
                    </div>
                    <div class="flex gap-2">
                        <a href="${waLink}" target="_blank" class="w-10 h-10 rounded-xl bg-green-900/20 text-green-500 border border-green-900/30 flex items-center justify-center hover:bg-green-600 hover:text-white transition shadow-lg"><i class="fa-brands fa-whatsapp text-lg"></i></a>
                        <a href="${mapLink}" target="_blank" class="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center hover:bg-blue-600 hover:text-white transition shadow-lg"><i class="fa-solid fa-map-location-dot"></i></a>
                        <a href="tel:${order.user.mobile}" class="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:text-white transition shadow-lg"><i class="fa-solid fa-phone"></i></a>
                        <button class="w-10 h-10 rounded-xl bg-slate-800 text-red-500 border border-slate-700 flex items-center justify-center hover:bg-red-600 hover:text-white transition shadow-lg btn-delete" data-id="${id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    },

    handleGridClicks(e, db) {
        const delBtn = e.target.closest('.btn-delete');
        if (delBtn) {
            const id = delBtn.dataset.id;
            if(confirm("Delete this order?")) db.ref('orders/' + id).remove();
        }
        const assignBtn = e.target.closest('.btn-assign');
        if (assignBtn) alert("Assign Feature: Coming soon!");
    }
};