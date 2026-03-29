// ============================================
// MOTOFARE KIGALI — app.js
// External APIs (both FREE, no key required):
//   1. Nominatim (OpenStreetMap) — geocoding & reverse geocoding
//      https://nominatim.openstreetmap.org
//   2. OSRM (Open Source Routing Machine) — real road routing
//      https://project-osrm.org
// ============================================

// Kigali bounding box — locations outside this are rejected
const KIGALI_BOUNDS = {
  minLat: -2.1,  maxLat: -1.78,
  minLon: 29.9,  maxLon: 30.25,
};

// Tiered pricing model (RWF) — range: 500 RWF (short) to ~2500 RWF (cross-city)
const PRICING = {
  baseFare:    500,   // minimum charge, covers first 1 km
  rateT1:      200,   // RWF/km for km 1–5
  rateT2:      150,   // RWF/km for km 5–10
  rateT3:      110,   // RWF/km for km > 10  (~2500 max at ~14 km across Kigali)
  studentDisc: 0.20,  // 20% student discount
};

// 4 fixed ALU Rwanda Campus routes with community-verified prices
const FIXED_ROUTES = [
  { from: "ALU Rwanda Campus", to: "Kimironko",           price: 500,  distanceKm: 2.8,  durationMin: 10, tag: "Popular"     },
  { from: "ALU Rwanda Campus", to: "Remera",              price: 1000, distanceKm: 5.5,  durationMin: 18, tag: "Common"      },
  { from: "ALU Rwanda Campus", to: "Kigali Airport",      price: 1500, distanceKm: 9.2,  durationMin: 28, tag: "Airport"     },
  { from: "ALU Rwanda Campus", to: "Downtown (Mu Mujyi)", price: 2000, distanceKm: 11.0, durationMin: 35, tag: "City Centre"  },
];

// Common Kigali places for autocomplete — covers sectors, markets, hotels, malls, hospitals
const KIGALI_PLACES = [
  // Universities & schools
  "ALU Rwanda Campus",
  "University of Rwanda",
  "Carnegie Mellon University Africa",
  "AUCA Kigali",
  "Mount Kigali University",
  "Kepler College",
  "INES Ruhengeri Kigali Campus",
  "Institut Français du Rwanda",

  // Sectors / neighbourhoods
  "Kimironko",
  "Remera",
  "Kacyiru",
  "Gikondo",
  "Muhima",
  "Kanombe",
  "Kinyinya",
  "Kibagabaga",
  "Masaka",
  "Niboye",
  "Biryogo",
  "Nyamirambo",
  "Gatenga",
  "Kicukiro",
  "Kimihurura",
  "Rugando",
  "Gasabo",
  "Gisozi",
  "Sonatubes",
  "Kabeza",
  "Batsinda",
  "Kagugu",
  "Nyacyonga",
  "Gahanga",
  "Kagarama",
  "Busanza",
  "Ndera",
  "Jabana",
  "Rusororo",
  "Kinyinya",
  "Rebero",
  "Kabuye",
  "Giporoso",
  "Gikumba",
  "Rwezamenyo",
  "Nyakabanda",
  "Gitega",

  // Transport hubs
  "Nyabugogo Bus Park",
  "Kigali International Airport",
  "Downtown Kigali",

  // Markets
  "Kimironko Market",
  "Nyabugogo Market",
  "Kicukiro Market",
  "Gikondo Market",
  "Nyamirambo Market",
  "Biryogo Market",
  "Kanombe Market",

  // Malls & commercial
  "Kigali Heights",
  "Deco Center",
  "Union Trade Centre",
  "Kigali City Tower",
  "RDB Building",
  "Centenary House",
  "UTC Kigali",

  // Hospitals & health
  "King Faisal Hospital",
  "CHUK Hospital",
  "Kanombe Military Hospital",
  "Kibagabaga Hospital",
  "La Croix du Sud Hospital",
  "Rwanda Military Hospital",

  // Hotels & landmarks
  "Kigali Marriott Hotel",
  "Radisson Blu Kigali",
  "Hotel des Mille Collines",
  "Ubumwe Grande Hotel",
  "Kigali Serena Hotel",
  "The Retreat Kigali",

  // Key buildings & venues
  "Kigali Convention Centre",
  "Kigali Arena",
  "Amahoro National Stadium",
  "Rwanda Parliament",
  "Prime Minister's Office",
  "Ministry of Finance",
  "Pension Plaza",
  "RSSB Tower",
  "BK Arena",

  // Roads & junctions (typed as landmarks)
  "Remera Roundabout",
  "Kacyiru Police Station",
  "Kabusunzu",
  "Kisimenti",
  "Gisozi Cemetery",
  "Kigali Genocide Memorial",
];

