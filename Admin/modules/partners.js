// modules/partners.js

let partnersRef = null;
let currentPartnerId = null;
let currentPartnerData = null;

export default {
    async render(container, db) {
        // ============================================================
        // 🎨 UI RENDER
        // ============================================================
        container.innerHTML = `
            <div class="h-full flex flex-col relative fade-in bg-slate-50">

                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-3 shrink-0 px-4 pt-4 bg-white shadow-sm z-10">
                    <div>
                        <h2 class="text-xl font-bold text-slate-800 tracking-tight">Delivery Team</h2>
                        <p class="text-[10px] text-slate-500 font-medium">Manage Riders & Settlements</p>
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
                                    <p class="text-lg font-bold text-green-600">₹<span id="m-lifetime-earnings">0</span></p>
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
                                    <p class="text-[10px] text-slate-400 uppercase font-bold">Payable Earnings</p>
                                    <p class="text-xl font-bold text-slate-800">₹<span id="m-payable-earnings">0</span></p>
                                </div>
                                <div class="flex gap-2">
                                    <input type="number" id="settle-amount" placeholder="Amount Paid" class="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500">
                                    <button id="btn-settle" class="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition shadow-lg shadow-green-200">
                                        SETTLE
                                    </button>
                                </div>
                                <p class="text-[9px] text-slate-400 mt-2 border-b border-slate-100 pb-2">Amount will be deducted from Payable Earnings.</p>

                                <button id="btn-view-history" class="w-full text-center text-[10px] font-bold text-blue-600 mt-2 hover:underline flex items-center justify-center gap-1">
                                    <i class="fa-solid fa-clock-rotate-left"></i> View Settlement History
                                </button>

                                <div id="history-container" class="hidden mt-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar border-t border-slate-100 pt-2">
                                    <p class="text-center text-[10px] text-slate-400 py-2">Loading history...</p>
                                </div>
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

        // Tab Logic
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
        // --- REQUEST LIST APPROVE LOGIC ---
        document.getElementById('request-list').addEventListener('click', (e) => {
            const approveBtn = e.target.closest('.btn-approve-request');
            if (approveBtn) {
                const mobile = approveBtn.dataset.id;
                if(confirm("Approve this rider? They will be able to login immediately.")) {
                    // Update Status to offline (so they can login) and verified to true
                    db.ref('deliveryBoys/' + mobile).update({ 
                        status: 'offline', 
                        verified: true,
                        joinedAt: firebase.database.ServerValue.TIMESTAMP 
                    }).then(() => {
                        window.switchPartnerTab('active');
                    });
                }
            }
        });

        // --- ACTIVE LIST CLICKS ---
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

        document.getElementById('btn-wa-direct').addEventListener('click', () => {
             if(currentPartnerData && currentPartnerId) {
                const url = `https://wa.me/91${currentPartnerId}`;
                window.open(url, '_blank');
             }
        });

        document.getElementById('m-status-toggle').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const newStatus = isChecked ? 'offline' : 'disabled';

            document.getElementById('m-status-text').innerText = isChecked ? 'Partner is ACTIVE' : 'Partner is DISABLED';
            document.getElementById('m-status-text').className = isChecked ? 'text-xs font-bold text-green-500' : 'text-xs font-bold text-red-500';

            db.ref('deliveryBoys/' + currentPartnerId).update({ status: newStatus });
        });

        document.getElementById('btn-open-recovery').addEventListener('click', () => {
            this.openRecoveryModal();
        });

        // --- SETTLEMENT LOGIC (UPDATED: USES EARNINGS) ---
        document.getElementById('btn-settle').addEventListener('click', () => {
            const amountInput = document.getElementById('settle-amount');
            const amount = parseFloat(amountInput.value);
            if(!amount || amount <= 0) return alert("Enter valid amount");

            // Get Current Payable Earnings (Not Wallet Balance)
            const currentPayable = parseFloat(document.getElementById('m-payable-earnings').innerText);
            const newPayable = currentPayable - amount;

            // 1. Update Earnings (Reduces payable amount)
            db.ref('deliveryBoys/' + currentPartnerId).update({ earnings: newPayable });

            // 2. Add History Record (Keep this same)
            const historyRef = db.ref('deliveryBoys/' + currentPartnerId + '/settlementHistory');
            historyRef.push({
                amount: amount,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                alert(`Settled ₹${amount}.`);
                amountInput.value = '';
                // The on('value') listener will automatically update the UI number
                // Refresh History list
                this.renderHistory(currentPartnerId, db);
            });
        });

        // --- VIEW HISTORY TOGGLE ---
        document.getElementById('btn-view-history').addEventListener('click', () => {
            const container = document.getElementById('history-container');
            if(container.classList.contains('hidden')) {
                container.classList.remove('hidden');
                this.renderHistory(currentPartnerId, db);
            } else {
                container.classList.add('hidden');
            }
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

    // --- RENDER HISTORY HELPER ---
    renderHistory(id, db) {
        const list = document.getElementById('history-container');
        list.innerHTML = `<div class="text-center py-2"><i class="fa-solid fa-spinner fa-spin text-blue-500"></i></div>`;

        db.ref('deliveryBoys/' + id + '/settlementHistory').limitToLast(10).once('value', snap => {
            list.innerHTML = '';
            if(!snap.exists()) {
                list.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-2">No history found.</p>`;
                return;
            }

            const history = [];
            snap.forEach(child => history.unshift(child.val())); // Reverse order

            history.forEach(h => {
                const date = new Date(h.timestamp).toLocaleDateString();
                const time = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                list.innerHTML += `
                    <div class="flex justify-between items-center text-[10px] border-b border-slate-50 last:border-0 py-1.5 px-1">
                        <div class="text-slate-500">
                            <span class="font-bold text-slate-700">${date}</span> at ${time}
                        </div>
                        <div class="font-bold text-green-600">
                            - ₹${h.amount}
                        </div>
                    </div>
                `;
            });
        });
    },

    openManageModal(id, p) {
        currentPartnerId = id;
        currentPartnerData = p; 
        const modal = document.getElementById('manage-modal');

        document.getElementById('history-container').classList.add('hidden');

        // Basic Info
        document.getElementById('m-name').innerText = p.name;
        document.getElementById('m-mobile').innerText = "+91 " + id;
        document.getElementById('m-pin-display').innerText = p.pin || '0000';

        // Stats
        // 1. Lifetime Earnings (Static/Cumulative)
        document.getElementById('m-lifetime-earnings').innerText = p.lifetimeEarnings || 0;

        // 2. Payable Earnings (Dynamic - Updated on settlement)
        document.getElementById('m-payable-earnings').innerText = p.earnings || 0; 

        document.getElementById('m-online-status').innerText = (p.status || 'OFFLINE').toUpperCase();

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

                // If manage modal is open for this partner, live update the values
                if(!document.getElementById('manage-modal').classList.contains('hidden') && currentPartnerId === mobile) {
                    if(document.getElementById('m-payable-earnings')) {
                         document.getElementById('m-payable-earnings').innerText = p.earnings || 0;
                         document.getElementById('m-lifetime-earnings').innerText = p.lifetimeEarnings || 0;
                    }
                }

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
        const lastSeen = this.getTimeAgo(p.lastHeartbeat);

        let battColor = 'text-green-500';
        if(batteryVal < 30) battColor = 'text-red-500';

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
        const vehicle = p.vehicle ? p.vehicle.toUpperCase() : 'UNKNOWN';
        const joinDate = p.joinedAt ? new Date(p.joinedAt).toLocaleDateString() : 'Recently';

        return `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-sm">${p.name}</h4>
                        <p class="text-[11px] text-slate-500 font-mono">+91 ${mobile}</p>
                    </div>
                    <span class="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-200">PENDING</span>
                </div>

                <div class="flex items-center gap-4 my-3 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div class="flex items-center gap-1.5">
                        <i class="fa-solid fa-calendar-days text-slate-400"></i>
                        <span>Joined: <b class="text-slate-700">${joinDate}</b></span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <i class="fa-solid fa-bicycle text-slate-400"></i>
                        <span>Vehicle: <b class="text-slate-700">${vehicle}</b></span>
                    </div>
                </div>

                <div class="flex gap-2">
                    <a href="https://wa.me/91${mobile}" target="_blank" class="flex-1 bg-slate-50 border border-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-bold text-center hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition">
                        <i class="fa-brands fa-whatsapp mr-1"></i> Check
                    </a>
                    <button class="btn-approve-request flex-1 bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition" data-id="${mobile}">
                        APPROVE
                    </button>
                </div>
            </div>
        `;
    }
};