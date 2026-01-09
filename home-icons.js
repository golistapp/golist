// home-icons.js
// Purpose: Handles Product Icons (Priority: Emoji > FontAwesome > Initials Avatar)

const ICON_MAP = [
    // --- 1. FRUITS (Emojis are Best here) ---
    { keys: ['apple', 'seb'], emoji: '🍎' },
    { keys: ['banana', 'kela', 'ripe'], emoji: '🍌' },
    { keys: ['mango', 'aam'], emoji: '🥭' },
    { keys: ['grape', 'angoor'], emoji: '🍇' },
    { keys: ['watermelon', 'tarbuj'], emoji: '🍉' },
    { keys: ['lemon', 'nimbu', 'lime'], emoji: '🍋' },
    { keys: ['orange', 'santra', 'mosambi'], emoji: '🍊' },
    { keys: ['papaya', 'papita'], emoji: '🥔' }, // Fallback or closest shape
    { keys: ['pineapple', 'ananas'], emoji: '🍍' },
    { keys: ['coconut', 'nariyal'], emoji: '🥥' },
    { keys: ['pomegranate', 'anar'], emoji: '🔴' }, // Abstract red
    { keys: ['fruit'], emoji: '🍒' },

    // --- 2. VEGETABLES (Sabzi) ---
    { keys: ['onion', 'pyaz'], emoji: '🧅' },
    { keys: ['potato', 'aloo'], emoji: '🥔' },
    { keys: ['tomato', 'tamatar'], emoji: '🍅' },
    { keys: ['carrot', 'gajar'], emoji: '🥕' },
    { keys: ['corn', 'bhutta', 'makka'], emoji: '🌽' },
    { keys: ['chilli', 'mirch', 'pepper'], emoji: '🌶️' },
    { keys: ['garlic', 'lahsun'], emoji: '🧄' },
    { keys: ['cucumber', 'kheera'], emoji: '🥒' },
    { keys: ['brinjal', 'baingan', 'eggplant'], emoji: '🍆' },
    { keys: ['broccoli', 'gobhi', 'cauliflower'], emoji: '🥦' },
    { keys: ['leaf', 'palak', 'saag', 'dhaniya', 'methi', 'mint'], emoji: '🥬' },
    { keys: ['mushroom'], emoji: '🍄' },
    { keys: ['veg', 'sabji'], emoji: '🥗' },

    // --- 3. DAIRY & BREAKFAST ---
    { keys: ['milk', 'doodh', 'amul'], emoji: '🥛' },
    { keys: ['cheese', 'paneer'], emoji: '🧀' },
    { keys: ['butter', 'makkhan', 'ghee'], emoji: '🧈' },
    { keys: ['egg', 'anda'], emoji: '🥚' },
    { keys: ['bread', 'toast', 'pav', 'bun'], emoji: '🍞' },
    { keys: ['curd', 'dahi', 'yogurt'], emoji: '🥣' },

    // --- 4. STAPLES (Atta, Rice, Oil) ---
    { keys: ['rice', 'chawal', 'basmati'], emoji: '🍚' },
    { keys: ['oil', 'tel', 'refine', 'mustard', 'sunflower'], emoji: '🛢️' }, // Oil Drum
    { keys: ['wheat', 'atta', 'flour', 'maida'], emoji: '🌾' },
    { keys: ['salt', 'namak'], emoji: '🧂' },
    { keys: ['sugar', 'cheeni', 'misri'], emoji: '⬜' }, // White square for sugar/cubes
    { keys: ['dal', 'pulse', 'rajma', 'chana'], emoji: '🥘' }, // Food pot

    // --- 5. SNACKS & DRINKS ---
    { keys: ['chocolate', 'cadbury', 'kitkat', '5star'], emoji: '🍫' },
    { keys: ['candy', 'toffee', 'lolly'], emoji: '🍬' },
    { keys: ['biscuit', 'cookie', 'parle', 'oreo'], emoji: '🍪' },
    { keys: ['chips', 'kurkure', 'lays', 'namkeen'], emoji: '🍟' }, // Fries look like snacks
    { keys: ['popcorn'], emoji: '🍿' },
    { keys: ['cake', 'pastry', 'birthday'], emoji: '🎂' },
    { keys: ['ice', 'cream', 'kulfi'], emoji: '🍦' },
    { keys: ['tea', 'chai', 'coffee'], emoji: '☕' },
    { keys: ['juice', 'coke', 'pepsi', 'soda', 'drink', 'maaza'], emoji: '🥤' },
    { keys: ['pizza'], emoji: '🍕' },
    { keys: ['burger'], emoji: '🍔' },
    { keys: ['noodle', 'maggi', 'pasta', 'chowmein'], emoji: '🍜' },

    // --- 6. NON-VEG ---
    { keys: ['chicken', 'murga', 'meat', 'mutton'], emoji: '🍗' },
    { keys: ['fish', 'machli', 'prawn'], emoji: '🐟' },

    // --- 7. HOUSEHOLD & PERSONAL (Icons might be better here, but Emojis used where fit) ---
    { keys: ['soap', 'sabun', 'bath', 'wash'], emoji: '🧼' },
    { keys: ['shampoo', 'conditioner', 'lotion'], emoji: '🧴' },
    { keys: ['brush', 'paste', 'colgate'], emoji: '🪥' }, // Toothbrush
    { keys: ['sponge', 'scrub', 'vim'], emoji: '🧽' },
    { keys: ['broom', 'jhaadu'], emoji: '🧹' },
    { keys: ['toilet', 'tissue'], emoji: '🧻' },
    { keys: ['bulb', 'light', 'led'], emoji: '💡' },
    { keys: ['battery', 'cell'], emoji: '🔋' },
    { keys: ['medicine', 'pill', 'tablet'], emoji: '💊' },
    { keys: ['injection', 'syringe'], emoji: '💉' },
    { keys: ['pen', 'pencil', 'write'], emoji: '🖊️' },
    { keys: ['book', 'notebook', 'diary'], emoji: '📔' },
    { keys: ['box', 'carton'], emoji: '📦' },

    // --- 8. FALLBACK TO FONTAWESOME (If Emoji looks bad/unavailable) ---
    // Icons are useful for abstract things like "Services" or "Hardware"
    { keys: ['mobile', 'phone', 'charger'], icon: 'fa-mobile-screen', color: 'text-slate-800' },
    { keys: ['headphone', 'earphone', 'speaker'], icon: 'fa-headphones', color: 'text-slate-900' },
    { keys: ['shirt', 'pant', 'cloth', 'detergent', 'surf', 'tide'], icon: 'fa-shirt', color: 'text-blue-500' },
    { keys: ['scissor', 'blade', 'shave'], icon: 'fa-scissors', color: 'text-slate-500' },
    { keys: ['plug', 'wire', 'switch'], icon: 'fa-plug', color: 'text-slate-600' },
    { keys: ['cycle', 'agarbatti', 'puja'], icon: 'fa-fire-flame-simple', color: 'text-orange-500' }
];

