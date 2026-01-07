// modules/customers.js
import customerDetails from './customer-details.js';

let customersRef = null;
let allCustomers = []; 

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="h-full flex flex-col relative fade-in">

                <div class="flex flex-col gap-3 border-b border-slate-800 pb-4 shrink-0 px-4 pt-2">
                    <div class="flex justify-between items-end">
                        <div>
                            <h2 class="text-xl font-bold text-white tracking-tight">Customer Base</h2>
                            <p class="text-[10px] text-slate-400 font-medium">Manage & Analyze Users</p>
                        </div>
                        <span id="total-count" class="bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">0 Active</span>
                    </div>

                    <div class="relative group">
                        <i class="fa-solid fa-search absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition"></i>
                        <input type="text" id="cust-search" placeholder="Search by Name, Mobile or Shop..." 
                            class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder-slate-600">
                    </div>
                </div>

                <div id="customer-grid" class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 pb-40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                    <div class="col-span-full text-center py-20 text-slate-500">
                        <i class="fa-solid fa-circle-notch fa-spin mr-2 text-blue-500"></i> Loading Database...
                    </div>
                </div>

                <div id="edit-cust-modal" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
                    <div class="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
                        <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                            <h3 class="font-bold text-white">Edit Customer</h3>
                            <button id="close-edit" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                        </div>

                        <div class="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                            <input type="hidden" id="edit-uid">
                            <div><label class="text-[10px] text-slate-500 uppercase font-bold">Full Name</label><input type="text" id="edit-name" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white mt-1"></div>
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="text-[10px] text-slate-500 uppercase font-bold">Mobile</label><input type="number" id="edit-mobile" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white mt-1 font-mono"></div>
                                <div><label class="text-[10px] text-slate-500 uppercase font-bold">Login PIN</label><input type="text" id="edit-pin" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white mt-1 font-mono"></div>
                            </div>
                            <div><label class="text-[10px] text-slate-500 uppercase font-bold">Shop Name</label><input type="text" id="edit-shop" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white mt-1"></div>
                        </div>

                        <div class="p-4 border-t border-slate-800 bg-slate-950 rounded-b-2xl">
                            <button id="btn-save-cust" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition active:scale-95">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEvents(db);
        this.startListener(db);
    },

    cleanup() {
        if (customersRef) customersRef.off();
        allCustomers = [];
    },

    attachEvents(db) {
        const grid = document.getElementById('customer-grid');
        const searchInput = document.getElementById('cust-search');
        const modal = document.getElementById('edit-cust-modal');
        const closeModal = document.getElementById('close-edit');
        const saveBtn = document.getElementById('btn-save-cust');

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allCustomers.filter(c => 
                (c.name || '').toLowerCase().includes(term) ||
                (c.mobile || '').includes(term) ||
                (c.shopName || '').toLowerCase().includes(term)
            );
            this.renderGrid(filtered);
        });

        // 🔥 CLICK ANYWHERE LOGIC
        grid.addEventListener('click', (e) => {
            // Check if clicked element is a specific action button
            const btn = e.target.closest('button');

            // Agar Action Button nahi hai, toh card click maano (Open Analysis)
            if (!btn) {
                const card = e.target.closest('.customer-card');
                if (card) {
                    const id = card.dataset.id;
                    const user = allCustomers.find(c => c.id === id);
                    if(user) customerDetails.show(db, id, user);
                }
                return;
            }

            // Agar Action Button hai, toh uska kaam karo
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const user = allCustomers.find(c => c.id === id);
            if (!user) return;

            if (action === 'analyze') {
                customerDetails.show(db, id, user);
            } 
            else if (action === 'edit') {
                this.openEditModal(user);
            }
            else if (action === 'block') {
                const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
                if(confirm(newStatus === 'blocked' ? 'Block this user?' : 'Unblock user?')) {
                    db.ref(`users/${id}`).update({ status: newStatus });
                }
            }
            else if (action === 'delete') {
                if(confirm(`⚠️ Delete ${user.name}? This is permanent.`)) {
                    db.ref(`users/${id}`).remove();
                }
            }
        });

        closeModal.addEventListener('click', () => modal.classList.add('hidden'));
        saveBtn.addEventListener('click', () => {
            const uid = document.getElementById('edit-uid').value;
            if(!uid) return;
            saveBtn.innerHTML = 'Saving...';
            db.ref(`users/${uid}`).update({
                name: document.getElementById('edit-name').value,
                mobile: document.getElementById('edit-mobile').value,
                pin: document.getElementById('edit-pin').value,
                shopName: document.getElementById('edit-shop').value
            }).then(() => {
                modal.classList.add('hidden');
                saveBtn.innerHTML = 'Save Changes';
            });
        });
    },

    openEditModal(user) {
        document.getElementById('edit-uid').value = user.id;
        document.getElementById('edit-name').value = user.name || '';
        document.getElementById('edit-mobile').value = user.mobile || '';
        document.getElementById('edit-pin').value = user.pin || '';
        document.getElementById('edit-shop').value = user.shopName || '';
        document.getElementById('edit-cust-modal').classList.remove('hidden');
    },

    startListener(db) {
        const countLabel = document.getElementById('total-count');
        customersRef = db.ref('users');
        customersRef.on('value', snap => {
            if (!snap.exists()) { this.renderGrid([]); countLabel.innerText = "0 Users"; return; }
            const data = snap.val();
            allCustomers = Object.entries(data).map(([key, val]) => ({ id: key, ...val })).reverse();
            countLabel.innerText = `${allCustomers.length} Users`;
            this.renderGrid(allCustomers);
        });
    },

    renderGrid(users) {
        const grid = document.getElementById('customer-grid');
        grid.innerHTML = '';
        if (users.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-20 opacity-50"><p>No customers found.</p></div>`;
            return;
        }

        users.forEach(u => {
            const isBlocked = u.status === 'blocked';
            const statusColor = isBlocked ? 'border-red-900/50 bg-red-900/10' : 'border-slate-800 bg-slate-900';

            // Added 'customer-card' class and cursor-pointer for full click
            grid.innerHTML += `
                <div class="customer-card cursor-pointer rounded-xl border ${statusColor} p-4 flex flex-col gap-3 shadow-sm hover:border-slate-600 transition relative group" data-id="${u.id}">

                    ${isBlocked ? '<div class="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl">BLOCKED</div>' : ''}

                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-lg shrink-0 border border-slate-700">
                            ${u.name ? u.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="overflow-hidden">
                            <h3 class="font-bold text-white truncate text-sm leading-tight">${u.name || 'Unknown'}</h3>
                            <p class="text-[11px] text-blue-400 font-mono flex items-center gap-1">
                                <i class="fa-solid fa-phone text-[9px]"></i> ${u.mobile}
                            </p>
                            <p class="text-[10px] text-slate-500 truncate mt-0.5">
                                <i class="fa-solid fa-shop text-[9px] mr-1"></i> ${u.shopName || 'No Shop'}
                            </p>
                        </div>
                        <div class="ml-auto text-slate-600">
                            <i class="fa-solid fa-chevron-right text-xs"></i>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-1 z-10 relative">
                        <button data-id="${u.id}" data-action="analyze" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-lg shadow-blue-900/20">
                            ANALYSIS
                        </button>

                        <button data-id="${u.id}" data-action="edit" class="w-9 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg flex items-center justify-center border border-slate-700 transition">
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button data-id="${u.id}" data-action="block" class="w-9 bg-slate-800 hover:bg-slate-700 ${isBlocked ? 'text-green-500' : 'text-amber-500'} rounded-lg flex items-center justify-center border border-slate-700 transition">
                            <i class="fa-solid ${isBlocked ? 'fa-lock-open' : 'fa-ban'}"></i>
                        </button>

                         <button data-id="${u.id}" data-action="delete" class="w-9 bg-slate-800 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded-lg flex items-center justify-center border border-slate-700 transition">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }
};