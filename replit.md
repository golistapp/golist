# GoList (Ramazone)

## Overview
GoList/Ramazone is a smart list-based assistance and task execution platform for simple and fast daily needs. It's a delivery and inventory management system with:
- Shop owner inventory management
- Delivery partner interface
- Customer shopping cart

## Project Architecture
- **Type**: Static HTML/CSS/JavaScript website
- **Backend**: Firebase Realtime Database (external service)
- **Styling**: Tailwind CSS (via CDN)
- **Icons**: Font Awesome (via CDN)
- **Fonts**: Google Fonts (Inter)

## Project Structure
```
/
├── index.html          # Landing page with role selection
├── home.html           # Main store/dashboard page
├── home-core.js        # Core JavaScript functionality
├── home-features.js    # Additional features
├── cart.html           # Shopping cart
├── cart.js             # Cart JavaScript
├── dashboard.html      # Dashboard view
├── ADMIN/              # Admin panel
│   ├── admin.html
│   ├── admin.js
│   └── admin-managers.js
├── Delivery/           # Delivery partner interface
│   ├── delivery-home.html
│   ├── delivery-home.js
│   ├── delivery-login.html
│   └── delivery-utils.js
├── server.py           # Python HTTP server for development
└── README.md           # Project description
```

## Development
- **Server**: Python SimpleHTTPServer on port 5000
- **Run command**: `python server.py`

## Deployment
This is a static website. For production deployment, use the static deployment target pointing to the root directory.
