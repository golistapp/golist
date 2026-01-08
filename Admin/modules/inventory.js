// modules/inventory.js

let productsRef = null;
let categoriesRef = null;
let imageKit = null;

export default {
    async render(container, db) {
        // ============================================================
        // 🔑 CONFIGURATION (Keys Wahi Hain Jo Aapne Di Thi)
        // ============================================================
        
        const PUBLIC_KEY = "public_Nf7wxZyGD34X18W6o9HtFezad2o=";
        const URL_ENDPOINT = "https://ik.imagekit.io/nsyr92pse";
        const PRIVATE_KEY = "private_qGMqr1FlHKO3mNudtWbgqwxtQvU="; 

        // ImageKit Initialize
        if (typeof ImageKit !== 'undefined') {
            try {
                imageKit = new ImageKit({
                    publicKey: PUBLIC_KEY,
                    urlEndpoint: URL_ENDPOINT,
                });
                console.log("ImageKit Ready");
            } catch (e) {
                console.error("ImageKit Init Error:", e);
            }
        }

        // ============================================================
        // 🛠️ HELPER: Custom UUID Generator (Fixes 'crypto' error on Mobile/IP)
        // ============================================================
        function createUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // ============================================================
        // 🔐 SIGNATURE GENERATOR
        // ============================================================
        const generateSignature = async (token, expire) => {
            try {
                // Browser Crypto API check
                if (!window.crypto || !window.crypto.subtle) {
                    alert("⚠️ Security Warning: Your browser is blocking crypto functions on this IP. Please use 'localhost' or HTTPS if upload fails.");
                    return null;
                }

                const encoder = new TextEncoder();
                const data = encoder.encode(token + expire);
                const key = encoder.encode(PRIVATE_KEY);
                
                const cryptoKey = await window.crypto.subtle.importKey(
                    "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
                );
                
                const signatureBuffer = await window.crypto.subtle.sign("HMAC", cryptoKey, data);
                return Array.from(new Uint8Array(signatureBuffer))
                    .map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (err) {
                console.error("Signature Gen Error:", err);
                alert("Signing Failed: " + err.message);
                return null;
            }
        };

        // ============================================================
        // 🖥️ HTML UI
        // ============================================================
        container.innerHTML = `
            <div class="space-y-6 fade-in h-full flex flex-col">
                <div class="flex justify-between items-end border-b border-slate-800 pb-4 shrink-0">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Master Inventory</h2>
                        <p class="text-xs text-slate-400">Manage Categories & Products with Images</p>
                    </div>
                    <div class="flex gap-2">
                        <span id="cat-count" class="bg-indigo-900/30 text-indigo-400 text-xs font-mono px-3 py-1 rounded border border-indigo-800">0 Cats</span>
                        <span id="prod-count" class="bg-slate-800 text-slate-300 text-xs font-mono px-3 py-1 rounded border border-slate-700">0 Items</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                    
                    <div class="lg:col-span-4 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        
                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 relative group">
                            <label class="block text-xs font-bold text-indigo-400 uppercase mb-2">1. New Category</label>
                            <div class="flex flex-col gap-3">
                                <div class="flex gap-2 items-center">
                                    <div class="relative w-12 h-12 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-indigo-500 transition" onclick="document.getElementById('cat-file').click()">
                                        <img id="cat-preview" class="w-full h-full object-cover hidden">
                                        <i id="cat-icon" class="fa-solid fa-camera text-slate-600"></i>
                                        <input type="file" id="cat-file" accept="image/*" class="hidden" onchange="window.previewInvImage(this, 'cat-preview', 'cat-icon')">
                                    </div>
                                    <input type="text" id="new-cat-name" placeholder="Name (e.g. Vegetables)" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-indigo-500">
                                </div>
                                <button id="btn-add-cat" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition shadow-lg flex justify-center items-center gap-2">
                                    <i class="fa-solid fa-plus"></i> ADD CATEGORY
                                </button>
                            </div>
                        </div>

                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 relative">
                            <label class="block text-xs font-bold text-green-400 uppercase mb-2">2. New Product</label>
                            <div class="flex flex-col gap-3">
                                <select id="prod-cat-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-xs focus:outline-none focus:border-green-500">
                                    <option value="">Select Category...</option>
                                </select>

                                <div class="flex gap-2 items-center">
                                    <div class="relative w-12 h-12 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-green-500 transition" onclick="document.getElementById('prod-file').click()">
                                        <img id="prod-preview" class="w-full h-full object-cover hidden">
                                        <i id="prod-icon" class="fa-solid fa-camera text-slate-600"></i>
                                        <input type="file" id="prod-file" accept="image/*" class="hidden" onchange="window.previewInvImage(this, 'prod-preview', 'prod-icon')">
                                    </div>
                                    <input type="text" id="new-prod-name" placeholder="Name (e.g. Tomato)" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-green-500">
                                </div>
                                
                                <button id="btn-add-prod" class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-xs transition shadow-lg flex justify-center items-center gap-2">
                                    <i class="fa-solid fa-plus"></i> ADD PRODUCT
                                </button>
                            </div>
                        </div>

                        <div class="bg-slate-900 rounded-xl border border-slate-800 p-3">
                            <h4 class="text-xs font-bold text-slate-500 uppercase mb-3">Active Categories</h4>
                            <div id="category-list" class="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                <p class="text-[10px] text-slate-500 text-center">Loading...</p>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-8 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden relative">
                        <div class="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                            <h3 class="font-bold text-sm text-white flex items-center gap-2">
                                <i class="fa-solid fa-database text-slate-500"></i> Database Items
                            </h3>
                            <input type="text" id="search-db" placeholder="Search..." class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white w-48 focus:outline-none focus:border-blue-500 transition">
                        </div>
                        
                        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-950/30">
                            <div id="product-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                <p class="text-center text-slate-500 py-10 col-span-full"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Products...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Preview Helper
        window.previewInvImage = function(input, imgId, iconId) {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.getElementById(imgId);
                    const icon = document.getElementById(iconId);
                    if(img && icon) {
                        img.src = e.target.result;
                        img.classList.remove('hidden');
                        icon.classList.add('hidden');
                    }
                }
                reader.readAsDataURL(file);
            }
        };

        // ============================================================
        // 🚀 UPLOAD LOGIC (USING CUSTOM UUID)
        // ============================================================
        this.uploadImage = async (file) => {
            if (!imageKit) return null;
            
            // 1. Generate Auth Parameters (Using custom createUUID)
            const token = createUUID(); 
            const expire = Math.floor(Date.now() / 1000) + 2400; // 40 mins
            const signature = await generateSignature(token, expire);

            if(!signature) {
                this.showToast("Browser Security Error: Use Localhost", "error");
                return null;
            }

            // 2. Upload
            return new Promise((resolve, reject) => {
                imageKit.upload({
                    file: file,
                    fileName: "inv_" + Date.now() + ".jpg",
                    tags: ["inventory"],
                    useUniqueFileName: true,
                    token: token,
                    signature: signature,
                    expire: expire
                }, (err, result) => {
                    if(err) {
                        console.error("Upload Failed:", err);
                        reject(err);
                    } else {
                        resolve(result.url);
                    }
                });
            });
        };

        this.attachEvents(db);
        this.startDataListeners(db);
    },

    cleanup() {
        if(productsRef) productsRef.off();
        if(categoriesRef) categoriesRef.off();
        delete window.previewInvImage;
    },

    attachEvents(db) {
        // ADD CATEGORY
        const btnAddCat = document.getElementById('btn-add-cat');
        btnAddCat.addEventListener('click', async () => {
            const name = document.getElementById('new-cat-name').value.trim();
            const file = document.getElementById('cat-file').files[0];

            if(!name || !file) return this.showToast("Name & Image required", "error");

            try {
                btnAddCat.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading...';
                btnAddCat.disabled = true;

                const imageUrl = await this.uploadImage(file);
                if(!imageUrl) throw new Error("Upload Failed");

                await db.ref('masterCategories').push({
                    name: name,
                    image: imageUrl,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });

                document.getElementById('new-cat-name').value = '';
                document.getElementById('cat-file').value = '';
                document.getElementById('cat-preview').classList.add('hidden');
                document.getElementById('cat-icon').classList.remove('hidden');
                
                this.showToast("Category Added!");
            } catch (error) {
                this.showToast("Error: " + error.message, "error");
            } finally {
                btnAddCat.innerHTML = '<i class="fa-solid fa-plus"></i> ADD CATEGORY';
                btnAddCat.disabled = false;
            }
        });

        // ADD PRODUCT
        const btnAddProd = document.getElementById('btn-add-prod');
        btnAddProd.addEventListener('click', async () => {
            const name = document.getElementById('new-prod-name').value.trim();
            const catId = document.getElementById('prod-cat-select').value;
            const file = document.getElementById('prod-file').files[0];

            if(!name) return this.showToast("Product name required", "error");
            
            try {
                btnAddProd.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
                btnAddProd.disabled = true;

                let imageUrl = '';
                if (file) {
                    imageUrl = await this.uploadImage(file);
                }

                await db.ref('masterProducts').push({
                    name: name,
                    category: catId, 
                    image: imageUrl,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });

                document.getElementById('new-prod-name').value = '';
                document.getElementById('prod-file').value = '';
                document.getElementById('prod-preview').classList.add('hidden');
                document.getElementById('prod-icon').classList.remove('hidden');

                this.showToast("Product Added!");
            } catch (error) {
                this.showToast("Error: " + error.message, "error");
            } finally {
                btnAddProd.innerHTML = '<i class="fa-solid fa-plus"></i> ADD PRODUCT';
                btnAddProd.disabled = false;
            }
        });

        // DELETE EVENTS
        const handleDelete = (type, key) => {
            if(confirm(`Delete this ${type}?`)) {
                const refPath = type === 'category' ? 'masterCategories' : 'masterProducts';
                db.ref(refPath + '/' + key).remove();
            }
        };

        document.getElementById('category-list').addEventListener('click', e => {
            const btn = e.target.closest('.delete-cat-btn');
            if(btn) handleDelete('category', btn.dataset.key);
        });

        document.getElementById('product-grid').addEventListener('click', e => {
            const btn = e.target.closest('.delete-prod-btn');
            if(btn) handleDelete('product', btn.dataset.key);
        });

        // SEARCH
        document.getElementById('search-db').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.prod-card');
            items.forEach(item => {
                const name = item.dataset.name.toLowerCase();
                if(name.includes(term)) item.classList.remove('hidden');
                else item.classList.add('hidden');
            });
        });
    },

    startDataListeners(db) {
        categoriesRef = db.ref('masterCategories');
        categoriesRef.on('value', snap => {
            const listEl = document.getElementById('category-list');
            const selectEl = document.getElementById('prod-cat-select');
            const countEl = document.getElementById('cat-count');
            
            if(!listEl) return;
            listEl.innerHTML = '';
            selectEl.innerHTML = '<option value="">Select Category...</option>'; 
            
            let cats = {};
            if(snap.exists()) {
                cats = snap.val();
                countEl.innerText = Object.keys(cats).length + " Cats";
                
                Object.entries(cats).forEach(([key, cat]) => {
                    const div = document.createElement('div');
                    div.className = "flex items-center gap-2 p-2 bg-slate-950/50 rounded border border-slate-800/50 hover:bg-slate-800 transition group";
                    div.innerHTML = `
                        <img src="${cat.image || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded object-cover bg-slate-800">
                        <span class="text-xs text-slate-300 flex-1 truncate">${cat.name}</span>
                        <button class="delete-cat-btn text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-1" data-key="${key}">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    `;
                    listEl.appendChild(div);

                    const option = document.createElement('option');
                    option.value = key;
                    option.innerText = cat.name;
                    selectEl.appendChild(option);
                });
            } else {
                countEl.innerText = "0 Cats";
            }
            this.categoriesCache = cats;
            if(this.lastProductsSnap) this.renderProducts(this.lastProductsSnap);
        });

        productsRef = db.ref('masterProducts');
        productsRef.on('value', snap => {
            this.lastProductsSnap = snap; 
            this.renderProducts(snap);
        });
    },

    renderProducts(snap) {
        const gridEl = document.getElementById('product-grid');
        const countEl = document.getElementById('prod-count');
        if(!gridEl) return;
        gridEl.innerHTML = '';
        
        if(!snap.exists()) {
            gridEl.innerHTML = '<div class="col-span-full text-center text-slate-500 py-10 flex flex-col items-center"><i class="fa-solid fa-box-open text-3xl mb-2 opacity-20"></i><p>Inventory Empty</p></div>';
            countEl.innerText = "0 Items";
            return;
        }

        const data = snap.val();
        const entries = Object.entries(data).reverse();
        countEl.innerText = entries.length + " Items";

        const fragment = document.createDocumentFragment();
        entries.forEach(([key, item]) => {
            const catName = (this.categoriesCache && item.category && this.categoriesCache[item.category]) 
                ? this.categoriesCache[item.category].name 
                : 'Uncategorized';

            const card = document.createElement('div');
            card.className = "prod-card bg-slate-800 rounded-lg border border-slate-700 overflow-hidden group hover:border-slate-500 transition relative";
            card.dataset.name = item.name;

            const imgHtml = item.image 
                ? `<img src="${item.image}" class="w-full h-24 object-cover bg-slate-900">`
                : `<div class="w-full h-24 bg-slate-900 flex items-center justify-center text-slate-600"><i class="fa-solid fa-image text-2xl opacity-20"></i></div>`;

            card.innerHTML = `
                ${imgHtml}
                <div class="p-2">
                    <p class="text-[10px] text-indigo-400 font-bold uppercase truncate mb-0.5">${catName}</p>
                    <h4 class="text-xs font-bold text-white truncate" title="${item.name}">${item.name}</h4>
                </div>
                <button class="delete-prod-btn absolute top-1 right-1 bg-red-900/80 text-white w-6 h-6 rounded flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow-md backdrop-blur-sm" data-key="${key}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            fragment.appendChild(card);
        });
        gridEl.appendChild(fragment);
    },

    showToast(msg, type='success') {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if(toast && toastMsg) {
            toastMsg.innerHTML = type === 'error' ? `<i class="fa-solid fa-circle-exclamation mr-1"></i> ${msg}` : msg;
            toast.classList.add('toast-visible');
            if(type === 'error') toastMsg.classList.add('text-red-400');
            else toastMsg.classList.remove('text-red-400');
            setTimeout(() => { toast.classList.remove('toast-visible'); }, 3000);
        }
    }
};