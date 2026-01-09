// --- FILE: home-features.js ---
// Contains: Tracking, Owner Tools, History, Support, Settings, Add Stock Logic, Invoice System, AND New Features (Address, PIN, Content)

// --- GLOBAL VARIABLES ---
let activeTrackingOrder = null;
window.cachedHistoryOrders = {}; 
let cachedMasterProducts = []; 
let selectedMasterItem = null; 
let currentGramValue = 1000;   

// ==========================================
// 1. ADD / EDIT ITEM MODAL LOGIC 
// ==========================================

function openAddModal(id = null, name = '', qty = '', price = '', cat = '', unit = '') {
    const modal = document.getElementById('addStockModal');
    const card = document.getElementById('addStockCard');

    resetModalUI();
    populateModalDropdowns(cat, unit);
    window.editItemId = id; 

    if (id) {
        // Edit Mode
        const isMaster = window.masterProductsList.find(p => p.name.toLowerCase() === name.toLowerCase());

        if (isMaster) {
            selectMasterProduct(isMaster, true); 
            parseAndSetQuantity(qty, isMaster);
        } else {
            // Custom Item
            document.getElementById('inpProdName').value = name;
            const priceInp = document.getElementById('inpProdPrice');
            if(price === 'Market Price' || isNaN(parseFloat(price))) {
                priceInp.value = 'Market Price';
            } else {
                priceInp.value = price;
            }
            document.getElementById('inpProdUnit').value = unit || 'kg';
            parseAndSetQuantityManual(qty, unit);
        }
    } else {
        // Add Mode
        document.getElementById('inpProdName').focus();
        loadMasterProductsForSearch();
    }

    modal.classList.remove('hidden');
    setTimeout(() => card.classList.remove('translate-y-full'), 10);
}

function closeAddModal() {
    const card = document.getElementById('addStockCard');
    card.classList.add('translate-y-full');
    setTimeout(() => {
        document.getElementById('addStockModal').classList.add('hidden');
        window.editItemId = null; 
        resetModalUI();
    }, 300);
}

function resetModalUI() {
    selectedMasterItem = null;
    currentGramValue = 1000; 

    const els = ['inpProdName', 'inpProdCat', 'inpProdUnit', 'inpProdPrice'];
    els.forEach(id => document.getElementById(id).classList.remove('locked-input'));

    document.getElementById('inpProdName').value = '';
    document.getElementById('inpProdPrice').value = 'Market Price';
    document.getElementById('inpProdQtyDisplay').value = '1 Kg'; 
    document.getElementById('masterProductBadge').classList.add('hidden');
    document.getElementById('suggestionBox').innerHTML = '';
}

function populateModalDropdowns(selectedCat, selectedUnit) {
    const catSelect = document.getElementById('inpProdCat');
    const unitSelect = document.getElementById('inpProdUnit');

    catSelect.innerHTML = '<option value="" disabled selected>Category</option>';

    if (window.masterCategories) {
        Object.entries(window.masterCategories)
            .sort(([,a], [,b]) => (a.order || 9999) - (b.order || 9999)) 
            .forEach(([key, val]) => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = val.name;
                if(key === selectedCat) opt.selected = true;
                catSelect.appendChild(opt);
            });
    }

    unitSelect.innerHTML = '';
    if (window.masterUnits) {
        Object.entries(window.masterUnits).forEach(([key, val]) => {
            const opt = document.createElement('option');
            opt.value = key; 
            opt.innerText = val.name; 
            if(key === selectedUnit) opt.selected = true;
            unitSelect.appendChild(opt);
        });
    }
}

// ==========================================
// 2. LOGIC: PARSING & UNIT HANDLING
// ==========================================

document.getElementById('inpProdUnit').addEventListener('change', function() {
    const newUnitId = this.value;
    const unitName = getUnitNameById(newUnitId).toLowerCase();

    if(unitName.includes('gram') || unitName.includes('gm')) {
        currentGramValue = 50; 
    } else if(isWeightUnit(unitName)) {
        currentGramValue = 1000; 
    } else {
        currentGramValue = 1; 
    }
    updateQuantityDisplay();
});

function getUnitNameById(unitId) {
    if (!window.masterUnits || !window.masterUnits[unitId]) return 'Unit';
    return window.masterUnits[unitId].name; 
}

