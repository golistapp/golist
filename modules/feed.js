// --- FILE: /modules/feed.js ---
// Purpose: Super Fast Feed with Local Storage & Infinite Scroll

(function() {
    console.log("⚡ Super Feed Module Loaded");

    // --- GLOBAL VARIABLES (State) ---
    window.allProducts = [];       
    window.masterCategories = {};  
    window.masterUnits = {};
    window.masterProductsList = []; 
    window.lastOrderItems = []; 

    // Pagination State
    let activeCategory = 'all';
    let currentFilteredList = []; // Jo data abhi screen par dikhana hai (filtered)
    let renderedCount = 0;        // Kitne item abhi dikh chuke hain
    const INITIAL_LOAD = 20;      // Pehli baar kitne dikhenge
    const BATCH_SIZE = 10;        // Scroll karne par kitne aur aayenge
    let isLoadingMore = false;    // Double loading rokne ke liye flag

    // Edit/Delete States
    window.isEditMode = false;
    window.isDeleteMode = false;
    let itemsToDelete = new Set();

    // --- 1. INITIALIZATION ---
    window.initFeed = function() {
        // Step A: Load from Local Storage (Instant Show)
        loadFromCache();

        // Step B: Background Sync
        loadMasterData();
        syncUserProducts();
        loadRecentOrders(); 
        updateBottomBar();

        // Step C: Setup Scroll Listener for Lazy Loading
        window.addEventListener('scroll', handleInfiniteScroll);

        // Search Listeners
        const searchInput = document.getElementById('searchInput');
        if(searchInput) {
            searchInput.addEventListener('keyup', () => {
                window.scrollTo(0, 0); // Search karte waqt upar jao
                window.filterProducts();
            });
            searchInput.addEventListener('focus', window.enableSearchMode);
        }
    };

    // --- 2. LOCAL STORAGE SYSTEM ---
    function loadFromCache() {
        // Products Cache
        const cachedProd = localStorage.getItem('rmz_cached_products');
        if (cachedProd) {
            window.allProducts = JSON.parse(cachedProd);
            console.log("🚀 Loaded products from Cache");
            window.filterProducts(); // Turant dikhao
        }

        // Categories Cache
        const cachedCats = localStorage.getItem('rmz_cached_cats');
        if (cachedCats) {
            window.masterCategories = JSON.parse(cachedCats);
            renderCategoriesUI();
        }
    }

    function saveToCache(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // --- 3. MASTER DATA ---
    function loadMasterData() {
        window.db.ref('masterCategories').once('value', snap => {
            if(snap.exists()) {
                window.masterCategories = snap.val();
                saveToCache('rmz_cached_cats', window.masterCategories); // Update Cache
                renderCategoriesUI();
            }
        });

        window.db.ref('masterUnits').once('value', snap => {
            if(snap.exists()) { window.masterUnits = snap.val(); }
        });

        window.db.ref('masterProducts').once('value', snap => {
            if(snap.exists()) {
                window.masterProductsList = Object.values(snap.val());
                // Fallback tags ke liye refresh agar zaroorat ho
                if(window.allProducts.length > 0) window.filterProducts();
            }
        });
    }

    // --- 4. USER PRODUCTS SYNC ---
    function syncUserProducts() {
        if(!window.targetMobile) return;

        // Real-time listener
        window.db.ref('products/' + window.targetMobile).on('value', snapshot => {
            if(snapshot.exists()) {
                // Naya data aaya
                window.allProducts = Object.entries(snapshot.val()).map(([key, val]) => ({id: key, ...val})).reverse();

                // Cache Update karo
                saveToCache('rmz_cached_products', window.allProducts);

                // List refresh karo
                window.filterProducts(); 
            } else {
                window.allProducts = [];
                saveToCache('rmz_cached_products', []);
                window.filterProducts();
            }
        });
    }

    // --- 5. CATEGORY & FILTER LOGIC ---
    window.filterByCategory = function(catId) {
        activeCategory = catId;
        window.scrollTo(0, 0); // Category change par top pe jao

        if(catId !== 'all') {
            const catName = window.masterCategories[catId]?.name || 'Category';
            window.showToast(`Showing: ${catName}`);
        } else {
            window.showToast("Showing All Items");
        }
        window.filterProducts();
    };

    window.filterProducts = function() {
        const searchInput = document.getElementById('searchInput');
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // 1. Filtering Logic
        let filtered = window.allProducts;

        if (activeCategory !== 'all') {
            filtered = filtered.filter(item => item.category === activeCategory);
        }

        if(searchVal) {
            filtered = filtered.filter(item => {
                const itemName = item.name.toLowerCase();
                if(itemName.includes(searchVal)) return true;

                let itemTags = item.tags;
                if (!itemTags && window.masterProductsList) {
                    const masterEntry = window.masterProductsList.find(m => m.name.toLowerCase() === itemName);
                    if (masterEntry && masterEntry.tags) itemTags = masterEntry.tags;
                }
                return itemTags && itemTags.toLowerCase().includes(searchVal);
            });
        }

        // 2. Setup Pagination Data
        currentFilteredList = filtered;
        renderedCount = 0; // Reset counter

        // 3. Clear List & Render First Batch
        const list = document.getElementById('productList');
        if(list) list.innerHTML = ''; // Safai

        renderBatch(INITIAL_LOAD);
        updateScrollLoaders();
    };

    // --- 6. LAZY RENDERING (BATCH) ---
    function renderBatch(count) {
        const list = document.getElementById('productList');
        if(!list) return;

        // Calculate range
        const start = renderedCount;
        const end = Math.min(start + count, currentFilteredList.length);

        if (start >= end) return; // Nothing to render

        const itemsToRender = currentFilteredList.slice(start, end);

        if(renderedCount === 0 && itemsToRender.length === 0) {
            list.innerHTML = `<div class="text-center py-10 opacity-50"><p class="text-xs font-bold text-slate-400">No products found</p></div>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        itemsToRender.forEach((item, index) => {
            const li = createProductCard(item);
            // Lazy Animation (Fade In)
            li.style.animation = `fadeIn 0.3s ease-out forwards`;
            li.style.animationDelay = `${index * 0.05}s`; // Staggered effect
            fragment.appendChild(li);
        });

        list.appendChild(fragment);
        renderedCount = end; // Update counter
    }

    function createProductCard(item) {
        const price = item.price || 0;
        const fullQty = item.qty || ''; 

        // Image Logic
        let imageContent = '';
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

        // Control Logic (Add/Edit/Delete)
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

        const li = document.createElement('li');
        li.className = "bg-white border border-slate-100 rounded-2xl p-2 flex items-center gap-3 shadow-sm relative opacity-0"; // Opacity 0 for animation
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
        return li;
    }

    // --- 7. INFINITE SCROLL HANDLER ---
    function handleInfiniteScroll() {
        if(isLoadingMore) return;

        // Check if user is near bottom (100px buffer)
        const scrollPosition = window.innerHeight + window.scrollY;
        const pageHeight = document.body.offsetHeight;

        if (scrollPosition >= pageHeight - 150) {
            // Check if more items are available
            if (renderedCount < currentFilteredList.length) {
                loadMoreItems();
            }
        }
    }

    function loadMoreItems() {
        isLoadingMore = true;

        // Show Spinner
        const loader = document.getElementById('scrollLoader');
        if(loader) loader.classList.remove('hidden');

        // Fake delay for animation feel (smoothness)
        setTimeout(() => {
            renderBatch(BATCH_SIZE);
            updateScrollLoaders();
            isLoadingMore = false;
        }, 400); // 400ms delay
    }

    function updateScrollLoaders() {
        const loader = document.getElementById('scrollLoader');
        const endMsg = document.getElementById('endOfList');

        // Hide Loader
        if(loader) loader.classList.add('hidden');

        // Show "End of List" only if we have rendered everything AND list is not empty
        if(renderedCount >= currentFilteredList.length && currentFilteredList.length > 0) {
            if(endMsg) endMsg.classList.remove('hidden');
        } else {
            if(endMsg) endMsg.classList.add('hidden');
        }
    }

    // --- 8. UI UTILS (Search/Categories) ---
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
            .sort((a, b) => (a.order || 9999) - (b.order || 9999));

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

    // --- 9. HELPER FUNCTIONS (Search Mode, Toasts) ---
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
        if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
    }

    window.showToast = function(msg) {
        const t = document.getElementById('toast');
        if(t) {
            document.getElementById('toastMsg').innerText = msg;
            t.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => t.classList.add('opacity-0', 'pointer-events-none'), 2000);
        }
    };

    // --- 10. RECENT ORDERS & CART UTILS ---
    function loadRecentOrders() {
        // (Existing Logic Same as before)
        const list = document.getElementById('recentList');
        const section = document.getElementById('recentSection');
        if(!window.session) { if(section) section.classList.add('hidden'); return; }

        window.db.ref('orders').orderByChild('user/mobile').equalTo(window.session.mobile).limitToLast(1).once('value', snap => {
            if(!snap.exists()) { if(section) section.classList.add('hidden'); return; }
            const data = snap.val();
            const orderId = Object.keys(data)[0];
            const lastOrder = data[orderId];
            if(!lastOrder.cart || lastOrder.cart.length === 0) { if(section) section.classList.add('hidden'); return; }
            if(section) section.classList.remove('hidden');
            window.lastOrderItems = lastOrder.cart; 
            if(list) list.innerHTML = '';

            const repeatCard = document.createElement('div');
            repeatCard.className = "w-20 bg-green-50 rounded-2xl p-2 border border-green-100 shadow-sm flex flex-col items-center justify-center flex-shrink-0 snap-start cursor-pointer active:scale-95 transition hover:bg-green-100";
            repeatCard.onclick = window.repeatLastOrder;
            repeatCard.innerHTML = `<div class="w-10 h-10 rounded-full bg-golist text-white mb-1 flex items-center justify-center shadow-md"><i class="fa-solid fa-rotate-right text-lg"></i></div><div class="text-center leading-tight"><h4 class="font-extrabold text-golist text-[10px]">Repeat</h4><p class="text-[9px] font-bold text-slate-500">Order</p></div>`;
            if(list) list.appendChild(repeatCard);

            lastOrder.cart.forEach(item => {
                let imageHtml = '';
                const masterMatch = window.masterProductsList?.find(mp => mp.name.toLowerCase() === item.name.toLowerCase());
                if(masterMatch && masterMatch.image) imageHtml = `<img src="${masterMatch.image}" class="w-full h-full object-cover rounded-full">`;
                else imageHtml = window.getProductIcon ? window.getProductIcon(item.name) : '📦';

                const div = document.createElement('div');
                div.className = "w-20 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm flex flex-col items-center justify-between flex-shrink-0 snap-start";
                div.innerHTML = `<div class="w-10 h-10 rounded-full bg-slate-50 mb-1 flex items-center justify-center text-xl shadow-inner overflow-hidden">${imageHtml}</div><div class="w-full text-center"><h4 class="font-bold text-slate-800 text-[10px] truncate leading-tight mb-0.5">${item.name}</h4><p class="text-[9px] text-slate-400 font-bold leading-none mb-1">${item.qty || 'Unit'}</p><div class="flex justify-between items-center w-full px-0.5 bg-slate-50 rounded-lg py-0.5"><span class="text-[9px] font-bold text-slate-600">₹${item.price}</span><button onclick="updateCart('${item.name}', '${item.qty}', '${item.price}', 1)" class="w-4 h-4 rounded-full bg-golist text-white flex items-center justify-center shadow-sm active:scale-90 transition"><i class="fa-solid fa-plus text-[7px]"></i></button></div></div>`;
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
        window.filterProducts(); // Refresh list to update counters
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
        // Note: Filter call is efficient now, as it re-renders current batch only logic would be complex, 
        // so we just re-render the view to show updated counts.
        // For smoother UX in future, we can just update DOM element directly, but for now re-render is fine.
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

    // --- 11. EDIT/DELETE CONTROLS ---
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