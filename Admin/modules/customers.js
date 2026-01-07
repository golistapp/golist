// modules/customers.js

let customersRef = null;

// Modal ke liye temporary variables
let targetMobile = null;
let targetPin = null;
let targetName = null;
let targetShop = null;

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="space-y-6 fade-in pb-20 relative h-full flex flex-col">
                <div class="flex justify-between items-end border-b border-slate-800 pb-4 shrink-0">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Customer</h2>
                        <p class="text-xs text-slate-400">Manage Users & Login Recovery</p>
                    </div>
                    <span id="cust-count" class="bg-slate-800 text-slate-300 text-xs font-mono px-3 py-1 rounded border border-slate-700">0 Users</span>
                </div>

                <div class="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl relative">
                    <div class="absolute inset-0 overflow-auto custom-scrollbar">
                        <table class="w-full text-left text-sm text-slate-400">
                            <thead class="bg-slate-950 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10 shadow-md">
                                <tr>
                                    <th class="p-4 tracking-wider">Name</th>
                                    <th class="p-4 tracking-wider">Mobile</th>
                                    <th class="p-4 tracking-wider">Shop Name</th>
                                    <th class="p-4 tracking-wider">PIN</th>
                                    <th class="p-4 tracking-wider">Recovery</th>
                                    <th class="p-4 tracking-wider text-right">Joined</th>
                                </tr>
                            </thead>
                            <tbody id="customer-list" class="divide-y divide-slate-800">
                                <tr><td colspan="6" class="p-8 text-center text-slate-500"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Database...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="rec-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm hidden p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div class="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl flex flex-col animate-[scaleIn_0.2s_ease-out]">
                        <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                            <h3 class="font-bold text-white flex items-center gap-2">
                                <i class="fa-solid fa-key text-amber-500"></i> Send Recovery PIN
                            </h3>
                            <button id="close-rec" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div class="p-6 space-y-4">
                            <div class="text-center">
                                <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700">
                                    <i class="fa-solid fa-user-lock text-2xl text-slate-400"></i>
                                </div>
                                <p class="text-sm text-slate-400">Send PIN to <b id="rec-name" class="text-white">User</b></p>
                                <p class="text-xs text-slate-500 font-mono mt-1 tracking-widest" id="rec-mobile">98XXXXXXXX</p>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <button id="btn-wa" class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-green-900/20">
                                    <i class="fa-brands fa-whatsapp text-2xl"></i>
                                    <span class="text-[10px] uppercase">WhatsApp</span>
                                </button>
                                <button id="btn-sms" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-blue-900/20">
                                    <i class="fa-solid fa-comment-sms text-2xl"></i>
                                    <span class="text-[10px] uppercase">Text SMS</span>
                                </button>
                            </div>
                            <p class="text-[9px] text-center text-slate-600">Message will be pre-filled on your device.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEvents();
        this.startListener(db);
    },

    cleanup() {
        if (customersRef) customersRef.off();
    },

    attachEvents() {
        const modal = document.getElementById('rec-modal');
        const closeBtn = document.getElementById('close-rec');
        const btnWa = document.getElementById('btn-wa');
        const btnSms = document.getElementById('btn-sms');
        const list = document.getElementById('customer-list');

        // Close Modal
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

        // Handle Table Clicks (PIN Toggle & Recovery Open)
        list.addEventListener('click', (e) => {
            // 1. PIN Toggle (Eye Icon)
            const pinBtn = e.target.closest('.toggle-pin');
            if (pinBtn) {
                const pin = pinBtn.dataset.pin;
                const span = pinBtn.previousElementSibling;
                const icon = pinBtn.querySelector('i');

                if (span.innerText === '••••') {
                    span.innerText = pin;
                    span.classList.add('text-white');
                    span.classList.remove('text-slate-600');
                    icon.className = 'fa-solid fa-eye-slash';
                } else {
                    span.innerText = '••••';
                    span.classList.add('text-slate-600');
                    span.classList.remove('text-white');
                    icon.className = 'fa-solid fa-eye';
                }
            }

            // 2. Open Recovery Modal
            const recBtn = e.target.closest('.btn-rec');
            if (recBtn) {
                targetMobile = recBtn.dataset.mobile;
                targetPin = recBtn.dataset.pin;
                targetName = recBtn.dataset.name;
                targetShop = recBtn.dataset.shop;

                if (!targetPin || targetPin === 'undefined') {
                    alert("User hasn't set a PIN yet.");
                    return;
                }

                document.getElementById('rec-name').innerText = targetName;
                document.getElementById('rec-mobile').innerText = "+91 " + targetMobile;
                modal.classList.remove('hidden');
            }
        });

        // Send via WhatsApp
        btnWa.addEventListener('click', () => {
            if(!targetMobile) return;
            const msg = `Hello ${targetName},\n\nYour Login PIN for *${targetShop}* is: *${targetPin}*\n\nPlease keep it safe.\n- Team Ramazone`;
            window.open(`https://wa.me/91${targetMobile}?text=${encodeURIComponent(msg)}`, '_blank');
            modal.classList.add('hidden');
        });

        // Send via SMS
        btnSms.addEventListener('click', () => {
            if(!targetMobile) return;
            const body = `Hello ${targetName}, Your PIN for ${targetShop} is: ${targetPin}`;
            window.open(`sms:${targetMobile}?body=${encodeURIComponent(body)}`, '_self');
            modal.classList.add('hidden');
        });
    },

    startListener(db) {
        const list = document.getElementById('customer-list');
        const countLabel = document.getElementById('cust-count');

        customersRef = db.ref('users');

        customersRef.on('value', snap => {
            if(!list) return;
            list.innerHTML = '';

            if (!snap.exists()) {
                list.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">No customers found.</td></tr>';
                countLabel.innerText = "0 Users";
                return;
            }

            const users = snap.val();
            const entries = Object.entries(users).reverse(); // Newest first
            countLabel.innerText = `${entries.length} Users`;

            entries.forEach(([id, u]) => {
                const joinedDate = u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : 'N/A';
                const shop = u.shopName || '-';
                const pin = u.pin || '';

                list.innerHTML += `
                    <tr class="hover:bg-slate-800/50 transition group border-b border-slate-800/50 last:border-0">
                        <td class="p-4">
                            <div class="font-bold text-white">${u.name}</div>
                        </td>

                        <td class="p-4 font-mono text-slate-400">
                            ${u.mobile}
                        </td>

                        <td class="p-4 text-slate-300">
                            ${shop}
                        </td>

                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <span class="font-mono text-lg tracking-widest text-slate-600 font-bold select-none">••••</span>
                                <button class="toggle-pin text-slate-500 hover:text-white transition" data-pin="${pin}">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                            </div>
                        </td>

                        <td class="p-4">
                            <button class="btn-rec bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm"
                                data-mobile="${u.mobile}" data-pin="${pin}" data-name="${u.name}" data-shop="${shop}">
                                <i class="fa-solid fa-key"></i> SEND
                            </button>
                        </td>

                        <td class="p-4 text-right text-xs text-slate-500 font-mono">
                            ${joinedDate}
                        </td>
                    </tr>
                `;
            });
        });
    }
};