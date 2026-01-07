// modules/inventory.js

let productsRef = null;

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="space-y-6 fade-in h-full flex flex-col">
                <div class="flex justify-between items-end border-b border-slate-800 pb-4 shrink-0">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Master Inventory</h2>
                        <p class="text-xs text-slate-400">Manage Product Suggestions DB</p>
                    </div>
                    <span id="total-count" class="bg-slate-800 text-slate-300 text-xs font-mono px-3 py-1 rounded border border-slate-700">0 Items</span>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                    <div class="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">

                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Add Single Item</label>
                            <div class="flex gap-2">
                                <input type="text" id="new-prod-name" placeholder="e.g. Aalu (आलू)" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                                <button id="btn-add-single" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded-lg text-xs transition shadow-lg">
                                    ADD
                                </button>
                            </div>
                        </div>

                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                             <div class="flex justify-between items-center mb-2">
                                <label class="block text-xs font-bold text-slate-500 uppercase">Bulk Upload</label>
                                <span class="text-[10px] text-slate-600">One item per line</span>
                             </div>
                             <textarea id="bulk-text" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono h-32 focus:outline-none leading-relaxed resize-none mb-3" placeholder="Onion&#10;Tomato&#10;Ginger"></textarea>
                             <button id="btn-bulk-upload" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg text-xs border border-slate-700 transition">
                                <i class="fa-solid fa-layer-group mr-1"></i> UPLOAD LIST
                             </button>
                        </div>
                    </div>

                    <div class="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden relative">
                        <div class="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                            <h3 class="font-bold text-sm text-white">Database Items</h3>
                            <input type="text" id="search-db" placeholder="Search..." class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-40 focus:outline-none">
                        </div>

                        <div class="flex-1 overflow-y-auto p-2 custom-scrollbar relative">
                            <div id="product-list" class="space-y-1">
                                <p class="text-center text-slate-500 py-10"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading DB...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Listeners Attach karo
        this.attachEvents(db);
        this.startDataListener(db);
    },

    cleanup() {
        if(productsRef) productsRef.off();
    },

    attachEvents(db) {
        // 1. Single Add Button
        document.getElementById('btn-add-single').addEventListener('click', () => {
            const input = document.getElementById('new-prod-name');
            const name = input.value.trim();
            if(!name) return this.showToast("Enter a name first", "error");

            db.ref('masterProducts').push({
                name: name,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                input.value = '';
                this.showToast("Item Added!");
            });
        });

        // 2. Bulk Upload Button
        document.getElementById('btn-bulk-upload').addEventListener('click', () => {
            const textarea = document.getElementById('bulk-text');
            const raw = textarea.value.trim();
            if(!raw) return this.showToast("List is empty", "error");

            const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if(lines.length === 0) return;

            // Bulk Update Object
            const updates = {};
            lines.forEach(item => {
                const newKey = db.ref('masterProducts').push().key;
                updates['masterProducts/' + newKey] = {
                    name: item,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
            });

            db.ref().update(updates).then(() => {
                textarea.value = '';
                this.showToast(`Uploaded ${lines.length} items!`);
            });
        });

        // 3. Delete Logic (Event Delegation)
        // Hum har button par listener nahi lagayenge, balki parent list par lagayenge
        document.getElementById('product-list').addEventListener('click', (e) => {
            // Check karo ki click delete button par hua hai ya uske icon par
            const btn = e.target.closest('.delete-btn');
            if(btn) {
                const key = btn.dataset.key;
                if(confirm("Delete this item permanently?")) {
                    db.ref('masterProducts/' + key).remove();
                }
            }
        });

        // 4. Search Filter (Local)
        document.getElementById('search-db').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.db-item');
            items.forEach(item => {
                const name = item.dataset.name.toLowerCase();
                if(name.includes(term)) item.classList.remove('hidden');
                else item.classList.add('hidden');
            });
        });
    },

    startDataListener(db) {
        const list = document.getElementById('product-list');
        const countLabel = document.getElementById('total-count');

        productsRef = db.ref('masterProducts');
        productsRef.on('value', snap => {
            if(!list) return;

            list.innerHTML = '';
            if(!snap.exists()) {
                list.innerHTML = '<p class="text-center text-slate-500 py-10">Database is empty.</p>';
                countLabel.innerText = "0 Items";
                return;
            }

            const data = snap.val();
            const entries = Object.entries(data).reverse(); // Newest first

            countLabel.innerText = `${entries.length} Items`;

            // Huge lists ko fast render karne ke liye Fragment use karte hain
            const fragment = document.createDocumentFragment();

            entries.forEach(([key, item]) => {
                const div = document.createElement('div');
                div.className = "db-item flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded hover:bg-slate-800 transition group";
                div.dataset.name = item.name; // Search ke liye

                div.innerHTML = `
                    <span class="text-sm text-slate-300 font-medium">${item.name}</span>
                    <button class="delete-btn text-slate-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition" data-key="${key}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
                fragment.appendChild(div);
            });

            list.appendChild(fragment);
        });
    },

    // Helper Toast (Temporary logic module level par)
    showToast(msg, type='success') {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if(toast && toastMsg) {
            toastMsg.innerText = msg;
            toast.classList.add('toast-visible');
            if(type === 'error') toastMsg.classList.add('text-red-500');
            else toastMsg.classList.remove('text-red-500');

            setTimeout(() => {
                toast.classList.remove('toast-visible');
            }, 3000);
        }
    }
};