function isWeightUnit(unitName) {
    const n = unitName.toLowerCase();
    return n.includes('kg') || n.includes('litre') || n.includes('liter') || n.includes('gm') || n.includes('ml') || n.includes('gram');
}

function parseAndSetQuantity(qtyString, masterItem) {
    const unitName = getUnitNameById(masterItem.unit);
    parseLogic(qtyString, unitName);
}

function parseAndSetQuantityManual(qtyString, unitId) {
    const unitName = getUnitNameById(unitId);
    parseLogic(qtyString, unitName);
}

function parseLogic(qtyString, unitName) {
    const isWt = isWeightUnit(unitName);
    const numMatch = qtyString.match(/(\d+(\.\d+)?)/);
    let val = numMatch ? parseFloat(numMatch[0]) : 1;
    const str = qtyString.toLowerCase();

    if (isWt) {
        if (str.includes('kg') || str.includes('litre') || str.includes('liter')) {
            currentGramValue = val * 1000;
        } else if (str.includes('gm') || str.includes('ml') || str.includes('gram')) {
            currentGramValue = val;
        } else {
            currentGramValue = 1000; 
        }
    } else {
        currentGramValue = val; 
    }
    updateQuantityDisplay();
}

// ==========================================
// 3. SMART SEARCH & SELECTION LOGIC
// ==========================================

function loadMasterProductsForSearch() {
    if(cachedMasterProducts.length > 0) { renderSuggestions(); return; }
    db.ref('masterProducts').limitToLast(100).once('value', snap => {
        if(snap.exists()) {
            cachedMasterProducts = Object.values(snap.val());
            renderSuggestions();
        }
    });
}

function renderSuggestions() {
    const box = document.getElementById('suggestionBox');
    box.innerHTML = '';
    const existingNames = (window.allProducts || []).map(p => p.name.toLowerCase());
    const suggestions = cachedMasterProducts
        .filter(p => !existingNames.includes(p.name.toLowerCase()))
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
    suggestions.forEach(prod => createChip(prod, box));
}

document.getElementById('inpProdName').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const box = document.getElementById('suggestionBox');
    box.innerHTML = '';
    if(query.length < 2) return;

    const existingNames = (window.allProducts || []).map(p => p.name.toLowerCase());
    const matches = cachedMasterProducts
        .filter(p => p.name.toLowerCase().includes(query) && !existingNames.includes(p.name.toLowerCase()))
        .slice(0, 4);
    matches.forEach(prod => createChip(prod, box));
});

function createChip(prod, container) {
    const btn = document.createElement('button');
    btn.className = "px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100 hover:bg-golist hover:text-white hover:border-transparent transition whitespace-nowrap";
    btn.innerHTML = `+ ${prod.name}`;
    btn.onclick = () => selectMasterProduct(prod);
    container.appendChild(btn);
}

function selectMasterProduct(prod, isEditing = false) {
    if (!isEditing) {
        const existing = window.allProducts.find(p => p.name.toLowerCase() === prod.name.toLowerCase());
        if(existing) { showToast("Item already in list!"); return; }
    }

    selectedMasterItem = prod;

    const nameInp = document.getElementById('inpProdName');
    const catInp = document.getElementById('inpProdCat');
    const unitInp = document.getElementById('inpProdUnit');
    const priceInp = document.getElementById('inpProdPrice');

    nameInp.value = prod.name;
    if(prod.category) catInp.value = prod.category;
    if(prod.unit) unitInp.value = prod.unit; 

    nameInp.classList.add('locked-input');
    catInp.classList.add('locked-input');
    unitInp.classList.add('locked-input');
    priceInp.classList.add('locked-input'); 

    if (!isEditing) {
        const unitName = getUnitNameById(prod.unit);
        if (isWeightUnit(unitName)) currentGramValue = 1000;
        else currentGramValue = 1;
        updateQuantityDisplay();
    }

    document.getElementById('masterProductBadge').classList.remove('hidden');
    document.getElementById('suggestionBox').innerHTML = '';
}

// ==========================================
// 4. QUANTITY & PRICE CALCULATION
// ==========================================

