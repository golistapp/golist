// modules/partners.js

let partnersRef = null;
let currentPartnerId = null;
let currentPartnerData = null;

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="h-full flex flex-col relative fade-in bg-slate-950">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-800 pb-3 shrink-0 px-3 pt-2">
                    <div>
                        <h2 class="text-xl font-bold text-white tracking-tight">Delivery Team</h2>
                        <p class="text-[10px] text-slate-400 font-medium">Manage Riders & Wallets</p>
                    </div>

                    <div class="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button id="tab-active" class="px-4 py-1.5 text-[10px] font-bold rounded bg-slate-700 text-white shadow transition" onclick="switchPartnerTab('active')">
                            Active Fleet
                        </button>
                        <button id="tab-requests" class="px-4 py-1.5 text-[10px] font-bold rounded text-slate-400 hover:text-white transition flex items-center gap-2" onclick="switchPartnerTab('requests')">
                            Requests <span id="req-badge" class="bg-red-500 text-white text-[9px] px-1.5 rounded-full hidden">0</span>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-hidden relative">

                    <div id="view-active" class="absolute inset-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        <div id="active-list" class="space-y-3 pb-24">
                            <div class="text-center py-20 text-slate-500"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>
                        </div>
                    </div>

                    <div id="view-requests" class="absolute inset-0 overflow-y-auto p-3 custom-scrollbar hidden">
                        <div id="request-list" class="space-y-3 pb-24">
                             <p class="text-center text-slate-500 py-10">No pending requests.</p>
                        </div>
                    </div>
                </div>

                <div id="manage-modal" class="fixed inset-0 z-[200] bg-slate-950 hidden flex flex-col animate-slide-in">

                    <div class="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shrink-0 safe-area-top shadow-md z-10">
                        <div class="flex items-center gap-3">
                            <button id="close-manage" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95">
                                <i class="fa-solid fa-arrow-left"></i>
                            </button>
                            <div>
                                <h3 class="font-bold text-white text-base leading-tight" id="m-name">Rider Name</h3>
                                <p class="text-[10px] text-slate-400 font-mono" id="m-mobile">+91 XXXXXXXXXX</p>
                            </div>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300" id="m-avatar">M</div>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-slate-950">

                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center shadow-sm">
                            <div>
                                <p class="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Account Access</p>
                                <p class="text-xs font-bold text-green-400" id="m-status-text">Partner is ACTIVE</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="m-status-toggle" class="sr-only peer">
                                <div class="w-11 h-6 bg-slate-800 border border-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 peer-checked:border-green-500"></div>
                            </label>
                        </div>

                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <p class="text-[10px] text-slate-500 uppercase font-bold">Login Credentials</p>
                                <p class="text-xs text-slate-300 mt-0.5">Current PIN: <span id="m-pin-display" class="font-mono font-bold text-white">••••</span></p>
                            </div>
                            <button id="btn-open-recovery" class="px-3 py-2 bg-amber-900/20 text-amber-500 border border-amber-900/50 hover:bg-amber-600 hover:text-white rounded-lg text-[10px] font-bold transition flex items-center gap-2">
                                <i class="fa-solid fa-key"></i> SEND PIN
                            </button>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                                <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Lifetime Earnings</p>
                                <p class="text-lg font-bold text-green-400">₹<span id="m-earnings">0</span></p>
                            </div>
                            <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                                <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Last Active</p>
                                <p class="text-xs font-bold text-blue-400 mt-1" id="m-last-seen">Never</p>
                            </div>
                            <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                                <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Current Status</p>
                                <p class="text-sm font-bold text-amber-400 uppercase" id="m-online-status">OFFLINE</p>
                            </div>
                            <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                                <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Joined On</p>
                                <p class="text-xs font-bold text-white mt-1" id="m-joined">--/--/--</p>
                            </div>
                        </div>

                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                            <div class="flex justify-between items-center mb-4">
                                <p class="text-[10px] text-slate-400 uppercase font-bold">Wallet Balance</p>
                                <p class="text-xl font-bold text-white">₹<span id="m-balance">0</span></p>
                            </div>
                            <div class="flex gap-2">
                                <input type="number" id="settle-amount" placeholder="Amount Paid" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500">
                                <button id="btn-settle" class="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition shadow-lg shadow-green-900/20">
                                    SETTLE
                                </button>
                            </div>
                            <p class="text-[9px] text-slate-600 mt-2">Entering amount reduces balance. History preserved.</p>
                        </div>

                        <details class="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <summary class="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-800/50 transition">
                                <span class="text-xs font-bold text-blue-400 uppercase flex items-center gap-2"><i class="fa-solid fa-pen-to-square"></i> Edit Profile</span>
                                <i class="fa-solid fa-chevron-down text-slate-500 group-open:rotate-180 transition"></i>
                            </summary>
                            <div class="p-4 space-y-4 border-t border-slate-800 bg-slate-900/30">
                                <div>
                                    <label class="text-[9px] text-slate-500 uppercase font-bold block mb-1">Full Name</label>
                                    <input type="text" id="edit-name" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:outline-none">
                                </div>
                                <div>
                                    <label class="text-[9px] text-slate-500 uppercase font-bold block mb-1">Mobile Number</label>
                                    <input type="number" id="edit-mobile-num" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-blue-500 focus:outline-none">
                                </div>
                                <button id="btn-save-details" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-xs mt-1 shadow-lg">UPDATE INFO</button>
                            </div>
                        </details>

                        <button id="btn-delete-partner" class="w-full bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-red-900/30 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition mb-6">
                            <i class="fa-solid fa-trash"></i> DELETE PARTNER PERMANENTLY
                        </button>

                    </div>
                </div>

                <div id="rec-modal" class="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-sm hidden p-4 animate-scale-in">
                    <div class="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl flex flex-col">
                        <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                            <h3 class="font-bold text-white flex items-center gap-2">
                                <i class="fa-solid fa-key text-amber-500"></i> Send Recovery PIN
                            </h3>
                            <button id="close-rec" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div class="p-6 space-y-4">
                            <div class="text-center">
                                <p class="text-sm text-slate-400">Send Login PIN to <b id="rec-name" class="text-white">Rider</b></p>
                                <p class="text-xs text-slate-500 font-mono mt-1 tracking-widest" id="rec-mobile">98XXXXXXXX</p>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <button id="btn-wa" class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-green-900/20">
                                    <i class="fa-brands fa-whatsapp text-lg"></i>
                                    <span class="text-[10px] uppercase">WhatsApp</span>
                                </button>
                                <button id="btn-sms" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-blue-900/20">
                                    <i class="fa-solid fa-comment-sms text-lg"></i>
                                    <span class="text-[10px] uppercase">Text SMS</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <style>
                .animate-slide-in { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-scale-in { animation: scaleIn 0.2s ease-out; }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            </style>
        `;

        // Tab Logic
        window.switchPartnerTab = (tab) => {
            const viewActive = document.getElementById('view-active');
            const viewReq = document.getElementById('view-requests');
            const btnActive = document.getElementById('tab-active');
            const btnReq = document.getElementById('tab-requests');

            if(tab === 'active') {
                viewActive.classList.remove('hidden');
                viewReq.classList.add('hidden');
                btnActive.classList.add('bg-slate-700', 'text-white', 'shadow');
                btnActive.classList.remove('text-slate-400');
                btnReq.classList.remove('bg-slate-700', 'text-white', 'shadow');
                btnReq.classList.add('text-slate-400');
            } else {
                viewActive.classList.add('hidden');
                viewReq.classList.remove('hidden');
                btnReq.classList.add('bg-slate-700', 'text-white', 'shadow');
                btnReq.classList.remove('text-slate-400');
                btnActive.classList.remove('bg-slate-700', 'text-white', 'shadow');
                btnActive.classList.add('text-slate-400');
            }
        };

        this.attachEvents(db);
        this.startListener(db);
    },

    cleanup() {
        if (partnersRef) partnersRef.off();
        delete window.switchPartnerTab;
    },

    attachEvents(db) {
        // --- PIN TOGGLE & MANAGE CLICK (Active List) ---
        document.getElementById('active-list').addEventListener('click', (e) => {
            const pinBtn = e.target.closest('.toggle-pin');
            if (pinBtn) {
                const pin = pinBtn.dataset.pin;
                const span = pinBtn.previousElementSibling;
                const icon = pinBtn.querySelector('i');
                if (span.innerText === '••••') {
                    span.innerText = pin;
                    span.classList.add('text-white', 'tracking-normal');
                    span.classList.remove('tracking-widest', 'text-slate-600');
                    icon.className = 'fa-solid fa-eye-slash';
                } else {
                    span.innerText = '••••';
                    span.classList.add('tracking-widest', 'text-slate-600');
                    span.classList.remove('text-white', 'tracking-normal');
                    icon.className = 'fa-solid fa-eye';
                }
            }

            const manageBtn = e.target.closest('.btn-manage');
            if(manageBtn) {
                const data = JSON.parse(decodeURIComponent(manageBtn.dataset.json));
                this.openManageModal(manageBtn.dataset.id, data);
            }
        });

        // 🔥 NEW: APPROVE LOGIC (Request List)
        document.getElementById('request-list').addEventListener('click', (e) => {
            const approveBtn = e.target.closest('button[data-action="approve"]');
            if (approveBtn) {
                const mobile = approveBtn.dataset.mobile;
                const name = approveBtn.dataset.name;

                if(confirm(`Approve ${name}?`)) {
                    // Update Status to 'offline' (ready to work)
                    db.ref(`deliveryBoys/${mobile}`).update({
                        status: 'offline',
                        verified: true,
                        joinedAt: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => {
                        const toast = document.createElement('div');
                        toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl z-[300] text-xs font-bold animate-fadeIn';
                        toast.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Approved ${name}`;
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 3000);

                        // Switch tab
                        window.switchPartnerTab('active');
                    });
                }
            }
        });

        // --- MANAGE MODAL LOGIC ---
        const manageModal = document.getElementById('manage-modal');
        document.getElementById('close-manage').addEventListener('click', () => manageModal.classList.add('hidden'));

        document.getElementById('m-status-toggle').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const newStatus = isChecked ? 'offline' : 'disabled';
            document.getElementById('m-status-text').innerText = isChecked ? 'Partner is ACTIVE' : 'Partner is DISABLED';
            document.getElementById('m-status-text').className = isChecked ? 'text-xs font-bold text-green-400' : 'text-xs font-bold text-red-400';
            db.ref('deliveryBoys/' + currentPartnerId).update({ status: newStatus });
        });

        document.getElementById('btn-open-recovery').addEventListener('click', () => {
            this.openRecoveryModal();
        });

        document.getElementById('btn-settle').addEventListener('click', () => {
            const amountInput = document.getElementById('settle-amount');
            const amount = parseFloat(amountInput.value);
            if(!amount || amount <= 0) return alert("Enter valid amount");
            const currentBal = parseFloat(document.getElementById('m-balance').innerText);
            const newBal = currentBal - amount;
            db.ref('deliveryBoys/' + currentPartnerId).update({ walletBalance: newBal }).then(() => {
                alert(`Settled ₹${amount}.`);
                amountInput.value = '';
                document.getElementById('m-balance').innerText = newBal;
            });
        });

        document.getElementById('btn-save-details').addEventListener('click', () => {
            const newName = document.getElementById('edit-name').value;
            const newMobile = document.getElementById('edit-mobile-num').value;
            if(!newName || !newMobile) return alert("Fields empty");
            db.ref('deliveryBoys/' + currentPartnerId).update({ name: newName, mobile: newMobile }).then(() => {
                document.getElementById('m-name').innerText = newName;
                document.getElementById('m-mobile').innerText = "+91 " + newMobile;
                alert("Profile Updated!");
            });
        });

        document.getElementById('btn-delete-partner').addEventListener('click', () => {
            if(confirm("Permanently delete this partner?")) {
                db.ref('deliveryBoys/' + currentPartnerId).remove();
                manageModal.classList.add('hidden');
            }
        });

        // --- RECOVERY MODAL LOGIC ---
        const recModal = document.getElementById('rec-modal');
        document.getElementById('close-rec').addEventListener('click', () => recModal.classList.add('hidden'));

        document.getElementById('btn-wa').addEventListener('click', () => {
            const msg = `Hello ${currentPartnerData.name},\n\nYour Login PIN for *Delivery App* is: *${currentPartnerData.pin}*\n\nPlease keep it safe.\n- Team Ramazone`;
            window.open(`https://wa.me/91${currentPartnerData.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
            recModal.classList.add('hidden');
        });

        document.getElementById('btn-sms').addEventListener('click', () => {
            const body = `Hello ${currentPartnerData.name}, Your PIN is: ${currentPartnerData.pin}. - Team Ramazone`;
            window.open(`sms:${currentPartnerData.mobile}?body=${encodeURIComponent(body)}`, '_self');
            recModal.classList.add('hidden');
        });
    },

    openManageModal(id, p) {
        currentPartnerId = id;
        currentPartnerData = p;
        const modal = document.getElementById('manage-modal');

        document.getElementById('m-avatar').innerText = p.name.charAt(0).toUpperCase();
        document.getElementById('m-name').innerText = p.name;
        document.getElementById('m-mobile').innerText = "+91 " + id;
        document.getElementById('m-pin-display').innerText = p.pin || '0000';
        document.getElementById('m-earnings').innerText = p.earnings || 0;
        document.getElementById('m-online-status').innerText = (p.status || 'OFFLINE').toUpperCase();
        document.getElementById('m-balance').innerText = p.walletBalance || 0;

        const joinDate = p.joinedAt ? new Date(p.joinedAt).toLocaleDateString() : 'Unknown';
        document.getElementById('m-joined').innerText = joinDate;

        let lastSeenText = "Never";
        if (p.lastHeartbeat) {
            const diff = Date.now() - p.lastHeartbeat;
            const mins = Math.floor(diff / 60000);
            if (mins < 1) lastSeenText = "Just now";
            else if (mins < 60) lastSeenText = `${mins} min ago`;
            else {
                const hours = Math.floor(mins / 60);
                if(hours < 24) lastSeenText = `${hours} hrs ago`;
                else lastSeenText = new Date(p.lastHeartbeat).toLocaleDateString();
            }
        }
        document.getElementById('m-last-seen').innerText = lastSeenText;

        const toggle = document.getElementById('m-status-toggle');
        const statusText = document.getElementById('m-status-text');

        if(p.status !== 'disabled') {
            toggle.checked = true;
            statusText.innerText = "Partner is ACTIVE";
            statusText.className = "text-xs font-bold text-green-400";
        } else {
            toggle.checked = false;
            statusText.innerText = "Partner is DISABLED";
            statusText.className = "text-xs font-bold text-red-400";
        }

        document.getElementById('edit-name').value = p.name;
        document.getElementById('edit-mobile-num').value = id;
        modal.classList.remove('hidden');
    },

    openRecoveryModal() {
        document.getElementById('rec-name').innerText = currentPartnerData.name;
        document.getElementById('rec-mobile').innerText = "+91 " + currentPartnerData.mobile;
        document.getElementById('rec-modal').classList.remove('hidden');
    },

    startListener(db) {
        const activeList = document.getElementById('active-list');
        const reqList = document.getElementById('request-list');
        const reqBadge = document.getElementById('req-badge');

        partnersRef = db.ref('deliveryBoys');
        partnersRef.on('value', snap => {
            if(!activeList) return;
            activeList.innerHTML = '';
            reqList.innerHTML = '';

            if (!snap.exists()) {
                activeList.innerHTML = `<div class="text-center py-20 text-slate-500">No partners found.</div>`;
                return;
            }

            let pendingCount = 0;
            Object.entries(snap.val()).forEach(([mobile, p]) => {
                if(!p.name) return;
                if (p.status === 'pending') {
                    pendingCount++;
                    reqList.innerHTML += this.createRequestCard(mobile, p);
                } else {
                    activeList.innerHTML += this.createActiveCard(mobile, p);
                }
            });

            if(pendingCount > 0) {
                reqBadge.innerText = pendingCount;
                reqBadge.classList.remove('hidden');
            } else {
                reqBadge.classList.add('hidden');
            }
        });
    },

    createActiveCard(mobile, p) {
        const isOnline = p.status === 'online';
        const safeJson = encodeURIComponent(JSON.stringify(p));
        const batteryVal = p.battery || 0;
        const pin = p.pin || '0000';
        let battColor = 'text-green-500';
        if(batteryVal < 30) battColor = 'text-red-500';

        return `
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-slate-700 transition">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 border border-slate-700">
                        ${p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 class="font-bold text-white text-sm">${p.name}</h3>
                        <p class="text-[11px] text-slate-500 font-mono tracking-wide">${mobile}</p>
                    </div>
                </div>

                <div class="hidden sm:block text-right">
                     <div class="flex items-center justify-end gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}"></span>
                        <span class="text-[10px] font-bold text-slate-400 uppercase">${p.status}</span>
                    </div>
                    <div class="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                        <i class="fa-solid fa-battery-half ${battColor}"></i> ${batteryVal}%
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                        <span class="font-mono text-xs tracking-widest text-slate-500 font-bold select-none">••••</span>
                        <button class="toggle-pin text-slate-600 hover:text-white transition text-[10px]" data-pin="${pin}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>

                    <button class="btn-manage w-9 h-9 rounded-lg bg-blue-600/10 text-blue-500 border border-blue-600/20 hover:bg-blue-600 hover:text-white transition flex items-center justify-center active:scale-95" 
                        data-id="${mobile}" data-json="${safeJson}">
                        <i class="fa-solid fa-angle-right text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    },

    createRequestCard(mobile, p) {
        return `
            <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-white text-sm">${p.name}</h4>
                        <p class="text-[11px] text-slate-400 font-mono">+91 ${mobile}</p>
                    </div>
                    <span class="bg-amber-500/20 text-amber-500 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/30">PENDING</span>
                </div>
                <div class="flex gap-2 mt-3">
                    <a href="https://wa.me/91${mobile}" target="_blank" class="flex-1 bg-slate-900 border border-slate-700 text-slate-300 py-2 rounded-lg text-[10px] font-bold text-center hover:bg-slate-800">
                        <i class="fa-brands fa-whatsapp text-green-500 mr-1"></i> Check
                    </a>
                    <button data-action="approve" data-mobile="${mobile}" data-name="${p.name}" class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-95 transition">
                        <i class="fa-solid fa-check"></i> APPROVE
                    </button>
                </div>
            </div>
        `;
    }
};