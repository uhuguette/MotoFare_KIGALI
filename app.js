// ============================================
// MOTOFARE KIGALI — app.js
// External APIs (both FREE, no key required):
//   1. Nominatim (OpenStreetMap) — geocoding
//   2. OSRM (Open Source Routing Machine) — road routing
// ============================================

const KIGALI_BOUNDS = {
  minLat: -2.1,  maxLat: -1.78,
  minLon: 29.9,  maxLon: 30.25,
};

const PRICING = {
  baseFare:    500,
  rateT1:      200,
  rateT2:      150,
  rateT3:      110,
  studentDisc: 0.20,
};

const FIXED_ROUTES = [
  { from: "ALU Rwanda Campus", to: "Kimironko",           price: 500,  distanceKm: 2.8,  durationMin: 10, tag: "Popular"     },
  { from: "ALU Rwanda Campus", to: "Remera",              price: 1000, distanceKm: 5.5,  durationMin: 18, tag: "Common"      },
  { from: "ALU Rwanda Campus", to: "Kigali Airport",      price: 1500, distanceKm: 9.2,  durationMin: 28, tag: "Airport"     },
  { from: "ALU Rwanda Campus", to: "Downtown (Mu Mujyi)", price: 2000, distanceKm: 11.0, durationMin: 35, tag: "City Centre"  },
];

const KIGALI_PLACES = [
  "ALU Rwanda Campus", "University of Rwanda", "Carnegie Mellon University Africa",
  "AUCA Kigali", "Mount Kigali University", "Kepler College",
  "Kimironko", "Remera", "Kacyiru", "Gikondo", "Muhima", "Kanombe",
  "Nyabugogo Bus Park", "Kigali International Airport", "Downtown Kigali",
  "Kimironko Market", "Kigali Heights", "Kigali Convention Centre",
  "King Faisal Hospital", "CHUK Hospital", "Kigali Marriott Hotel",
];

let currentFilter = "all";
let currentSort   = "default";
let userProfile   = null;

const UNIVERSITY_KEYWORDS = [
  "alu", "african leadership", "university of rwanda",
  "carnegie mellon", "cmu africa", "auca", "mount kigali", "kepler", "ines",
];

function tripInvolvesUniversity(origin, dest) {
  const text = (origin + " " + dest).toLowerCase();
  return UNIVERSITY_KEYWORDS.some(kw => text.includes(kw));
}

function shouldApplyStudentDiscount(origin, dest) {
  return userProfile && userProfile.type === "student" && tripInvolvesUniversity(origin, dest);
}

// ============================================================
// FIXED ROUTES RENDERING
// ============================================================
function renderRoutes() {
  const grid = document.getElementById("routesGrid");
  let routes = [...FIXED_ROUTES];

  if (currentSort === "price-asc")        routes.sort((a, b) => a.price - b.price);
  else if (currentSort === "price-desc")  routes.sort((a, b) => b.price - a.price);
  else if (currentSort === "distance-asc") routes.sort((a, b) => a.distanceKm - b.distanceKm);

  grid.innerHTML = routes.map(r => {
    let hidden = "";
    if (currentFilter === "cheap"  && r.price >= 1000)                    hidden = "hidden-card";
    if (currentFilter === "medium" && (r.price < 1000 || r.price > 2000)) hidden = "hidden-card";
    if (currentFilter === "far"    && r.price <= 2000)                    hidden = "hidden-card";

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

  grid.querySelectorAll(".use-route-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("origin").value      = btn.dataset.from;
      document.getElementById("destination").value = btn.dataset.to;
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
// FARE CALCULATION
// ============================================================
function calcFare(distanceKm, applyDiscount = false) {
  let cost = PRICING.baseFare;
  let rem  = Math.max(0, distanceKm - 1);

  const t1 = Math.min(rem, 4);
  cost += t1 * PRICING.rateT1; rem -= t1;

  const t2 = Math.min(rem, 5);
  cost += t2 * PRICING.rateT2; rem -= t2;

  cost += rem * PRICING.rateT3;

  const subtotal = cost;
  const stuAdj   = applyDiscount ? subtotal * PRICING.studentDisc : 0;
  const final    = Math.round((subtotal - stuAdj) / 50) * 50;

  return { subtotal, stuAdj, final };
}

// UI helpers
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
  document.getElementById("errorIcon").textContent = isOutOfBounds ? "🗺️" : "⚠️";
  document.getElementById("errorMsg").textContent  = msg;
}

// ============================================================
// ROUTING — OSRM
// ============================================================
async function getRouteOSRM(fromCoords, toCoords) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromCoords.lon},${fromCoords.lat};${toCoords.lon},${toCoords.lat}?overview=false`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (HTTP ${res.status})`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes || !data.routes.length)
    throw new Error("No road route found.");
  const route = data.routes[0];
  return { distanceKm: parseFloat((route.distance / 1000).toFixed(2)), durationMin: Math.ceil(route.duration / 60) };
}

document.getElementById("estimateBtn").addEventListener("click", async () => {
  const origin = document.getElementById("origin").value.trim();
  const dest   = document.getElementById("destination").value.trim();
  if (!origin || !dest) { showError("Please enter both a starting point and destination."); return; }
  if (origin.toLowerCase() === dest.toLowerCase()) { showError("Origin and destination appear to be the same location."); return; }
  // Full flow handled after geocoding is added
  showError("Geocoding not yet implemented. Stay tuned!");
});
