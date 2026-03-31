# 🏍️ MotoFare Kigali

> **Know the fair price before you ride.**

A web application that helps riders in Kigali, Rwanda get transparent, fair fare estimates for moto-taxi rides — especially useful for ALU students and other university students navigating common routes.

🌐 **Live:** [motofare.huguette.tech](http://motofare.huguette.tech)

---

## 📖 The Problem

Moto-taxis in Kigali often charge inconsistent or inflated fares, especially to students unfamiliar with standard prices. There is no transparent, open tool to know what a ride *should* cost before you board and negotiate. MotoFare solves that.

---

## ✨ Features

- **⚡ Fixed ALU Routes** — Community-verified fair prices for 4 common ALU Campus routes (Kimironko, Remera, Airport, Downtown/Mu Mujyi) with a "Use this route" button to load them into the estimator
- **📍 Custom Fare Estimator** — Type any two locations in Kigali; the app geocodes them and calculates a real road-distance fare
- **📡 GPS Detection** — Tap the 📍 button to auto-detect your current location via browser GPS + Nominatim reverse geocoding
- **🎓 Student Discount** — Toggle a 20% student discount in the header (ALU, UR, CMU Africa, AUCA, MKU, Kepler)
- **🌙 Night Surcharge** — Automatically applies +15% between 21:00 and 05:00
- **🔍 Filter & Sort** — Filter fixed routes by price range; sort by price or distance
- **💰 Fare Breakdown** — Shows every component of the fare (base, tiered km rate, surcharge, discount) transparently
- **🔗 Negotiation Range** — Gives a realistic low–high range so you know what to expect
- **⌨️ Autocomplete** — Suggests common Kigali locations as you type
- **⚠️ Error Handling** — Clear, actionable messages for API failures, out-of-bounds locations, or network errors
- **📱 Responsive** — Works on mobile and desktop

---

## 🔌 APIs Used

> ✅ **Both APIs are completely free and require NO API key.**

| API | Purpose | Documentation |
|-----|---------|---------------|
| [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) | Forward geocoding (place name → GPS coordinates) and reverse geocoding (GPS → address) | [nominatim.org/release-docs](https://nominatim.org/release-docs/latest/api/Search/) |
| [OSRM (Open Source Routing Machine)](https://project-osrm.org) | Real road distance and estimated travel time via Kigali's road network | [project-osrm.org/docs](http://project-osrm.org/docs/v5.5.1/api/) |

> **Attribution:** This app uses OpenStreetMap Nominatim and OSRM, both free and open-source.
> Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).

---

## 🧮 Fare Model

Based on prevailing Kigali moto-taxi market rates:

| Segment | Rate |
|---------|------|
| Base fare (first 1 km) | 500 RWF |
| 1 – 5 km | 200 RWF/km |
| 5 – 10 km | 150 RWF/km |
| > 10 km | 110 RWF/km |
| Night surcharge (21:00 – 05:00) | +15% |
| Student discount | −20% |

Final fare is rounded to the nearest 50 RWF.

Fixed routes use community-verified prices that reflect real student experience.

---

## 🚀 Running Locally

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- **No API key required** — both APIs are free and open

### Option A: Open directly (simplest)

```bash
# Clone the repository
git clone https://github.com/uhuguette/MotoFare_KIGALI.git
cd MotoFare_KIGALI

# Open in browser
open index.html         # macOS
start index.html        # Windows
xdg-open index.html     # Linux
```

> ⚠️ GPS detection may require a local server (see Option B) due to browser security restrictions on `file://` URLs.

### Option B: Local server (recommended for GPS)

```bash
# Using Python (no install needed)
python3 -m http.server 8080

# Using Node.js
npx serve .
```

Then visit `http://localhost:8080`

---

## 🌐 Deployment

The app is a set of **static files** (HTML + CSS + JS) and can be served by any web server.

### Infrastructure

| Server | Role | IP |
|--------|------|----|
| Web01 | Web server | 54.211.72.26 |
| Web02 | Web server | 3.88.144.28 |
| Lb01 | Load balancer | 13.222.209.189 |

Live URL: **[http://motofare.huguette.tech](http://motofare.huguette.tech)**

---

### Server Setup (Web01 & Web02)

Repeat these steps on **both** servers.

```bash
# 1. SSH into the server
ssh ubuntu@54.211.72.26   # Web01
# or
ssh ubuntu@3.88.144.28    # Web02

# 2. Install Nginx
sudo apt update && sudo apt install nginx -y

# 3. Clone the repository
sudo git clone https://github.com/uhuguette/MotoFare_KIGALI.git /var/www/html/motofare

# 4. Set permissions
sudo chown -R www-data:www-data /var/www/html/motofare
sudo chmod -R 755 /var/www/html/motofare

# 5. Configure Nginx to serve the app
sudo nano /etc/nginx/sites-available/motofare
```

Paste this Nginx config:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html/motofare;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|woff2|png|jpg|ico)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/motofare /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

Verify each server is working:
```
http://54.211.72.26    → should load MotoFare
http://3.88.144.28     → should load MotoFare
```

---

### Load Balancer Configuration (Lb01)

```bash
# 1. SSH into the load balancer
ssh ubuntu@13.222.209.189

# 2. Install HAProxy
sudo apt update && sudo apt install haproxy -y

# 3. Configure HAProxy
sudo nano /etc/haproxy/haproxy.cfg
```

Paste this config:

```
global
    log /dev/log local0
    maxconn 2000
    daemon

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

frontend motofare_frontend
    bind *:80
    default_backend motofare_backend

backend motofare_backend
    balance roundrobin
    option httpchk GET /
    server web01 54.211.72.26:80 check
    server web02 3.88.144.28:80 check
```

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg   # validate config
sudo systemctl restart haproxy
sudo systemctl enable haproxy
```

### Verify Load Balancing

```bash
# Access via load balancer IP
curl http://13.222.209.189

# Or via domain
curl http://motofare.huguette.tech

# Check HAProxy logs to confirm traffic is alternating between web01 and web02
sudo tail -f /var/log/haproxy.log
```

You can also temporarily add a server identifier in each copy's footer ("Served by Web01" / "Served by Web02"), then refresh multiple times via the LB IP to confirm traffic is balanced.

---

## 🗂️ Project Structure

```
MotoFare_KIGALI/
├── index.html    — App markup (header, route cards, estimator, results, modal)
├── style.css     — All styles (CSS variables, layout, components, responsive)
├── app.js        — All logic (APIs, pricing, UI, autocomplete, GPS)
├── README.md     — This file
└── .gitignore    — Excludes sensitive files
```

---

## 🔐 Security Notes

- **No API keys in the codebase** — both Nominatim and OSRM are fully public, no key needed
- Nominatim is used within its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) (1 req/sec, User-Agent set)
- Input is validated before any API call (empty, same-location, and out-of-bounds checks)
- A `.gitignore` is included to prevent accidental commits of sensitive files

---

## ⚠️ Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| OSRM only accepts coordinates, not place names | Added Nominatim geocoding step first; both calls run in parallel with `Promise.all()` |
| OSRM can be slow or occasionally unavailable | Added Haversine fallback (straight-line × 1.35 road factor) with console warning |
| GPS location on `file://` URLs | Documented local server option (`python3 -m http.server`) as recommended setup |
| Nominatim rate limit (1 req/sec) | Both geocode calls are made in parallel (only 2 requests total per estimate) |
| No official Kigali fare table | Tiered model built from crowd-sourced student experience; negotiation range (−10% to +15%) shown |

---

## 🙏 Credits

| Resource | Use |
|----------|-----|
| [OSRM (Open Source Routing Machine)](https://project-osrm.org) | Road distance & routing |
| [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org) | Free geocoding & reverse geocoding |
| [Google Fonts – Syne](https://fonts.google.com/specimen/Syne) | Display typography |
| [Google Fonts – DM Sans](https://fonts.google.com/specimen/DM+Sans) | Body typography |

Inspired by the real pricing frustrations of ALU students in Kigali 🇷🇼

---

## 👤 Author

Built by Huguette Uwase — ALU student, African Leadership University, Kigali, Rwanda.
GitHub: [github.com/uhuguette](https://github.com/uhuguette)