// Aliases: user-facing names → better Nominatim search queries
// Nominatim does not know informal names like "ALU Campus" — these map them to OSM names
const GEOCODE_ALIASES = {
  "alu rwanda campus":          "African Leadership University Rwanda",
  "alu campus":                 "African Leadership University Rwanda",
  "alu":                        "African Leadership University Rwanda",
  "kigali airport":             "Kigali International Airport Rwanda",
  "kia":                        "Kigali International Airport Rwanda",
  "downtown kigali":            "Kigali City Centre Rwanda",
  "mu mujyi":                   "Kigali City Centre Rwanda",
  "downtown (mu mujyi)":        "Kigali City Centre Rwanda",
  "nyabugogo bus park":         "Nyabugogo Terminal Kigali",
  "kimironko market":           "Kimironko Market Kigali",
  "deco center":                "Deco Center KG 9 Ave Kigali",
  "decor center":               "Deco Center KG 9 Ave Kigali",
  "kigali heights":             "Kigali Heights Kigali",
  "kigali convention centre":   "Kigali Convention Centre Rwanda",
  "kcc":                        "Kigali Convention Centre Rwanda",
  "union trade centre":         "Union Trade Centre Kigali",
  "utc":                        "Union Trade Centre Kigali",
  "chic restaurant":            "Chic Restaurant Kigali",
  "car general":                "Car General Kigali",
  "ubumwe grande hotel":        "Ubumwe Grande Hotel Kigali",
  "rwandan parliament":         "Parliament of Rwanda Kigali",
};

// Hardcoded fallback coordinates for key places that Nominatim occasionally misses
// Used only if Nominatim returns no result after alias substitution
const KNOWN_COORDS = {
  "african leadership university rwanda": { lat: -1.9156, lon: 30.1032 },
  "alu rwanda campus":                    { lat: -1.9156, lon: 30.1032 },
  "kigali international airport rwanda":  { lat: -1.9686, lon: 30.1395 },
  "kigali city centre rwanda":            { lat: -1.9507, lon: 30.0588 },
  "nyabugogo terminal kigali":            { lat: -1.9455, lon: 30.0437 },
  "kimironko market kigali":              { lat: -1.9371, lon: 30.1138 },
  "deco center kg 9 ave kigali":          { lat: -1.9544, lon: 30.0611 },
  "kigali convention centre rwanda":      { lat: -1.9534, lon: 30.0934 },
  "union trade centre kigali":            { lat: -1.9497, lon: 30.0588 },
};

// App state
let currentFilter = "all";
let currentSort   = "default";
let userProfile   = null; // set by onboarding form; saved in localStorage

// Keywords in trip locations that qualify for the student discount
// If origin OR destination contains any of these, a student gets the 20% off
const UNIVERSITY_KEYWORDS = [
  "alu", "african leadership",
  "university of rwanda",
  "carnegie mellon", "cmu africa",
  "auca", "adventist university",
  "mount kigali", "mku",
  "kepler",
  "ines",
];

function tripInvolvesUniversity(origin, dest) {
  const text = (origin + " " + dest).toLowerCase();
  return UNIVERSITY_KEYWORDS.some(kw => text.includes(kw));
}

function shouldApplyStudentDiscount(origin, dest) {
  return (
    userProfile &&
    userProfile.type === "student" &&
    tripInvolvesUniversity(origin, dest)
  );
}

