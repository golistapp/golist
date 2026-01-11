// --- FILE: /core/app.js ---
// Purpose: Main Application Controller (Session, Navigation, Module Loader)

// Global State
window.session = JSON.parse(localStorage.getItem('rmz_user'));
const urlParams = new URLSearchParams(window.location.search);
window.targetMobile = urlParams.get('shop') || (window.session ? window.session.mobile : null);

// --- 1. SESSION CHECK & INITIALIZATION ---
window.onload = () => {
    console.log("🚀 App Initializing...");

    // Security Check
    if (!window.targetMobile) {
        window.location.href = 'index.html';
        return;
    }

    // Setup UI
    setupHeader();
    setupSideMenu();

    // Initial Module Load (Feed/Home)
    loadModule('modules/feed.js', () => {
        console.log("📦 Feed Module Loaded");
        // Feed module load hone ke baad agar koi specific function chalana ho to yahan likhenge
        if(window.initFeed) window.initFeed();
    });

    // Check Active Order (Global Check)
    // Note: orders.js load hone par hi ye function milega, isliye hum check karte hain
    setTimeout(() => {
        if (!window.checkActiveOrderHome) {
            loadModule('modules/orders.js', () => {
                if (typeof window.checkActiveOrderHome === 'function') window.checkActiveOrderHome();
            });
        }
    }, 2000); // Thoda delay taaki main feed pehle load ho jaye
};

// --- 2. DYNAMIC MODULE LOADER (Lazy Loading Logic) ---
window.loadedModules = new Set();

window.loadModule = (path, callback) => {
    if (window.loadedModules.has(path)) {
        if (callback) callback();
        return;
    }

    const script = document.createElement('script');
    script.src = path;
    script.onload = () => {
        window.loadedModules.add(path);
        if (callback) callback();
    };
    script.onerror = () => console.error(`❌ Failed to load module: ${path}`);
    document.body.appendChild(script);
};

// --- 3. NAVIGATION & UI FUNCTIONS ---
window.toggleMenu = () => { 
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('menuOverlay');
    if(sidebar) sidebar.classList.toggle('open'); 
    if(overlay) overlay.classList.toggle('open'); 
};

window.setupHeader = () => {
    if(window.session) {
        const menuName = document.getElementById('menuName');
        const menuMobile = document.getElementById('menuMobile');
        const profileImg = document.getElementById('profileImg');

        if(menuName) menuName.innerText = window.session.name || 'User';
        if(menuMobile) menuMobile.innerText = '+91 ' + window.session.mobile;

        // Load Logo
        if(profileImg) {
            window.db.ref('users/' + window.targetMobile + '/logo').once('value', s => {
                if(s.exists()) profileImg.src = s.val();
            });
        }
    }
};

window.setupSideMenu = () => {
    const nav = document.getElementById('sidebarNav');
    if(!nav) return;

    // Clean Menu Structure
    let html = `
        <button onclick="toggleMenu(); openAddModalWrapper()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-plus text-golist w-5 text-lg"></i> Add Product
        </button>

        <button onclick="openHistoryWrapper()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-clock-rotate-left text-blue-600 w-5 text-lg"></i> Order History
        </button>

        <div class="h-px bg-slate-100 my-1 mx-4"></div>

        <button onclick="toggleMenu(); openProfileWrapper()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-green-50 text-slate-700 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-user-gear text-slate-500 w-5 text-lg"></i> Profile & Settings
        </button>

        <div class="h-px bg-slate-100 my-1 mx-4"></div>

        <button onclick="window.logout()" class="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-sm flex items-center gap-3 transition">
            <i class="fa-solid fa-power-off w-5 text-lg"></i> Logout
        </button>
    `;
    nav.innerHTML = html;
};

// --- 4. WRAPPERS FOR LAZY LOADING ---
// Jab user button dabayega, tabhi relevant file load hogi

window.openAddModalWrapper = () => {
    loadModule('modules/inventory.js', () => {
        if(window.openAddModal) window.openAddModal();
    });
};

window.openHistoryWrapper = () => {
    toggleMenu(); // Menu band karo
    loadModule('modules/orders.js', () => {
        if(window.openHistory) window.openHistory();
    });
};

window.openProfileWrapper = () => {
    loadModule('modules/profile.js', () => {
        if(window.openProfileSettings) window.openProfileSettings();
    });
};

window.logout = () => {
    localStorage.removeItem('rmz_user');
    window.location.href = 'index.html';
};