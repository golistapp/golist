// modules/partners.js

let partnersRef = null;
let currentPartnerId = null;
let currentPartnerData = null;

export default {
    async render(container, db) {
        // ============================================================
        // 🎨 UI RENDER (LIGHT THEME UPDATED)
        // ============================================================
        container.innerHTML = `
            <div class="h-full flex flex-col relative fade-in bg-slate-50">

                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-3 shrink-0 px-4 pt-4 bg-white shadow-sm z-10">
                    <div>
                        <h2 class="text-xl font-bold text-slate-800 tracking-tight">Delivery Team</h2>
                        <p class="text-[10px] text-slate-500 font-medium">Manage Riders & Wallets</p>
                    </div>

                    <div class="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button id="tab-active" class="px-4 py-1.5 text-[10px] font-bold rounded bg-white text-blue-600 shadow-sm transition border border-slate-200" onclick="switchPartnerTab('active')">
                            Active Fleet
                        </button>
                        <button id="tab-requests" class="px-4 py-1.5 text-[10px] font-bold rounded text-slate-500 hover:text-slate-700 transition flex items-center gap-2" onclick="switchPartnerTab('requests')">
                            Requests <span id="req-badge" class="bg-red-500 text-white text-[9px] px-1.5 rounded-full hidden">0</span>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-hidden relative">

                    <div id="view-active" class="absolute inset-0 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        <div id="active-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-24">
                            <div class="col-span-full text-center py-20 text-slate-400">
                                <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-500"></i>
                                <p>Loading Team...</p>
                            </div>
                        </div>
                    </div>

                    <div id="view-requests" class="absolute inset-0 overflow-y-auto p-4 custom-scrollbar hidden">
                        <div id="request-list" class="space-y-3 pb-24 max-w-2xl mx-auto">
                             <p class="text-center text-slate-400 py-10">No pending requests.</p>
                        </div>
                    </div>
                </div>

                <div id="manage-modal" class="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm hidden flex flex-col justify-end sm:justify-center animate-fade-in p-0 sm:p-4">

                    <div class="bg-white w-full sm:max-w-md mx-auto rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90%] sm:max-h-auto animate-slide-up">

                        <div class="bg-white border-b border-slate-100 p-4 flex justify-between items-center shrink-0 z-10 sticky top-0">
                            <div class="flex items-center gap-3">
                                <button id="close-manage" class="w-8 h-8 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition active:scale-95">
                                    <i class="fa-solid fa-arrow-left"></i>
                                </button>
                                <div>
                                    <h3 class="font-bold text-slate-800 text-base leading-tight" id="m-name">Rider Name</h3>
                                    <p class="text-[11px] text-slate-500 font-mono tracking-wide" id="m-mobile">+91 XXXXXXXXXX</p>
                                </div>
                            </div>
                            <button id="btn-wa-direct" class="w-9 h-9 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center justify-center shadow-sm hover:bg-green-100 transition">
                                <i class="fa-brands fa-whatsapp text-lg"></i>
                            </button>
                        </div>

                        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 bg-slate-50">

                            <div class="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                <div>
                                    <p class="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Account Status</p>
                                    <p class="text-xs font-bold text-green-500" id="m-status-text">Partner is ACTIVE</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="m-status-toggle" class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>

                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p class="text-[10px] text-slate-400 uppercase font-bold">Login Credentials</p>
                                    <p class="text-xs text-slate-600 mt-0.5">Current PIN: <span id="m-pin-display" class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">••••</span></p>
                                </div>
                                <button id="btn-open-recovery" class="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition flex items-center gap-2">
                                    <i class="fa-solid fa-key"></i> SEND PIN
                                </button>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-white p-3 rounded-xl border border-slate-200 text-center">
                                    <p class="text-[9px] text-slate-400 uppercase font-bold mb-1">Lifetime Earnings</p>
                                    <p class="text-lg font-bold text-green-600">₹<span id="m-earnings">0</span></p>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200 text-center">
                                    <p class="text-[9px] text-slate-400 uppercase font-bold mb-1">Last Active</p>
                                    <p class="text-xs font-bold text-blue-600 mt-1" id="m-last-seen">Never</p>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200 text-center">
                                    <p class="text-[9px] text-slate-400 uppercase font-bold mb-1">Current Status</p>
                                    <p class="text-sm font-bold text-amber-500 uppercase" id="m-online-status">OFFLINE</p>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200 text-center">
                                    <p class="text-[9px] text-slate-400 uppercase font-bold mb-1">Joined On</p>
                                    <p class="text-xs font-bold text-slate-700 mt-1" id="m-joined">--/--/--</p>
                                </div>
                            </div>

                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div class="flex justify-between items-center mb-4">
                                    <p class="text-[10px] text-slate-400 uppercase font-bold">Wallet Balance</p>
                                    <p class="text-xl font-bold text-slate-800">₹<span id="m-balance">0</span></p>
                                </div>
                                <div class="flex gap-2">
                                    <input type="number" id="settle-amount" placeholder="Amount Paid" class="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500">
                                    <button id="btn-settle" class="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition shadow-lg shadow-green-200">
                                        SETTLE
                                    </button>
                                </div>
                                <p class="text-[9px] text-slate-400 mt-2">Entering amount reduces balance. History preserved.</p>
                            </div>

                            <details class="group bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <summary class="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 transition">
                                    <span class="text-xs font-bold text-blue-600 uppercase flex items-center gap-2"><i class="fa-solid fa-pen-to-square"></i> Edit Profile</span>
                                    <i class="fa-solid fa-chevron-down text-slate-400 group-open:rotate-180 transition"></i>
                                </summary>
                                <div class="p-4 space-y-4 border-t border-slate-100 bg-slate-50">
                                    <div>
                                        <label class="text-[9px] text-slate-500 uppercase font-bold block mb-1">Full Name</label>
                                        <input type="text" id="edit-name" class="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[9px] text-slate-500 uppercase font-bold block mb-1">Mobile Number</label>
                                        <input type="number" id="edit-mobile-num" class="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 font-mono focus:border-blue-500 focus:outline-none">
                                    </div>
                                    <button id="btn-save-details" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xs mt-1 shadow-md shadow-blue-200">UPDATE INFO</button>
                                </div>
                            </details>

                            <button id="btn-delete-partner" class="w-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition mb-6">
                                <i class="fa-solid fa-trash"></i> DELETE PARTNER PERMANENTLY
                            </button>

                        </div>
                    </div>
                </div>

                <div id="rec-modal" class="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm hidden p-4 animate-scale-in">
                    <div class="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
                        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                <i class="fa-solid fa-key text-amber-500"></i> Send Recovery PIN
                            </h3>
                            <button id="close-rec" class="text-slate-400 hover:text-red-500 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div class="p-6 space-y-4">
                            <div class="text-center">
                                <p class="text-sm text-slate-500">Send Login PIN to <b id="rec-name" class="text-slate-800">Rider</b></p>
                                <p class="text-xs text-slate-400 font-mono mt-1 tracking-widest" id="rec-mobile">98XXXXXXXX</p>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <button id="btn-wa" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-green-200">
                                    <i class="fa-brands fa-whatsapp text-lg"></i>
                                    <span class="text-[10px] uppercase">WhatsApp</span>
                                </button>
                                <button id="btn-sms" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-blue-200">
                                    <i class="fa-solid fa-comment-sms text-lg"></i>
                                    <span class="text-[10px] uppercase">Text SMS</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        `;

        // Tab Logic (Updated for Light Theme classes)
        window.switchPartnerTab = (tab) => {
            const viewActive = document.getElementById('view-active');
            const viewReq = document.getElementById('view-requests');
            const btnActive = document.getElementById('tab-active');
            const btnReq = document.getElementById('tab-requests');

            if(tab === 'active') {
                viewActive.classList.remove('hidden');
                viewReq.classList.add('hidden');

                btnActive.className = "px-4 py-1.5 text-[10px] font-bold rounded bg-white text-blue-600 shadow-sm transition border border-slate-200";
                btnReq.className = "px-4 py-1.5 text-[10px] font-bold rounded text-slate-500 hover:text-slate-700 transition flex items-center gap-2";
            } else {
                viewActive.classList.add('hidden');
                viewReq.classList.remove('hidden');

                btnReq.className = "px-4 py-1.5 text-[10px] font-bold rounded bg-white text-blue-600 shadow-sm transition border border-slate-200 flex items-center gap-2";
                btnActive.className = "px-4 py-1.5 text-[10px] font-bold rounded text-slate-500 hover:text-slate-700 transition";
            }
        };

        this.attachEvents(db);
        this.startListener(db);
    },

    cleanup() {
        if (partnersRef) partnersRef.off();
        delete window.switchPartnerTab;
    },

    // ============================================================
    // 🛠️ HELPER: Time Ago
    // ============================================================
    getTimeAgo(timestamp) {
        if(!timestamp) return "Never";
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if(hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    },

    attachEvents(db) {
        // --- PIN TOGGLE & MANAGE CLICK ---
        document.getElementById('active-list').addEventListener('click', (e) => {
            // PIN Toggle
            const pinBtn = e.target.closest('.toggle-pin');
            if (pinBtn) {
                const pin = pinBtn.dataset.pin;
                const span = pinBtn.previousElementSibling;
                const icon = pinBtn.querySelector('i');

                if (span.innerText === '••••') {
                    span.innerText = pin;
                    span.classList.add('text-slate-900', 'tracking-normal', 'bg-slate-100');
                    span.classList.remove('tracking-widest', 'text-slate-400', 'bg-transparent');
                    icon.className = 'fa-solid fa-eye-slash';
                } else {
                    span.innerText = '••••';
                    span.classList.add('tracking-widest', 'text-slate-400', 'bg-transparent');
                    span.classList.remove('text-slate-900', 'tracking-normal', 'bg-slate-100');
                    icon.className = 'fa-solid fa-eye';
                }
            }

            // Manage Button
            const manageBtn = e.target.closest('.btn-manage');
            if(manageBtn) {
                const data = JSON.parse(decodeURIComponent(manageBtn.dataset.json));
                this.openManageModal(manageBtn.dataset.id, data);
            }
        });

        // --- MANAGE MODAL LOGIC ---
        const manageModal = document.getElementById('manage-modal');
        document.getElementById('close-manage').addEventListener('click', () => manageModal.classList.add('hidden'));

        // Direct WhatsApp Button (New Feature)
        document.getElementById('btn-wa-direct').addEventListener('click', () => {
             if(currentPartnerData && currentPartnerId) {
                const url = `https://wa.me/91${currentPartnerId}`;
                window.open(url, '_blank');
             }
        });

        // Toggle Status
        document.getElementById('m-status-toggle').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const newStatus = isChecked ? 'offline' : 'disabled'; // Default to offline if enabled, agent must come online

            document.getElementById('m-status-text').innerText = isChecked ? 'Partner is ACTIVE' : 'Partner is DISABLED';
            document.getElementById('m-status-text').className = isChecked ? 'text-xs font-bold text-green-500' : 'text-xs font-bold text-red-500';

            db.ref('deliveryBoys/' + currentPartnerId).update({ status: newStatus });
        });

        // Open Recovery inside Manage
        document.getElementById('btn-open-recovery').addEventListener('click', () => {
            this.openRecoveryModal();
        });

        // Settlement
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

        // Save Details
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

        // Delete
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

        // Basic Info
        document.getElementById('m-name').innerText = p.name;
        document.getElementById('m-mobile').innerText = "+91 " + id;
        document.getElementById('m-pin-display').innerText = p.pin || '0000';

        // Stats
        document.getElementById('m-earnings').innerText = p.earnings || 0;
        document.getElementById('m-online-status').innerText = (p.status || 'OFFLINE').toUpperCase();
        document.getElementById('m-balance').innerText = p.walletBalance || 0;

        // Joined Date
        const joinDate = p.joinedAt ? new Date(p.joinedAt).toLocaleDateString() : 'Unknown';
        document.getElementById('m-joined').innerText = joinDate;

        // Last Seen
        document.getElementById('m-last-seen').innerText = this.getTimeAgo(p.lastHeartbeat);

        // Toggle Switch State
        const toggle = document.getElementById('m-status-toggle');
        const statusText = document.getElementById('m-status-text');

        if(p.status !== 'disabled') {
            toggle.checked = true;
            statusText.innerText = "Partner is ACTIVE";
            statusText.className = "text-xs font-bold text-green-500";
        } else {
            toggle.checked = false;
            statusText.innerText = "Partner is DISABLED";
            statusText.className = "text-xs font-bold text-red-500";
        }

        // Edit Inputs
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
                activeList.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400">No partners found.</div>`;
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

    // --- CARD GENERATOR (LIGHT THEME + FEATURES) ---
    createActiveCard(mobile, p) {
        const isOnline = p.status === 'online';
        const safeJson = encodeURIComponent(JSON.stringify(p));
        const batteryVal = p.battery || 0;
        const pin = p.pin || '0000';
        const lastSeen = this.getTimeAgo(p.lastHeartbeat); // Show on front card

        let battColor = 'text-green-500';
        if(batteryVal < 30) battColor = 'text-red-500';

        // Online Indicator Logic
        const statusDot = isOnline 
            ? `<span class="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>` 
            : `<span class="w-2.5 h-2.5 rounded-full bg-slate-300"></span>`;

        const statusText = isOnline ? "Online" : "Offline";

        return `
            <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-blue-200 transition group relative overflow-hidden">

                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                            ${p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-sm leading-tight">${p.name}</h3>
                            <div class="flex items-center gap-2 mt-0.5">
                                ${statusDot}
                                <span class="text-[10px] font-medium ${isOnline ? 'text-green-600' : 'text-slate-400'}">${statusText}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                         <div class="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            <i class="fa-solid fa-clock"></i> ${lastSeen}
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center border-t border-slate-50 pt-2 mt-1">
                    <p class="text-[11px] text-slate-500 font-mono tracking-wide"><i class="fa-solid fa-phone text-[9px] mr-1"></i> ${mobile}</p>
                    <div class="text-[10px] text-slate-500 flex items-center gap-1">
                        <i class="fa-solid fa-battery-half ${battColor}"></i> ${batteryVal}%
                    </div>
                </div>

                <div class="flex items-center justify-between gap-3 mt-1">

                    <div class="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 w-fit">
                        <span class="font-mono text-xs tracking-widest text-slate-400 font-bold select-none">••••</span>
                        <button class="toggle-pin text-slate-400 hover:text-blue-600 transition text-[10px] outline-none" data-pin="${pin}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>

                    <button class="btn-manage flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-2 text-xs font-bold" 
                        data-id="${mobile}" data-json="${safeJson}">
                        Manage <i class="fa-solid fa-angle-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    createRequestCard(mobile, p) {
        return `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-sm">${p.name}</h4>
                        <p class="text-[11px] text-slate-500 font-mono">+91 ${mobile}</p>
                    </div>
                    <span class="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-200">PENDING</span>
                </div>
                <div class="flex gap-2 mt-3">
                    <a href="https://wa.me/91${mobile}" target="_blank" class="flex-1 bg-slate-50 border border-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-bold text-center hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition">
                        <i class="fa-brands fa-whatsapp mr-1"></i> Check
                    </a>
                    <button class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition" onclick="alert('Approve logic here')">
                        APPROVE
                    </button>
                </div>
            </div>
        `;
    }
};