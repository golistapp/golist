// modules/inventory.js

let productsRef = null;
let categoriesRef = null;
let unitsRef = null;
let imageKit = null;

// Caches for Data
let cachedCats = {};
let cachedUnits = {};
let cachedProducts = {}; 

// Edit State
let currentEditKey = null;
let currentEditImg = "";

export default {
    async render(container, db) {
        // ============================================================
        // 🔑 CONFIGURATION
        // ============================================================
        const PUBLIC_KEY = "public_Nf7wxZyGD34X18W6o9HtFezad2o=";
        const URL_ENDPOINT = "https://ik.imagekit.io/nsyr92pse";
        const PRIVATE_KEY = "private_qGMqr1FlHKO3mNudtWbgqwxtQvU="; 

        // Init ImageKit
        if (typeof ImageKit !== 'undefined') {
            try {
                imageKit = new ImageKit({ publicKey: PUBLIC_KEY, urlEndpoint: URL_ENDPOINT });
            } catch (e) { console.error("IK Error", e); }
        }

        // ============================================================
        // 🛠️ HELPERS
        // ============================================================
        function createUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        const generateSignature = async (token, expire) => {
            try {
                if (!window.crypto || !window.crypto.subtle) return null;
                const encoder = new TextEncoder();
                const data = encoder.encode(token + expire);
                const key = encoder.encode(PRIVATE_KEY);
                const cryptoKey = await window.crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
                const sig = await window.crypto.subtle.sign("HMAC", cryptoKey, data);
                return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) { return null; }
        };

        this.uploadImage = async (file) => {
            if (!imageKit) return null;
            const token = createUUID();
            const expire = Math.floor(Date.now() / 1000) + 2400;
            const signature = await generateSignature(token, expire);
            if(!signature) return null;

            return new Promise((resolve, reject) => {
                imageKit.upload({
                    file: file,
                    fileName: "prod_" + Date.now() + ".jpg",
                    tags: ["product"],
                    useUniqueFileName: true,
                    token: token,
                    signature: signature,
                    expire: expire
                }, (err, result) => err ? reject(err) : resolve(result.url));
            });
        };

        // ============================================================
        // 🎨 UI RENDER
        // ============================================================
        container.innerHTML = `
            <div class="h-full flex flex-col bg-slate-50 relative fade-in">
                
                <div class="bg-white px-4 py-3 border-b border-slate-200 shadow-sm z-10 shrink-0 sticky top-0">
                    <div class="flex justify-between items-center mb-3">
                        <div>
                            <h2 class="text-xl font-bold text-slate-800">Inventory</h2>
                            <p class="text-[10px] text-slate-500 font-mono" id="total-count">0 Items Found</p>
                        </div>
                        <div class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                            Live
                        </div>
                    </div>
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="search-bar" placeholder="Search products..." class="w-full bg-slate-100 border border-slate-200 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar" id="main-scroll">
                    <div id="product-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-20">
                        <div class="col-span-full text-center py-20 text-slate-400">
                            <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                            <p>Loading Inventory...</p>
                        </div>
                    </div>
                </div>

                <button id="fab-add" class="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-500/40 flex items-center justify-center text-2xl transition transform hover:scale-105 active:scale-95 z-20">
                    <i class="fa-solid fa-plus"></i>
                </button>

                <div id="prod-modal" class="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm hidden flex flex-col justify-end sm:justify-center p-0 sm:p-6 animate-fade-in">
                    <div class="bg-white w-full sm:max-w-md mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90%] sm:max-h-auto animate-slide-up">
                        
                        <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 class="font-bold text-slate-800 text-lg" id="modal-title">Add New Item</h3>
                            <button id="close-modal" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>

                        <div class="p-5 overflow-y-auto custom-scrollbar space-y-5">
                            <div class="flex justify-center">
                                <div class="relative w-32 h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition group" onclick="document.getElementById('modal-file').click()">
                                    <img id="modal-preview" class="w-full h-full object-cover rounded-xl hidden absolute inset-0">
                                    <i id="modal-icon" class="fa-solid fa-camera text-2xl text-slate-400 group-hover:text-blue-500 mb-1"></i>
                                    <span id="modal-text" class="text-[10px] text-slate-400 font-bold uppercase">Upload</span>
                                    <input type="file" id="modal-file" accept="image/*" class="hidden" onchange="window.previewProdImage(this)">
                                </div>
                            </div>

                            <div>
                                <label class="text-xs font-bold text-slate-500 uppercase">Product Name</label>
                                <input type="text" id="inp-name" placeholder="e.g. Fresh Tomato" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:border-blue-500 outline-none">
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs font-bold text-slate-500 uppercase">Category</label>
                                    <select id="inp-cat" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:border-blue-500 outline-none">
                                        <option value="">Select...</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-slate-500 uppercase">Price (₹)</label>
                                    <div class="relative">
                                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input type="number" id="inp-price" placeholder="0" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-slate-800 text-sm font-bold focus:border-blue-500 outline-none">
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs font-bold text-slate-500 uppercase">Qty / Weight</label>
                                    <input type="number" id="inp-qty" placeholder="e.g. 1" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:border-blue-500 outline-none">
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-slate-500 uppercase">Unit</label>
                                    <select id="inp-unit" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:border-blue-500 outline-none">
                                        <option value="">Select...</option>
                                    </select>
                                </div>
                            </div>

                        </div>

                        <div class="p-4 border-t border-slate-100 bg-slate-50">
                            <button id="btn-save" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition flex justify-center items-center gap-2">
                                <i class="fa-solid fa-check"></i> Save Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ============================================================
        // 🧠 LOGIC
        // ============================================================
        
        // Preview
        window.previewProdImage = (input) => {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('modal-preview').src = e.target.result;
                    document.getElementById('modal-preview').classList.remove('hidden');
                    document.getElementById('modal-icon').classList.add('hidden');
                    document.getElementById('modal-text').classList.add('hidden');
                };
                reader.readAsDataURL(input.files[0]);
            }
        };

        // Modal Functions
        const modal = document.getElementById('prod-modal');
        const modalTitle = document.getElementById('modal-title');
        
        const openModal = (isEdit = false, key = null) => {
            modal.classList.remove('hidden');
            this.populateDropdowns();
            
            if (isEdit && key && cachedProducts[key]) {
                // EDIT MODE
                const data = cachedProducts[key];
                currentEditKey = key;
                currentEditImg = data.image || "";
                
                modalTitle.innerText = "Edit Item";
                document.getElementById('inp-name').value = data.name || "";
                document.getElementById('inp-price').value = data.price || "";
                document.getElementById('inp-cat').value = data.category || "";
                
                // Qty & Unit Load
                document.getElementById('inp-qty').value = data.qty || ""; 
                document.getElementById('inp-unit').value = data.unit || "";
                
                if (data.image) {
                    document.getElementById('modal-preview').src = data.image;
                    document.getElementById('modal-preview').classList.remove('hidden');
                    document.getElementById('modal-icon').classList.add('hidden');
                    document.getElementById('modal-text').classList.add('hidden');
                } else {
                    resetImageUI();
                }
            } else {
                // ADD MODE
                currentEditKey = null;
                currentEditImg = "";
                modalTitle.innerText = "Add New Item";
                resetForm();
            }
        };

        const resetForm = () => {
            document.getElementById('inp-name').value = '';
            document.getElementById('inp-price').value = '';
            document.getElementById('inp-cat').value = '';
            document.getElementById('inp-qty').value = '';
            document.getElementById('inp-unit').value = '';
            document.getElementById('modal-file').value = '';
            resetImageUI();
        };

        const resetImageUI = () => {
            document.getElementById('modal-preview').classList.add('hidden');
            document.getElementById('modal-icon').classList.remove('hidden');
            document.getElementById('modal-text').classList.remove('hidden');
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            resetForm();
        };

        // Button Events
        document.getElementById('fab-add').onclick = () => openModal(false);
        document.getElementById('close-modal').onclick = closeModal;

        // SAVE / UPDATE Logic
        const btnSave = document.getElementById('btn-save');
        btnSave.onclick = async () => {
            const name = document.getElementById('inp-name').value.trim();
            const price = document.getElementById('inp-price').value;
            const cat = document.getElementById('inp-cat').value;
            const qty = document.getElementById('inp-qty').value;
            const unit = document.getElementById('inp-unit').value;
            const file = document.getElementById('modal-file').files[0];

            if(!name || !price || !cat || !unit || !qty) return alert("Fill all details");

            btnSave.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
            btnSave.disabled = true;

            try {
                let imgUrl = currentEditImg; // Default to old image
                if(file) {
                    imgUrl = await this.uploadImage(file); // Upload new if selected
                }

                const payload = {
                    name, 
                    price, 
                    category: cat, 
                    qty: qty, // New Field
                    unit: unit,
                    image: imgUrl,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                };

                if (currentEditKey) {
                    // Update
                    await db.ref('masterProducts/' + currentEditKey).update(payload);
                } else {
                    // Create
                    payload.createdAt = firebase.database.ServerValue.TIMESTAMP;
                    await db.ref('masterProducts').push(payload);
                }

                closeModal();
            } catch (err) {
                alert("Error: " + err.message);
            } finally {
                btnSave.innerHTML = '<i class="fa-solid fa-check"></i> Save Product';
                btnSave.disabled = false;
            }
        };

        // Populate Dropdowns
        this.populateDropdowns = () => {
            const catSel = document.getElementById('inp-cat');
            const unitSel = document.getElementById('inp-unit');
            
            // Keep selected value if exists
            const currentCat = catSel.value;
            const currentUnit = unitSel.value;

            catSel.innerHTML = '<option value="">Select Category...</option>';
            unitSel.innerHTML = '<option value="">Select Unit...</option>';

            Object.entries(cachedCats).forEach(([k, v]) => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.innerText = v.name;
                catSel.appendChild(opt);
            });

            Object.entries(cachedUnits).forEach(([k, v]) => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.innerText = v.name;
                unitSel.appendChild(opt);
            });

            if(currentCat) catSel.value = currentCat;
            if(currentUnit) unitSel.value = currentUnit;
        };

        this.startListeners(db);
    },

    cleanup() {
        if(productsRef) productsRef.off();
        if(categoriesRef) categoriesRef.off();
        if(unitsRef) unitsRef.off();
        delete window.previewProdImage;
    },

    startListeners(db) {
        categoriesRef = db.ref('masterCategories');
        categoriesRef.on('value', snap => {
            if(snap.exists()) cachedCats = snap.val();
        });

        unitsRef = db.ref('masterUnits');
        unitsRef.on('value', snap => {
            if(snap.exists()) cachedUnits = snap.val();
        });

        productsRef = db.ref('masterProducts');
        productsRef.on('value', snap => {
            const grid = document.getElementById('product-grid');
            const countLabel = document.getElementById('total-count');
            if(!grid) return;

            grid.innerHTML = '';
            cachedProducts = {}; 

            if(snap.exists()) {
                const data = snap.val();
                cachedProducts = data; 
                
                const entries = Object.entries(data).reverse();
                countLabel.innerText = entries.length + " Items Found";

                entries.forEach(([key, item]) => {
                    const catName = (cachedCats[item.category]) ? cachedCats[item.category].name : 'Unknown';
                    const unitName = (cachedUnits[item.unit]) ? cachedUnits[item.unit].name : (item.unit || 'Unit');
                    const displayPrice = item.price || '--';
                    const displayQty = item.qty || '1'; // Default to 1 if missing

                    const card = document.createElement('div');
                    card.className = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition relative group prod-card";
                    card.dataset.name = (item.name || "").toLowerCase();

                    const imgHtml = item.image 
                        ? `<img src="${item.image}" class="w-full h-32 object-cover bg-slate-50">`
                        : `<div class="w-full h-32 bg-slate-50 flex items-center justify-center text-slate-300"><i class="fa-solid fa-image text-2xl"></i></div>`;

                    card.innerHTML = `
                        ${imgHtml}
                        <div class="p-3">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wide truncate max-w-[70%]">${catName}</span>
                            </div>
                            <h3 class="font-bold text-slate-800 text-sm truncate mb-1" title="${item.name}">${item.name}</h3>
                            <div class="flex items-center justify-between mt-2">
                                <span class="text-sm font-extrabold text-slate-900">₹${displayPrice}</span>
                                <span class="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">${displayQty} ${unitName}</span>
                            </div>
                        </div>
                        
                        <div class="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                            <button class="w-7 h-7 bg-white/90 backdrop-blur text-blue-600 rounded-full shadow-sm flex items-center justify-center border border-blue-100 hover:bg-blue-50 edit-btn" data-key="${key}">
                                <i class="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button class="w-7 h-7 bg-white/90 backdrop-blur text-red-500 rounded-full shadow-sm flex items-center justify-center border border-red-100 hover:bg-red-50 delete-btn" data-key="${key}">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            } else {
                grid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Inventory Empty</div>';
                countLabel.innerText = "0 Items";
            }
        });

        // Event Delegation
        const grid = document.getElementById('product-grid');
        grid.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (editBtn) {
                const key = editBtn.dataset.key;
                this.populateDropdowns(); 
                document.getElementById('fab-add').click(); // Trigger Open
                
                // Override with Edit Data
                const data = cachedProducts[key];
                if(data) {
                    currentEditKey = key;
                    currentEditImg = data.image || "";
                    document.getElementById('modal-title').innerText = "Edit Item";
                    
                    document.getElementById('inp-name').value = data.name || "";
                    document.getElementById('inp-price').value = data.price || "";
                    document.getElementById('inp-cat').value = data.category || "";
                    document.getElementById('inp-qty').value = data.qty || "";
                    document.getElementById('inp-unit').value = data.unit || "";
                    
                    if(data.image) {
                        document.getElementById('modal-preview').src = data.image;
                        document.getElementById('modal-preview').classList.remove('hidden');
                        document.getElementById('modal-icon').classList.add('hidden');
                        document.getElementById('modal-text').classList.add('hidden');
                    }
                }
            }

            if (deleteBtn) {
                const key = deleteBtn.dataset.key;
                if(confirm('Permanently delete this product?')) {
                    db.ref('masterProducts/' + key).remove();
                }
            }
        });

        // Search Filter
        document.getElementById('search-bar').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.prod-card').forEach(card => {
                if(card.dataset.name.includes(term)) card.classList.remove('hidden');
                else card.classList.add('hidden');
            });
        });
    }
};