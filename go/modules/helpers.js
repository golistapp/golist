// ==========================================
// MODULE: Helpers (Math & Calculations)
// ==========================================

// 1. Distance Calculator (Haversine Formula)
export function getDistance(lat1, lon1, lat2, lon2) {
    if(!lat1 || !lon1 || !lat2 || !lon2) return 9999;

    const R = 6371; // Earth Radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1); 
}

// 2. Order Weight Calculator
export function calculateOrderWeight(cart) {
    if (!cart || !Array.isArray(cart)) return 0;

    let totalKg = 0;
    cart.forEach(item => {
        if (item.qty === 'Special Request') return; 

        let txt = item.qty.toLowerCase().replace(/\s/g, ''); 
        let weight = 0; 
        let mul = item.count || 1; 
        let match;

        // Regex to find kg, g, l, ml
        if (match = txt.match(/(\d+(\.\d+)?)kg/)) weight = parseFloat(match[1]);
        else if ((match = txt.match(/(\d+)g/)) || (match = txt.match(/(\d+)gm/))) weight = parseFloat(match[1]) / 1000;
        else if ((match = txt.match(/(\d+(\.\d+)?)l/)) || (match = txt.match(/(\d+(\.\d+)?)ltr/))) weight = parseFloat(match[1]);
        else if (match = txt.match(/(\d+)ml/)) weight = parseFloat(match[1]) / 1000;

        totalKg += (weight * mul);
    });
    return totalKg.toFixed(2);
}