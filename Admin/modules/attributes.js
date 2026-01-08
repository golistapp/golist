// modules/attributes.js

let categoriesRef = null;
let unitsRef = null;
let imageKit = null;

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
        // 🛠️ HELPER: UUID & Signature (Upload ke liye)
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
        // 🎨 UI RENDER (Light Theme)
        // ============================================================
        container.innerHTML = `
            <div class="h-full flex flex-col bg-slate-50 fade-in">
                <div class="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 class="text-xl font-bold text-slate-800">Attributes Manager</h2>
                        <p class="text-xs text-slate-500">Setup Categories & Measurement Units</p>
                    </div>
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
                        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 class="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Add New Category</h3>
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
                                <button id="btn-save-cat" class="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition shadow-lg shadow-slate-200">
                                    <i class="fa-solid fa-plus"></i> Add
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-xs font-bold text-slate-400 uppercase mb-3 px-1">Active Categories</h3>
                            <div id="cats-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                <div class="col-span-full text-center py-10 text-slate-400">
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

        // Helper for Preview
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

        this.setupTabs();
        this.attachLogic(db);
    },

    cleanup() {
        if(categoriesRef) categoriesRef.off();
        if(unitsRef) unitsRef.off();
        delete window.previewAttrImage;
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
        // --- CATEGORY LOGIC ---
        const btnSaveCat = document.getElementById('btn-save-cat');

        btnSaveCat.onclick = async () => {
            const name = document.getElementById('cat-name-input').value.trim();
            const file = document.getElementById('cat-upload').files[0];

            if(!name) return alert("Category name is required");
            if(!file) return alert("Please select an image");

            btnSaveCat.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btnSaveCat.disabled = true;

            try {
                const imgUrl = await this.uploadImage(file);
                if(!imgUrl) throw new Error("Image Upload Failed");

                await db.ref('masterCategories').push({
                    name: name,
                    image: imgUrl,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });

                // Reset
                document.getElementById('cat-name-input').value = '';
                document.getElementById('cat-upload').value = '';
                document.getElementById('cat-preview-img').classList.add('hidden');
                document.getElementById('cat-icon-placeholder').classList.remove('hidden');
            } catch (err) {
                alert("Error: " + err.message);
            } finally {
                btnSaveCat.innerHTML = '<i class="fa-solid fa-plus"></i> Add';
                btnSaveCat.disabled = false;
            }
        };

        // Listen Categories
        categoriesRef = db.ref('masterCategories');
        categoriesRef.on('value', snap => {
            const list = document.getElementById('cats-list');
            if(!list) return;
            list.innerHTML = '';

            if(snap.exists()) {
                const data = snap.val();
                Object.entries(data).reverse().forEach(([key, val]) => {
                    const div = document.createElement('div');
                    div.className = "bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm hover:shadow-md transition group";
                    div.innerHTML = `
                        <img src="${val.image}" class="w-10 h-10 rounded-md object-cover bg-slate-100">
                        <span class="text-sm font-medium text-slate-700 flex-1 truncate">${val.name}</span>
                        <button class="text-slate-400 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition" onclick="if(confirm('Delete category?')) firebase.database().ref('masterCategories/${key}').remove()">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    `;
                    list.appendChild(div);
                });
            } else {
                list.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400 text-sm">No categories found.</div>';
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