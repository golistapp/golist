// --- FILE: /modules/inventory.js ---
// Purpose: Add/Edit Product Modal, Smart Search (Name + Tags), and Unit Calculations

(function() {
    console.log("📦 Inventory Module Loaded");

    // --- MODULE STATE ---
    let cachedMasterProducts = []; 
    let selectedMasterItem = null; 
    let currentGramValue = 1000;   
    let editItemId = null;

    // --- 1. MODAL OPEN/CLOSE LOGIC ---
    window.openAddModal = function(id = null, name = '', qty = '', price = '', cat = '', unit = '') {
        const modal = document.getElementById('addStockModal');
        const card = document.getElementById('addStockCard');
        if(!modal || !card) return console.error("Modal elements missing in HTML");

        resetModalUI();
        populateModalDropdowns(cat, unit);
        editItemId = id; 

        if (id) {
            // Edit Mode
            const isMaster = window.masterProductsList ? window.masterProductsList.find(p => p.name.toLowerCase() === name.toLowerCase()) : null;

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
    };

    window.closeAddModal = function() {
        const card = document.getElementById('addStockCard');
        if(card) card.classList.add('translate-y-full');
        setTimeout(() => {
            const modal = document.getElementById('addStockModal');
            if(modal) modal.classList.add('hidden');
            editItemId = null; 
            resetModalUI();
        }, 300);
    };

    function resetModalUI() {
        selectedMasterItem = null;
        currentGramValue = 1000; 

        const els = ['inpProdName', 'inpProdCat', 'inpProdUnit', 'inpProdPrice'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.remove('locked-input');
        });

        const nameInp = document.getElementById('inpProdName');
        if(nameInp) nameInp.value = '';

        const priceInp = document.getElementById('inpProdPrice');
        if(priceInp) priceInp.value = 'Market Price';

        document.getElementById('inpProdQtyDisplay').value = '1 Kg'; 
        document.getElementById('masterProductBadge').classList.add('hidden');
        document.getElementById('suggestionBox').innerHTML = '';
    }

    function populateModalDropdowns(selectedCat, selectedUnit) {
        const catSelect = document.getElementById('inpProdCat');
        const unitSelect = document.getElementById('inpProdUnit');

        if(catSelect) {
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
        }

        if(unitSelect) {
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
    }

    // --- 2. LOGIC: PARSING & UNIT HANDLING ---
    setTimeout(() => {
        const unitEl = document.getElementById('inpProdUnit');
        if(unitEl) {
            unitEl.addEventListener('change', function() {
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
        }
    }, 500);

    function getUnitNameById(unitId) {
        if (!window.masterUnits || !window.masterUnits[unitId]) return 'Unit';
        return window.masterUnits[unitId].name; 
    }

    function isWeightUnit(unitName) {
        if(!unitName) return false;
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

    // --- 3. SMART SEARCH & SELECTION LOGIC (UPDATED) ---
    function loadMasterProductsForSearch() {
        if(cachedMasterProducts.length > 0) { renderSuggestions(); return; }

        // Fetch Master Products
        window.db.ref('masterProducts').limitToLast(100).once('value', snap => {
            if(snap.exists()) {
                cachedMasterProducts = Object.values(snap.val());
                renderSuggestions();
            }
        });
    }

    function renderSuggestions() {
        const box = document.getElementById('suggestionBox');
        if(!box) return;
        box.innerHTML = '';
        const existingNames = (window.allProducts || []).map(p => p.name.toLowerCase());

        // UPDATE 1: Added isActive Check here
        const suggestions = cachedMasterProducts
            .filter(p => {
                // Check Active Status
                if(p.isActive !== true) return false;
                // Check Duplicate
                return !existingNames.includes(p.name.toLowerCase());
            })
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        suggestions.forEach(prod => createChip(prod, box));
    }

    // Input Listener for Search
    setTimeout(() => {
        const nameInput = document.getElementById('inpProdName');
        if(nameInput) {
            nameInput.addEventListener('input', function(e) {
                const query = e.target.value.toLowerCase();
                const box = document.getElementById('suggestionBox');
                if(!box) return;
                box.innerHTML = '';
                if(query.length < 2) return;

                const existingNames = (window.allProducts || []).map(p => p.name.toLowerCase());

                // UPDATE 2: Added Tags Search & Active Check
                const matches = cachedMasterProducts
                    .filter(p => {
                        // 1. Check Active Status
                        if(p.isActive !== true) return false;

                        // 2. Check Duplicate
                        if(existingNames.includes(p.name.toLowerCase())) return false;

                        // 3. Match Logic (Name OR Tags)
                        const nameMatches = p.name.toLowerCase().includes(query);
                        const tagsMatches = p.tags ? p.tags.toLowerCase().includes(query) : false;

                        return nameMatches || tagsMatches;
                    })
                    .slice(0, 4);

                matches.forEach(prod => createChip(prod, box));
            });
        }
    }, 500);

    function createChip(prod, container) {
        const btn = document.createElement('button');
        btn.className = "px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100 hover:bg-golist hover:text-white hover:border-transparent transition whitespace-nowrap";
        btn.innerHTML = `+ ${prod.name}`;
        btn.onclick = () => selectMasterProduct(prod);
        container.appendChild(btn);
    }

    function selectMasterProduct(prod, isEditing = false) {
        if (!isEditing && window.allProducts) {
            const existing = window.allProducts.find(p => p.name.toLowerCase() === prod.name.toLowerCase());
            if(existing) { window.showToast("Item already in list!"); return; }
        }

        selectedMasterItem = prod;

        const nameInp = document.getElementById('inpProdName');
        const catInp = document.getElementById('inpProdCat');
        const unitInp = document.getElementById('inpProdUnit');
        const priceInp = document.getElementById('inpProdPrice');

        if(nameInp) nameInp.value = prod.name;
        if(catInp && prod.category) catInp.value = prod.category;
        if(unitInp && prod.unit) unitInp.value = prod.unit; 

        if(nameInp) nameInp.classList.add('locked-input');
        if(catInp) catInp.classList.add('locked-input');
        if(unitInp) unitInp.classList.add('locked-input');
        if(priceInp) priceInp.classList.add('locked-input'); 

        if (!isEditing) {
            const unitName = getUnitNameById(prod.unit);
            if (isWeightUnit(unitName)) currentGramValue = 1000;
            else currentGramValue = 1;
            updateQuantityDisplay();
        }

        document.getElementById('masterProductBadge').classList.remove('hidden');
        document.getElementById('suggestionBox').innerHTML = '';
    }

    // --- 4. QUANTITY & PRICE CALCULATION ---
    window.adjustModalQty = function(dir) {
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
    };

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

        if(displayInput) displayInput.value = displayText;

        if(selectedMasterItem && priceInput) {
            priceInput.value = Math.round(finalPrice * 100) / 100;
        }
    }

    window.saveProduct = function() {
        const name = document.getElementById('inpProdName').value.trim();
        const catId = document.getElementById('inpProdCat').value;
        const unitId = document.getElementById('inpProdUnit').value;
        const price = document.getElementById('inpProdPrice').value;
        const qtyText = document.getElementById('inpProdQtyDisplay').value.trim();

        if(!name) return window.showToast("Enter Name");
        if(!price) return window.showToast("Enter Price");
        if(!catId) return window.showToast("Select Category");
        if(!unitId) return window.showToast("Select Unit Category");

        const productData = {
            name: name,
            price: price, 
            category: catId,
            unit: unitId, 
            qty: qtyText, 
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        const btn = document.querySelector('#addStockModal button[onclick="saveProduct()"]');
        let originalText = "ADD TO LIST";
        if(btn) {
            originalText = btn.innerText;
            btn.innerText = "SAVING...";
            btn.disabled = true;
        }

        const targetMobile = window.targetMobile;
        if(!targetMobile) {
            window.showToast("Error: Store ID not found!");
            if(btn) { btn.innerText = originalText; btn.disabled = false; }
            return;
        }

        const editId = editItemId;

        if (editId) {
            window.db.ref(`products/${targetMobile}/${editId}`).update(productData)
            .then(() => finalizeSave("Item Updated!"));
        } else {
            if(!selectedMasterItem && window.allProducts) {
                const existing = window.allProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
                if(existing) {
                    window.showToast("Item already exists!");
                    if(btn) { btn.innerText = originalText; btn.disabled = false; }
                    return;
                }
            }
            productData.addedAt = firebase.database.ServerValue.TIMESTAMP;
            window.db.ref(`products/${targetMobile}`).push(productData)
            .then(() => finalizeSave("Item Added!"));
        }

        function finalizeSave(msg) {
            window.showToast(msg);
            window.closeAddModal();
            if(btn) { btn.innerText = originalText; btn.disabled = false; }
        }
    };

})();