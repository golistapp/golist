// ==========================================
// MAIN ENTRY POINT
// ==========================================

import { initApp } from './router.js';
import { toggleMenu, showToast } from './utils.js';

console.log("System Booting...");

// 1. Initialize Application
document.addEventListener('DOMContentLoaded', () => {

    // Start Router (Decides Login vs Dashboard)
    initApp();

    // Setup Global Event Listeners
    setupGlobalEvents();

    // Setup Lazy Load Triggers for Sidebar Features
    setupLazyFeatures();
});

// ============================
// GLOBAL EVENTS
// ============================

function setupGlobalEvents() {
    // Sidebar Toggle
    const btnMenu = document.getElementById('btnMenu');
    const overlay = document.getElementById('menuOverlay');

    if (btnMenu) btnMenu.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // SOS Button
    const btnSOS = document.getElementById('btnSOS');
    if (btnSOS) {
        btnSOS.addEventListener('click', () => {
            if (confirm("⚠️ SEND EMERGENCY SOS? \nLocation will be shared with Admin.")) {
                // In real app, fetch current location via state
                const msg = encodeURIComponent("🚨 *SOS EMERGENCY* 🚨\n\nPartner needs help immediately!");
                window.open(`https://wa.me/917903698180?text=${msg}`, '_blank');
            }
        });
    }
}

// ============================
// LAZY LOADING FEATURES
// ============================

function setupLazyFeatures() {

    // 1. WHOLESALER FEATURE
    const btnWholesaler = document.getElementById('navWholesaler');
    if (btnWholesaler) {
        btnWholesaler.addEventListener('click', async (e) => {
            // Check if already loaded to prevent reload
            if (window.wholesalerModuleLoaded) return;

            e.preventDefault(); // Stop initial click
            showToast("Loading Module...");

            try {
                const module = await import('./features/wholesaler.js');
                module.initWholesalerFeature();
                window.wholesalerModuleLoaded = true;

                // Re-trigger click to open modal immediately after load
                btnWholesaler.click(); 
            } catch (err) {
                console.error("Failed to load Wholesaler module", err);
                showToast("Error loading module");
            }
        }, { once: true }); // Only runs once, then standard module logic takes over
    }

    // 2. HISTORY FEATURE
    const btnHistory = document.getElementById('navHistory');
    if (btnHistory) {
        btnHistory.addEventListener('click', async (e) => {
            if (window.historyModuleLoaded) return;

            e.preventDefault();
            showToast("Loading History...");

            try {
                const module = await import('./features/history.js');
                module.initHistoryFeature();
                window.historyModuleLoaded = true;

                // Re-trigger click
                btnHistory.click();
            } catch (err) {
                console.error("Failed to load History module", err);
                showToast("Error loading history");
            }
        }, { once: true });
    }
}