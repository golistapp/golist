// --- FILE: /modules/orders.js ---
// Purpose: Order History, Invoice Generation, Live Tracking, and Cancellations

(function() {
    console.log("🚚 Orders Module Loaded");

    // --- MODULE STATE ---
    let activeTrackingOrder = null;
    window.cachedHistoryOrders = {}; 

    // --- 1. HISTORY SYSTEM ---
    window.openHistory = function() {
        const session = window.session;
        if(!session) return window.showToast("Please login first");

        const modal = document.getElementById('historyModal');
        const list = document.getElementById('historyList');
        if(!modal || !list) return;

        modal.classList.remove('hidden');
        list.innerHTML = `
            <div class="text-center mt-10 opacity-50">
                <i class="fa-solid fa-spinner fa-spin text-4xl text-slate-300 mb-2"></i>
                <p class="text-xs font-bold text-slate-400">Loading Orders...</p>
            </div>`;

        window.db.ref('orders').orderByChild('user/mobile').equalTo(session.mobile).once('value', snap => {
            if(!snap.exists()) {
                list.innerHTML = `<div class="text-center mt-10 opacity-50"><i class="fa-solid fa-box-open text-4xl text-slate-300 mb-2"></i><p class="text-xs font-bold text-slate-400">No orders found</p></div>`;
                return;
            }

            const orders = [];
            snap.forEach(child => {
                const ord = { id: child.key, ...child.val() };
                orders.push(ord);
                window.cachedHistoryOrders[child.key] = ord;
            });

            orders.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

            list.innerHTML = '';
            orders.forEach(order => {
                const date = new Date(order.timestamp).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                });

                const isDelivered = order.status === 'delivered';
                const statusColor = isDelivered ? 'bg-green-100 text-golist' : 'bg-orange-50 text-orange-600';
                const statusText = order.status === 'out_for_delivery' ? 'On Way' : order.status;
                let totalAmount = order.totalAmount || (order.payment ? order.payment.deliveryFee : 0);
                const itemCount = order.cart ? order.cart.length : 0;
                const displayId = order.orderId ? order.orderId : `...${order.id.slice(-4)}`;

                list.innerHTML += `
                    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 animate-float">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-bold text-slate-800 text-sm">Order #${displayId}</h4>
                                <p class="text-[10px] text-slate-400 font-bold">${date}</p>
                            </div>
                            <span class="${statusColor} px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">${statusText}</span>
                        </div>
                        <div class="flex justify-between items-center my-3 bg-slate-50 rounded-lg p-2 px-3">
                            <div class="text-center">
                                <p class="text-[9px] text-slate-400 uppercase font-bold">Items</p>
                                <p class="font-bold text-slate-800 text-sm">${itemCount}</p>
                            </div>
                            <div class="w-px h-6 bg-slate-200"></div>
                            <div class="text-center">
                                <p class="text-[9px] text-slate-400 uppercase font-bold">Total</p>
                                <p class="font-bold text-slate-800 text-sm">₹${totalAmount}</p>
                            </div>
                        </div>
                        <button onclick="viewOrderInvoice('${order.id}')" class="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg text-xs hover:bg-black transition flex items-center justify-center gap-2">
                            <i class="fa-solid fa-eye"></i> View Order & Bill
                        </button>
                    </div>
                `;
            });
        });
    };

    // --- 2. INVOICE SYSTEM ---
    window.viewOrderInvoice = function(orderId) {
        const order = window.cachedHistoryOrders[orderId];
        if(!order) return window.showToast("Order Data Missing");

        const modal = document.getElementById('invoiceModal');
        if(!modal) return;

        document.getElementById('invShopName').innerText = document.getElementById('headerShopName').innerText || "My Shop";
        document.getElementById('invOrderId').innerText = order.orderId || `#${orderId.slice(-6).toUpperCase()}`;
        document.getElementById('invDate').innerText = new Date(order.timestamp).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
        });
        document.getElementById('invCustName').innerText = order.user ? order.user.name : "Guest";
        document.getElementById('invCustMobile').innerText = order.user ? `+91 ${order.user.mobile}` : "";

        const listContainer = document.getElementById('invItemsList');
        listContainer.innerHTML = '';

        let subTotal = 0;
        if(order.cart) {
            order.cart.forEach(item => {
                const itemTotal = (parseFloat(item.price) || 0) * (item.count || 1);
                subTotal += itemTotal;
                listContainer.innerHTML += `
                    <div class="flex justify-between items-center text-xs border-b border-slate-50 py-1.5 last:border-0">
                        <div class="flex-1 font-medium text-slate-700">${item.name} <span class="text-[10px] text-slate-400">(${item.qty})</span></div>
                        <div class="w-12 text-center text-slate-500">x${item.count}</div>
                        <div class="w-16 text-right font-bold text-slate-800">₹${itemTotal}</div>
                    </div>`;
            });
        }

        const delFee = order.payment ? (parseFloat(order.payment.deliveryFee) || 0) : 0;
        const grandTotal = subTotal + delFee;

        document.getElementById('invSubTotal').innerText = subTotal;
        document.getElementById('invDelFee').innerText = delFee;
        document.getElementById('invGrandTotal').innerText = grandTotal;

        const partnerEl = document.getElementById('invPartnerName');
        const invoiceActions = document.querySelector('#invoiceModal .grid');

        let cancelBtn = document.getElementById('btnCancelOrder');
        if(cancelBtn) cancelBtn.remove(); 

        if(order.status === 'placed') {
            partnerEl.innerText = "Waiting for Partner...";
            partnerEl.className = "text-xs font-bold text-orange-500 animate-pulse";

            const btnHtml = `
                <button id="btnCancelOrder" onclick="cancelOrder('${orderId}')" class="col-span-2 w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold text-xs border border-red-100 hover:bg-red-100 transition mt-2">
                    <i class="fa-solid fa-ban"></i> Cancel Order & Edit Cart
                </button>`;
            if(invoiceActions) invoiceActions.insertAdjacentHTML('afterend', btnHtml);
        } else {
            if(order.deliveryBoyName) {
                partnerEl.innerText = order.deliveryBoyName;
                partnerEl.className = "text-xs font-bold text-golist";
            } else {
                partnerEl.innerText = "Not Assigned";
                partnerEl.className = "text-xs font-bold text-slate-400";
            }
        }

        modal.classList.remove('hidden');
    };

    window.closeInvoiceModal = function() {
        const modal = document.getElementById('invoiceModal');
        if(modal) modal.classList.add('hidden');
        const cBtn = document.getElementById('btnCancelOrder');
        if(cBtn) cBtn.remove();
    };

    window.downloadInvoiceAsImage = function() {
        if (typeof html2canvas === 'undefined') return window.showToast("Image library missing");

        const element = document.getElementById('invoiceCaptureArea');
        const orderId = document.getElementById('invOrderId').innerText.replace('#', '');
        const btn = document.querySelector('#invoiceModal button i.fa-download').parentNode;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;

        html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Invoice_${orderId}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            btn.innerHTML = originalText;
            window.showToast("Invoice Downloaded!");
        }).catch(err => {
            btn.innerHTML = originalText;
            window.showToast("Error generating image");
        });
    };

    // --- 3. LIVE TRACKING ---
    window.checkActiveOrderHome = function() {
        const session = window.session;
        if(!session) return;

        const saved = JSON.parse(localStorage.getItem('rmz_active_order'));
        if(saved && saved.user.mobile === session.mobile) activateBanner(saved);

        window.db.ref('orders').orderByChild('user/mobile').equalTo(session.mobile).limitToLast(1).on('value', snap => {
            if(snap.exists()) {
                const data = snap.val();
                const orderId = Object.keys(data)[0];
                const order = data[orderId];
                const activeStatuses = ['placed', 'accepted', 'out_for_delivery', 'admin_accepted'];
                if (activeStatuses.includes(order.status)) {
                    activeTrackingOrder = { id: orderId, ...order };
                    localStorage.setItem('rmz_active_order', JSON.stringify(activeTrackingOrder));
                    activateBanner(activeTrackingOrder);
                } else {
                    localStorage.removeItem('rmz_active_order');
                    const banner = document.getElementById('liveOrderBanner');
                    if(banner) banner.classList.add('hidden');
                }
            }
        });
    };

    function activateBanner(order) {
        const banner = document.getElementById('liveOrderBanner');
        if(banner) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
            let text = "Processing...";
            if(order.status === 'placed') text = "Waiting Confirmation";
            else if(order.status === 'accepted') text = "Packing Items";
            else if(order.status === 'out_for_delivery') text = "Out for Delivery";
            document.getElementById('bannerStatus').innerText = text;
            activeTrackingOrder = order;
        }
    }

    window.openTrackingModal = function() {
        if(!activeTrackingOrder) {
            const saved = JSON.parse(localStorage.getItem('rmz_active_order'));
            if(saved) activeTrackingOrder = saved;
            else return window.showToast("No active order details found");
        }

        const modal = document.getElementById('trackingModal');
        if(!modal) return;
        modal.classList.remove('hidden');

        document.getElementById('modalOrderId').innerText = activeTrackingOrder.orderId ? activeTrackingOrder.orderId.slice(-6) : '...';
        document.getElementById('modalTotal').innerText = activeTrackingOrder.totalAmount || activeTrackingOrder.payment?.deliveryFee || '0';

        const timelineContainer = document.getElementById('modalTimeline');
        const steps = [
            { key: 'placed', label: 'Order Placed' },
            { key: 'accepted', label: 'Partner Assigned' },
            { key: 'out_for_delivery', label: 'Out for Delivery' },
            { key: 'delivered', label: 'Delivered' }
        ];

        let html = '';
        let isStepActive = true; 
        const currentStatus = activeTrackingOrder.status === 'admin_accepted' ? 'placed' : activeTrackingOrder.status;

        steps.forEach((step, index) => {
            const isCurrent = step.key === currentStatus;
            const isCompleted = isStepActive; 
            if (isCurrent) isStepActive = false; 
            const dotClass = isCompleted ? 'timeline-dot active' : 'timeline-dot';
            const textClass = isCompleted ? 'text-slate-800' : 'text-slate-400';
            const connectorClass = (index !== steps.length - 1) ? `<div class="absolute left-[5px] top-[14px] w-0.5 h-full ${isCompleted && !isCurrent ? 'bg-green-500' : 'bg-slate-200'} -z-10"></div>` : '';

            // --- NEW: OTP DISPLAY LOGIC ---
            let otpHtml = '';
            if (step.key === 'out_for_delivery' && activeTrackingOrder.deliveryOtp) {
                otpHtml = `<span class="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-mono font-bold tracking-widest border border-red-200">OTP: ${activeTrackingOrder.deliveryOtp}</span>`;
            }

            html += `<div class="relative pl-8 pb-1"><div class="absolute left-0 top-1 ${dotClass}"></div>${connectorClass}<h4 class="text-sm font-bold ${textClass}">${step.label} ${otpHtml}</h4></div>`;
        });
        timelineContainer.innerHTML = html;

        let trackCancelBtn = document.getElementById('trackCancelBtn');
        if(trackCancelBtn) trackCancelBtn.remove();

        if(activeTrackingOrder.status === 'placed') {
            const btn = document.createElement('button');
            btn.id = 'trackCancelBtn';
            btn.className = "w-full py-3 mt-4 bg-red-50 text-red-600 font-bold text-xs rounded-xl border border-red-100 hover:bg-red-100";
            btn.innerHTML = '<i class="fa-solid fa-ban"></i> Cancel Order';
            btn.onclick = () => { window.cancelOrder(activeTrackingOrder.id || Object.keys(window.cachedHistoryOrders).find(k => window.cachedHistoryOrders[k].orderId === activeTrackingOrder.orderId)); };
            const modalBody = document.querySelector('#trackingModal .bg-white.rounded-xl.shadow-sm.border.p-5');
            if(modalBody) modalBody.appendChild(btn);
        }

        const pCard = document.getElementById('modalPartnerCard');
        if(activeTrackingOrder.deliveryBoyName) {
            pCard.classList.remove('hidden');
            document.getElementById('modalPartnerName').innerText = activeTrackingOrder.deliveryBoyName;
            document.getElementById('btnCallPartner').href = `tel:${activeTrackingOrder.deliveryBoyMobile}`;
            document.getElementById('btnChatPartner').href = `https://wa.me/91${activeTrackingOrder.deliveryBoyMobile}`;
        } else {
            pCard.classList.add('hidden');
        }

        const list = document.getElementById('modalItemsList');
        list.innerHTML = '';
        if(activeTrackingOrder.cart) {
            activeTrackingOrder.cart.forEach(item => {
                list.innerHTML += `<div class="flex justify-between py-2 border-b border-slate-50 last:border-0"><span class="text-slate-600 text-sm font-medium">${item.name} <span class="text-[10px] text-slate-400">(${item.qty})</span></span><span class="font-bold text-slate-800 text-sm">x${item.count}</span></div>`;
            });
        }
    };

    window.closeTrackingModal = function() {
        const modal = document.getElementById('trackingModal');
        if(modal) modal.classList.add('hidden');
    };

    // --- 4. ORDER CANCELLATION & UTILS ---
    window.cancelOrder = function(orderId) {
        if(!confirm("Are you sure? This will cancel the order and move items back to your cart.")) return;

        const order = window.cachedHistoryOrders[orderId] || activeTrackingOrder;
        if(!order) return window.showToast("Error finding order");

        localStorage.setItem('rmz_cart', JSON.stringify(order.cart));

        window.db.ref('orders/' + orderId).remove()
        .then(() => {
            window.showToast("Order Cancelled! Items Restored.");
            setTimeout(() => window.location.href = 'home.html', 500);
        })
        .catch(err => window.showToast("Error: " + err.message));
    };

    window.shareStore = function() {
        const url = window.location.href;
        const nameEl = document.getElementById('headerShopName');
        const name = nameEl ? nameEl.innerText : 'My Shop';
        const text = `Order fresh items from ${name} on GoList!\n${url}`;
        if (navigator.share) navigator.share({ title: name, text: text, url: url });
        else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    };

})();