// ==========================================
// WHOLESALER SHOP MANAGEMENT
// ==========================================

import { db } from '../config.js';
import { getUser } from '../core/state.js';
import { showToast, toggleClass } from '../utils.js';

let myQuery = null;

// DOM Elements
const els = {
    modal: document.getElementById('modal-wholesaler'),
    btnClose: document.querySelector('#modal-wholesaler .btn-close-modal'),
    btnOpen: document.getElementById('navWholesaler'),

    // Form
    name: document.getElementById('wsName'),
    mobile: document.getElementById('wsMobile'),
    addr: document.getElementById('wsAddress'),
    lat: document.getElementById('wsLat'),
    lng: document.getElementById('wsLng'),
    editId: document.getElementById('wsEditId'),
    btnLoc: document.getElementById('btnConnectLoc'),
    btnSubmit: document.getElementById('btnWsSubmit'),

    // List
    list: document.getElementById('myWholesalerList')
};

// ============================
// INITIALIZATION
// ============================

// Called by Router/Main when module loads
export function initWholesalerFeature() {
    console.log("Initializing Wholesaler Module...");

    if (els.btnOpen) els.btnOpen.onclick = openModal;
    if (els.btnClose) els.btnClose.onclick = closeModal;
    if (els.btnLoc) els.btnLoc.onclick = connectLocation;
    if (els.btnSubmit) els.btnSubmit.onclick = submitRequest;

    // Setup List Action Delegation (Edit/Delete)
    if (els.list) els.list.onclick = handleListActions;
}

function openModal() {
    resetForm();
    els.modal.classList.remove('hidden');
    loadMyRequests();

    // Close sidebar if open
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('menuOverlay').classList.remove('open');
}

function closeModal() {
    els.modal.classList.add('hidden');
    if (myQuery) {
        myQuery.off();
        myQuery = null;
    }
}

// ============================
// FORM LOGIC
// ============================

function resetForm() {
    els.name.value = '';
    els.mobile.value = '';
    els.addr.value = '';
    els.lat.value = '';
    els.lng.value = '';
    els.editId.value = '';
    els.btnLoc.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Connect Location';
    els.btnLoc.classList.remove('bg-green-50', 'text-green-600');
    els.btnLoc.classList.add('bg-blue-50', 'text-blue-600');
    els.btnSubmit.innerText = "SUBMIT FOR VERIFICATION";
}

function connectLocation() {
    els.btnLoc.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting...';

    if (!navigator.geolocation) {
        alert("GPS not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        els.lat.value = lat;
        els.lng.value = lng;

        els.btnLoc.innerHTML = '<i class="fa-solid fa-check"></i> Location Locked';
        els.btnLoc.classList.replace('bg-blue-50', 'bg-green-50');
        els.btnLoc.classList.replace('text-blue-600', 'text-green-600');

        // Reverse Geocoding (Nominatim)
        els.addr.value = "Fetching address...";
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            els.addr.value = data.display_name || `Lat: ${lat}, Lng: ${lng}`;
        } catch(e) {
            els.addr.value = `Lat: ${lat}, Lng: ${lng}`;
        }
    }, (err) => {
        alert("GPS Error: " + err.message);
        els.btnLoc.innerHTML = 'Retry Location';
    }, { enableHighAccuracy: true });
}

function submitRequest() {
    const user = getUser();
    const data = {
        partnerMobile: String(user.mobile),
        partnerName: user.name,
        shopName: els.name.value.trim(),
        ownerMobile: els.mobile.value.trim(),
        address: els.addr.value.trim(),
        location: { lat: parseFloat(els.lat.value), lng: parseFloat(els.lng.value) },
        status: 'pending',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    if (!data.shopName || !data.ownerMobile || !data.address) return showToast("Fill all fields");
    if (!data.location.lat) return showToast("Connect Location First");

    const editId = els.editId.value;

    if (editId) {
        db.ref('wholesalerRequests/' + editId).update(data)
          .then(() => { showToast("Updated Successfully!"); resetForm(); });
    } else {
        db.ref('wholesalerRequests').push(data)
          .then(() => { showToast("Submitted Successfully!"); resetForm(); });
    }
}

// ============================
// LIST LOGIC
// ============================

function loadMyRequests() {
    const user = getUser();
    els.list.innerHTML = '<p class="text-center text-gray-400 text-xs mt-4">Loading...</p>';

    myQuery = db.ref('wholesalerRequests').orderByChild('partnerMobile').equalTo(String(user.mobile));

    myQuery.on('value', snap => {
        els.list.innerHTML = '';
        if (!snap.exists()) {
            els.list.innerHTML = '<p class="text-center text-gray-400 text-xs mt-4">No shops added yet.</p>';
            return;
        }

        const reqs = [];
        snap.forEach(c => reqs.push({key: c.key, ...c.val()}));
        reqs.reverse(); // Newest first

        reqs.forEach(r => {
            const badge = r.status === 'approved' ? '<span class="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] border border-green-200 font-bold">Verified</span>' :
                          (r.status === 'pending' ? '<span class="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200 font-bold">Pending</span>' : 
                          '<span class="text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] border border-red-200 font-bold">Disabled</span>');

            const actions = r.status === 'pending' ? `
                <div class="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button data-action="edit" data-key="${r.key}" class="flex-1 py-1.5 bg-gray-50 text-gray-700 text-xs font-bold rounded hover:bg-gray-100">Edit</button>
                    <button data-action="delete" data-key="${r.key}" class="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100">Delete</button>
                </div>` : '';

            // Using JSON.stringify for edit data passing is tricky in HTML, we'll fetch from array or DOM
            // Instead, we attach data to the DOM element in memory or just use the object since we have 'reqs'
            // For simplicity in module, we will stick to dataset key lookup

            const card = document.createElement('div');
            card.className = "bg-white p-3 rounded-xl border border-gray-200 shadow-sm";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-1"><h4 class="font-bold text-gray-900 text-sm">${r.shopName}</h4>${badge}</div>
                <p class="text-[10px] text-gray-500 font-mono mb-1"><i class="fa-solid fa-phone mr-1"></i>${r.ownerMobile}</p>
                <p class="text-[10px] text-gray-600 truncate"><i class="fa-solid fa-map-pin mr-1"></i>${r.address}</p>
                ${actions}
            `;

            // Attach data object for edit
            if(r.status === 'pending') {
                const editBtn = card.querySelector('[data-action="edit"]');
                if(editBtn) editBtn.dataObj = r;
            }

            els.list.appendChild(card);
        });
    });
}

function handleListActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const key = btn.dataset.key;
    const action = btn.dataset.action;

    if (action === 'delete') {
        if(confirm("Delete this request?")) {
            db.ref('wholesalerRequests/' + key).remove();
        }
    }
    else if (action === 'edit') {
        const r = btn.dataObj; // Retrieve attached object
        if(!r) return;

        els.editId.value = key;
        els.name.value = r.shopName;
        els.mobile.value = r.ownerMobile;
        els.addr.value = r.address;
        els.lat.value = r.location.lat;
        els.lng.value = r.location.lng;

        els.btnLoc.innerHTML = '<i class="fa-solid fa-check"></i> Location Set';
        els.btnSubmit.innerText = "UPDATE REQUEST";

        // Scroll to top
        els.modal.querySelector('.overflow-y-auto').scrollTop = 0;
    }
}