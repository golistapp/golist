// modules/attributes.js

let categoriesRef = null;
let unitsRef = null;
let imageKit = null;

// State Management
let localCategories = [];
let isEditing = false;
let editKey = null;
let currentEditImgUrl = "";

export default {
    async render(container, db) {
        // ============================================================
        // 🔑 CONFIGURATION (ImageKit)
        // ============================================================
        const PUBLIC_KEY = "public_Nf7wxZyGD34X18W6o9HtFezad2o=";
        const URL_ENDPOINT = "https://ik.imagekit.io/nsyr92pse";
        const PRIVATE_KEY = "private_qGMqr1FlHKO3mNudtWbgqwxtQvU="; 

        // Initialize ImageKit
        if (typeof ImageKit !== 'undefined') {
            try {
                imageKit = new ImageKit({
                    publicKey: PUBLIC_KEY,
                    urlEndpoint: URL_ENDPOINT,
                });
            } catch (e) { console.error("IK Init Error", e); }
        }

        // ============================================================
        // 🛠️ HELPER: Upload Logic
        // ============================================================
        function createUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
                const cryptoKey = await window.crypto.subtle.importKey(
                    "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
                );
                const signatureBuffer = await window.crypto.subtle.sign("HMAC", cryptoKey, data);
                return Array.from(new Uint8Array(signatureBuffer))
                    .map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (err) { return null; }
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
                    fileName: "cat_" + Date.now() + ".jpg",
                    tags: ["category"],
                    useUniqueFileName: true,
                    token: token,
                    signature: signature,
                    expire: expire
                }, (err, result) => {
                    if(err) reject(err);
                    else resolve(result.url);
                });
            });
        };

        // ============================================================
        // 🎨 UI RENDER
        // ============================================================
        container.innerHTML = `
            <div class="h-full flex flex-col bg-slate-50 fade-in">
                <div class="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 class="text-xl font-bold text-slate-800">Attributes Manager</h2>
                        <p class="text-xs text-slate-500">Setup Categories & Measurement Units</p>
                    </div>
                    <button onclick="window.cancelEdit()" id="btn-cancel-edit" class="hidden text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition">
                        Cancel Editing
                    </button>
                </div>

                <div class="flex border-b border-slate-200 bg-white px-6">
                    <button id="tab-cats" class="px-4 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600 transition">
                        <i class="fa-solid fa-layer-group mr-2"></i> Categories
                    </button>
                    <button id="tab-units" class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition">
                        <i class="fa-solid fa-scale-balanced mr-2"></i> Units
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative">

                    <div id="view-cats" class="space-y-6 max-w-4xl mx-auto">

                        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300" id="cat-form-card">
                            <h3 class="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider" id="form-title">Add New Category</h3>
                            <div class="flex flex-col sm:flex-row gap-4 items-end">
                                <div class="relative w-16 h-16 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 transition group" onclick="document.getElementById('cat-upload').click()">
                                    <img id="cat-preview-img" class="w-full h-full object-cover hidden">
                                    <i id="cat-icon-placeholder" class="fa-solid fa-camera text-slate-400 group-hover:text-blue-500 text-lg"></i>
                                    <input type="file" id="cat-upload" accept="image/*" class="hidden" onchange="window.previewAttrImage(this)">
                                </div>
                                <div class="flex-1 w-full">
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Category Name</label>
                                    <input type="text" id="cat-name-input" placeholder="e.g. Vegetables" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-blue-500 transition">
                                </div>
                                <button id="btn-save-cat" class="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition shadow-lg shadow-slate-200 min-w-[100px]">
                                    <i class="fa-solid fa-plus"></i> Add
                                </button>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-3 px-1">
                                <h3 class="text-xs font-bold text-slate-400 uppercase">Active Categories</h3>
                                <span class="text-[10px] text-slate-500 bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold border border-blue-100">
                                    <i class="fa-solid fa-arrow-down-1-9"></i> Type number to reorder
                                </span>
                            </div>
                            <div id="cats-list" class="space-y-3">
                                <div class="text-center py-10 text-slate-400">
                                    <i class="fa-solid fa-circle-notch fa-spin"></i> Loading...
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="view-units" class="hidden space-y-6 max-w-2xl mx-auto">
                        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 class="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Add Measurement Unit</h3>
                            <div class="flex gap-3">
                                <input type="text" id="unit-name-input" placeholder="e.g. kg, ltr, pcs, packet" class="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-green-500 transition">
                                <button id="btn-save-unit" class="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg text-sm transition shadow-lg shadow-green-100">
                                    <i class="fa-solid fa-plus"></i> Add Unit
                                </button>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">Available Units</div>
                            <div id="units-list" class="divide-y divide-slate-100">
                                <div class="p-4 text-center text-slate-400 text-sm">Loading...</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;

        // ============================================================
        // 🧠 LOGIC & FUNCTIONS
        // ============================================================

        // 1. Preview Image
        window.previewAttrImage = (input) => {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('cat-preview-img').src = e.target.result;
                    document.getElementById('cat-preview-img').classList.remove('hidden');
                    document.getElementById('cat-icon-placeholder').classList.add('hidden');
                };
                reader.readAsDataURL(input.files[0]);
            }
        };

        // 2. Edit Setup Function
        window.editCategory = (key) => {
            const cat = localCategories.find(c => c.key === key);
            if (!cat) return;

            isEditing = true;
            editKey = key;
            currentEditImgUrl = cat.image;

            // UI Update
            document.getElementById('cat-name-input').value = cat.name;
            document.getElementById('cat-preview-img').src = cat.image;
            document.getElementById('cat-preview-img').classList.remove('hidden');
            document.getElementById('cat-icon-placeholder').classList.add('hidden');

            // Change Button to Update
            const btn = document.getElementById('btn-save-cat');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Update';
            btn.classList.remove('bg-slate-900', 'hover:bg-slate-800');
            btn.classList.add('bg-blue-600', 'hover:bg-blue-700');

            document.getElementById('form-title').innerText = "Edit Category";
            document.getElementById('form-title').classList.add('text-blue-600');
            document.getElementById('btn-cancel-edit').classList.remove('hidden');

            // Scroll to top
            document.getElementById('cat-form-card').scrollIntoView({ behavior: 'smooth' });
        };

        // 3. Cancel Edit
        window.cancelEdit = () => {
            isEditing = false;
            editKey = null;
            currentEditImgUrl = "";

            document.getElementById('cat-name-input').value = '';
            document.getElementById('cat-upload').value = '';
            document.getElementById('cat-preview-img').classList.add('hidden');
            document.getElementById('cat-icon-placeholder').classList.remove('hidden');

            const btn = document.getElementById('btn-save-cat');
            btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add';
            btn.classList.add('bg-slate-900', 'hover:bg-slate-800');
            btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');

            document.getElementById('form-title').innerText = "Add New Category";
            document.getElementById('form-title').classList.remove('text-blue-600');
            document.getElementById('btn-cancel-edit').classList.add('hidden');
        };

        // 4. CHANGE ORDER (Number Logic)
        window.changeOrder = async (key, newRankVal) => {
            let newRank = parseInt(newRankVal);
            if (isNaN(newRank) || newRank < 1) return; // Invalid input

            // Adjust index (1-based to 0-based)
            const newIndex = newRank - 1;
            const currentIndex = localCategories.findIndex(c => c.key === key);

            if (currentIndex === -1 || currentIndex === newIndex) return;

            // Remove from old position
            const [movedItem] = localCategories.splice(currentIndex, 1);

            // Insert at new position
            // (If newIndex is larger than array, push to end)
            if (newIndex >= localCategories.length) {
                localCategories.push(movedItem);
            } else {
                localCategories.splice(newIndex, 0, movedItem);
            }

            // Now, rewrite ALL orders to be 1, 2, 3...
            // This guarantees Clean Serial Data in Firebase
            const updates = {};
            localCategories.forEach((cat, idx) => {
                updates[`masterCategories/${cat.key}/order`] = idx + 1;
            });

            // Show loading in UI immediately (Optimistic)
            document.getElementById('cats-list').style.opacity = '0.5';

            try {
                await firebase.database().ref().update(updates);
            } catch (error) {
                console.error("Order update failed", error);
                alert("Failed to update order.");
                document.getElementById('cats-list').style.opacity = '1';
            }
        };

        this.setupTabs();
        this.attachLogic(db);
    },

    cleanup() {
        if(categoriesRef) categoriesRef.off();
        if(unitsRef) unitsRef.off();
        delete window.previewAttrImage;
        delete window.changeOrder;
        delete window.editCategory;
        delete window.cancelEdit;
        localCategories = [];
    },

    setupTabs() {
        const tabCats = document.getElementById('tab-cats');
        const tabUnits = document.getElementById('tab-units');
        const viewCats = document.getElementById('view-cats');
        const viewUnits = document.getElementById('view-units');

        const switchTab = (active) => {
            if(active === 'cats') {
                tabCats.className = "px-4 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600 transition";
                tabUnits.className = "px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition";
                viewCats.classList.remove('hidden');
                viewUnits.classList.add('hidden');
            } else {
                tabUnits.className = "px-4 py-3 text-sm font-medium border-b-2 border-green-600 text-green-600 transition";
                tabCats.className = "px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition";
                viewUnits.classList.remove('hidden');
                viewCats.classList.add('hidden');
            }
        };

        tabCats.onclick = () => switchTab('cats');
        tabUnits.onclick = () => switchTab('units');
    },

    attachLogic(db) {
        // --- SAVE / UPDATE CATEGORY ---
        const btnSaveCat = document.getElementById('btn-save-cat');

        btnSaveCat.onclick = async () => {
            const name = document.getElementById('cat-name-input').value.trim();
            const file = document.getElementById('cat-upload').files[0];

            if(!name) return alert("Category name is required");
            if(!isEditing && !file) return alert("Please select an image");

            btnSaveCat.disabled = true;
            btnSaveCat.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

            try {
                let imgUrl = currentEditImgUrl;
                if(file) {
                    imgUrl = await this.uploadImage(file);
                    if(!imgUrl) throw new Error("Image Upload Failed");
                }

                if (isEditing && editKey) {
                    // UPDATE EXISTING
                    await db.ref(`masterCategories/${editKey}`).update({
                        name: name,
                        image: imgUrl,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    window.cancelEdit(); // Reset UI
                } else {
                    // CREATE NEW
                    // Get next order number (Length + 1)
                    const nextOrder = localCategories.length + 1;

                    await db.ref('masterCategories').push({
                        name: name,
                        image: imgUrl,
                        order: nextOrder, 
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    });

                    // Reset Form
                    document.getElementById('cat-name-input').value = '';
                    document.getElementById('cat-upload').value = '';
                    document.getElementById('cat-preview-img').classList.add('hidden');
                    document.getElementById('cat-icon-placeholder').classList.remove('hidden');
                }

            } catch (err) {
                alert("Error: " + err.message);
            } finally {
                btnSaveCat.disabled = false;
                if(isEditing) {
                     btnSaveCat.innerHTML = '<i class="fa-solid fa-check"></i> Update';
                } else {
                     btnSaveCat.innerHTML = '<i class="fa-solid fa-plus"></i> Add';
                }
            }
        };

        // --- LISTEN CATEGORIES ---
        categoriesRef = db.ref('masterCategories');
        categoriesRef.on('value', snap => {
            const list = document.getElementById('cats-list');
            if(!list) return;
            list.innerHTML = '';
            list.style.opacity = '1'; // Restore opacity if stuck

            localCategories = []; 

            if(snap.exists()) {
                const data = snap.val();

                Object.entries(data).forEach(([key, val]) => {
                    localCategories.push({ key, ...val });
                });

                // SORT BY ORDER
                // Using (a.order || 999) to handle missing orders gracefully
                localCategories.sort((a, b) => (a.order || 9999) - (b.order || 9999));

                localCategories.forEach((cat, index) => {
                    const currentRank = index + 1;

                    const div = document.createElement('div');
                    div.className = "flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm transition hover:shadow-md group";

                    div.innerHTML = `
                        <div class="flex flex-col items-center justify-center w-12 border-r border-slate-100 pr-3">
                            <label class="text-[9px] font-bold text-slate-400 uppercase mb-1">Pos</label>
                            <input type="number" 
                                value="${currentRank}" 
                                min="1" 
                                class="w-10 h-8 text-center font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition"
                                onchange="window.changeOrder('${cat.key}', this.value)"
                            >
                        </div>

                        <div class="relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-100 shrink-0 overflow-hidden">
                            <img src="${cat.image}" class="w-full h-full object-cover">
                        </div>

                        <div class="flex-1 min-w-0 pl-1">
                            <h4 class="text-sm font-bold text-slate-800 truncate">${cat.name}</h4>
                            <p class="text-[10px] text-slate-400 font-mono">ID: ...${cat.key.substr(-4)}</p>
                        </div>

                        <div class="flex items-center gap-2">
                            <button class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100" 
                                onclick="window.editCategory('${cat.key}')" title="Edit">
                                <i class="fa-solid fa-pencil text-xs"></i>
                            </button>

                            <button class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100" 
                                onclick="if(confirm('Delete this category?')) firebase.database().ref('masterCategories/${cat.key}').remove()" title="Delete">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    `;
                    list.appendChild(div);
                });
            } else {
                list.innerHTML = '<div class="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-slate-100 border-dashed">No categories found.</div>';
            }
        });

        // --- UNITS LOGIC ---
        const btnSaveUnit = document.getElementById('btn-save-unit');

        btnSaveUnit.onclick = async () => {
            const name = document.getElementById('unit-name-input').value.trim();
            if(!name) return;

            await db.ref('masterUnits').push({
                name: name,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            document.getElementById('unit-name-input').value = '';
        };

        // Listen Units
        unitsRef = db.ref('masterUnits');
        unitsRef.on('value', snap => {
            const list = document.getElementById('units-list');
            if(!list) return;
            list.innerHTML = '';

            if(snap.exists()) {
                const data = snap.val();
                Object.entries(data).forEach(([key, val]) => {
                    const div = document.createElement('div');
                    div.className = "p-3 flex justify-between items-center hover:bg-slate-50 transition";
                    div.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 rounded-full bg-green-500"></div>
                            <span class="text-sm font-medium text-slate-700">${val.name}</span>
                        </div>
                        <button class="text-slate-400 hover:text-red-500 px-2" onclick="if(confirm('Delete unit?')) firebase.database().ref('masterUnits/${key}').remove()">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    `;
                    list.appendChild(div);
                });
            } else {
                list.innerHTML = '<div class="p-4 text-center text-slate-400 text-sm">No units added yet.</div>';
            }
        });
    }
};