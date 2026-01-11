// --- FILE: /modules/feed.js ---
// Purpose: Main Product Feed, Search Focus Mode, Master Tag Fallback, Categories, and Cart Logic

(function() {
    console.log("📦 Feed Module Loaded");

    // --- GLOBAL VARIABLES (State) ---
    window.allProducts = [];       
    window.masterCategories = {};  
    window.masterUnits = {};
    window.masterProductsList = []; 
    window.lastOrderItems = []; 
    let activeCategory = 'all';

    // Edit/Delete States
    window.isEditMode = false;
    window.isDeleteMode = false;
    let itemsToDelete = new Set();

    // --- INITIALIZATION ---
    window.initFeed = function() {
        loadMasterData();
        syncUserProducts();
        loadRecentOrders(); 
        updateBottomBar();

        // --- SEARCH LISTENERS ---
        const searchInput = document.getElementById('searchInput');
        if(searchInput) {
            searchInput.addEventListener('keyup', window.filterProducts);
            searchInput.addEventListener('focus', window.enableSearchMode);
        }
    };

    // --- UTILS ---
    window.showToast = function(msg) {
        const t = document.getElementById('toast');
        if(t) {
            document.getElementById('toastMsg').innerText = msg;
            t.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => t.classList.add('opacity-0', 'pointer-events-none'), 2000);
        }
    };

    // --- 0. SEARCH FOCUS MODE LOGIC ---
    window.enableSearchMode = function() {
        toggleElement('topHeader', false);
        toggleElement('homeOptions', false);
        toggleElement('homeBanners', false);
        toggleElement('listHeader', false); 
        toggleElement('bottomAddLink', false); 

        toggleElement('searchCloseBtn', true);

        document.body.classList.add('bg-white');
        document.body.classList.remove('bg-[#f4f6f8]');
        window.scrollTo(0, 0);
    };

    window.disableSearchMode = function() {
        const inp = document.getElementById('searchInput');
        if(inp) inp.value = '';

        toggleElement('topHeader', true);
        toggleElement('homeOptions', true);
        toggleElement('homeBanners', true);
        toggleElement('listHeader', true);
        toggleElement('bottomAddLink', true);

        toggleElement('searchCloseBtn', false);

        document.body.classList.remove('bg-white');
        window.filterProducts();
    };

    function toggleElement(id, show) {
        const el = document.getElementById(id);
        if(el) {
            if(show) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    }

    // --- 1. MASTER DATA LOADING ---
    function loadMasterData() {
        window.db.ref('masterCategories').once('value', snap => {
            if(snap.exists()) {
                window.masterCategories = snap.val();
                renderCategoriesUI();
            }
        });

        window.db.ref('masterUnits').once('value', snap => {
            if(snap.exists()) { window.masterUnits = snap.val(); }
        });

        window.db.ref('masterProducts').once('value', snap => {
            if(snap.exists()) {
                window.masterProductsList = Object.values(snap.val());
                if(window.allProducts.length > 0) window.filterProducts();
            }
        });
    }

    function renderCategoriesUI() {
        const list = document.getElementById('categoryList');
        if(!list) return;

        list.innerHTML = `
            <button onclick="filterByCategory('all')" class="flex flex-col items-center gap-1 min-w-[60px] group">
                <div class="w-12 h-12 rounded-xl bg-golistLight border border-green-100 flex items-center justify-center text-golist group-hover:bg-golist group-hover:text-white transition shadow-sm">
                    <i class="fa-solid fa-border-all text-lg"></i>
                </div>
                <span class="text-[10px] font-bold text-slate-600 group-hover:text-golist">All</span>
            </button>
        `;

        const sortedCats = Object.entries(window.masterCategories)
            .map(([key, val]) => ({ key, ...val }))
            .sort((a, b) => {
                const orderA = (a.order !== undefined && a.order !== null) ? a.order : 9999;
                const orderB = (b.order !== undefined && b.order !== null) ? b.order : 9999;
                return orderA - orderB;
            });

        sortedCats.forEach(cat => {
            const content = cat.image 
                ? `<img src="${cat.image}" class="w-full h-full object-cover">` 
                : `<i class="fa-solid fa-layer-group text-xl text-slate-400"></i>`;

            const btn = document.createElement('button');
            btn.onclick = () => window.filterByCategory(cat.key);
            btn.className = "flex flex-col items-center gap-1 min-w-[60px] group transition active:scale-95";
            btn.innerHTML = `
                <div class="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:border-green-200 overflow-hidden p-0.5">
                    <div class="w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-slate-50">
                        ${content}
                    </div>
                </div>
                <span class="text-[10px] font-bold text-slate-600 truncate w-full text-center max-w-[60px] group-hover:text-golist">${cat.name}</span>
            `;
            list.appendChild(btn);
        });
    }

    // --- 2. MAIN PRODUCT LIST ---
    function syncUserProducts() {
        if(!window.targetMobile) return;
        window.db.ref('products/' + window.targetMobile).on('value', snapshot => {
            if(snapshot.exists()) {
                window.allProducts = Object.entries(snapshot.val()).map(([key, val]) => ({id: key, ...val})).reverse();
                window.filterProducts(); 
            } else {
                window.allProducts = [];
                renderList([]);
            }
        });
    }

    window.filterByCategory = function(catId) {
        activeCategory = catId;
        const sVal = document.getElementById('searchInput').value;

        if(catId !== 'all') {
            const catName = window.masterCategories[catId]?.name || 'Category';
            window.showToast(`Showing: ${catName}`);
        } else {
            if(!sVal) window.showToast("Showing All Items");
        }

        window.filterProducts();
    };

    // --- 3. UPDATED SEARCH LOGIC (Master Fallback) ---
    window.filterProducts = function() {
        const searchInput = document.getElementById('searchInput');
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

        let filtered = window.allProducts;

        // 1. Filter by Category
        if (activeCategory !== 'all') {
            filtered = filtered.filter(item => item.category === activeCategory);
        }

        // 2. Filter by Search (Name OR Tags OR Master Tags)
        if(searchVal) {
            filtered = filtered.filter(item => {
                const itemName = item.name.toLowerCase();

                // A. Direct Name Match
                if(itemName.includes(searchVal)) return true;

                // B. Tag Match (Existing tags or Fallback to Master tags)
                let itemTags = item.tags;

                // Agar item mein tags nahi hain, to Master List mein check karo
                if (!itemTags && window.masterProductsList) {
                    const masterEntry = window.masterProductsList.find(m => m.name.toLowerCase() === itemName);
                    if (masterEntry && masterEntry.tags) {
                        itemTags = masterEntry.tags;
                    }
                }

                if (itemTags && itemTags.toLowerCase().includes(searchVal)) {
                    return true;
                }

                return false;
            });
        }

        renderList(filtered);
    };

    function renderList(products) {
        const list = document.getElementById('productList');
        if(!list) return;
        list.innerHTML = '';

        if(products.length === 0) {
            list.innerHTML = `<div class="text-center py-10 opacity-50"><p class="text-xs font-bold text-slate-400">No products found</p></div>`;
            return;
        }

        products.forEach(item => {
            const price = item.price || 0;
            const fullQty = item.qty || ''; 

            let imageContent = '';
            // Image Fallback Logic
            if (item.image) {
                imageContent = `<img src="${item.image}" class="w-full h-full object-cover">`;
            } else {
                const masterMatch = window.masterProductsList?.find(mp => mp.name.toLowerCase() === item.name.toLowerCase());
                if(masterMatch && masterMatch.image) {
                    imageContent = `<img src="${masterMatch.image}" class="w-full h-full object-cover">`;
                } else {
                    imageContent = window.getProductIcon ? window.getProductIcon(item.name) : '📦';
                }
            }

            const li = document.createElement('li');
            li.className = "bg-white border border-slate-100 rounded-2xl p-2 flex items-center gap-3 shadow-sm relative";

            let controlHtml = '';

            if (window.isDeleteMode) {
                const isChecked = itemsToDelete.has(item.id) ? 'checked' : '';
                controlHtml = `<input type="checkbox" class="custom-check" onclick="toggleDeleteItem('${item.id}')" ${isChecked}>`;
            } else if (window.isEditMode) {
                controlHtml = `<button onclick="openAddModal('${item.id}', '${item.name}', '${item.qty}', '${item.price}', '${item.category}', '${item.unit}')" class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100"><i class="fa-solid fa-pencil text-xs"></i></button>`;
            } else {
                const cartItem = getCartItem(item.name); 
                const count = cartItem ? cartItem.count : 0;

                if (count === 0) {
                    controlHtml = `
                        <button onclick="updateCart('${item.name}', '${fullQty}', '${item.price}', 1)" class="w-16 h-8 bg-white text-golist font-bold text-xs rounded-lg border border-green-200 shadow-sm hover:bg-golist hover:text-white transition active:scale-95 flex items-center justify-center gap-1">
                            ADD <i class="fa-solid fa-plus text-[9px]"></i>
                        </button>`;
                } else {
                    controlHtml = `
                        <div class="w-20 h-8 flex items-center justify-between bg-golist rounded-lg shadow-md px-1">
                            <button onclick="updateCart('${item.name}', '${fullQty}', '${item.price}', -1)" class="w-6 h-full text-white flex items-center justify-center active:scale-75 transition"><i class="fa-solid fa-minus text-[9px]"></i></button>
                            <span class="text-white font-bold text-sm min-w-[16px] text-center">${count}</span>
                            <button onclick="updateCart('${item.name}', '${fullQty}', '${item.price}', 1)" class="w-6 h-full text-white flex items-center justify-center active:scale-75 transition"><i class="fa-solid fa-plus text-[9px]"></i></button>
                        </div>`;
                }
            }

            li.innerHTML = `
                <div class="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-xl flex-shrink-0 border border-slate-100 shadow-sm overflow-hidden p-0.5">
                    <div class="w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-white">
                        ${imageContent}
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-sm truncate leading-tight">${item.name}</h4>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-slate-500 font-medium">${fullQty}</span>
                    </div>
                    <div class="font-extrabold text-slate-900 text-xs mt-0.5">₹${price}</div>
                </div>
                <div class="flex-shrink-0 pl-1">
                    ${controlHtml}
                </div>
            `;
            list.appendChild(li);
        });
    }

    // --- RECENT ORDERS & CART LOGIC (Remaining Same) ---
    function loadRecentOrders() {
        const list = document.getElementById('recentList');
        const section = document.getElementById('recentSection');

        if(!window.session) { if(section) section.classList.add('hidden'); return; }

        window.db.ref('orders').orderByChild('user/mobile').equalTo(window.session.mobile).limitToLast(1).once('value', snap => {
            if(!snap.exists()) { if(section) section.classList.add('hidden'); return; }

            const data = snap.val();
            const orderId = Object.keys(data)[0];
            const lastOrder = data[orderId];

            if(!lastOrder.cart || lastOrder.cart.length === 0) {
                if(section) section.classList.add('hidden');
                return;
            }

            if(section) section.classList.remove('hidden');
            window.lastOrderItems = lastOrder.cart; 
            if(list) list.innerHTML = '';

            const repeatCard = document.createElement('div');
            repeatCard.className = "w-20 bg-green-50 rounded-2xl p-2 border border-green-100 shadow-sm flex flex-col items-center justify-center flex-shrink-0 snap-start cursor-pointer active:scale-95 transition hover:bg-green-100";
            repeatCard.onclick = window.repeatLastOrder;
            repeatCard.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-golist text-white mb-1 flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-rotate-right text-lg"></i>
                </div>
                <div class="text-center leading-tight">
                    <h4 class="font-extrabold text-golist text-[10px]">Repeat</h4>
                    <p class="text-[9px] font-bold text-slate-500">Order</p>
                </div>
            `;
            if(list) list.appendChild(repeatCard);

            lastOrder.cart.forEach(item => {
                // Reuse Image Logic for Recent
                let imageHtml = '';
                const masterMatch = window.masterProductsList?.find(mp => mp.name.toLowerCase() === item.name.toLowerCase());
                if(masterMatch && masterMatch.image) {
                    imageHtml = `<img src="${masterMatch.image}" class="w-full h-full object-cover rounded-full">`;
                } else {
                    imageHtml = window.getProductIcon ? window.getProductIcon(item.name) : '📦';
                }

                const div = document.createElement('div');
                div.className = "w-20 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm flex flex-col items-center justify-between flex-shrink-0 snap-start";
                div.innerHTML = `
                    <div class="w-10 h-10 rounded-full bg-slate-50 mb-1 flex items-center justify-center text-xl shadow-inner overflow-hidden">
                        ${imageHtml}
                    </div>
                    <div class="w-full text-center">
                        <h4 class="font-bold text-slate-800 text-[10px] truncate leading-tight mb-0.5">${item.name}</h4>
                        <p class="text-[9px] text-slate-400 font-bold leading-none mb-1">${item.qty || 'Unit'}</p>

                        <div class="flex justify-between items-center w-full px-0.5 bg-slate-50 rounded-lg py-0.5">
                            <span class="text-[9px] font-bold text-slate-600">₹${item.price}</span>
                            <button onclick="updateCart('${item.name}', '${item.qty}', '${item.price}', 1)" class="w-4 h-4 rounded-full bg-golist text-white flex items-center justify-center shadow-sm active:scale-90 transition">
                                <i class="fa-solid fa-plus text-[7px]"></i>
                            </button>
                        </div>
                    </div>
                `;
                if(list) list.appendChild(div);
            });
        });
    }

    window.repeatLastOrder = function() {
        if(!window.lastOrderItems || window.lastOrderItems.length === 0) return;
        let cart = getCart(); 
        window.lastOrderItems.forEach(lastItem => {
            const existingIdx = cart.findIndex(c => c.name === lastItem.name);
            if (existingIdx > -1) { cart[existingIdx].count = lastItem.count || 1; } 
            else { cart.push({ name: lastItem.name, qty: lastItem.qty, price: lastItem.price, count: lastItem.count || 1 }); }
        });
        localStorage.setItem('rmz_cart', JSON.stringify(cart));
        window.filterProducts();
        updateBottomBar();
        window.showToast("Cart restored from last order!");
    };

    function getCart() { return JSON.parse(localStorage.getItem('rmz_cart')) || []; }
    function getCartItem(name) { return getCart().find(i => i.name === name); }

    window.updateCart = function(name, qty, price, change) {
        let cart = getCart();
        let itemIndex = cart.findIndex(i => i.name === name);
        if (navigator.vibrate) navigator.vibrate(40); 
        if (itemIndex > -1) {
            cart[itemIndex].count += change;
            if (cart[itemIndex].count <= 0) cart.splice(itemIndex, 1);
        } else if (change > 0) {
            cart.push({ name, qty, price, count: change }); 
        }
        localStorage.setItem('rmz_cart', JSON.stringify(cart));
        window.filterProducts(); 
        updateBottomBar();
    };

    function updateBottomBar() {
        const cart = getCart();
        const bar = document.getElementById('bottomBar');
        if(!bar) return;
        if(cart.length > 0) {
            bar.classList.remove('hidden');
            let total = 0, count = 0;
            cart.forEach(i => { total += (parseFloat(i.price)||0) * i.count; count += i.count; });
            document.getElementById('barCount').innerText = count;
            document.getElementById('barTotal').innerText = total;
        } else {
            bar.classList.add('hidden');
        }
    }

    // --- 5. EDIT/DELETE CONTROLS ---
    window.toggleEditMode = function() { window.isEditMode = !window.isEditMode; window.isDeleteMode = false; updateControlUI(); };
    window.toggleDeleteMode = function() { window.isDeleteMode = !window.isDeleteMode; window.isEditMode = false; itemsToDelete.clear(); updateControlUI(); };

    function updateControlUI() {
        const editBtn = document.getElementById('btnEditMode');
        const delBtn = document.getElementById('btnDeleteMode');
        const delBar = document.getElementById('bulkDeleteAction');

        editBtn.className = "w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center border border-slate-100 transition";
        delBtn.className = "w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center border border-slate-100 transition";
        delBar.classList.add('hidden');

        if(window.isEditMode) { editBtn.className = "w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md"; window.showToast("Tap pencil to edit item"); }
        if(window.isDeleteMode) { delBtn.className = "w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md"; delBar.classList.remove('hidden'); window.showToast("Select items to delete"); }
        window.filterProducts();
    }

    window.toggleDeleteItem = function(id) {
        if(itemsToDelete.has(id)) itemsToDelete.delete(id); else itemsToDelete.add(id);
    };

    window.confirmBulkDelete = function() {
        if(itemsToDelete.size === 0) return window.showToast("No items selected");
        if(confirm(`Delete ${itemsToDelete.size} items?`)) {
            itemsToDelete.forEach(id => { window.db.ref(`products/${window.targetMobile}/${id}`).remove(); });
            window.toggleDeleteMode(); window.showToast("Items Deleted");
        }
    };
})();