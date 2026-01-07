// modules/wholesalers.js

let wholesalersRef = null;

export default {
    async render(container, db) {
        // 🔥 CHANGE 1: Main container ko 'h-full' aur 'flex flex-col' diya taaki height fix ho jaye
        container.innerHTML = `
            <div class="h-full flex flex-col relative fade-in">

                <div class="flex justify-between items-end border-b border-slate-800 pb-3 shrink-0 px-2 pt-2">
                    <div>
                        <h2 class="text-xl font-bold text-white tracking-tight">Wholesalers</h2>
                        <p class="text-[10px] text-slate-400 font-medium">Verify & Manage Shops</p>
                    </div>
                </div>

                <div id="wholesaler-grid" class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 pb-24 grid grid-cols-1 gap-3 content-start">
                    <div class="col-span-full text-center py-20 text-slate-500">
                        <i class="fa-solid fa-circle-notch fa-spin mr-2 text-blue-500"></i> Loading Requests...
                    </div>
                </div>

                <div id="edit-modal" class="fixed inset-0 z-[200] bg-slate-950 hidden flex flex-col animate-slide-in">

                    <div class="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shrink-0 safe-area-top shadow-md z-10">
                        <h3 class="font-bold text-white text-lg flex items-center gap-3">
                            <button id="close-modal" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95">
                                <i class="fa-solid fa-arrow-left"></i>
                            </button>
                            Edit Shop Details
                        </h3>
                        <div class="px-2 py-1 bg-blue-900/30 border border-blue-500/30 rounded text-[10px] text-blue-400 font-bold uppercase">
                            Admin Mode
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 bg-slate-950">
                        <input type="hidden" id="edit-id">

                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                            <div class="flex justify-between items-center mb-3">
                                <label class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                    <i class="fa-solid fa-map-pin mr-1"></i> Geo-Location
                                </label>
                                <span class="text-[9px] text-slate-500">Auto-detect advised</span>
                            </div>

                            <div class="grid grid-cols-2 gap-3 mb-4">
                                <div class="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                                    <span class="text-[9px] text-slate-500 block uppercase font-bold">Latitude</span>
                                    <input type="text" id="edit-lat" class="w-full bg-transparent text-sm text-white font-mono focus:outline-none" readonly placeholder="0.00">
                                </div>
                                <div class="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                                    <span class="text-[9px] text-slate-500 block uppercase font-bold">Longitude</span>
                                    <input type="text" id="edit-lng" class="w-full bg-transparent text-sm text-white font-mono focus:outline-none" readonly placeholder="0.00">
                                </div>
                            </div>

                            <button id="btn-get-gps" class="w-full py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95">
                                <i class="fa-solid fa-location-crosshairs"></i> DETECT CURRENT LOCATION
                            </button>
                        </div>

                        <div class="space-y-5">
                            <div class="relative group">
                                <label class="absolute -top-2 left-3 bg-slate-950 px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-blue-500 transition">SHOP NAME</label>
                                <input type="text" id="edit-name" class="w-full bg-transparent border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:bg-slate-900 transition placeholder-slate-700">
                            </div>

                            <div class="relative group">
                                <label class="absolute -top-2 left-3 bg-slate-950 px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-blue-500 transition">MOBILE NUMBER</label>
                                <input type="number" id="edit-mobile" class="w-full bg-transparent border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:bg-slate-900 transition placeholder-slate-700 font-mono">
                            </div>

                            <div class="relative group">
                                <label class="absolute -top-2 left-3 bg-slate-950 px-1 text-[10px] font-bold text-slate-400 group-focus-within:text-blue-500 transition">FULL ADDRESS</label>
                                <textarea id="edit-address" class="w-full bg-transparent border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:bg-slate-900 transition h-28 resize-none leading-relaxed placeholder-slate-700"></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-slate-900 border-t border-slate-800 shrink-0 safe-area-bottom z-10">
                        <button id="btn-save-edit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-95">
                            <i class="fa-solid fa-floppy-disk"></i> Update Details
                        </button>
                    </div>
                </div>
            </div>

            <style>
                /* Right to Left Slide Animation for Full Screen Feel */
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in {
                    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; margin: 0; 
                }
            </style>
        `;

        this.attachEvents(db);
        this.startListener(db);
    },

    cleanup() {
        if (wholesalersRef) wholesalersRef.off();
    },

    attachEvents(db) {
        const grid = document.getElementById('wholesaler-grid');
        const modal = document.getElementById('edit-modal');
        const closeModalBtn = document.getElementById('close-modal');
        const saveBtn = document.getElementById('btn-save-edit');
        const gpsBtn = document.getElementById('btn-get-gps');

        // Close Modal
        const hideModal = () => {
            modal.classList.add('hidden');
            // Reset fields
            document.getElementById('btn-get-gps').innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> DETECT CURRENT LOCATION`;
        };
        closeModalBtn.addEventListener('click', hideModal);

        // Grid Actions
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if(!btn) return;

            const id = btn.dataset.id;
            const action = btn.dataset.action;

            if (action === 'verify') {
                if(confirm("Verify this Wholesaler?")) {
                    db.ref('wholesalerRequests/' + id).update({ status: 'approved', verifiedAt: firebase.database.ServerValue.TIMESTAMP });
                }
            } else if (action === 'disable') {
                if(confirm("Disable this Wholesaler?")) {
                    db.ref('wholesalerRequests/' + id).update({ status: 'disabled' });
                }
            } else if (action === 'delete') {
                if(confirm("Permanently Delete this Shop?")) {
                    db.ref('wholesalerRequests/' + id).remove();
                }
            } else if (action === 'edit') {
                const data = JSON.parse(decodeURIComponent(btn.dataset.json));
                this.openEditModal(id, data);
            }
        });

        // GPS Button Logic
        gpsBtn.addEventListener('click', () => {
            if(!navigator.geolocation) return alert("Geolocation not supported.");

            const originalText = gpsBtn.innerHTML;
            gpsBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> SATELLITE PING...';
            gpsBtn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    document.getElementById('edit-lat').value = position.coords.latitude.toFixed(7);
                    document.getElementById('edit-lng').value = position.coords.longitude.toFixed(7);

                    gpsBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> CAPTURED!';
                    gpsBtn.classList.remove('text-blue-400', 'border-blue-500/30');
                    gpsBtn.classList.add('text-green-400', 'border-green-500/50', 'bg-green-900/20');

                    setTimeout(() => {
                        gpsBtn.disabled = false;
                        gpsBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> RE-DETECT';
                         gpsBtn.classList.add('text-blue-400', 'border-blue-500/30');
                        gpsBtn.classList.remove('text-green-400', 'border-green-500/50', 'bg-green-900/20');
                    }, 2000);
                },
                (error) => {
                    alert("GPS Error: " + error.message);
                    gpsBtn.innerHTML = originalText;
                    gpsBtn.disabled = false;
                },
                { enableHighAccuracy: true }
            );
        });

        // Save Logic
        saveBtn.addEventListener('click', () => {
            const id = document.getElementById('edit-id').value;
            if(!id) return;

            saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> UPDATING...';

            const updates = {
                shopName: document.getElementById('edit-name').value,
                ownerMobile: document.getElementById('edit-mobile').value,
                address: document.getElementById('edit-address').value,
                location: {
                    lat: parseFloat(document.getElementById('edit-lat').value) || 0,
                    lng: parseFloat(document.getElementById('edit-lng').value) || 0
                }
            };

            db.ref('wholesalerRequests/' + id).update(updates).then(() => {
                saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> SUCCESS';
                setTimeout(() => {
                    hideModal();
                    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Details';
                }, 800);

                // Simple Toast
                const toast = document.getElementById('toast');
                if(toast) {
                    document.getElementById('toast-msg').innerText = "Details Updated!";
                    toast.classList.add('toast-visible');
                    setTimeout(() => toast.classList.remove('toast-visible'), 3000);
                }
            });
        });
    },

    openEditModal(id, data) {
        const modal = document.getElementById('edit-modal');

        // Fill Data
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-name').value = data.shopName || '';
        document.getElementById('edit-mobile').value = data.ownerMobile || '';
        document.getElementById('edit-address').value = data.address || '';
        document.getElementById('edit-lat').value = data.location?.lat || '';
        document.getElementById('edit-lng').value = data.location?.lng || '';

        // Reset GPS Style
        const gpsBtn = document.getElementById('btn-get-gps');
        gpsBtn.className = "w-full py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95";
        gpsBtn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> DETECT CURRENT LOCATION`;

        // Show Modal
        modal.classList.remove('hidden');
    },

    startListener(db) {
        const grid = document.getElementById('wholesaler-grid');
        wholesalersRef = db.ref('wholesalerRequests');

        wholesalersRef.on('value', snap => {
            if(!grid) return;

            grid.innerHTML = '';
            if (!snap.exists()) {
                grid.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900 rounded-xl border border-slate-800 border-dashed">
                    <i class="fa-solid fa-store-slash text-3xl mb-2 opacity-50"></i>
                    <span class="text-xs">No wholesaler requests found.</span>
                </div>`;
                return;
            }

            const reqs = snap.val();
            const sorted = Object.entries(reqs).sort((a, b) => {
                const statusOrder = { 'pending': 1, 'approved': 2, 'disabled': 3 };
                return (statusOrder[a[1].status] || 99) - (statusOrder[b[1].status] || 99);
            });

            sorted.forEach(([id, w]) => {
                grid.innerHTML += this.createCard(id, w);
            });
        });
    },

    createCard(id, w) {
        let statusBadge = '';
        let actionBtn = '';
        let borderClass = 'border-slate-800';
        const safeJson = encodeURIComponent(JSON.stringify(w));

        if(w.status === 'pending') {
            statusBadge = `<span class="bg-amber-500 text-slate-900 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide animate-pulse">Pending</span>`;
            actionBtn = `<button data-id="${id}" data-action="verify" class="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-[10px] font-bold transition shadow-lg shadow-green-900/20">VERIFY</button>`;
        } else if(w.status === 'approved') {
            statusBadge = `<span class="text-green-500 text-[10px] font-bold uppercase flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Verified</span>`;
            actionBtn = `<button data-id="${id}" data-action="disable" class="flex-1 bg-slate-800 text-slate-400 hover:bg-red-900/30 hover:text-red-400 border border-slate-700 hover:border-red-900/50 py-2 rounded-lg text-[10px] font-bold transition">DISABLE</button>`;
            borderClass = 'border-green-900/20';
        } else {
            statusBadge = `<span class="text-red-500 text-[10px] font-bold uppercase flex items-center gap-1"><i class="fa-solid fa-ban"></i> Disabled</span>`;
            actionBtn = `<button data-id="${id}" data-action="verify" class="flex-1 bg-slate-800 text-slate-400 hover:bg-green-600 hover:text-white border border-slate-700 py-2 rounded-lg text-[10px] font-bold transition">ENABLE</button>`;
            borderClass = 'border-red-900/20 opacity-75';
        }

        const mapLink = w.location ? `http://googleusercontent.com/maps.google.com/3{w.location.lat},${w.location.lng}` : '#';

        return `
            <div class="bg-slate-900 border ${borderClass} rounded-xl p-4 flex flex-col gap-3 shadow-md relative group hover:border-slate-700 transition">
                <div class="flex justify-between items-start">
                    <div class="overflow-hidden">
                        <h3 class="font-bold text-white text-sm truncate pr-2">${w.shopName}</h3>
                        <a href="tel:${w.ownerMobile}" class="text-[11px] text-blue-400 font-mono hover:underline flex items-center gap-1 mt-0.5"><i class="fa-solid fa-phone text-[10px]"></i> ${w.ownerMobile}</a>
                    </div>
                    ${statusBadge}
                </div>

                <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800/50">
                    <p class="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-1.5">${w.address}</p>
                    <a href="${mapLink}" target="_blank" class="text-[10px] text-slate-500 font-bold hover:text-blue-400 transition flex items-center gap-1 w-max">
                        <i class="fa-solid fa-map-location-dot"></i> Google Maps
                    </a>
                </div>

                <div class="flex justify-between items-center text-[9px] text-slate-600 border-t border-slate-800/50 pt-2">
                    <span>By: <b class="text-slate-500">${w.partnerName || 'Admin'}</b></span>
                    <span>${new Date(w.timestamp).toLocaleDateString()}</span>
                </div>

                <div class="flex gap-2 mt-1">
                    ${actionBtn}
                    <button data-id="${id}" data-action="edit" data-json="${safeJson}" class="w-9 bg-blue-600/10 text-blue-500 border border-blue-600/20 hover:bg-blue-600 hover:text-white rounded-lg flex items-center justify-center transition active:scale-95"><i class="fa-solid fa-pen"></i></button>
                    <button data-id="${id}" data-action="delete" class="w-9 bg-slate-800 text-slate-500 hover:bg-red-600 hover:text-white rounded-lg flex items-center justify-center transition active:scale-95"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }
};