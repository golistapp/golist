// --- FILE: sw.js ---
// Purpose: Minimal Service Worker to enable PWA Install Prompt

const CACHE_NAME = 'golist-v1';

// Install Event
self.addEventListener('install', (evt) => {
    console.log('✅ Service Worker Installed');
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (evt) => {
    console.log('✅ Service Worker Activated');
    evt.waitUntil(self.clients.claim());
});

// Fetch Event (Network First Strategy for now)
self.addEventListener('fetch', (evt) => {
    // Filhal hum sab kuch network se hi load karenge taaki live updates milein
    evt.respondWith(fetch(evt.request));
});