function adjustModalQty(dir) {
    let unitId = selectedMasterItem ? selectedMasterItem.unit : document.getElementById('inpProdUnit').value;
    const unitName = getUnitNameById(unitId).toLowerCase();
    const isWt = isWeightUnit(unitName);

    if (isWt) {
        let step = 50;
        if(unitName.includes('gram') || unitName.includes('gm')) {
            step = 25; 
            currentGramValue += (dir * step);
            if(currentGramValue < 25) currentGramValue = 25;
        } else {
            if (currentGramValue >= 1000) step = 250; 
            if (dir === -1 && currentGramValue <= 1000) step = 50;
            currentGramValue += (dir * step);
            if (currentGramValue < 50) currentGramValue = 50; 
        }

    } else {
        currentGramValue += dir;
        if (currentGramValue < 1) currentGramValue = 1;
    }
    updateQuantityDisplay();
}

function updateQuantityDisplay() {
    let unitId = selectedMasterItem ? selectedMasterItem.unit : document.getElementById('inpProdUnit').value;
    if(!unitId) return;

    const unitName = getUnitNameById(unitId);
    const isWt = isWeightUnit(unitName);

    const displayInput = document.getElementById('inpProdQtyDisplay');
    const priceInput = document.getElementById('inpProdPrice');

    let basePrice = selectedMasterItem ? (parseFloat(selectedMasterItem.price) || 0) : 0;

    let finalPrice = 0;
    let displayText = "";

    if (isWt) {
        if (currentGramValue < 1000) {
            const smallUnit = unitName.toLowerCase().includes('l') ? 'ml' : 'gm';
            displayText = `${currentGramValue} ${smallUnit}`;
        } else {
            const mainVal = currentGramValue / 1000;
            displayText = `${mainVal} ${unitName}`;
        }

        if(selectedMasterItem) finalPrice = (currentGramValue / 1000) * basePrice;

    } else {
        displayText = `${currentGramValue} ${unitName}`;
        if(selectedMasterItem) finalPrice = currentGramValue * basePrice;
    }

    displayInput.value = displayText;

    if(selectedMasterItem) {
        priceInput.value = Math.round(finalPrice * 100) / 100;
    }
}

