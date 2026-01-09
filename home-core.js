// home-core.js

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCmgMr4cj7ec1B09eu3xpRhCwsVCeQR9v0",
    authDomain: "tipsplit-e3wes.firebaseapp.com",
    databaseURL: "https://tipsplit-e3wes-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tipsplit-e3wes",
    storageBucket: "tipsplit-e3wes.firebasestorage.app",
    messagingSenderId: "984733883633",
    appId: "1:984733883633:web:adc1e1d22b629a6b631d50"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- STATE MANAGEMENT ---
const session = JSON.parse(localStorage.getItem('rmz_user'));
const urlParams = new URLSearchParams(window.location.search);
const targetMobile = urlParams.get('shop') || (session ? session.mobile : null);

if (!targetMobile) window.location.href = 'index.html'; 

const isOwner = session && session.mobile === targetMobile;

// Data Holders (Global Access Enabled)
window.allProducts = [];       
window.masterCategories = {};  
window.masterUnits = {};
window.masterProductsList = []; 
window.lastOrderItems = []; 
let activeCategory = 'all';

// Edit/Delete States
let isEditMode = false;
let isDeleteMode = false;
let itemsToDelete = new Set();

// --- INITIALIZATION ---
window.onload = () => {
    setupHeader();
    setupSideMenu(); 

    // 1. Load all Master Data
    loadMasterData();

    // 2. Load User's Products
    syncUserProducts();

    // 3. Load Recent Orders (Dynamic)
    loadRecentOrders();

    // 4. Update Cart Bar
    updateBottomBar();

    // 5. Feature Checks
    if (typeof checkActiveOrderHome === 'function') checkActiveOrderHome();
};

// --- UTILS ---
function showToast(msg) {
    const t = document.getElementById('toast');
    if(t) {
        document.getElementById('toastMsg').innerText = msg;
        t.classList.remove('opacity-0', 'pointer-events-none');
        setTimeout(() => t.classList.add('opacity-0', 'pointer-events-none'), 2000);
    }
}

function toggleMenu() { 
    document.getElementById('sidebar').classList.toggle('open'); 
    document.getElementById('menuOverlay').classList.toggle('open'); 
}

// (Old getEmoji Function Removed - Now using getProductIcon from home-icons.js)

// --- 1. SETUP & MENU ---
function setupHeader() {
    if(session) {
        document.getElementById('menuName').innerText = session.name || 'User';
        document.getElementById('menuMobile').innerText = '+91 ' + session.mobile;
        db.ref('users/' + targetMobile + '/logo').once('value', s => {
            if(s.exists()) document.getElementById('profileImg').src = s.val();
        });
    }
}

function setupSideMenu() {
    const nav = document.getElementById('sidebarNav');
    let html = `
        <button onclick="toggleMenu(); openAddModal()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-plus text-golist w-5 text-lg"></i> Add Product
        </button>

        <button onclick="openHistory()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-clock-rotate-left text-blue-600 w-5"></i> Order History
        </button>

        <div class="h-px bg-slate-100 my-1 mx-4"></div>

        <button onclick="toggleMenu(); openAddressModal()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-location-dot text-indigo-500 w-5"></i> My Address
        </button>

        <button onclick="toggleMenu(); openPinModal()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-key text-orange-500 w-5"></i> Change PIN
        </button>

        <div class="h-px bg-slate-100 my-1 mx-4"></div>

        <button onclick="toggleMenu(); fetchDynamicContent('video')" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-brands fa-youtube text-red-500 w-5"></i> How to Use App
        </button>

        <button onclick="openSupportOptions()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-golist font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-brands fa-whatsapp w-5 text-xl"></i> Contact Support
        </button>

        <button onclick="toggleMenu(); fetchDynamicContent('policy')" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-shield-halved text-slate-400 w-5"></i> Policies & Terms
        </button>

        <div class="h-px bg-slate-100 my-1 mx-4"></div>

        <button onclick="logout()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-power-off w-5"></i> Logout
        </button>
    `;
    nav.innerHTML = html;
}

function logout() {
    localStorage.removeItem('rmz_user');
    window.location.href = 'index.html';
}