// ============================================================
// FIXED ROUTES RENDERING
// ============================================================
function renderRoutes() {
  const grid = document.getElementById("routesGrid");
  let routes = [...FIXED_ROUTES];

  // Sort
  if (currentSort === "price-asc")       routes.sort((a, b) => a.price - b.price);
  else if (currentSort === "price-desc") routes.sort((a, b) => b.price - a.price);
  else if (currentSort === "distance-asc") routes.sort((a, b) => a.distanceKm - b.distanceKm);

  grid.innerHTML = routes.map(r => {
    // Fixed filter logic — "cheap" = under 1000 RWF
    let hidden = "";
    if (currentFilter === "cheap"  && r.price >= 1000)                      hidden = "hidden-card";
    if (currentFilter === "medium" && (r.price < 1000 || r.price > 2000))   hidden = "hidden-card";
    if (currentFilter === "far"    && r.price <= 2000)                       hidden = "hidden-card";

    return `
      <div class="route-card ${hidden}">
        <span class="route-from">${r.from}</span>
        <div class="route-to">${r.to}</div>
        <div class="route-info">~${r.distanceKm} km &nbsp;·&nbsp; ~${r.durationMin} min</div>
        <span class="route-tag">${r.tag}</span>
        <div class="route-price">${r.price.toLocaleString()} RWF</div>
        <button class="use-route-btn" data-from="${r.from}" data-to="${r.to}">Use this route →</button>
      </div>`;
  }).join("");

  // Bind "Use this route" buttons — fills estimator and scrolls to it
  grid.querySelectorAll(".use-route-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("origin").value      = btn.dataset.from;
      document.getElementById("destination").value = btn.dataset.to;
      document.querySelectorAll(".shortcut-chip").forEach(c => c.classList.remove("active-dest"));
      document.getElementById("estimator").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderRoutes();
  });
});

document.getElementById("sortSelect").addEventListener("change", e => {
  currentSort = e.target.value;
  renderRoutes();
});

renderRoutes();

// ============================================================
// PROFILE BAR — shows user info; "Change" button re-opens modal
// ============================================================
function showProfileBar(profile) {
  const bar  = document.getElementById("profileBar");
  const info = document.getElementById("profileInfo");

  if (profile.type === "student") {
    const uniLabels = {
      alu: "ALU Rwanda Campus", ur: "University of Rwanda",
      cmu: "CMU Africa", auca: "AUCA", mku: "Mount Kigali University",
      kepler: "Kepler College", ines: "INES", other: "University",
    };
    info.innerHTML =
      `<span class="profile-badge student-badge">🎓 Student</span>` +
      `<strong>${profile.name}</strong> · ${uniLabels[profile.university] || "University"}` +
      `<span class="disc-pill">20% off university routes</span>`;
  } else {
    info.innerHTML =
      `<span class="profile-badge public-badge">👤 Rider</span>` +
      `<strong>${profile.name}</strong>`;
  }

  bar.hidden = false;
}

document.getElementById("changeProfileBtn").addEventListener("click", () => {
  // Reset to step 1 and clear stored profile so onboarding runs fresh
  localStorage.removeItem("motofare_profile");
  userProfile = null;
  const steps = ["stepType", "stepStudent", "stepPublic"];
  steps.forEach(id => document.getElementById(id).classList.add("hidden"));
  document.getElementById("stepType").classList.remove("hidden");
  document.getElementById("modalOverlay").classList.add("visible");
});

// ============================================================
// AUTOCOMPLETE — local list + live Nominatim API search
// Shows local matches instantly, then enriches with API results
// after a 500 ms debounce (respects Nominatim's 1 req/sec policy)
// ============================================================
function renderSuggestions(sugBox, items, input) {
  if (!items.length) { sugBox.classList.remove("visible"); return; }
  sugBox.innerHTML = items
    .map(m => `<div class="suggestion-item"><span class="sug-icon">📍</span>${m}</div>`)
    .join("");
  sugBox.classList.add("visible");
  sugBox.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("mousedown", e => {
      e.preventDefault();
      input.value = item.textContent.trim().replace("📍", "").trim();
      sugBox.classList.remove("visible");
    });
  });
}