function saveProduct() {
    const name = document.getElementById('inpProdName').value.trim();
    const catId = document.getElementById('inpProdCat').value;
    const unitId = document.getElementById('inpProdUnit').value;
    const price = document.getElementById('inpProdPrice').value;
    const qtyText = document.getElementById('inpProdQtyDisplay').value.trim();

    if(!name) return showToast("Enter Name");
    if(!price) return showToast("Enter Price");
    if(!catId) return showToast("Select Category");
    if(!unitId) return showToast("Select Unit Category");

    const productData = {
        name: name,
        price: price, 
        category: catId,
        unit: unitId, 
        qty: qtyText, 
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    const btn = document.querySelector('#addStockModal button[onclick="saveProduct()"]');
    const originalText = btn.innerText;
    btn.innerText = "SAVING...";
    btn.disabled = true;

    const urlParams = new URLSearchParams(window.location.search);
    const session = JSON.parse(localStorage.getItem('rmz_user'));
    const targetMobile = urlParams.get('shop') || (session ? session.mobile : null);

    if(!targetMobile) {
        showToast("Error: Store ID not found!");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }

    const editId = window.editItemId;

    if (editId) {
        db.ref(`products/${targetMobile}/${editId}`).update(productData)
        .then(() => finalizeSave("Item Updated!"));
    } else {
        if(!selectedMasterItem) {
            const existing = window.allProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
            if(existing) {
                showToast("Item already exists!");
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }
        }
        productData.addedAt = firebase.database.ServerValue.TIMESTAMP;
        db.ref(`products/${targetMobile}`).push(productData)
        .then(() => finalizeSave("Item Added!"));
    }

    function finalizeSave(msg) {
        showToast(msg);
        closeAddModal();
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// 5. HISTORY & INVOICE SYSTEM
// ==========================================

function openHistory() {
    const session = JSON.parse(localStorage.getItem('rmz_user'));
    if(!session) return showToast("Please login first");

    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');

    modal.classList.remove('hidden');
    list.innerHTML = `
        <div class="text-center mt-10 opacity-50">
            <i class="fa-solid fa-spinner fa-spin text-4xl text-slate-300 mb-2"></i>
            <p class="text-xs font-bold text-slate-400">Loading Orders...</p>
        </div>`;

    db.ref('orders').orderByChild('user/mobile').equalTo(session.mobile).once('value', snap => {
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
}

function viewOrderInvoice(orderId) {
    const order = window.cachedHistoryOrders[orderId];
    if(!order) return showToast("Order Data Missing");

    const modal = document.getElementById('invoiceModal');

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
        invoiceActions.insertAdjacentHTML('afterend', btnHtml);
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
}

function cancelOrder(orderId) {
    if(!confirm("Are you sure? This will cancel the order and move items back to your cart.")) return;

    const order = window.cachedHistoryOrders[orderId] || activeTrackingOrder;
    if(!order) return showToast("Error finding order");

    localStorage.setItem('rmz_cart', JSON.stringify(order.cart));

    db.ref('orders/' + orderId).remove()
    .then(() => {
        showToast("Order Cancelled! Items Restored.");
        setTimeout(() => window.location.href = 'home.html', 500);
    })
    .catch(err => showToast("Error: " + err.message));
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').classList.add('hidden');
    const cBtn = document.getElementById('btnCancelOrder');
    if(cBtn) cBtn.remove();
}

function downloadInvoiceAsImage() {
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
        showToast("Invoice Downloaded!");
    }).catch(err => {
        btn.innerHTML = originalText;
        showToast("Error generating image");
    });
}


// ==========================================
// 6. LIVE TRACKING & SUPPORT 
// ==========================================

function checkActiveOrderHome() {
    const session = JSON.parse(localStorage.getItem('rmz_user'));
    if(!session) return;

    const saved = JSON.parse(localStorage.getItem('rmz_active_order'));
    if(saved && saved.user.mobile === session.mobile) activateBanner(saved);

    db.ref('orders').orderByChild('user/mobile').equalTo(session.mobile).limitToLast(1).on('value', snap => {
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
                document.getElementById('liveOrderBanner').classList.add('hidden');
            }
        }
    });
}

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

function openTrackingModal() {
    if(!activeTrackingOrder) {
        const saved = JSON.parse(localStorage.getItem('rmz_active_order'));
        if(saved) activeTrackingOrder = saved;
        else return showToast("No active order details found");
    }

    const modal = document.getElementById('trackingModal');
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
        html += `<div class="relative pl-8 pb-1"><div class="absolute left-0 top-1 ${dotClass}"></div>${connectorClass}<h4 class="text-sm font-bold ${textClass}">${step.label}</h4></div>`;
    });
    timelineContainer.innerHTML = html;

    let trackCancelBtn = document.getElementById('trackCancelBtn');
    if(trackCancelBtn) trackCancelBtn.remove();

    if(activeTrackingOrder.status === 'placed') {
        const btn = document.createElement('button');
        btn.id = 'trackCancelBtn';
        btn.className = "w-full py-3 mt-4 bg-red-50 text-red-600 font-bold text-xs rounded-xl border border-red-100 hover:bg-red-100";
        btn.innerHTML = '<i class="fa-solid fa-ban"></i> Cancel Order';
        btn.onclick = () => { cancelOrder(activeTrackingOrder.id || Object.keys(window.cachedHistoryOrders).find(k => window.cachedHistoryOrders[k].orderId === activeTrackingOrder.orderId)); };
        document.querySelector('#trackingModal .bg-white.rounded-xl.shadow-sm.border.p-5').appendChild(btn);
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
}

function closeTrackingModal() {
    document.getElementById('trackingModal').classList.add('hidden');
}