// Vibrant Colors for Initials Avatar
const AVATAR_COLORS = [
    'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700',
    'bg-yellow-100 text-yellow-700', 'bg-lime-100 text-lime-700', 'bg-green-100 text-green-700',
    'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700',
    'bg-sky-100 text-sky-700', 'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700', 'bg-purple-100 text-purple-700', 'bg-fuchsia-100 text-fuchsia-700',
    'bg-pink-100 text-pink-700', 'bg-rose-100 text-rose-700', 'bg-slate-100 text-slate-700'
];

/**
 * Main Function: Returns Emoji > Icon > Avatar
 */
function getProductIcon(name) {
    if (!name) return getDefaultIcon();

    const lowerName = name.toLowerCase();

    // 1. Check Keywords
    for (const item of ICON_MAP) {
        if (item.keys.some(key => lowerName.includes(key))) {
            // PRIORITY 1: Return Emoji if available
            if (item.emoji) {
                return `<div class="w-full h-full flex items-center justify-center text-[22px] leading-none select-none">${item.emoji}</div>`;
            }
            // PRIORITY 2: Return FontAwesome Icon if available
            if (item.icon) {
                return `<i class="fa-solid ${item.icon} ${item.color} text-lg"></i>`;
            }
        }
    }

    // PRIORITY 3: Fallback to Initials Avatar
    return generateAvatar(name);
}

function generateAvatar(name) {
    // Generate 2 initials (e.g. "Tata Salt" -> "TS")
    const parts = name.trim().split(' ');
    let initials = parts[0] ? parts[0][0] : '?';

    if (parts.length > 1 && parts[1]) {
        initials += parts[1][0];
    } else if (parts[0].length > 1) {
        initials += parts[0][1];
    }

    initials = initials.toUpperCase().substring(0, 2);

    // Color based on name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
    const colorClass = AVATAR_COLORS[colorIndex];

    return `<div class="w-full h-full flex items-center justify-center font-extrabold text-[13px] rounded-lg ${colorClass} tracking-tighter shadow-sm border border-white/40">${initials}</div>`;
}

function getDefaultIcon() {
    return `<div class="w-full h-full flex items-center justify-center text-[20px]">📦</div>`;
}

// Export
window.getProductIcon = getProductIcon;