// --- 2. MASTER DATA LOADING ---
function loadMasterData() {
    db.ref('masterCategories').once('value', snap => {
        if(snap.exists()) {
            window.masterCategories = snap.val();
            renderCategoriesUI();
        }
    });

    db.ref('masterUnits').once('value', snap => {
        if(snap.exists()) { window.masterUnits = snap.val(); }
    });

    db.ref('masterProducts').once('value', snap => {
        if(snap.exists()) {
            window.masterProductsList = Object.values(snap.val());
            if(window.allProducts.length > 0) filterProducts();
        }
    });
}

function renderCategoriesUI() {
    const list = document.getElementById('categoryList');
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
        btn.onclick = () => filterByCategory(cat.key);
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

// --- 3. RECENT ORDERS (Last Order Items) ---
function loadRecentOrders() {
    const list = document.getElementById('recentList');
    const section = document.getElementById('recentSection');

    if(!session) { section.classList.add('hidden'); return; }

    db.ref('orders').orderByChild('user/mobile').equalTo(session.mobile).limitToLast(1).once('value', snap => {
        if(!snap.exists()) {
            section.classList.add('hidden');
            return;
        }

        const data = snap.val();
        const orderId = Object.keys(data)[0];
        const lastOrder = data[orderId];

        if(!lastOrder.cart || lastOrder.cart.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        window.lastOrderItems = lastOrder.cart; 
        list.innerHTML = '';

        const repeatCard = document.createElement('div');
        repeatCard.className = "w-20 bg-green-50 rounded-2xl p-2 border border-green-100 shadow-sm flex flex-col items-center justify-center flex-shrink-0 snap-start cursor-pointer active:scale-95 transition hover:bg-green-100";
        repeatCard.onclick = repeatLastOrder;
        repeatCard.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-golist text-white mb-1 flex items-center justify-center shadow-md">
                <i class="fa-solid fa-rotate-right text-lg"></i>
            </div>
            <div class="text-center leading-tight">
                <h4 class="font-extrabold text-golist text-[10px]">Repeat</h4>
                <p class="text-[9px] font-bold text-slate-500">Order</p>
            </div>
        `;
        list.appendChild(repeatCard);

        lastOrder.cart.forEach(item => {
            let imageHtml = '';
            const masterMatch = window.masterProductsList?.find(mp => mp.name.toLowerCase() === item.name.toLowerCase());

            if(masterMatch && masterMatch.image) {
                 imageHtml = `<img src="${masterMatch.image}" class="w-full h-full object-cover rounded-full">`;
            } else {
                 // UPDATED: Using New Icon System
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
            list.appendChild(div);
        });
    });
}

// REPEAT ORDER FIX (Overwrite Mode)
function repeatLastOrder() {
    if(!window.lastOrderItems || window.lastOrderItems.length === 0) return;

    let cart = getCart(); 

    window.lastOrderItems.forEach(lastItem => {
        const existingIdx = cart.findIndex(c => c.name === lastItem.name);

        if (existingIdx > -1) {
            cart[existingIdx].count = lastItem.count || 1;
        } else {
            cart.push({
                name: lastItem.name,
                qty: lastItem.qty,
                price: lastItem.price,
                count: lastItem.count || 1
            });
        }
    });

    localStorage.setItem('rmz_cart', JSON.stringify(cart));
    filterProducts();
    updateBottomBar();

    showToast("Cart restored from last order!");
    const bar = document.getElementById('bottomBar');
    if(bar) bar.classList.add('animate-bounce');
    setTimeout(() => { if(bar) bar.classList.remove('animate-bounce'); }, 1000);
}

// --- 4. MAIN PRODUCT LIST ---
function syncUserProducts() {
    db.ref('products/' + targetMobile).on('value', snapshot => {
        if(snapshot.exists()) {
            window.allProducts = Object.entries(snapshot.val()).map(([key, val]) => ({id: key, ...val})).reverse();
            filterProducts(); 
        } else {
            window.allProducts = [];
            renderList([]);
        }
    });
}

function filterByCategory(catId) {
    activeCategory = catId;
    const searchVal = document.getElementById('searchInput').value.toLowerCase();

    if(catId !== 'all') {
        const catName = window.masterCategories[catId]?.name || 'Category';
        showToast(`Showing: ${catName}`);
    } else {
        showToast("Showing All Items");
    }

    let filtered = window.allProducts;
    if (catId !== 'all') filtered = filtered.filter(item => item.category === catId);
    if(searchVal) filtered = filtered.filter(item => item.name.toLowerCase().includes(searchVal));

    renderList(filtered);
}

function filterProducts() {
    filterByCategory(activeCategory);
}

function renderList(products) {
    const list = document.getElementById('productList');
    list.innerHTML = '';

    if(products.length === 0) {
        list.innerHTML = `<div class="text-center py-10 opacity-50"><p class="text-xs font-bold text-slate-400">No products found</p></div>`;
        return;
    }

    products.forEach(item => {
        const price = item.price || 0;
        const fullQty = item.qty || ''; 

        let imageContent = '';
        const masterMatch = window.masterProductsList?.find(mp => mp.name.toLowerCase() === item.name.toLowerCase());

        if(masterMatch && masterMatch.image) {
            imageContent = `<img src="${masterMatch.image}" class="w-full h-full object-cover">`;
        } else {
            // UPDATED: Using New Icon System
            imageContent = window.getProductIcon ? window.getProductIcon(item.name) : '📦';
        }

        const li = document.createElement('li');
        li.className = "bg-white border border-slate-100 rounded-2xl p-2 flex items-center gap-3 shadow-sm relative";

        let controlHtml = '';

        if (isDeleteMode) {
            const isChecked = itemsToDelete.has(item.id) ? 'checked' : '';
            controlHtml = `<input type="checkbox" class="custom-check" onclick="toggleDeleteItem('${item.id}')" ${isChecked}>`;
        } else if (isEditMode) {
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

// --- 5. CONTROL MODES & CART ---
function toggleEditMode() {
    isEditMode = !isEditMode;
    isDeleteMode = false;
    updateControlUI();
}

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    isEditMode = false;
    itemsToDelete.clear();
    updateControlUI();
}

function updateControlUI() {
    const editBtn = document.getElementById('btnEditMode');
    const delBtn = document.getElementById('btnDeleteMode');
    const delBar = document.getElementById('bulkDeleteAction');

    editBtn.className = "w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center border border-slate-100 transition";
    delBtn.className = "w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center border border-slate-100 transition";
    delBar.classList.add('hidden');

    if(isEditMode) {
        editBtn.className = "w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md";
        showToast("Tap pencil to edit item");
    }
    if(isDeleteMode) {
        delBtn.className = "w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md";
        delBar.classList.remove('hidden');
        showToast("Select items to delete");
    }
    filterProducts();
}

function toggleDeleteItem(id) {
    if(itemsToDelete.has(id)) itemsToDelete.delete(id);
    else itemsToDelete.add(id);
}

function confirmBulkDelete() {
    if(itemsToDelete.size === 0) return showToast("No items selected");
    if(confirm(`Delete ${itemsToDelete.size} items?`)) {
        itemsToDelete.forEach(id => {
            db.ref(`products/${targetMobile}/${id}`).remove();
        });
        toggleDeleteMode(); 
        showToast("Items Deleted");
    }
}

function getCart() { return JSON.parse(localStorage.getItem('rmz_cart')) || []; }
function getCartItem(name) { return getCart().find(i => i.name === name); }

function updateCart(name, qty, price, change) {
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
    filterProducts(); 
    updateBottomBar();
}

function updateBottomBar() {
    const cart = getCart();
    const bar = document.getElementById('bottomBar');
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

// Global Exports
window.updateCart = updateCart;
window.filterByCategory = filterByCategory;
window.toggleEditMode = toggleEditMode;
window.toggleDeleteMode = toggleDeleteMode;
window.confirmBulkDelete = confirmBulkDelete;
window.toggleDeleteItem = toggleDeleteItem;
window.toggleMenu = toggleMenu;
window.logout = logout;
window.openSupportOptions = openSupportOptions; 
window.setupSideMenu = setupSideMenu; 