function setupAutocomplete(inputId, suggestionsId) {
  const input  = document.getElementById(inputId);
  const sugBox = document.getElementById(suggestionsId);
  let apiTimer;

  input.addEventListener("input", () => {
    const val = input.value.trim();
    clearTimeout(apiTimer);

    if (val.length < 2) { sugBox.classList.remove("visible"); return; }

    // 1. Show local matches immediately
    const local = KIGALI_PLACES
      .filter(p => p.toLowerCase().includes(val.toLowerCase()))
      .slice(0, 6);
    renderSuggestions(sugBox, local, input);

    // 2. After 500 ms, enrich with Nominatim API results
    apiTimer = setTimeout(async () => {
      try {
        const q   = encodeURIComponent(val + " Kigali Rwanda");
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=rw&addressdetails=1&namedetails=1&viewbox=${KIGALI_VIEWBOX}`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "en",
            "User-Agent":      "MotoFareKigali/1.0 (student-project)",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.length) return;

        // Extract short readable names from Nominatim results
        const apiNames = data.map(d => {
          const a = d.address || {};
          return (a.amenity || a.building || a.road || a.neighbourhood
               || a.suburb  || a.city_district || d.name
               || d.display_name.split(",")[0]).trim();
        }).filter(Boolean);

        // Merge: local first, then API results not already shown
        const seen  = new Set(local.map(l => l.toLowerCase()));
        const merged = [...local];
        for (const name of apiNames) {
          if (!seen.has(name.toLowerCase())) {
            merged.push(name);
            seen.add(name.toLowerCase());
          }
          if (merged.length >= 8) break;
        }

        // Only re-render if input hasn't changed
        if (input.value.trim() === val) {
          renderSuggestions(sugBox, merged, input);
        }
      } catch {
        // Silently ignore API failures — local suggestions remain visible
      }
    }, 500);
  });

  input.addEventListener("blur", () => setTimeout(() => sugBox.classList.remove("visible"), 150));
}

setupAutocomplete("origin",      "originSuggestions");
setupAutocomplete("destination", "destinationSuggestions");

// ============================================================
// SHORTCUT CHIPS — quick destination selection
// ============================================================
document.querySelectorAll(".shortcut-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".shortcut-chip").forEach(c => c.classList.remove("active-dest"));
    chip.classList.add("active-dest");
    document.getElementById("destination").value = chip.dataset.place;
    document.getElementById("destinationSuggestions").classList.remove("visible");
  });
});

// ============================================================
// SWAP BUTTON
// ============================================================
document.getElementById("swapBtn").addEventListener("click", () => {
  const o = document.getElementById("origin");
  const d = document.getElementById("destination");
  [o.value, d.value] = [d.value, o.value];
});

// ============================================================
// GPS DETECTION — browser geolocation + Nominatim reverse geocode
// ============================================================
document.getElementById("gpsBtn").addEventListener("click", async () => {
  if (!navigator.geolocation) {
    showError("Your browser doesn't support GPS. Please type your starting address.");
    return;
  }

  const btn    = document.getElementById("gpsBtn");
  const origin = document.getElementById("origin");
  btn.classList.add("spinning");
  btn.disabled = true;
  origin.value = "Detecting your location…";

  navigator.geolocation.getCurrentPosition(
    // SUCCESS
    async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":      "MotoFareKigali/1.0 (student-project)",
            "Accept-Language": "en",
          },
        });
        if (!res.ok) throw new Error("Reverse geocode failed");
        const data = await res.json();
        const addr = data.address || {};
        const label = addr.road || addr.neighbourhood || addr.suburb
                   || addr.city_district || data.display_name.split(",")[0];
        origin.value = label.trim();
        errorCard.classList.add("hidden");
      } catch {
        origin.value = "";
        showError("Could not convert your GPS location to an address. Please type your starting point.");
      } finally {
        btn.classList.remove("spinning");
        btn.disabled = false;
      }
    },
    // ERROR
    err => {
      btn.classList.remove("spinning");
      btn.disabled = false;
      origin.value = "";
      const msgs = {
        1: "Location access denied. Please allow location permission, or type your address.",
        2: "Location signal unavailable. Please type your address.",
        3: "Location timed out. Please try again or type your address.",
      };
      showError(msgs[err.code] || "Could not detect location. Please type your address.");
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
});

// ============================================================
// GEOCODING — Nominatim (OpenStreetMap), FREE, no key needed
// Strategy:
//   1. Resolve alias (e.g. "ALU Rwanda Campus" → official OSM name)
//   2. Build a smart query suffix — never duplicate "Kigali" or "Rwanda"
//   3. Try Nominatim; if empty, retry with a simplified query
//   4. Fall back to KNOWN_COORDS for key places Nominatim may miss
// Returns { lat, lon, displayName } or null
// ============================================================

// Builds the right location suffix so we never end up with
// "Kigali, KG 9 Ave, Kigali, Rwanda" (duplicated city name)
function buildGeoQuery(text) {
  const lower = text.toLowerCase();
  if (lower.includes("rwanda"))       return text;               // already has country
  if (lower.includes("kigali"))       return text + ", Rwanda";  // has city, add country
  return text + ", Kigali, Rwanda";                              // add both
}

// Kigali viewbox for Nominatim: left,top,right,bottom (minLon,maxLat,maxLon,minLat)
// Biases results to Kigali without blocking results outside it entirely
const KIGALI_VIEWBOX = "29.9,-1.78,30.25,-2.1";

async function nominatimFetch(queryText) {
  // namedetails=1 helps match local/alternative names (e.g. "Mu Mujyi", "KCC")
  const url = `https://nominatim.openstreetmap.org/search`
    + `?q=${encodeURIComponent(queryText)}`
    + `&format=json&limit=5&countrycodes=rw`
    + `&addressdetails=1&namedetails=1`
    + `&viewbox=${KIGALI_VIEWBOX}`;   // bias to Kigali — plain names like "Nyamirambo" resolve correctly
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent":      "MotoFareKigali/1.0 (student-project)",
    },
  });
  if (!res.ok) throw new Error(`Geocoding request failed (HTTP ${res.status})`);
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
}

async function geocode(query) {
  const lower    = query.trim().toLowerCase();
  const resolved = GEOCODE_ALIASES[lower] || query.trim();
  const fallback = KNOWN_COORDS[resolved.toLowerCase()];

  try {
    // Attempt 1: smart-suffixed query
    let hit = await nominatimFetch(buildGeoQuery(resolved));

    // Attempt 2: if nothing returned, try the last meaningful token
    // e.g. "Kigali, KG 9 Ave, Deco Center" → try "Deco Center, Kigali, Rwanda"
    if (!hit) {
      const parts   = resolved.split(/[,/]/).map(s => s.trim()).filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.toLowerCase() !== lower) {
        console.warn("Nominatim: retrying with last token:", lastPart);
        hit = await nominatimFetch(buildGeoQuery(lastPart));
      }
    }

    // Attempt 3: try the first meaningful token (landmark before street)
    if (!hit) {
      const parts      = resolved.split(/[,/]/).map(s => s.trim()).filter(Boolean);
      const firstPart  = parts[0];
      if (firstPart && firstPart.toLowerCase() !== lower) {
        console.warn("Nominatim: retrying with first token:", firstPart);
        hit = await nominatimFetch(buildGeoQuery(firstPart));
      }
    }

    if (hit) {
      return {
        lat:         parseFloat(hit.lat),
        lon:         parseFloat(hit.lon),
        displayName: hit.display_name,
      };
    }
  } catch (err) {
    if (fallback) {
      console.warn("Nominatim unavailable, using hardcoded coords for:", resolved);
      return { lat: fallback.lat, lon: fallback.lon, displayName: resolved };
    }
    throw err;
  }

  // Nominatim returned nothing after all attempts — use hardcoded coords if available
  if (fallback) {
    console.warn("Nominatim found nothing for:", resolved, "— using hardcoded coords");
    return { lat: fallback.lat, lon: fallback.lon, displayName: resolved };
  }

  return null;
}

// ============================================================
// KIGALI BOUNDS CHECK
// ============================================================
function isInsideKigali(lat, lon) {
  return (
    lat >= KIGALI_BOUNDS.minLat && lat <= KIGALI_BOUNDS.maxLat &&
    lon >= KIGALI_BOUNDS.minLon && lon <= KIGALI_BOUNDS.maxLon
  );
}

// ============================================================
// ROUTING — OSRM (Open Source Routing Machine), FREE, no key
// Returns { distanceKm, durationMin }
// ============================================================
async function getRouteOSRM(fromCoords, toCoords) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromCoords.lon},${fromCoords.lat};${toCoords.lon},${toCoords.lat}?overview=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (HTTP ${res.status})`);

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes || !data.routes.length) {
    throw new Error("No road route found between these two locations.");
  }

  const route = data.routes[0];
  return {
    distanceKm:  parseFloat((route.distance / 1000).toFixed(2)),
    durationMin: Math.ceil(route.duration / 60),
  };
}

// ============================================================
// HAVERSINE — straight-line distance fallback (km)
// Used only if OSRM is unreachable
// ============================================================
function haversineKm(lat1, lon1, lat2, lon2) {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2 +
             Math.cos(lat1 * Math.PI / 180) *
             Math.cos(lat2 * Math.PI / 180) *
             Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// FARE CALCULATION — tiered pricing + optional student discount
// applyDiscount = true only when user is a student AND trip is to/from a university
// ============================================================
function calcFare(distanceKm, applyDiscount = false) {
  let cost = PRICING.baseFare;
  let rem  = Math.max(0, distanceKm - 1); // base fare covers first 1 km

  const t1 = Math.min(rem, 4);            // km 1–5
  cost += t1 * PRICING.rateT1; rem -= t1;

  const t2 = Math.min(rem, 5);            // km 5–10
  cost += t2 * PRICING.rateT2; rem -= t2;

  cost += rem * PRICING.rateT3;           // km > 10

  const subtotal = cost;
  const stuAdj   = applyDiscount ? subtotal * PRICING.studentDisc : 0;
  const final    = Math.round((subtotal - stuAdj) / 50) * 50; // round to nearest 50 RWF

  return { subtotal, stuAdj, final };
}

// ============================================================
// UI HELPERS
// ============================================================
const estimateBtn = document.getElementById("estimateBtn");
const btnText     = document.querySelector(".btn-text");
const btnLoader   = document.querySelector(".btn-loader");
const resultCard  = document.getElementById("resultCard");
const errorCard   = document.getElementById("errorCard");

function setLoading(yes) {
  estimateBtn.disabled = yes;
  btnText.classList.toggle("hidden", yes);
  btnLoader.classList.toggle("hidden", !yes);
}

function showError(msg, isOutOfBounds = false) {
  resultCard.classList.add("hidden");
  errorCard.classList.remove("hidden");

  const icon  = document.getElementById("errorIcon");
  const msgEl = document.getElementById("errorMsg");

  if (isOutOfBounds) {
    icon.textContent = "🗺️";
    msgEl.innerHTML  = `
      <strong>Location outside Kigali</strong><br><br>
      MotoFare only supports rides <em>within Kigali City</em>.<br>
      We're still growing — new areas coming soon! 🚧
    `;
  } else {
    icon.textContent  = "⚠️";
    msgEl.textContent = msg;
  }
}

function showResult({ origin, destination, distanceKm, durationMin, fare, applyDiscount }) {
  errorCard.classList.add("hidden");
  resultCard.classList.remove("hidden");

  document.getElementById("resultRoute").textContent = `${origin} → ${destination}`;
  document.getElementById("resultFare").textContent  = `${fare.final.toLocaleString()} RWF`;

  let meta = `Distance: ~${distanceKm} km  ·  Est. time: ~${durationMin} min`;
  if (applyDiscount) meta += "  ·  🎓 Student discount applied";
  document.getElementById("resultMeta").textContent = meta;

  // Negotiation range (−10% to +15%)
  const lo = Math.round(fare.final * 0.9);
  const hi = Math.round(fare.final * 1.15);
  document.getElementById("fareRange").textContent =
    `Negotiation range: ${lo.toLocaleString()} – ${hi.toLocaleString()} RWF`;

  // Build detailed breakdown
  const km1 = Math.min(Math.max(distanceKm - 1, 0), 4);
  const km2 = Math.min(Math.max(distanceKm - 5, 0), 5);
  const km3 = Math.max(distanceKm - 10, 0);

  let bd = `Base fare (first 1 km): <strong>${PRICING.baseFare} RWF</strong>`;

  if (km1 > 0.001)
    bd += `<br>km 1–${Math.min(distanceKm, 5).toFixed(1)} (${km1.toFixed(2)} km × ${PRICING.rateT1} RWF): `
        + `<strong>${Math.round(km1 * PRICING.rateT1).toLocaleString()} RWF</strong>`;

  if (km2 > 0.001)
    bd += `<br>km 5–${Math.min(distanceKm, 10).toFixed(1)} (${km2.toFixed(2)} km × ${PRICING.rateT2} RWF): `
        + `<strong>${Math.round(km2 * PRICING.rateT2).toLocaleString()} RWF</strong>`;

  if (km3 > 0.001)
    bd += `<br>km >10 (${km3.toFixed(2)} km × ${PRICING.rateT3} RWF): `
        + `<strong>${Math.round(km3 * PRICING.rateT3).toLocaleString()} RWF</strong>`;

  bd += `<br>──────────────────────────────────<br>`
      + `Subtotal: <strong>${Math.round(fare.subtotal).toLocaleString()} RWF</strong>`;

  if (applyDiscount && fare.stuAdj > 0)
    bd += `<br>🎓 Student discount (−20%): <strong>−${Math.round(fare.stuAdj).toLocaleString()} RWF</strong>`;

  bd += `<br>──────────────────────────────────<br>`
      + `<strong>Total: ${fare.final.toLocaleString()} RWF</strong>`;

  document.getElementById("resultBreakdown").innerHTML = bd;
  document.getElementById("studentNote").hidden = !applyDiscount;
}

// ============================================================
// MAIN ESTIMATE FLOW
// ============================================================
estimateBtn.addEventListener("click", async () => {
  const originVal = document.getElementById("origin").value.trim();
  const destVal   = document.getElementById("destination").value.trim();

  // Input validation
  if (!originVal) {
    showError("Please enter a starting location.");
    return;
  }
  if (!destVal) {
    showError("Please enter a destination.");
    return;
  }
  if (originVal.toLowerCase() === destVal.toLowerCase()) {
    showError("Starting point and destination look the same. Please enter two different locations.");
    return;
  }

  setLoading(true);
  resultCard.classList.add("hidden");
  errorCard.classList.add("hidden");

  try {
    // Step 1: Geocode both locations via Nominatim
    const [fromCoords, toCoords] = await Promise.all([
      geocode(originVal),
      geocode(destVal),
    ]);

    // Step 2: Check if locations were found
    if (!fromCoords) {
      showError(`Could not find "${originVal}" on the map. Try a more specific name, e.g. "Kimironko, Kigali".`);
      return;
    }
    if (!toCoords) {
      showError(`Could not find "${destVal}" on the map. Try a more specific name, e.g. "Remera, Kigali".`);
      return;
    }

    // Step 3: Kigali boundary check
    if (!isInsideKigali(fromCoords.lat, fromCoords.lon)) {
      showError(null, true);
      return;
    }
    if (!isInsideKigali(toCoords.lat, toCoords.lon)) {
      showError(null, true);
      return;
    }

    // Step 4: Get real road distance from OSRM
    let route;
    try {
      route = await getRouteOSRM(fromCoords, toCoords);
    } catch (routeErr) {
      // Fallback: Haversine × 1.35 (road-to-straight-line factor for hilly Kigali)
      console.warn("OSRM unavailable, using Haversine fallback:", routeErr.message);
      const straightKm = haversineKm(fromCoords.lat, fromCoords.lon, toCoords.lat, toCoords.lon);
      const roadKm     = parseFloat((straightKm * 1.35).toFixed(2));
      route = {
        distanceKm:  roadKm,
        durationMin: Math.ceil(roadKm / 20 * 60), // avg 20 km/h in Kigali traffic
      };
    }

    // Step 5: Calculate fare and show result
    const applyDiscount = shouldApplyStudentDiscount(originVal, destVal);
    const fare = calcFare(route.distanceKm, applyDiscount);
    showResult({ origin: originVal, destination: destVal, ...route, fare, applyDiscount });

  } catch (err) {
    console.error("Estimation error:", err);
    const msg = err.message.toLowerCase();
    if (msg.includes("failed to fetch") || msg.includes("networkerror")) {
      showError("Network error — please check your internet connection and try again.");
    } else {
      showError(`Something went wrong: ${err.message}. Please try again.`);
    }
  } finally {
    setLoading(false);
  }
});

// ============================================================
// ONBOARDING MODAL — shown on first visit; data saved to localStorage
// ============================================================
(function initOnboarding() {
  const overlay   = document.getElementById("modalOverlay");
  const stepType  = document.getElementById("stepType");
  const stepStu   = document.getElementById("stepStudent");
  const stepPub   = document.getElementById("stepPublic");

  function showStep(step) {
    [stepType, stepStu, stepPub].forEach(s => s.classList.add("hidden"));
    step.classList.remove("hidden");
  }

  function closeModal(profile) {
    userProfile = profile;
    localStorage.setItem("motofare_profile", JSON.stringify(profile));
    overlay.classList.remove("visible");
    showProfileBar(profile);
  }

  // ── Step navigation — always attach so "Change" re-open works too ──
  document.getElementById("chooseStudent").addEventListener("click", () => showStep(stepStu));
  document.getElementById("choosePublic").addEventListener("click",  () => showStep(stepPub));
  document.getElementById("backStudent").addEventListener("click",   () => showStep(stepType));
  document.getElementById("backPublic").addEventListener("click",    () => showStep(stepType));

  // Check for saved profile — skip modal if already set up
  try {
    const saved = localStorage.getItem("motofare_profile");
    if (saved) {
      const p = JSON.parse(saved);
      if (p && p.type && p.name) {
        userProfile = p;
        showProfileBar(p);
        return; // skip modal
      }
    }
  } catch { /* ignore corrupt storage */ }

  // No saved profile — show modal
  overlay.classList.add("visible");
  showStep(stepType);

  // ── Step 2a: Student form ──
  const sCard     = document.getElementById("sCard");
  const preview   = document.getElementById("cardPreview");
  const zoneText  = document.getElementById("fileZoneText");
  const fileZone  = document.getElementById("fileZone");

  sCard.addEventListener("change", () => {
    const file = sCard.files[0];
    if (!file) return;
    zoneText.textContent = file.name;
    fileZone.classList.add("has-file");
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("studentForm").addEventListener("submit", e => {
    e.preventDefault();
    const name  = document.getElementById("sName").value.trim();
    const uni   = document.getElementById("sUniversity").value;
    const sid   = document.getElementById("sId").value.trim();
    const hasCard = sCard.files.length > 0;
    const errEl = document.getElementById("sError");

    if (!name) {
      errEl.textContent = "Please enter your full name.";
      errEl.classList.remove("hidden"); return;
    }
    if (!uni) {
      errEl.textContent = "Please select your university.";
      errEl.classList.remove("hidden"); return;
    }
    if (!sid && !hasCard) {
      errEl.textContent = "Please provide your Student ID or upload your student card photo.";
      errEl.classList.remove("hidden"); return;
    }
    errEl.classList.add("hidden");

    closeModal({
      type: "student", name, university: uni,
      studentId: sid || null, hasCard,
    });
  });

  // ── Step 2b: Public form ──
  document.getElementById("publicForm").addEventListener("submit", e => {
    e.preventDefault();
    const name  = document.getElementById("pName").value.trim();
    const phone = document.getElementById("pPhone").value.trim();
    const errEl = document.getElementById("pError");

    if (!name) {
      errEl.textContent = "Please enter your full name.";
      errEl.classList.remove("hidden"); return;
    }
    if (!phone) {
      errEl.textContent = "Please enter your phone number.";
      errEl.classList.remove("hidden"); return;
    }
    // Basic Rwanda phone validation: 10 digits starting with 07 or 072/073/078/079
    if (!/^0[7][0-9]{8}$/.test(phone.replace(/\s/g, ""))) {
      errEl.textContent = "Please enter a valid Rwandan phone number (e.g. 0788 123 456).";
      errEl.classList.remove("hidden"); return;
    }
    errEl.classList.add("hidden");

    closeModal({ type: "public", name, phone });
  });
})();

// ============================================================
// KEYBOARD UX
// ============================================================
document.getElementById("origin").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("destination").focus();
});
document.getElementById("destination").addEventListener("keydown", e => {
  if (e.key === "Enter") estimateBtn.click();
});
document.getElementById("retryBtn").addEventListener("click", () => {
  errorCard.classList.add("hidden");
  document.getElementById("origin").focus();
});