function shareStore() {
    const url = window.location.href;
    const name = document.getElementById('headerShopName').innerText;
    const text = `Order fresh items from ${name} on GoList!\n${url}`;
    if (navigator.share) navigator.share({ title: name, text: text, url: url });
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

function openSupportOptions() {
    document.getElementById('supportModal').classList.remove('hidden');
}

function sendSupportMsg(type) {
    const session = JSON.parse(localStorage.getItem('rmz_user'));
    const userName = session ? session.name : 'Guest';
    const mobile = session ? session.mobile : 'N/A';
    let extraInfo = '';
    if(activeTrackingOrder) extraInfo = `\nActive Order ID: ${activeTrackingOrder.orderId ? activeTrackingOrder.orderId.slice(-6) : 'N/A'}`;
    const text = `*Support Request*\nType: ${type}\nUser: ${userName} (${mobile})${extraInfo}\n\nPlease help me with this issue.`;
    window.open(`https://wa.me/917903698180?text=${encodeURIComponent(text)}`, '_blank');
}


// ==========================================
// 7. NEW FEATURES (Address, PIN, Content)
// ==========================================

// --- ADDRESS SYSTEM ---
function openAddressModal() {
    const session = JSON.parse(localStorage.getItem('rmz_user'));
    if(!session) return showToast("Login required");

    // Fetch existing address
    document.getElementById('inpAddress').value = "Loading...";
    db.ref('users/' + session.mobile + '/address').once('value', snap => {
        document.getElementById('inpAddress').value = snap.exists() ? snap.val() : "";
    });

    document.getElementById('addressModal').classList.remove('hidden');
}

function closeAddressModal() {
    document.getElementById('addressModal').classList.add('hidden');
}

function saveAddress() {
    const session = JSON.parse(localStorage.getItem('rmz_user'));
    const addr = document.getElementById('inpAddress').value.trim();

    if(!addr) return showToast("Please enter address");
    if(!session) return;

    db.ref('users/' + session.mobile).update({ address: addr })
    .then(() => {
        showToast("Address Saved!");
        closeAddressModal();
    });
}

// --- PIN CHANGE SYSTEM ---
function openPinModal() {
    document.getElementById('inpNewPin').value = '';
    document.getElementById('inpConfirmPin').value = '';
    document.getElementById('pinModal').classList.remove('hidden');
}

function closePinModal() {
    document.getElementById('pinModal').classList.add('hidden');
}

function updatePin() {
    const newPin = document.getElementById('inpNewPin').value;
    const confPin = document.getElementById('inpConfirmPin').value;
    const session = JSON.parse(localStorage.getItem('rmz_user'));

    if(newPin.length !== 4) return showToast("PIN must be 4 digits");
    if(newPin !== confPin) return showToast("PINs do not match");

    db.ref('users/' + session.mobile).update({ pin: newPin })
    .then(() => {
        showToast("PIN Updated Successfully!");
        closePinModal();
    });
}

// --- DYNAMIC CONTENT (Policies & Videos) ---
function fetchDynamicContent(type) {
    const modal = document.getElementById('contentModal');
    const title = document.getElementById('contentTitle');
    const body = document.getElementById('contentBody');

    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center mt-10"><i class="fa-solid fa-spinner fa-spin text-2xl text-slate-300"></i></div>';

    if(type === 'policy') {
        title.innerText = "Policies & Terms";
        db.ref('admin/policies/about').once('value', snap => {
            if(snap.exists()) {
                body.innerHTML = snap.val();
            } else {
                body.innerHTML = "<p>No policies updated yet.</p>";
            }
        });
    } 
    else if(type === 'video') {
        title.innerText = "How to Use App";
        // Fetch last added video
        db.ref('admin/videos').limitToLast(1).once('value', snap => {
            if(snap.exists()) {
                const data = Object.values(snap.val())[0];
                const videoId = extractYouTubeID(data.link);
                if(videoId) {
                    body.innerHTML = `
                        <div class="aspect-video w-full rounded-xl overflow-hidden shadow-lg mb-4">
                            <iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                        </div>
                        <h3 class="font-bold text-lg text-slate-800">${data.title}</h3>
                        <p class="text-xs text-slate-400 mt-1">Uploaded: ${new Date(data.addedAt || Date.now()).toLocaleDateString()}</p>
                    `;
                } else {
                    body.innerHTML = "<p>Invalid Video Link found.</p>";
                }
            } else {
                body.innerHTML = "<p>No tutorial videos found.</p>";
            }
        });
    }
}

function extractYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function closeContentModal() {
    document.getElementById('contentModal').classList.add('hidden');
}

// Global Exports for New Features
window.openAddModal = openAddModal;
window.closeAddModal = closeAddModal;
window.saveProduct = saveProduct;
window.openHistory = openHistory;
window.viewOrderInvoice = viewOrderInvoice;
window.closeInvoiceModal = closeInvoiceModal;
window.downloadInvoiceAsImage = downloadInvoiceAsImage;
window.checkActiveOrderHome = checkActiveOrderHome;
window.openTrackingModal = openTrackingModal;
window.closeTrackingModal = closeTrackingModal;
window.shareStore = shareStore;
window.openSupportOptions = openSupportOptions;

// New Exports
window.openAddressModal = openAddressModal;
window.closeAddressModal = closeAddressModal;
window.saveAddress = saveAddress;
window.openPinModal = openPinModal;
window.closePinModal = closePinModal;
window.updatePin = updatePin;
window.fetchDynamicContent = fetchDynamicContent;
window.closeContentModal = closeContentModal;