// ==========================================
// SHARED UTILITIES & HELPERS
// ==========================================

// 1. UI FEEDBACK (Toast Notification)
export function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;

    document.getElementById('toastMsg').innerText = msg;
    t.classList.remove('opacity-0', 'pointer-events-none');

    // Auto-hide after 2.5 seconds
    setTimeout(() => {
        t.classList.add('opacity-0', 'pointer-events-none');
    }, 2500);
}

// 2. DOM MANIPULATION
export function toggleClass(elementId, className, forceAdd = null) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (forceAdd === true) el.classList.add(className);
    else if (forceAdd === false) el.classList.remove(className);
    else el.classList.toggle(className);
}

export function toggleMenu() {
    toggleClass('sidebar', 'open');
    toggleClass('menuOverlay', 'hidden'); // Tailwind 'hidden' is opposite of 'open' overlay logic

    // Custom logic for overlay fade in/out if needed, but Tailwind 'hidden' works for visibility
    const overlay = document.getElementById('menuOverlay');
    if(overlay && !overlay.classList.contains('hidden')) {
         overlay.classList.add('open');
    } else if (overlay) {
         overlay.classList.remove('open');
    }
}

// 3. GEOSPATIAL CALCULATION (Haversine Formula)
export function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;

    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1); // Returns string "5.2"
}

// 4. ORDER HELPERS
export function calculateOrderWeight(cart) {
    if (!cart || !Array.isArray(cart)) return "0.00";

    let totalKg = 0;
    cart.forEach(item => {
        if (item.qty === 'Special Request') return;

        // Extract numbers from strings like "500g", "1kg", "2L"
        let txt = item.qty.toLowerCase().replace(/\s/g, '');
        let weight = 0;
        let mul = item.count || 1;
        let match;

        if (match = txt.match(/(\d+(\.\d+)?)kg/)) {
            weight = parseFloat(match[1]);
        } else if ((match = txt.match(/(\d+)g/)) || (match = txt.match(/(\d+)gm/))) {
            weight = parseFloat(match[1]) / 1000;
        } else if ((match = txt.match(/(\d+(\.\d+)?)l/)) || (match = txt.match(/(\d+(\.\d+)?)ltr/))) {
            weight = parseFloat(match[1]); // Treat Liter as KG for rough weight
        } else if (match = txt.match(/(\d+)ml/)) {
            weight = parseFloat(match[1]) / 1000;
        }

        totalKg += (weight * mul);
    });

    return totalKg.toFixed(2);
}

// 5. GENERIC TRIGGER (SOS/Call)
export function triggerExternalAction(type, data) {
    if(type === 'call') window.open(`tel:${data}`);
    if(type === 'whatsapp') window.open(`https://wa.me/91${data}`, '_blank');
    if(type === 'map_dir') window.open(`http://maps.google.com/maps?daddr=${data.lat},${data.lng}`, '_blank');
}