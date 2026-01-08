// modules/inventory.js
import { db, imageKitConfig } from '../core/firebase-config.js';


let productsRef = null;
let categoriesRef = null;
let unitsRef = null;

// Blobs to hold images before upload
let currentBlob = null; 
let categoryBlob = null; 
let editBlob = null; 

// --- HELPER: Direct Upload to ImageKit (No SDK) ---
// Yah function browser mein hi signature banata hai aur upload karta hai
async function uploadToImageKit(file, fileName, folder = "/products") {
    if (!imageKitConfig || !imageKitConfig.privateKey) {
        throw new Error("ImageKit Config Missing in firebase-config.js");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", fileName);
    formData.append("folder", folder);
    formData.append("publicKey", imageKitConfig.publicKey);
    formData.append("useUniqueFileName", "false"); // Hum khud naam de rahe hain

    // 1. Signature Generation (Client Side)
    const timestamp = Math.floor(Date.now() / 1000);
    const expire = timestamp + 1800; // 30 mins validity
    const token = "uuid-" + Math.random().toString(36).substring(2) + Date.now();

    // Crypto-JS ka use karke Signature bana rahe hain
    // Order of parameters in signature string is important (alphabetical)
    const signatureString = `expire=${expire}&fileName=${fileName}&folder=${folder}&publicKey=${imageKitConfig.publicKey}&token=${token}&useUniqueFileName=false`;

    // HMAC-SHA1 Signature Create karein
    const signature = CryptoJS.HmacSHA1(signatureString, imageKitConfig.privateKey).toString();

    formData.append("signature", signature);
    formData.append("expire", expire);
    formData.append("token", token);

    // 2. Sending Request via Fetch
    const response = await fetch(imageKitConfig.urlEndpoint + "/api/v1/files/upload", {
        method: "POST",
        body: formData
    });

    // Note: Agar urlEndpoint mein '/api/...' already hai to upar check kar lena. 
    // Usually endpoint bas "https://ik.imagekit.io/id" hota hai, upload URL alag hota hai:
    // Safe side ke liye hum full upload URL use karenge:
    const uploadUrl = "https://upload.imagekit.io/api/v1/files/upload";

    const finalRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData
    });

    if (!finalRes.ok) {
        const errorData = await finalRes.json();
        throw new Error(errorData.message || "Upload Failed");
    }

    return await finalRes.json();
}
// ---------------------------------------------------------

