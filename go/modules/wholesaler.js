// ==========================================
// FILE: modules/wholesaler.js (Updated)
// ==========================================

import { db } from './firebase-config.js';
import { showToast } from './ui.js';

let myWholesalerQuery = null;

// 1. FETCH ALL APPROVED SHOPS (For Map & Global Use) -> NEW FUNCTION ADDED
export function fetchAllApprovedShops() {
    db.ref('wholesalerRequests').orderByChild('status').equalTo('approved').on('value', snap => {
        window.Ramazone.approvedWholesalers = []; // Clear old data

        if(snap.exists()) {
            snap.forEach(child => {
                const shop = child.val();
                // Ensure location exists to avoid errors
                if(shop.location && shop.location.lat && shop.location.lng) {
                    window.Ramazone.approvedWholesalers.push({ 
                        id: child.key, 
                        ...shop 
                    });
                }
            });
            console.log("✅ Shops Loaded for Map:", window.Ramazone.approvedWholesalers.length);

            // Agar Map khula hai, to turant update karo
            if(document.getElementById('liveMapSection') && !document.getElementById('liveMapSection').classList.contains('hidden')) {
                import('./map.js').then(m => {
                    m.updateMapVisuals();
                    m.renderActiveWholesalerWidget();
                });
            }
        }
    });
}

// 2. OPEN MODAL & INIT
export function openModal() {
    const modal = document.getElementById('wholesalerModal');
    if(modal) {
        modal.classList.remove('hidden');
        resetForm();
        loadMyRequests();
    }
}

// 3. CONNECT LIVE LOCATION (GPS)
export function connectLocation() {
    const btn = document.getElementById('btnConnectLoc');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting...';

    if(!navigator.geolocation) {
        alert("GPS not supported");
        btn.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> GPS Failed';
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        document.getElementById('wsLat').value = lat;
        document.getElementById('wsLng').value = lng;

        btn.innerHTML = '<i class="fa-solid fa-check"></i> Location Connected';
        btn.classList.replace('bg-blue-50', 'bg-green-50');
        btn.classList.replace('text-blue-600', 'text-green-600');

        // Auto-fetch Address
        const addrField = document.getElementById('wsAddress');
        addrField.value = "Fetching address details...";

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            addrField.value = data && data.display_name ? data.display_name : `Lat: ${lat}, Lng: ${lng}`;
        } catch(e) {
            addrField.value = `Lat: ${lat}, Lng: ${lng} (Type Address manually)`;
        }

    }, (err) => {
        alert("GPS Access Denied: " + err.message);
        btn.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Retry Location';
    }, { enableHighAccuracy: true });
}

