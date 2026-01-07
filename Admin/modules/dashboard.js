// modules/dashboard.js

let ordersRef = null;
let adminLat = null;
let adminLng = null;

export default {
    async render(container, db) {
        this.getAdminLocation();

        container.innerHTML = `
            <div class="space-y-3 fade-in pb-24 relative">
                <div class="flex justify-between items-end border-b border-slate-800 pb-2 px-1">
                    <div>
                        <h2 class="text-lg font-bold text-white leading-tight">Live Activity</h2>
                        <p class="text-[10px] text-slate-400">Realtime Order Feed</p>
                    </div>
                    <span id="active-count" class="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full hidden animate-pulse shadow-lg shadow-red-900/20">0 Active</span>
                </div>

                <div id="orders-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div class="col-span-full text-center py-16 text-slate-500">
                        <i class="fa-solid fa-circle-notch fa-spin mr-2 text-blue-500"></i> syncing...
                    </div>
                </div>

                <div id="assign-modal" class="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm hidden flex items-center justify-center p-4 animate-scale-in">
                    <div class="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
                        <div class="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                            <div>
                                <h3 class="font-bold text-white text-sm">Smart Assign</h3>
                                <p class="text-[10px] text-slate-400">Nearest Available Partners</p>
                            </div>
                            <button id="close-assign" class="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
                        </div>

                        <div id="partner-list" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-slate-950/50">
                            <div class="text-center text-slate-500 py-6 text-xs">
                                <i class="fa-solid fa-satellite-dish fa-spin mb-2"></i><br>Locating Fleet...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const grid = document.getElementById('orders-grid');
        grid.addEventListener('click', (e) => this.handleGridClicks(e, db));

        document.getElementById('close-assign').addEventListener('click', () => {
            document.getElementById('assign-modal').classList.add('hidden');
        });

        ordersRef = db.ref('orders').limitToLast(50);
        ordersRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-500 bg-slate-900 rounded-xl border border-slate-800 text-xs border-dashed">No active orders found.</div>`;
                document.getElementById('active-count').classList.add('hidden');
                return;
            }

            const orders = snapshot.val();
            let html = '';
            let activeCount = 0;

            Object.entries(orders).reverse().forEach(([id, order]) => {
                if (order.status !== 'delivered' && order.status !== 'cancelled') {
                    activeCount++;
                    html += this.createDetailedCard(id, order);
                }
            });

            grid.innerHTML = html || `<div class="col-span-full text-center py-10 text-slate-500 bg-slate-900 rounded-xl border border-slate-800 text-xs border-dashed">All orders completed.</div>`;

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

    // --- LOGIC FUNCTIONS ---

    async openAssignModal(db, orderId, orderLocation) {
        const modal = document.getElementById('assign-modal');
        const list = document.getElementById('partner-list');

        modal.classList.remove('hidden');
        modal.dataset.orderId = orderId; 

        try {
            const snap = await db.ref('deliveryBoys').once('value');

            if(!snap.exists()) {
                list.innerHTML = `<div class="text-center text-slate-500 py-6 text-xs">No delivery partners found.</div>`;
                return;
            }

            const partners = snap.val();
            let partnerArray = [];

            Object.entries(partners).forEach(([pid, p]) => {
                let distNum = 9999;
                if(orderLocation && p.location) {
                    const pLat = p.location.lat || p.lat;
                    const pLng = p.location.lng || p.lng;
                    if(pLat && pLng) {
                        distNum = parseFloat(this.getDistance(pLat, pLng, orderLocation.lat, orderLocation.lng));
                    }
                }
                partnerArray.push({ pid, ...p, distNum });
            });

            partnerArray.sort((a, b) => {
                const aOnline = (a.status === 'online');
                const bOnline = (b.status === 'online');
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;
                return a.distNum - b.distNum;
            });

            list.innerHTML = '';
            partnerArray.forEach(p => {
                const isOnline = p.status === 'online';
                const statusText = isOnline ? 'Online' : 'Offline';
                const statusColor = isOnline ? 'text-green-400' : 'text-slate-500';
                const opacity = isOnline ? 'opacity-100' : 'opacity-60';
                const distanceDisplay = p.distNum < 9000 ? `${p.distNum} KM` : '--';
                const lastSeen = this.formatLastSeen(p.lastHeartbeat);

                const item = document.createElement('div');
                item.className = `bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between ${opacity}`;
                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700 relative text-xs">
                            ${p.name ? p.name.charAt(0).toUpperCase() : 'D'}
                            ${isOnline ? '<span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900"></span>' : ''}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-white leading-none">${p.name || 'Unknown'}</p>
                            <p class="text-[10px] ${statusColor} font-bold mt-0.5">
                                ${statusText} • <span class="text-slate-500 font-normal">${lastSeen}</span>
                            </p>
                            <p class="text-[10px] font-bold text-amber-500">
                                <i class="fa-solid fa-route"></i> ${distanceDisplay}
                            </p>
                        </div>
                    </div>
                    <button class="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition btn-confirm-assign shadow-lg shadow-blue-900/20">
                        ASSIGN
                    </button>
                `;

                item.querySelector('.btn-confirm-assign').addEventListener('click', () => {
                    this.assignPartner(db, orderId, p.pid, p);
                });

                list.appendChild(item);
            });

        } catch (error) {
            console.error(error);
            list.innerHTML = `<div class="text-red-400 text-center py-4 text-xs">Error loading list</div>`;
        }
    },

    assignPartner(db, orderId, partnerId, partnerData) {
        if(!confirm(`Assign to ${partnerData.name}?`)) return;

        const updates = {
            status: 'accepted',
            deliveryBoyId: partnerId,
            deliveryBoyName: partnerData.name,
            deliveryBoyMobile: partnerData.mobile,
            assignedAt: firebase.database.ServerValue.TIMESTAMP
        };

        db.ref('orders/' + orderId).update(updates).then(() => {
            document.getElementById('assign-modal').classList.add('hidden');
            const toast = document.createElement('div');
            toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl z-[300] text-xs font-bold animate-fadeIn';
            toast.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Assigned to ${partnerData.name}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        });
    },

    // --- UTILITIES ---
    getAdminLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(p => {
                adminLat = p.coords.latitude;
                adminLng = p.coords.longitude;
            });
        }
    },

    getDistance(lat1, lon1, lat2, lon2) {
        if(!lat1 || !lon1 || !lat2 || !lon2) return "9999";
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
            let mul = item.count || 1; 
            let match;
            let weight = 0;
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

    formatLastSeen(timestamp) {
        if (!timestamp) return 'Never';
        const diff = Date.now() - timestamp;
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'Just now';
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr}h ago`;
        return `${Math.floor(hr / 24)}d ago`;
    },

    // 🔥 ULTRA COMPACT & BEAUTIFUL CARD
    createDetailedCard(id, order) {
        // 1. Status Badge (Pill Style)
        let statusBadge = '';
        if(order.status === 'placed') statusBadge = `<span class="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shadow-sm shadow-amber-900/30">PLACED</span>`;
        else if(order.status === 'accepted') statusBadge = `<span class="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shadow-sm shadow-blue-900/30">ACCEPTED</span>`;
        else statusBadge = `<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">${order.status}</span>`;

        // 2. Products List (Clean & Tight)
        let productsHTML = '';
        let waItems = '';
        if(order.cart) {
            order.cart.forEach(i => {
                productsHTML += `
                    <div class="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
                        <div class="text-xs text-slate-300 font-medium truncate w-3/4"><span class="text-slate-500 mr-1.5">${i.count}x</span>${i.name}</div>
                        <div class="text-[10px] text-slate-500 font-mono">${i.qty}</div>
                    </div>
                `;
                waItems += `${i.name} (${i.qty}) x${i.count}\n`;
            });
        }

        // 3. Data Calculations
        const totalWeight = this.calculateWeight(order.cart);
        const orderTime = this.formatTime(order.timestamp);

        let distBadge = '';
        if(adminLat && order.location && order.location.lat) {
            const dist = this.getDistance(adminLat, adminLng, order.location.lat, order.location.lng);
            distBadge = `<span class="text-[9px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-600/30 font-bold ml-auto"><i class="fa-solid fa-route"></i> ${dist} KM</span>`;
        }

        // 4. Preferences (Budget & Time)
        const prefTime = order.preferences?.deliveryTime || 'Standard';
        const prefBudg = order.preferences?.budget || 'Standard'; // 🔥 RE-ADDED BUDGET

        // 5. Buttons & Partner Logic
        let partnerDisplay = '';
        let mainBtn = '';
        const locString = order.location ? encodeURIComponent(JSON.stringify(order.location)) : '';

        if(order.status === 'placed') {
            mainBtn = `<button class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs shadow-lg transition btn-assign" data-id="${id}" data-loc="${locString}">ASSIGN PARTNER <i class="fa-solid fa-chevron-right ml-1"></i></button>`;
        } else if(order.deliveryBoyName) {
            partnerDisplay = `
                <div class="flex items-center gap-2 mb-2">
                    <i class="fa-solid fa-motorcycle text-blue-500 text-xs"></i>
                    <span class="text-xs text-blue-400 font-bold">${order.deliveryBoyName}</span>
                </div>`;
            mainBtn = `<button class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2 rounded-lg text-[10px] transition border border-slate-700 btn-assign uppercase tracking-wide" data-id="${id}" data-loc="${locString}">RE-ASSIGN</button>`;
        }

        const mapLink = order.location ? `https://www.google.com/maps/search/?api=1&query=${order.location.lat},${order.location.lng}` : '#';
        const waLink = `https://wa.me/?text=${encodeURIComponent(`*Customer:* ${order.user.name}\n*Order ID:* #${id}\n*Items:*\n${waItems}`)}`;

        // 🔥 HTML STRUCTURE - MATCHING SCREENSHOT EXACTLY
        return `
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-md hover:border-slate-700 transition group relative overflow-hidden">

                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-white text-base leading-none">${order.user.name}</h3>
                        <a href="tel:${order.user.mobile}" class="text-[11px] text-blue-500 font-mono font-bold hover:underline mt-1 block">
                            ${order.user.mobile}
                        </a>
                    </div>
                    ${statusBadge}
                </div>

                <div class="flex items-center gap-1.5">
                    <i class="fa-solid fa-store text-pink-500 text-[10px]"></i>
                    <span class="text-[11px] font-bold text-slate-300 truncate">${order.user.shopName || 'No Shop Name'}</span>
                </div>

                <div class="bg-slate-950/60 rounded-lg p-2 max-h-24 overflow-y-auto custom-scrollbar border border-slate-800/30">
                    ${productsHTML || '<span class="text-[10px] text-slate-500">No items</span>'}
                </div>

                <div class="flex flex-wrap gap-1.5">
                    <span class="bg-purple-900/30 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded text-[9px] font-bold capitalize">
                        ${prefTime}
                    </span>
                    <span class="bg-pink-900/30 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded text-[9px] font-bold capitalize">
                        ${prefBudg}
                    </span>
                    <span class="bg-red-900/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[9px] font-bold">
                        <i class="fa-regular fa-clock mr-1"></i>${orderTime}
                    </span>
                    <span class="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold ml-auto">
                        <i class="fa-solid fa-weight-hanging mr-1"></i>${totalWeight}kg
                    </span>
                </div>

                <div class="flex items-center bg-slate-950 p-2 rounded-lg border border-slate-800 gap-2">
                    <i class="fa-solid fa-location-dot text-slate-500 text-[10px] shrink-0"></i>
                    <p class="text-[10px] text-slate-400 truncate flex-1" title="${order.location?.address}">${order.location?.address || 'No Address'}</p>
                    ${distBadge}
                </div>

                <div>
                    ${partnerDisplay}
                    ${mainBtn}
                </div>

                <div class="pt-2 border-t border-slate-800 flex justify-between items-center mt-0.5">
                    <div class="flex flex-col leading-none">
                        <span class="font-bold text-white text-sm">₹${order.payment?.deliveryFee || 0}</span>
                        <span class="text-[8px] text-slate-600 uppercase font-bold">Fee</span>
                    </div>
                    <div class="flex gap-1.5">
                        <a href="${waLink}" target="_blank" class="w-8 h-8 rounded-lg bg-green-900/10 text-green-500 border border-green-900/20 flex items-center justify-center hover:bg-green-600 hover:text-white transition"><i class="fa-brands fa-whatsapp"></i></a>
                        <a href="${mapLink}" target="_blank" class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center hover:bg-blue-600 hover:text-white transition"><i class="fa-solid fa-map-location-dot"></i></a>
                        <button class="w-8 h-8 rounded-lg bg-slate-800 text-red-500 border border-slate-700 flex items-center justify-center hover:bg-red-600 hover:text-white transition btn-delete" data-id="${id}"><i class="fa-solid fa-trash"></i></button>
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
        if (assignBtn) {
            const locString = assignBtn.dataset.loc;
            const orderLocation = locString ? JSON.parse(decodeURIComponent(locString)) : null;
            this.openAssignModal(db, assignBtn.dataset.id, orderLocation);
        }
    }
};