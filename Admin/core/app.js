// core/app.js
import { db } from './firebase-config.js';

class App {
    constructor() {
        this.currentModule = null;
        this.container = document.getElementById('app-container');
        this.sidebar = document.querySelector('aside'); // Sidebar ka reference
        this.init();
    }

    init() {
        console.log("🚀 Smart Admin System Starting...");

        // 1. Navigation Listeners
        this.setupNavigation();

        // 2. Mobile Menu Toggle
        this.setupMobileMenu();

        // 3. Default Page Load
        this.loadRoute('dashboard');
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn, .mob-nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Button se route name nikalo
                const route = e.target.closest('button').dataset.route;

                // Page Load karo
                this.loadRoute(route);

                // 🔥 NEW FIX: Agar mobile hai, toh menu band karo click ke baad
                this.closeMobileMenu();
            });
        });
    }

    setupMobileMenu() {
        const toggleBtn = document.getElementById('menu-toggle');

        if(toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                // Menu dikhana/chupana (Toggle)
                this.sidebar.classList.toggle('hidden');
                this.sidebar.classList.toggle('flex');
                this.sidebar.classList.toggle('absolute');
                this.sidebar.classList.toggle('inset-y-0');
                this.sidebar.classList.toggle('left-0');
                this.sidebar.classList.toggle('z-50');
            });
        }
    }

    // 🔥 NEW FUNCTION: Menu Close karne ke liye
    closeMobileMenu() {
        // Check karo ki screen choti hai (Mobile) aur menu khula hai
        if (window.innerWidth < 768 && !this.sidebar.classList.contains('hidden')) {
            this.sidebar.classList.add('hidden');
            this.sidebar.classList.remove('flex', 'absolute', 'inset-y-0', 'left-0', 'z-50');
        }
    }

    async loadRoute(route) {
        this.updateActiveNav(route);

        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-500 fade-in">
                <i class="fa-solid fa-circle-notch fa-spin text-3xl mb-4 text-blue-500"></i>
                <p>Loading ${route}...</p>
            </div>
        `;

        try {
            const module = await import(`../modules/${route}.js`);

            if (module.default && typeof module.default.render === 'function') {
                if (this.currentModule && this.currentModule.cleanup) {
                    this.currentModule.cleanup();
                }

                await module.default.render(this.container, db);
                this.currentModule = module.default;
            } else {
                throw new Error("Module has no render function");
            }

        } catch (error) {
            console.error("Module Load Error:", error);
            this.container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-red-400">
                    <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
                    <p>Failed to load: ${route}</p>
                    <p class="text-xs text-slate-500 mt-2">${error.message}</p>
                </div>
            `;
        }
    }

    updateActiveNav(route) {
        document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(btn => {
            btn.classList.remove('active-nav');
            if(btn.dataset.route === route) {
                btn.classList.add('active-nav');
            }
        });
    }
}

new App();