// 4. SUBMIT REQUEST
export function submitRequest() {
    const name = document.getElementById('wsName').value.trim();
    const mobile = document.getElementById('wsMobile').value.trim();
    const address = document.getElementById('wsAddress').value.trim();
    const lat = document.getElementById('wsLat').value;
    const lng = document.getElementById('wsLng').value;
    const editId = document.getElementById('wsEditId').value;
    const user = window.Ramazone.user;

    if(!name || !mobile || !address) return showToast("Fill all fields");
    if(!lat || !lng) return showToast("Connect Location First");

    const data = {
        partnerMobile: String(user.mobile),
        partnerName: user.name,
        shopName: name,
        ownerMobile: mobile,
        address: address,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        status: 'pending', 
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    if(editId) {
        db.ref('wholesalerRequests/' + editId).update(data).then(() => { 
            showToast("Shop Updated!"); 
            resetForm(); 
        });
    } else {
        db.ref('wholesalerRequests').push(data).then(() => { 
            showToast("Submitted Successfully!"); 
            resetForm(); 
        });
    }
}

// 5. LOAD MY REQUESTS (For Modal List Only)
function loadMyRequests() {
    const list = document.getElementById('myWholesalerList');
    if(!list) return;

    list.innerHTML = '<p class="text-center text-gray-500 text-xs py-2"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>';

    if (myWholesalerQuery) myWholesalerQuery.off();

    myWholesalerQuery = db.ref('wholesalerRequests').orderByChild('partnerMobile').equalTo(String(window.Ramazone.user.mobile));

    myWholesalerQuery.on('value', snap => {
        list.innerHTML = '';
        if(snap.exists()) {
            const requests = [];
            snap.forEach(c => requests.push({key: c.key, ...c.val()}));
            requests.reverse(); 

            requests.forEach(req => {
                let statusBadge = req.status === 'approved' ? `<span class="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded border border-green-200 uppercase font-bold"><i class="fa-solid fa-check-circle mr-1"></i> Verified</span>` : 
                                 (req.status === 'pending' ? `<span class="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded border border-amber-200 uppercase font-bold">Pending</span>` : 
                                 `<span class="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded border border-red-200 uppercase font-bold">Disabled</span>`);

                let actions = req.status === 'pending' ? `
                    <div class="flex gap-2 mt-2">
                        <button onclick="window.editWsRequest('${req.key}', '${req.shopName}', '${req.ownerMobile}', '${req.address}', ${req.location.lat}, ${req.location.lng})" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-gray-700 flex-1 font-bold">Edit</button>
                        <button onclick="window.deleteWsRequest('${req.key}')" class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded border border-red-200 flex-1 font-bold">Delete</button>
                    </div>` : '';

                list.innerHTML += `
                    <div class="bg-white p-3 rounded-xl border border-gray-200 ${req.status === 'disabled' ? 'opacity-50' : ''} shadow-sm">
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="font-bold text-gray-900 text-sm">${req.shopName}</h4>
                            ${statusBadge}
                        </div>
                        <p class="text-[10px] text-gray-500 font-mono mb-1"><i class="fa-solid fa-phone mr-1"></i>${req.ownerMobile}</p>
                        <p class="text-[10px] text-gray-600 truncate"><i class="fa-solid fa-map-pin mr-1"></i>${req.address}</p>
                        ${actions}
                    </div>
                `;
            });
        } else {
            list.innerHTML = '<p class="text-center text-gray-500 text-xs py-4">You haven\'t added any shops yet.</p>';
        }
    });
}

// 6. HELPER: RESET FORM
function resetForm() {
    document.getElementById('wsName').value = '';
    document.getElementById('wsMobile').value = '';
    document.getElementById('wsAddress').value = '';
    document.getElementById('wsLat').value = '';
    document.getElementById('wsLng').value = '';
    document.getElementById('wsEditId').value = '';

    const btnLoc = document.getElementById('btnConnectLoc');
    if(btnLoc) {
        btnLoc.innerHTML = '<i class="fa-solid fa-location-crosshairs text-lg"></i> Connect Live Location';
        btnLoc.classList.replace('bg-green-50', 'bg-blue-50');
        btnLoc.classList.replace('text-green-600', 'text-blue-600');
    }
    document.getElementById('btnWsSubmit').innerText = "SUBMIT FOR VERIFICATION";
}

// 7. GLOBAL ACTIONS
window.editWsRequest = function(key, name, mobile, address, lat, lng) {
    document.getElementById('wsEditId').value = key;
    document.getElementById('wsName').value = name;
    document.getElementById('wsMobile').value = mobile;
    document.getElementById('wsAddress').value = address;
    document.getElementById('wsLat').value = lat;
    document.getElementById('wsLng').value = lng;

    const btnLoc = document.getElementById('btnConnectLoc');
    btnLoc.innerHTML = '<i class="fa-solid fa-check"></i> Location Set (Tap to Update)';
    btnLoc.classList.replace('bg-blue-50', 'bg-green-50');
    btnLoc.classList.replace('text-blue-600', 'text-green-600');

    document.getElementById('btnWsSubmit').innerText = "UPDATE REQUEST";

    const modal = document.getElementById('wholesalerModal');
    const scrollContainer = modal.querySelector('.overflow-y-auto');
    if(scrollContainer) scrollContainer.scrollTop = 0;
}

window.deleteWsRequest = function(key) {
    if(confirm("Delete this shop request?")) {
        db.ref('wholesalerRequests/' + key).remove();
    }
}