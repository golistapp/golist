// --- FILE: /modules/master-catalog.js ---
// Purpose: Logic for Master Catalog (Lazy Load, Search, Add, Unit Map, HIDE ALREADY ADDED)

(function() {
    console.log("📚 Master Catalog Module Loaded");

    // --- STATE VARIABLES ---
    let allMasterItems = [];
    let filteredItems = [];
    let displayedCount = 20;
    let currentCategory = 'all';
    let isLoading = false;

    // Global Maps
    let masterUnits = {}; 
    let userAddedNames = new Set(); // Store names of products user ALREADY has

    // --- INITIALIZATION ---
    window.onload = function() {
        console.log("🚀 Initializing Catalog...");
        loadMasterData();
        setupEventListeners();
    };

    // --- 1. DATA LOADING ---
    function loadMasterData() {
        const loader = document.getElementById('initialLoader');
        if(loader) loader.classList.remove('hidden');

        // 0. Fetch User's EXISTING Products (To Hide duplicates)
        const session = JSON.parse(localStorage.getItem('rmz_user'));
        if(session && session.mobile) {
            window.db.ref('products/' + session.mobile).once('value', snap => {
                if(snap.exists()) {
                    const data = snap.val();
                    Object.values(data).forEach(item => {
                        if(item.name) userAddedNames.add(item.name.toLowerCase().trim());
                    });
                }
                // Refresh list if master data is already loaded
                if(allMasterItems.length > 0) filterData();
            });
        }

        // 1. Fetch Categories
        window.db.ref('masterCategories').once('value', snap => {
            if(snap.exists()) renderCategories(snap.val());
        });

        // 2. Fetch Units
        window.db.ref('masterUnits').once('value', snap => {
            if(snap.exists()) {
                masterUnits = snap.val(); 
            }

            // 3. Fetch Products
            loadProducts(loader);
        });
    }

    function loadProducts(loader) {
        window.db.ref('masterProducts').once('value', snap => {
            if(loader) loader.classList.add('hidden');

            if(snap.exists()) {
                allMasterItems = Object.values(snap.val());
                filterData();
            } else {
                document.getElementById('emptyState').classList.remove('hidden');
            }
        });
    }

    function renderCategories(categories) {
        const container = document.getElementById('catalogCategories');

        const sorted = Object.entries(categories)
            .map(([key, val]) => ({ key, ...val }))
            .sort((a, b) => (a.order || 99) - (b.order || 99));

        sorted.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = "inactive-cat px-4 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-sm transition";
            btn.innerText = cat.name;
            btn.onclick = () => {
                setActiveCategory(btn, cat.key);
            };
            container.appendChild(btn);
        });
    }

    function setActiveCategory(btn, catKey) {
        document.querySelectorAll('#catalogCategories button').forEach(b => {
            b.className = "inactive-cat px-4 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-sm transition";
        });
        btn.className = "active-cat px-4 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-sm transition";

        currentCategory = catKey;
        filterData();
    }

    // --- 2. FILTER & SEARCH LOGIC (Updated with Hiding Logic) ---
    function filterData() {
        const query = document.getElementById('catalogSearch').value.toLowerCase().trim();

        filteredItems = allMasterItems.filter(item => {
            // A. Active Check
            if(item.isActive !== true) return false;

            // B. ALREADY ADDED CHECK (New Logic)
            // Agar ye item user ki list mein pehle se hai, to HIDE karo
            if (userAddedNames.has(item.name.toLowerCase().trim())) return false;

            // C. Category Check
            if(currentCategory !== 'all' && item.category !== currentCategory) return false;

            // D. Search Check
            if(query) {
                const matchName = item.name.toLowerCase().includes(query);
                const matchTags = item.tags ? item.tags.toLowerCase().includes(query) : false;
                return matchName || matchTags;
            }
            return true;
        });

        displayedCount = 20; // Reset lazy load on filter change
        renderList();
    }

    window.filterCatalog = function(catKey) {
        if(catKey === 'all') {
             currentCategory = 'all';
             document.querySelectorAll('#catalogCategories button').forEach(b => {
                b.className = "inactive-cat px-4 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-sm transition";
            });
            const allBtn = document.getElementById('cat-all');
            if(allBtn) allBtn.className = "active-cat px-4 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-sm transition";
            filterData();
        }
    };

    // --- 3. RENDERING (LAZY LOAD) ---
    function renderList() {
        const listContainer = document.getElementById('catalogList');
        const emptyState = document.getElementById('emptyState');
        const endMsg = document.getElementById('endOfList');

        listContainer.innerHTML = ''; 

        if(filteredItems.length === 0) {
            emptyState.classList.remove('hidden');
            endMsg.classList.add('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        const toShow = filteredItems.slice(0, displayedCount);

        toShow.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 animate-[fadeIn_0.3s]";

            // Image Logic
            let imageHtml = '';
            if(item.image) {
                imageHtml = `<img src="${item.image}" class="w-full h-full object-cover">`;
            } else {
                imageHtml = window.getProductIcon ? window.getProductIcon(item.name) : '📦';
            }

            // Unit Name Mapping
            let unitName = "";
            if (item.unit && masterUnits[item.unit]) {
                unitName = masterUnits[item.unit].name;
            }
            const fullQtyDisplay = `${item.qty || ''} ${unitName}`;

            card.innerHTML = `
                <div class="w-12 h-12 rounded-lg bg-slate-50 flex-shrink-0 flex items-center justify-center text-xl overflow-hidden border border-slate-100">
                    ${imageHtml}
                </div>

                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-sm truncate">${item.name}</h4>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase">${fullQtyDisplay}</span>
                        <span class="text-xs font-extrabold text-slate-700">₹${item.price}</span>
                    </div>
                </div>

                <button onclick="addItemToHome('${item.name}', '${item.price}', '${item.category}', '${item.unit}', '${item.qty}', this)" class="bg-white border border-green-200 text-golist hover:bg-golist hover:text-white px-3 py-2 rounded-lg text-[10px] font-bold transition shadow-sm flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap">
                    ADD TO LIST <i class="fa-solid fa-plus"></i>
                </button>
            `;
            listContainer.appendChild(card);
        });

        if(displayedCount >= filteredItems.length) {
            endMsg.classList.remove('hidden');
            document.getElementById('scrollLoader').classList.add('hidden');
        } else {
            endMsg.classList.add('hidden');
        }
    }

    // --- 4. SCROLL LISTENER ---
    function setupEventListeners() {
        const searchInput = document.getElementById('catalogSearch');
        const clearBtn = document.getElementById('clearSearchBtn');

        searchInput.addEventListener('keyup', (e) => {
            if(searchInput.value.length > 0) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
            filterData();
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            filterData();
        });

        window.addEventListener('scroll', () => {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
                if(!isLoading && displayedCount < filteredItems.length) {
                    loadMoreItems();
                }
            }
        });
    }

    function loadMoreItems() {
        isLoading = true;
        document.getElementById('scrollLoader').classList.remove('hidden');

        setTimeout(() => {
            displayedCount += 10;
            renderList(); 
            isLoading = false;
            if(displayedCount < filteredItems.length) {
                 document.getElementById('scrollLoader').classList.add('hidden');
            }
        }, 500); 
    }

    // --- 5. ADD TO HOME LOGIC (Updates Blacklist) ---
    window.addItemToHome = function(name, price, cat, unit, qty, btn) {
        const session = JSON.parse(localStorage.getItem('rmz_user'));
        const targetMobile = session ? session.mobile : null;

        if(!targetMobile) {
            showToast("Please Login First");
            return;
        }

        const masterItem = allMasterItems.find(i => i.name === name);
        const tags = masterItem ? (masterItem.tags || '') : '';
        const image = masterItem ? (masterItem.image || '') : '';

        // Unit Calculation for Saving
        let unitName = "";
        if (unit && masterUnits[unit]) {
            unitName = masterUnits[unit].name;
        }
        const qtyToSave = `${qty} ${unitName}`;

        const productData = {
            name: name,
            price: price,
            category: cat,
            unit: unit,
            qty: qtyToSave,
            tags: tags,
            image: image,
            addedAt: firebase.database.ServerValue.TIMESTAMP
        };

        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        btn.classList.add('bg-slate-100', 'text-slate-400', 'border-slate-200');
        btn.disabled = true;

        window.db.ref(`products/${targetMobile}`).push(productData)
        .then(() => {
            // Feedback UI
            btn.innerHTML = `<i class="fa-solid fa-check"></i> ADDED`;
            btn.classList.remove('bg-white', 'text-golist', 'hover:bg-golist', 'hover:text-white');
            btn.classList.add('bg-green-600', 'text-white', 'border-transparent');

            showToast(`Added: ${name}`);

            // Update Blacklist
            userAddedNames.add(name.toLowerCase().trim());

            // Remove from screen after delay (Smooth Experience)
            setTimeout(() => {
                filterData(); // Refresh list -> Item will hide automatically
            }, 1000);
        })
        .catch(err => {
            console.error(err);
            showToast("Error adding item");
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        });
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        if(t) {
            document.getElementById('toastMsg').innerText = msg;
            t.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => t.classList.add('opacity-0', 'pointer-events-none'), 2000);
        }
    }

})();