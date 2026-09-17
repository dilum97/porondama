/**
 * districts.js
 * ------------------------------------------------------------------
 * The 25 administrative districts of Sri Lanka, bilingual
 * (Sinhala + English). Used for:
 *   - the "පදිංචි දිස්ත්‍රික්කය" (residential district) dropdown in
 *     the Settings profile form (dashboard.html) — saved on the user
 *     doc as `district` (the Sinhala name is stored, same convention
 *     already used for birthPlace in data/places.js)
 *   - the district search box on the Home tab feed (dashboard.html),
 *     which filters the feed down to people in one district
 *
 * Deliberately separate from data/places.js (SL_PLACES) — that list
 * is town-level and used only for the Lagna/Ascendant calculation;
 * it has nothing to do with where someone currently lives.
 * ------------------------------------------------------------------
 */

const SL_DISTRICTS = [
  { si: "කොළඹ",         en: "Colombo" },
  { si: "ගම්පහ",         en: "Gampaha" },
  { si: "කළුතර",         en: "Kalutara" },
  { si: "මහනුවර",        en: "Kandy" },
  { si: "මාතලේ",         en: "Matale" },
  { si: "නුවරඑළිය",      en: "Nuwara Eliya" },
  { si: "ගාල්ල",         en: "Galle" },
  { si: "මාතර",          en: "Mathara" },
  { si: "හම්බන්තොට",     en: "Hambanthota" },
  { si: "යාපනය",         en: "Jaffna" },
  { si: "කිලිනොච්චිය",   en: "Kilinochchi" },
  { si: "මන්නාරම",       en: "Mannar" },
  { si: "වවුනියාව",      en: "Vavuniya" },
  { si: "මුලතිව්",       en: "Mullaitivu" },
  { si: "මඩකලපුව",       en: "Batticaloa" },
  { si: "අම්පාර",        en: "Ampara" },
  { si: "ත්‍රිකුණාමලය",  en: "Trincomalee" },
  { si: "කුරුණෑගල",      en: "Kurunegala" },
  { si: "පුත්තලම",       en: "Puttalam" },
  { si: "අනුරාධපුරය",    en: "Anuradhapura" },
  { si: "පොළොන්නරුව",    en: "Polonnaruwa" },
  { si: "බදුල්ල",        en: "Badulla" },
  { si: "මොනරාගල",       en: "Monaragala" },
  { si: "රත්නපුර",       en: "Ratnapura" },
  { si: "කෑගල්ල",        en: "Kegalle" }
];

// Fills a <select> with the SL_DISTRICTS list (option value = Sinhala
// name — same string stored in the `district` field everywhere else),
// label shown as "සිංහල - English".
function populateDistrictSelect(selectEl, currentValue) {
  selectEl.innerHTML = '<option value="">-- Select --</option>' +
    SL_DISTRICTS.map(d => `<option value="${d.si}">${d.si} - ${d.en}</option>`).join("");
  if (currentValue) selectEl.value = currentValue;
}

// Returns districts whose Sinhala or English name contains `query`
// (case-insensitive on the English side, plain substring on Sinhala).
function searchDistricts(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return SL_DISTRICTS.filter(d =>
    d.si.includes(query.trim()) || d.en.toLowerCase().includes(q)
  );
}
