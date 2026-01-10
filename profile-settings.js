// --- FILE: profile-settings.js ---
// Purpose: Handles the new "Profile & Settings" UI (Screenshot based)

function openProfileSettings() {
    // 1. Check or Create Modal Container
    let modal = document.getElementById('profileSettingsModal');

    // Agar modal HTML mein nahi hai (jo hum next step mein home.html mein daalenge), to return kar do
    if (!modal) {
        console.error("Error: profileSettingsModal div missing in home.html");
        return;
    }

    // 2. Fetch User Data from LocalStorage
    const session = JSON.parse(localStorage.getItem('rmz_user'));
    const mobile = session ? session.mobile : '...';
    const name = session ? session.name : 'Guest';

    // 3. Render the UI (Matches your screenshot exactly)
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

    // 4. Show the Modal
    modal.classList.remove('hidden');

    // 5. Load Profile Image (Async)
    db.ref('users/' + mobile + '/logo').once('value', s => {
        if(s.exists()) document.getElementById('settingProfileImg').src = s.val();
    });
}

function closeProfileSettings() {
    const modal = document.getElementById('profileSettingsModal');
    if(modal) modal.classList.add('hidden');
}

// Global Export
window.openProfileSettings = openProfileSettings;
window.closeProfileSettings = closeProfileSettings;