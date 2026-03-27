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
