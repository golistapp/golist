// ==========================================
// MODULE: UI & Visual Helpers
// ==========================================

// 1. Toast Notification
export function showToast(msg) { 
    const t = document.getElementById('toast'); 
    if(!t) return;
    document.getElementById('toastMsg').innerText = msg; 
    t.classList.remove('opacity-0','pointer-events-none'); 
    setTimeout(() => t.classList.add('opacity-0','pointer-events-none'), 2000); 
}

// 2. Header & Sidebar Setup
export function renderHeader(user) {
    if(!user) return;

    // Header Elements
    const hName = document.getElementById('headerName');
    const hVeh = document.getElementById('vehicleType');
    if(hName) hName.innerText = user.name;
    if(hVeh) hVeh.innerText = user.vehicle;

    // Sidebar Elements
    const mName = document.getElementById('menuName');
    const mMob = document.getElementById('menuMobile');
    if(mName) mName.innerText = user.name;
    if(mMob) mMob.innerText = '+91 ' + user.mobile;
}

export function toggleSidebar() { 
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('menuOverlay');
    if(sb) sb.classList.toggle('open'); 
    if(ov) ov.classList.toggle('open'); 
}

// 3. SOS Feature
export function triggerSOS() {
    const adminNumber = '7903698180';
    const user = window.Ramazone.user;
    const loc = window.Ramazone.location;

    if(!confirm("⚠️ SEND EMERGENCY SOS? \nLocation will be shared with Admin & Team.")) return;

    const message = `🚨 *SOS EMERGENCY* 🚨\n\nPartner: ${user.name}\nPhone: ${user.mobile}\nLocation: https://www.google.com/maps/dir/?api=1&destination=$${loc.lat},${loc.lng}\n\n*Call Immediately!*`;

    window.open(`https://wa.me/91${adminNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

// 4. External Maps Helper
export function openExternalMap(lat, lng) {
    if(!lat || !lng) {
        showToast("Location coordinates missing");
        return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=$${lat},${lng}`, '_blank');
}

// 5. Celebration Effect (Confetti)
export function triggerCelebration() {
    // Canvas Confetti Library use kar rahe hain
    if(typeof confetti !== 'undefined') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    const overlay = document.getElementById('celebrationOverlay');
    if(overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 3000);
    }
}