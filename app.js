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