export default {
    async render(container, db) {
        // FULL SCREEN UI
        container.innerHTML = `
            <div class="flex flex-col h-full w-full bg-gray-50 text-gray-800 font-sans">

                <div class="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm shrink-0 z-10">
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 tracking-tight">Inventory Manager</h2>
                        <p class="text-[10px] text-gray-500 font-medium">Create & Manage Products</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="btn-open-cats" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-indigo-100">
                            <i class="fa-solid fa-layer-group"></i> <span class="hidden sm:inline">Categories</span>
                        </button>
                        <button id="btn-open-units" class="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-emerald-100">
                            <i class="fa-solid fa-scale-balanced"></i> <span class="hidden sm:inline">Units</span>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-hidden relative flex flex-col md:flex-row">

                    <div class="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col shrink-0 z-0 overflow-y-auto custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        <div class="p-5 space-y-5">
                            <div class="flex items-center justify-between">
                                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Add New Item</h3>
                                <span id="img-status" class="text-[10px] text-orange-500 font-bold hidden"><i class="fa-solid fa-circle-notch fa-spin"></i> Processing...</span>
                            </div>

                            <div class="flex justify-center">
                                <div class="relative w-40 h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition group overflow-hidden" id="img-trigger">
                                    <img id="img-preview" class="w-full h-full object-cover hidden">
                                    <div id="img-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-500 transition">
                                        <div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 border border-gray-100">
                                            <i class="fa-solid fa-camera text-xl"></i>
                                        </div>
                                        <span class="text-[10px] font-bold uppercase">Tap to Upload</span>
                                        <span class="text-[9px] text-gray-300 mt-1">1:1 Auto Crop</span>
                                    </div>
                                    <input type="file" id="prod-img" accept="image/*" class="hidden">
                                </div>
                            </div>

                            <div class="space-y-4">
                                <div class="space-y-1">
                                    <label class="text-[10px] font-bold text-gray-500 uppercase">Product Name</label>
                                    <input type="text" id="prod-name" placeholder="e.g. Fresh Potato" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-800 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm">
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-gray-500 uppercase">Price (₹)</label>
                                        <input type="number" id="prod-price" placeholder="0" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-800 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-gray-500 uppercase">Category</label>
                                        <select id="prod-cat" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm cursor-pointer">
                                            <option value="">Select...</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-gray-500 uppercase">Qty / Weight</label>
                                        <input type="number" id="prod-qty" placeholder="1" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-800 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-gray-500 uppercase">Unit</label>
                                        <select id="prod-unit" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 focus:border-blue-500 focus:bg-white outline-none transition shadow-sm cursor-pointer">
                                            <option value="">Select...</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button id="btn-save" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs tracking-wide transition shadow-lg hover:shadow-xl flex justify-center items-center gap-2 transform active:scale-95">
                                <i class="fa-solid fa-cloud-arrow-up"></i> SAVE TO INVENTORY
                            </button>
                        </div>
                    </div>

                    <div class="flex-1 bg-gray-50 flex flex-col min-w-0">
                        <div class="p-4 border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-10">
                            <div class="relative group">
                                <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition"></i>
                                <input type="text" id="search-db" placeholder="Search inventory..." class="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition shadow-sm">
                                <span id="total-count" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">0</span>
                            </div>
                        </div>

                        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div id="product-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                                <div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                                    <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-500"></i>
                                    <p class="text-xs">Loading Inventory...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="modals-area"></div>

                <canvas id="compress-canvas" class="hidden"></canvas>
            </div>
        `;

        this.renderModals();
        this.attachEvents(db);
        this.attachManagers(db);
        this.startDataListener(db);
    },

    cleanup() {
        if(productsRef) productsRef.off();
        if(categoriesRef) categoriesRef.off();
        if(unitsRef) unitsRef.off();
    },

    // --- 1. MODALS HTML (Pure White Theme) ---
    renderModals() {
        document.getElementById('modals-area').innerHTML = `
            <div id="modal-cat" class="fixed inset-0 bg-slate-900/60 z-50 hidden flex items-center justify-center backdrop-blur-sm animate-fade-in p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="font-bold text-gray-800 text-lg">Categories</h3>
                        <button class="close-modal w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex gap-3 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div class="w-14 h-14 bg-white rounded-lg border border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm hover:border-blue-500 transition group" id="cat-img-trigger">
                            <img id="cat-img-preview" class="w-full h-full object-cover hidden">
                            <i class="fa-solid fa-image text-gray-300 text-xl group-hover:text-blue-500" id="cat-icon"></i>
                            <input type="file" id="cat-file" class="hidden" accept="image/*">
                        </div>
                        <div class="flex-1 flex flex-col justify-center gap-2">
                            <input type="text" id="new-cat-name" placeholder="Category Name" class="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-blue-500 transition">
                            <button id="btn-add-cat" class="bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg text-xs font-bold shadow-sm transition">ADD</button>
                        </div>
                    </div>
                    <div id="cat-list" class="h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1"></div>
                </div>
            </div>

            <div id="modal-unit" class="fixed inset-0 bg-slate-900/60 z-50 hidden flex items-center justify-center backdrop-blur-sm animate-fade-in p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="font-bold text-gray-800 text-lg">Units</h3>
                        <button class="close-modal w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex gap-2 mb-4">
                        <input type="text" id="new-unit-name" placeholder="e.g. Kg, Box" class="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition">
                        <button id="btn-add-unit" class="bg-emerald-600 hover:bg-emerald-500 text-white w-10 rounded-lg shadow-sm transition"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <div id="unit-list" class="h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1"></div>
                </div>
            </div>

            <div id="modal-edit" class="fixed inset-0 bg-slate-900/60 z-50 hidden flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                    <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                        <h3 class="font-bold text-lg text-gray-800">Edit Product</h3>
                        <button class="close-modal text-gray-400 hover:text-red-500 transition"><i class="fa-solid fa-xmark text-xl"></i></button>
                    </div>

                    <div class="flex gap-4 mb-4">
                         <div class="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0 relative overflow-hidden group cursor-pointer" id="edit-img-trigger">
                            <img id="edit-img-preview" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-[10px] font-bold">CHANGE</div>
                            <input type="file" id="edit-file" class="hidden" accept="image/*">
                        </div>
                        <div class="flex-1 space-y-2">
                            <input type="text" id="edit-name" class="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white outline-none focus:border-blue-500 transition">
                            <select id="edit-cat" class="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs text-gray-600 outline-none focus:border-blue-500 transition"></select>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 mb-5">
                        <div>
                            <label class="text-[9px] font-bold text-gray-400">PRICE</label>
                            <input type="number" id="edit-price" class="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs font-bold focus:border-blue-500 outline-none">
                        </div>
                        <div>
                            <label class="text-[9px] font-bold text-gray-400">QTY</label>
                            <input type="number" id="edit-qty" class="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs font-bold focus:border-blue-500 outline-none">
                        </div>
                        <div>
                            <label class="text-[9px] font-bold text-gray-400">UNIT</label>
                            <select id="edit-unit" class="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs font-bold focus:border-blue-500 outline-none"></select>
                        </div>
                    </div>

                    <button id="btn-update-prod" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg transition">
                        UPDATE CHANGES
                    </button>
                </div>
            </div>
        `;

        document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => {
            document.getElementById('modal-cat').classList.add('hidden');
            document.getElementById('modal-unit').classList.add('hidden');
            document.getElementById('modal-edit').classList.add('hidden');
        });
    },

    // --- 2. MANAGER LOGIC (Categories/Units) ---
    attachManagers(db) {
        const toggle = (id) => document.getElementById(id).classList.remove('hidden');
        document.getElementById('btn-open-cats').onclick = () => toggle('modal-cat');
        document.getElementById('btn-open-units').onclick = () => toggle('modal-unit');

        // CATEGORIES
        const catList = document.getElementById('cat-list');
        categoriesRef = db.ref('masterCategories');
        categoriesRef.on('value', snap => {
            catList.innerHTML = '';
            const data = snap.val() || {};
            const opts = '<option value="">Select...</option>' + Object.values(data).map(v => `<option value="${v.name}">${v.name}</option>`).join('');
            document.getElementById('prod-cat').innerHTML = opts;
            document.getElementById('edit-cat').innerHTML = opts;

            Object.entries(data).forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = "flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 group hover:border-blue-200 transition";
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        <img src="${val.img || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-md object-cover bg-white border border-gray-200">
                        <span class="text-xs font-bold text-gray-700">${val.name}</span>
                    </div>
                    <button class="text-gray-300 hover:text-red-500 px-2 transition" onclick="if(confirm('Delete?')) firebase.database().ref('masterCategories/${key}').remove()"><i class="fa-solid fa-trash"></i></button>
                `;
                catList.appendChild(div);
            });
        });

        // ADD CATEGORY
        const catCanvas = document.getElementById('compress-canvas');
        document.getElementById('cat-img-trigger').onclick = () => document.getElementById('cat-file').click();
        document.getElementById('cat-file').onchange = (e) => this.handleImageSelect(e, catCanvas, (blob, url) => {
            categoryBlob = blob;
            document.getElementById('cat-img-preview').src = url;
            document.getElementById('cat-img-preview').classList.remove('hidden');
            document.getElementById('cat-icon').classList.add('hidden');
        });

        // 🔥 MODIFIED: Using async/await with new upload function
        document.getElementById('btn-add-cat').onclick = async () => {
            const name = document.getElementById('new-cat-name').value.trim();
            if(!name) return alert("Enter Name");
            if(!categoryBlob) return alert("Select Image");

            const btn = document.getElementById('btn-add-cat');
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>'; btn.disabled = true;

            try {
                // New Direct Upload Call
                const res = await uploadToImageKit(categoryBlob, `cat_${Date.now()}.jpg`, "/categories");

                // Save to DB
                await db.ref('masterCategories').push({ name, img: res.url });

                // Reset Form
                document.getElementById('new-cat-name').value = '';
                document.getElementById('cat-img-preview').classList.add('hidden');
                document.getElementById('cat-icon').classList.remove('hidden');
                categoryBlob = null;
                btn.innerHTML = 'ADD'; btn.disabled = false;

            } catch (err) {
                console.error(err);
                alert("Upload Failed: " + (err.message || "Unknown Error")); 
                btn.innerHTML = 'ADD'; btn.disabled = false;
            }
        };

        // UNITS (No changes needed here)
        const unitList = document.getElementById('unit-list');
        unitsRef = db.ref('masterUnits');
        unitsRef.on('value', snap => {
            unitList.innerHTML = '';
            const data = snap.val() || {};
            const opts = '<option value="">Select...</option>' + Object.values(data).map(v => `<option value="${v.name}">${v.name}</option>`).join('');
            document.getElementById('prod-unit').innerHTML = opts;
            document.getElementById('edit-unit').innerHTML = opts;

            Object.entries(data).forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = "flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-white transition";
                div.innerHTML = `<span class="text-xs font-bold text-gray-700">${val.name}</span> <button class="text-gray-300 hover:text-red-500" onclick="if(confirm('Delete?')) firebase.database().ref('masterUnits/${key}').remove()"><i class="fa-solid fa-trash"></i></button>`;
                unitList.appendChild(div);
            });
        });
        document.getElementById('btn-add-unit').onclick = () => {
            const name = document.getElementById('new-unit-name').value.trim();
            if(name) { db.ref('masterUnits').push({ name }); document.getElementById('new-unit-name').value = ''; }
        };
    },

    // --- 3. PRODUCT LOGIC ---
    attachEvents(db) {
        const canvas = document.getElementById('compress-canvas');

        // Add Image
        document.getElementById('img-trigger').onclick = () => document.getElementById('prod-img').click();
        document.getElementById('prod-img').onchange = (e) => {
            document.getElementById('img-status').classList.remove('hidden');
            this.handleImageSelect(e, canvas, (blob, url) => {
                currentBlob = blob;
                const p = document.getElementById('img-preview');
                p.src = url; p.classList.remove('hidden');
                document.getElementById('img-placeholder').classList.add('hidden');
                document.getElementById('img-status').classList.add('hidden');
            });
        };

        // 🔥 MODIFIED: SAVE PRODUCT with new Upload function
        document.getElementById('btn-save').onclick = async () => {
            const name = document.getElementById('prod-name').value.trim();
            const price = parseFloat(document.getElementById('prod-price').value);
            const cat = document.getElementById('prod-cat').value;
            const qty = document.getElementById('prod-qty').value;
            const unit = document.getElementById('prod-unit').value;

            // Strict Validation
            if(!name || isNaN(price) || !cat || !qty || !unit) return alert("Please fill all fields correctly!");
            if(!currentBlob) return alert("Product Image is missing!");

            const btn = document.getElementById('btn-save');
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading...';
            btn.disabled = true;

            try {
                // Direct Upload
                const result = await uploadToImageKit(currentBlob, `prod_${Date.now()}.jpg`, "/products");

                // Save to DB
                await db.ref('masterProducts').push({
                    name: name,
                    price: price, 
                    category: cat,
                    unitValue: qty,
                    unitType: unit,
                    img: result.url,
                    thumbnail: result.thumbnailUrl || result.url,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });

                // Success & Reset
                this.resetForm();
                btn.innerHTML = '<i class="fa-solid fa-check"></i> SAVED!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> SAVE TO INVENTORY';
                    btn.disabled = false;
                }, 2000);

            } catch (err) {
                console.error("Upload Error:", err);
                alert("Upload Failed! " + (err.message || "Check Keys or Auth"));
                btn.innerHTML = 'RETRY SAVE';
                btn.disabled = false;
            }
        };

        // Edit Image
        document.getElementById('edit-img-trigger').onclick = () => document.getElementById('edit-file').click();
        document.getElementById('edit-file').onchange = (e) => this.handleImageSelect(e, canvas, (blob, url) => {
            editBlob = blob;
            document.getElementById('edit-img-preview').src = url;
        });

        // 🔥 MODIFIED: UPDATE PRODUCT
        document.getElementById('btn-update-prod').onclick = async () => {
            const btn = document.getElementById('btn-update-prod');
            const key = btn.dataset.key;

            btn.innerHTML = 'Processing...'; btn.disabled = true;

            const updates = {
                name: document.getElementById('edit-name').value,
                price: parseFloat(document.getElementById('edit-price').value),
                category: document.getElementById('edit-cat').value,
                unitValue: document.getElementById('edit-qty').value,
                unitType: document.getElementById('edit-unit').value
            };

            try {
                // Agar nayi image select ki hai to upload karo
                if(editBlob) {
                    btn.innerHTML = 'Uploading Image...';
                    const res = await uploadToImageKit(editBlob, `prod_edit_${Date.now()}.jpg`, "/products");
                    updates.img = res.url;
                }

                // Update Database
                await db.ref('masterProducts/'+key).update(updates);

                // Close Modal
                document.getElementById('modal-edit').classList.add('hidden');
                btn.innerHTML = 'UPDATE CHANGES'; btn.disabled = false;

            } catch (err) {
                console.error(err);
                alert("Update Failed: " + err.message);
                btn.innerHTML = 'UPDATE CHANGES'; btn.disabled = false;
            }
        };
    },

    startDataListener(db) {
        productsRef = db.ref('masterProducts');
        productsRef.on('value', snap => {
            const list = document.getElementById('product-list');
            if(!list) return;
            list.innerHTML = '';

            const entries = Object.entries(snap.val() || {}).reverse();
            document.getElementById('total-count').innerText = entries.length;

            if(entries.length === 0) {
                 list.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Inventory Empty</div>';
                 return;
            }

            entries.forEach(([key, item]) => {
                const div = document.createElement('div');
                div.className = "bg-white border border-gray-100 p-2 rounded-xl flex gap-3 shadow-sm hover:shadow-md transition group relative";
                div.dataset.search = `${item.name} ${item.category}`;

                div.innerHTML = `
                    <div class="w-14 h-14 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                        <img src="${item.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100?text=No+Img'">
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 class="text-xs font-bold text-gray-800 truncate mb-0.5">${item.name}</h4>
                        <div class="flex items-center gap-2 text-[10px] text-gray-500">
                            <span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">₹${item.price}</span>
                            <span>${item.unitValue} ${item.unitType}</span>
                        </div>
                        <span class="text-[9px] text-gray-400 mt-0.5">${item.category}</span>
                    </div>
                    <div class="flex flex-col gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bottom-2 bg-white/95 pl-2">
                        <button class="w-7 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-sm" onclick="openEdit('${key}')"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        <button class="w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition shadow-sm" onclick="if(confirm('Delete?')) firebase.database().ref('masterProducts/${key}').remove()"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                `;

                // Event Delegation fix for onclick
                div.querySelector('button[onclick^="openEdit"]').onclick = (e) => {
                    e.stopPropagation();
                    this.openEditModal(key, item);
                };

                list.appendChild(div);
            });
        });

        // Search
        document.getElementById('search-db').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#product-list > div').forEach(div => {
                div.style.display = div.dataset.search.toLowerCase().includes(term) ? "flex" : "none";
            });
        });
    },

    openEditModal(key, item) {
        document.getElementById('edit-name').value = item.name;
        document.getElementById('edit-price').value = item.price;
        document.getElementById('edit-qty').value = item.unitValue;
        document.getElementById('edit-cat').value = item.category;
        document.getElementById('edit-unit').value = item.unitType;
        document.getElementById('edit-img-preview').src = item.img;
        document.getElementById('btn-update-prod').dataset.key = key;
        editBlob = null;
        document.getElementById('modal-edit').classList.remove('hidden');
    },

    handleImageSelect(e, canvas, callback) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const size = Math.min(img.width, img.height);
                canvas.width = size; canvas.height = size;
                canvas.getContext('2d').drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, size, size);
                const url = canvas.toDataURL('image/jpeg', 0.25);
                fetch(url).then(r=>r.blob()).then(b=>callback(b, url));
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    },

    resetForm() {
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-qty').value = '';
        document.getElementById('prod-img').value = '';
        document.getElementById('img-preview').classList.add('hidden');
        document.getElementById('img-placeholder').classList.remove('hidden');
        currentBlob = null;
    }
};