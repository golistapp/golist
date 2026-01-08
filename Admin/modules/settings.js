// modules/settings.js

// Firebase References for cleanup
let videosRef = null;

export default {
    async render(container, db) {
        container.innerHTML = `
            <div class="space-y-6 fade-in h-full flex flex-col">
                <div class="flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
                    <div>
                        <h2 class="text-2xl font-bold text-white">App Configuration</h2>
                        <p class="text-xs text-slate-400">Control Policies & Video Content</p>
                    </div>
                </div>

                <div class="flex gap-2 border-b border-slate-800 pb-1">
                    <button class="settings-tab active-tab px-4 py-2 text-xs font-bold text-white border-b-2 border-blue-500 transition" data-target="sec-policies">
                        <i class="fa-solid fa-file-contract mr-1"></i> Policies
                    </button>
                    <button class="settings-tab px-4 py-2 text-xs font-bold text-slate-400 border-b-2 border-transparent hover:text-white transition" data-target="sec-videos">
                        <i class="fa-brands fa-youtube mr-1"></i> Videos
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar relative">

                    <div id="sec-policies" class="settings-section space-y-4">
                        <div class="flex justify-between items-center">
                            <select id="policy-selector" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:outline-none">
                                <option value="privacy">Privacy Policy</option>
                                <option value="terms">Terms & Conditions</option>
                                <option value="refund">Refund Policy</option>
                                <option value="about">About Us</option>
                                <option value="contact">Support Info</option>
                            </select>
                            <button id="btn-save-policy" class="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition">
                                <i class="fa-solid fa-save mr-1"></i> SAVE
                            </button>
                        </div>
                        <textarea id="policy-editor" class="w-full h-96 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-300 text-sm font-mono leading-relaxed focus:outline-none custom-scrollbar" placeholder="Select a policy to edit..."></textarea>
                    </div>

                    <div id="sec-videos" class="settings-section hidden space-y-4">
                        <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3">
                            <input type="text" id="vid-title" placeholder="Video Title" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs">
                            <input type="text" id="vid-link" placeholder="YouTube Link" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs">
                            <button id="btn-add-video" class="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-lg text-xs whitespace-nowrap">
                                ADD VIDEO
                            </button>
                        </div>
                        <div id="videos-list" class="space-y-2">
                            <p class="text-slate-500 text-xs py-4">Loading videos...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initTabs();
        this.initPolicies(db);
        this.initVideos(db);
    },

    cleanup() {
        if(videosRef) videosRef.off();
    },

    // --- 1. TABS LOGIC ---
    initTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Update Buttons
                tabs.forEach(t => {
                    t.classList.remove('active-tab', 'text-white', 'border-blue-500');
                    t.classList.add('text-slate-400', 'border-transparent');
                });
                const clicked = e.currentTarget;
                clicked.classList.add('active-tab', 'text-white', 'border-blue-500');
                clicked.classList.remove('text-slate-400', 'border-transparent');

                // Update Sections
                document.querySelectorAll('.settings-section').forEach(sec => sec.classList.add('hidden'));
                document.getElementById(clicked.dataset.target).classList.remove('hidden');
            });
        });
    },

    // --- 2. BANNERS LOGIC REMOVED ---

    // --- 3. POLICIES LOGIC ---
    initPolicies(db) {
        const selector = document.getElementById('policy-selector');
        const editor = document.getElementById('policy-editor');
        const saveBtn = document.getElementById('btn-save-policy');

        const loadPolicy = () => {
            editor.value = "Loading...";
            editor.disabled = true;
            db.ref('admin/policies/' + selector.value).once('value', snap => {
                editor.disabled = false;
                editor.value = snap.exists() ? snap.val() : "";
                editor.placeholder = "Write HTML or Text here...";
            });
        };

        // Load initial
        loadPolicy();

        // Change listener
        selector.addEventListener('change', loadPolicy);

        // Save listener
        saveBtn.addEventListener('click', () => {
            const content = editor.value;
            saveBtn.innerHTML = '<i class="fa-solid fa-spin fa-circle-notch"></i>';
            db.ref('admin/policies/' + selector.value).set(content).then(() => {
                saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
                setTimeout(() => saveBtn.innerHTML = '<i class="fa-solid fa-save mr-1"></i> SAVE', 2000);
            });
        });
    },

    // --- 4. VIDEOS LOGIC ---
    initVideos(db) {
        const list = document.getElementById('videos-list');

        videosRef = db.ref('admin/videos');
        videosRef.on('value', snap => {
            if(!list) return;
            list.innerHTML = '';
            if(!snap.exists()) {
                list.innerHTML = '<p class="text-slate-500 text-xs text-center">No videos added.</p>';
                return;
            }
            Object.entries(snap.val()).forEach(([key, vid]) => {
                const div = document.createElement('div');
                div.className = "flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800 hover:bg-slate-800 transition";
                div.innerHTML = `
                    <div class="flex items-center gap-3 overflow-hidden">
                        <i class="fa-brands fa-youtube text-red-500 text-lg"></i>
                        <div class="truncate">
                            <p class="text-xs text-white font-bold truncate">${vid.title}</p>
                            <a href="${vid.link}" target="_blank" class="text-[10px] text-blue-400 hover:underline block truncate">${vid.link}</a>
                        </div>
                    </div>
                    <button class="del-vid text-slate-500 hover:text-red-500 px-2" data-key="${key}"><i class="fa-solid fa-trash"></i></button>
                `;
                div.querySelector('.del-vid').addEventListener('click', () => {
                    if(confirm("Delete Video?")) db.ref('admin/videos/' + key).remove();
                });
                list.appendChild(div);
            });
        });

        document.getElementById('btn-add-video').addEventListener('click', () => {
            const t = document.getElementById('vid-title');
            const l = document.getElementById('vid-link');
            if(!t.value || !l.value) return alert("Enter Title and Link");

            db.ref('admin/videos').push({
                title: t.value,
                link: l.value,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                t.value = ''; l.value = '';
            });
        });
    }
};