// core/app.js
import { db } from './firebase-config.js';

class App {
    constructor() {
        this.currentModule = null;
        this.container = document.getElementById('app-container');
        this.sidebar = document.querySelector('aside');
        this.init();
    }

    init() {
        console.log("🚀 Smart Admin System Starting...");
        this.setupNavigation();
        this.setupMobileMenu();
        this.loadRoute('dashboard'); // Default Page
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn, .mob-nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnElem = e.target.closest('button');
                const route = btnElem.dataset.route;
                this.loadRoute(route);
                this.closeMobileMenu();
            });
        });
    }

    setupMobileMenu() {
        const toggleBtn = document.getElementById('menu-toggle');
        if(toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.sidebar.classList.toggle('hidden');
                this.sidebar.classList.toggle('flex');
                this.sidebar.classList.toggle('absolute');
                this.sidebar.classList.toggle('inset-y-0');
                this.sidebar.classList.toggle('left-0');
                this.sidebar.classList.toggle('z-50');
            });
        }
    }

    closeMobileMenu() {
        if (window.innerWidth < 768 && !this.sidebar.classList.contains('hidden')) {
            this.sidebar.classList.add('hidden');
            this.sidebar.classList.remove('flex', 'absolute', 'inset-y-0', 'left-0', 'z-50');
        }
    }

    async loadRoute(route) {
        // 🔥 FIX: Route load hote hi Tab update karo
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
                if (this.currentModule && this.currentModule.cleanup) this.currentModule.cleanup();
                await module.default.render(this.container, db);
                this.currentModule = module.default;
            } else {
                throw new Error("Module has no render function");
            }
        } catch (error) {
            console.error("Module Load Error:", error);
            this.container.innerHTML = `<p class="text-red-500 text-center mt-10">Error loading ${route}</p>`;
        }
    }

    updateActiveNav(route) {
        // Remove active class from ALL buttons
        document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(btn => {
            btn.classList.remove('active-nav', 'bg-blue-600', 'text-white', 'shadow-lg');
            btn.classList.add('text-slate-300'); // Reset text color

            // Icon Reset
            const icon = btn.querySelector('i');
            if(icon) icon.classList.remove('text-white');
        });

        // Add active class to CURRENT route button
        document.querySelectorAll(`[data-route="${route}"]`).forEach(btn => {
            btn.classList.add('active-nav', 'bg-blue-600', 'text-white', 'shadow-lg');
            btn.classList.remove('text-slate-300');

            // Icon Highlight
            const icon = btn.querySelector('i');
            if(icon) icon.classList.add('text-white');
        });
    }
}

new App();
