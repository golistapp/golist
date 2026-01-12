// ==========================================
// FILE: js/app.js
// (Main Entry Point & Router)
// ==========================================

import { state, resetState } from './state.js';
import { LoginModule } from './modules/login-module.js';
import { HomeModule } from './modules/home-module.js';

// --- MAIN ROUTER ---
const appDiv = document.getElementById('app');

function renderApp() {
    // 1. Check LocalStorage for existing session
    const savedUser = localStorage.getItem('rmz_delivery_user');

    if (savedUser) {
        // --- CASE: USER LOGGED IN (SHOW HOME) ---
        try {
            state.user = JSON.parse(savedUser);
            loadHome();
        } catch (e) {
            console.error("Session Corrupted", e);
            logout();
        }
    } else {
        // --- CASE: NO USER (SHOW LOGIN) ---
        loadLogin();
    }
}

// --- VIEW LOADERS ---

function loadLogin() {
    // 1. Inject HTML
    appDiv.innerHTML = LoginModule.render();

    // 2. Initialize Logic (Pass 'onSuccess' callback)
    LoginModule.init((userData) => {
        state.user = userData;
        loadHome(); // Switch to Home instantly
    });
}

function loadHome() {
    // 1. Inject HTML
    appDiv.innerHTML = HomeModule.render();

    // 2. Initialize Logic (Pass 'onLogout' callback)
    HomeModule.init(() => {
        logout();
    });
}

// --- GLOBAL ACTIONS ---

function logout() {
    resetState(); // Clear Memory
    localStorage.removeItem('rmz_delivery_user'); // Clear Storage
    loadLogin(); // Switch to Login
}

// --- START APP ---
// Run immediately when script loads
renderApp();