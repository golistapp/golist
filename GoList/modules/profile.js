// --- FILE: /modules/profile.js ---
// Purpose: Profile Settings, Address Management, Security (PIN), and Support/Policies

(function() {
    console.log("👤 Profile Module Loaded");

    // --- 1. PROFILE SETTINGS UI ---
    window.openProfileSettings = function() {
        let modal = document.getElementById('profileSettingsModal');

        // Agar modal HTML mein nahi hai to error (home.html mein empty div hona chahiye)
        if (!modal) {
            console.error("Error: profileSettingsModal div missing in home.html");
            return;
        }

        const session = window.session;
        const mobile = session ? session.mobile : '...';
        const name = session ? session.name : 'Guest';

        // Render UI
        modal.innerHTML = `
            <div class="fixed inset-0 z-[60] bg-slate-50 flex flex-col h-full animate-[fadeIn_0.2s_ease-out] overflow-y-auto">

                <div class="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
                     <button onclick="closeProfileSettings()" class="w-8 h-8 rounded-full bg-slate-50 text-slate-500 hover:text-golist flex items-center justify-center transition active:scale-95">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h3 class="font-bold text-lg text-slate-800">Profile & Settings</h3>
                    <div class="w-8"></div> </div>

                <div class="p-5 pb-20 space-y-6">

                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-golist to-green-300"></div>

                        <div class="w-24 h-24 rounded-full p-1 border-2 border-slate-100 mb-3 relative group">
                            <img id="settingProfileImg" src="https://via.placeholder.com/150" class="w-full h-full rounded-full object-cover shadow-inner">
                             <label class="absolute bottom-1 right-1 bg-slate-800 text-white w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition hover:bg-black">
                                <i class="fa-solid fa-camera text-[10px]"></i>
                                <input type="file" class="hidden" accept="image/*" onchange="if(window.uploadCompressedLogo) window.uploadCompressedLogo(this)">
                            </label>
                        </div>

                        <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">${name}</h2>
                        <p class="text-sm font-medium text-slate-400 mt-1">+91 ${mobile}</p>
                    </div>

                    <div>
                        <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Account Settings</h4>
                        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                            <div onclick="openAddressModal()" class="flex items-center justify-between p-4 border-b border-slate-50 active:bg-slate-50 transition cursor-pointer group">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg group-hover:bg-indigo-100 transition">
                                        <i class="fa-solid fa-location-dot"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-slate-800 text-sm">My Address</h3>
                                        <p class="text-[10px] text-slate-400 font-medium">Set delivery location</p>
                                    </div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-indigo-500 transition"></i>
                            </div>

                            <div onclick="openPinModal()" class="flex items-center justify-between p-4 active:bg-slate-50 transition cursor-pointer group">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center text-lg group-hover:bg-orange-100 transition">
                                        <i class="fa-solid fa-key"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-slate-800 text-sm">Change PIN</h3>
                                        <p class="text-[10px] text-slate-400 font-medium">Secure your account</p>
                                    </div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-orange-500 transition"></i>
                            </div>

                        </div>
                    </div>

                    <div>
                        <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Help & Info</h4>
                        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                            <div onclick="fetchDynamicContent('video')" class="flex items-center justify-between p-4 border-b border-slate-50 active:bg-slate-50 transition cursor-pointer group">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-lg group-hover:bg-red-100 transition">
                                        <i class="fa-brands fa-youtube"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-slate-800 text-sm">How to Use App</h3>
                                        <p class="text-[10px] text-slate-400 font-medium">Watch tutorial video</p>
                                    </div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-red-500 transition"></i>
                            </div>

                            <div onclick="fetchDynamicContent('policy')" class="flex items-center justify-between p-4 border-b border-slate-50 active:bg-slate-50 transition cursor-pointer group">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-lg group-hover:bg-slate-200 transition">
                                        <i class="fa-solid fa-shield-halved"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-slate-800 text-sm">Policies & Terms</h3>
                                        <p class="text-[10px] text-slate-400 font-medium">Read our rules</p>
                                    </div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-slate-500 transition"></i>
                            </div>

                             <div onclick="openSupportOptions()" class="flex items-center justify-between p-4 active:bg-slate-50 transition cursor-pointer group">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-green-50 text-golist flex items-center justify-center text-lg group-hover:bg-green-100 transition">
                                        <i class="fa-brands fa-whatsapp"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-slate-800 text-sm">Contact Support</h3>
                                        <p class="text-[10px] text-slate-400 font-medium">Chat with us</p>
                                    </div>
                                </div>
                                <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-golist transition"></i>
                            </div>

                        </div>
                    </div>

                    <div class="text-center pt-4 opacity-50">
                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">GoList v2.5 • Powered by Ramazone</p>
                    </div>

                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // Load Profile Image
        window.db.ref('users/' + mobile + '/logo').once('value', s => {
            const imgEl = document.getElementById('settingProfileImg');
            if(s.exists() && imgEl) imgEl.src = s.val();
        });
    };

    window.closeProfileSettings = function() {
        const modal = document.getElementById('profileSettingsModal');
        if(modal) modal.classList.add('hidden');
        window.toggleMenu(); // Ensure menu state is synced
    };

    // --- 2. ADDRESS SYSTEM ---
    window.openAddressModal = function() {
        const session = window.session;
        if(!session) return window.showToast("Login required");

        const addrInp = document.getElementById('inpAddress');
        const modal = document.getElementById('addressModal');
        if(!modal || !addrInp) return;

        addrInp.value = "Loading...";
        window.db.ref('users/' + session.mobile + '/address').once('value', snap => {
            addrInp.value = snap.exists() ? snap.val() : "";
        });

        modal.classList.remove('hidden');
    };

    window.closeAddressModal = function() {
        const modal = document.getElementById('addressModal');
        if(modal) modal.classList.add('hidden');
    };

    window.saveAddress = function() {
        const session = window.session;
        const addr = document.getElementById('inpAddress').value.trim();

        if(!addr) return window.showToast("Please enter address");
        if(!session) return;

        window.db.ref('users/' + session.mobile).update({ address: addr })
        .then(() => {
            window.showToast("Address Saved!");
            window.closeAddressModal();
        });
    };

    // --- 3. PIN CHANGE SYSTEM ---
    window.openPinModal = function() {
        const nPin = document.getElementById('inpNewPin');
        const cPin = document.getElementById('inpConfirmPin');
        if(nPin) nPin.value = '';
        if(cPin) cPin.value = '';

        const modal = document.getElementById('pinModal');
        if(modal) modal.classList.remove('hidden');
    };

    window.closePinModal = function() {
        const modal = document.getElementById('pinModal');
        if(modal) modal.classList.add('hidden');
    };

    window.updatePin = function() {
        const newPin = document.getElementById('inpNewPin').value;
        const confPin = document.getElementById('inpConfirmPin').value;
        const session = window.session;

        if(newPin.length !== 4) return window.showToast("PIN must be 4 digits");
        if(newPin !== confPin) return window.showToast("PINs do not match");

        window.db.ref('users/' + session.mobile).update({ pin: newPin })
        .then(() => {
            window.showToast("PIN Updated Successfully!");
            window.closePinModal();
        });
    };

    // --- 4. SUPPORT & CONTENT ---
    window.openSupportOptions = function() {
        const modal = document.getElementById('supportModal');
        if(modal) modal.classList.remove('hidden');
    };

    window.sendSupportMsg = function(type) {
        const session = window.session;
        const userName = session ? session.name : 'Guest';
        const mobile = session ? session.mobile : 'N/A';
        const text = `*Support Request*\nType: ${type}\nUser: ${userName} (${mobile})\n\nPlease help me with this issue.`;
        window.open(`https://wa.me/917903698180?text=${encodeURIComponent(text)}`, '_blank');
    };

    // --- 5. DYNAMIC CONTENT (Policies & Videos) ---
    window.cachedPolicies = null;

    window.fetchDynamicContent = function(type) {
        const modal = document.getElementById('contentModal');
        const title = document.getElementById('contentTitle');
        const body = document.getElementById('contentBody');

        if(!modal || !title || !body) return;
        modal.classList.remove('hidden');

        title.innerText = type === 'video' ? "How to Use App" : "Policies & Terms";
        body.innerHTML = `
            <div class="text-center mt-10">
                <i class="fa-solid fa-spinner fa-spin text-2xl text-slate-300"></i>
                <p class="text-xs font-bold text-slate-400 mt-2">Loading content...</p>
            </div>`;

        if(type === 'policy') {
            window.db.ref('admin/policies').once('value', snap => {
                if(snap.exists()) {
                    const policies = snap.val();
                    const keys = Object.keys(policies);
                    const names = {
                        'about': 'About Us', 'privacy': 'Privacy Policy', 'refund': 'Refund & Return',
                        'terms': 'Terms of Use', 'shipping': 'Shipping Info'
                    };

                    let navHtml = '<div class="flex flex-wrap gap-2 mb-4 border-b border-slate-100 pb-3">';
                    let firstKey = keys[0];

                    keys.forEach((key, index) => {
                        const displayName = names[key] || key.toUpperCase();
                        const activeClass = index === 0 ? 'bg-golist text-white border-golist' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';
                        navHtml += `<button onclick="switchPolicyTab('${key}')" id="btn-pol-${key}" class="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${activeClass}">${displayName}</button>`;
                    });
                    navHtml += '</div>';
                    let contentHtml = `<div id="policyTextContent" class="prose prose-sm text-slate-600 leading-relaxed text-xs"></div>`;
                    body.innerHTML = navHtml + contentHtml;

                    window.cachedPolicies = policies;
                    window.switchPolicyTab(firstKey);
                } else {
                    body.innerHTML = "<div class='text-center mt-10 opacity-50'><i class='fa-solid fa-file-circle-xmark text-4xl mb-2'></i><p>No policies updated yet.</p></div>";
                }
            });
        } 
        else if(type === 'video') {
            window.db.ref('admin/videos').limitToLast(1).once('value', snap => {
                if(snap.exists()) {
                    const data = Object.values(snap.val())[0];
                    const videoId = extractYouTubeID(data.link);
                    if(videoId) {
                        body.innerHTML = `
                            <div class="aspect-video w-full rounded-xl overflow-hidden shadow-lg mb-4 bg-black">
                                <iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                            </div>
                            <h3 class="font-bold text-lg text-slate-800">${data.title}</h3>
                            <p class="text-xs text-slate-400 mt-1">Uploaded: ${new Date(data.addedAt || Date.now()).toLocaleDateString()}</p>
                        `;
                    } else {
                        body.innerHTML = "<p>Invalid Video Link found.</p>";
                    }
                } else {
                    body.innerHTML = "<p>No tutorial videos found.</p>";
                }
            });
        }
    };

    window.switchPolicyTab = function(key) {
        const policies = window.cachedPolicies;
        if(!policies || !policies[key]) return;

        const contentBox = document.getElementById('policyTextContent');
        if(contentBox) contentBox.innerHTML = policies[key]; 

        const allBtns = document.querySelectorAll('[id^="btn-pol-"]');
        allBtns.forEach(btn => {
            btn.className = "px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition";
        });

        const activeBtn = document.getElementById(`btn-pol-${key}`);
        if(activeBtn) {
            activeBtn.className = "px-3 py-1.5 rounded-lg text-[10px] font-bold border border-golist bg-golist text-white shadow-md transition";
        }
    };

    function extractYouTubeID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    window.closeContentModal = function() {
        const modal = document.getElementById('contentModal');
        if(modal) modal.classList.add('hidden');
        window.cachedPolicies = null; 
    };

})();