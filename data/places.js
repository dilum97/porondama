/**
 * places.js
 * ------------------------------------------------------------------
 * Major Sri Lankan towns/cities with lat/lng, used ONLY to compute
 * the Lagna (Ascendant) in js/panchanga.js -> calculateLagna(). The
 * Ascendant depends on the exact birth location's coordinates and
 * local sidereal time, unlike Nakshatra/Rashi which only need birth
 * date + time.
 *
 * Presented to the member as a dropdown (see populatePlaceSelect
 * below) rather than free text + geocoding API — keeps the whole
 * site working offline with no network call and no API key, same
 * reasoning as astronomy-engine.min.js being vendored locally.
 * Coordinates are town-centre approximations; fine for Ascendant
 * purposes since a few km of error moves the Ascendant by a
 * negligible fraction of a degree, nowhere near a rashi boundary.
 *
 * Not exhaustive — district capitals plus some other well-known
 * towns. Extend this list any time a common place is missing;
 * nothing else needs to change (see populatePlaceSelect).
 */

const SL_PLACES = [
  { si: "කොළඹ",        en: "Colombo",       lat: 6.9271, lng: 79.8612 },
  { si: "ගම්පහ",        en: "Gampaha",       lat: 7.0917, lng: 80.0000 },
  { si: "නෙගොම්බෝ",     en: "Negombo",       lat: 7.2083, lng: 79.8358 },
  { si: "පානදුර",       en: "Panadura",      lat: 6.7133, lng: 79.9026 },
  { si: "මොරටුව",       en: "Moratuwa",      lat: 6.7730, lng: 79.8816 },
  { si: "කළුතර",        en: "Kalutara",      lat: 6.5854, lng: 79.9607 },
  { si: "මහනුවර",       en: "Kandy",         lat: 7.2906, lng: 80.6337 },
  { si: "ගම්පොල",       en: "Gampola",       lat: 7.1647, lng: 80.5722 },
  { si: "මාතලේ",        en: "Matale",        lat: 7.4675, lng: 80.6234 },
  { si: "නුවරඑළිය",     en: "Nuwara Eliya",  lat: 6.9497, lng: 80.7891 },
  { si: "ගාල්ල",        en: "Galle",         lat: 6.0535, lng: 80.2210 },
  { si: "හික්කඩුව",     en: "Hikkaduwa",     lat: 6.1408, lng: 80.1017 },
  { si: "මාතර",         en: "Matara",        lat: 5.9549, lng: 80.5550 },
  { si: "වැලිගම",       en: "Weligama",      lat: 5.9740, lng: 80.4297 },
  { si: "හම්බන්තොට",    en: "Hambantota",    lat: 6.1241, lng: 81.1185 },
  { si: "තංගල්ල",       en: "Tangalle",      lat: 6.0242, lng: 80.7942 },
  { si: "එම්බිලිපිටිය", en: "Embilipitiya",  lat: 6.3417, lng: 80.8500 },
  { si: "යාපනය",        en: "Jaffna",        lat: 9.6615, lng: 80.0255 },
  { si: "කිලිනොච්චිය",  en: "Kilinochchi",   lat: 9.3961, lng: 80.3982 },
  { si: "මන්නාරම",      en: "Mannar",        lat: 8.9810, lng: 79.9044 },
  { si: "වවුනියාව",     en: "Vavuniya",      lat: 8.7514, lng: 80.4971 },
  { si: "මුලතිව්",      en: "Mullaitivu",    lat: 9.2671, lng: 80.8142 },
  { si: "මඩකලපුව",      en: "Batticaloa",    lat: 7.7170, lng: 81.7000 },
  { si: "අම්පාර",       en: "Ampara",        lat: 7.2975, lng: 81.6747 },
  { si: "කල්මුනේ",      en: "Kalmunai",      lat: 7.4167, lng: 81.8167 },
  { si: "ත්‍රිකුණාමලය", en: "Trincomalee",   lat: 8.5874, lng: 81.2152 },
  { si: "කුරුණෑගල",     en: "Kurunegala",    lat: 7.4818, lng: 80.3609 },
  { si: "පුත්තලම",      en: "Puttalam",      lat: 8.0362, lng: 79.8283 },
  { si: "හලාවත",        en: "Chilaw",        lat: 7.5758, lng: 79.7953 },
  { si: "අනුරාධපුරය",   en: "Anuradhapura",  lat: 8.3114, lng: 80.4037 },
  { si: "පොළොන්නරුව",   en: "Polonnaruwa",   lat: 7.9403, lng: 81.0188 },
  { si: "දඹුල්ල",       en: "Dambulla",      lat: 7.8675, lng: 80.6517 },
  { si: "බදුල්ල",       en: "Badulla",       lat: 6.9934, lng: 81.0550 },
  { si: "බණ්ඩාරවෙල",    en: "Bandarawela",   lat: 6.8290, lng: 80.9862 },
  { si: "වැලිමඩ",       en: "Welimada",      lat: 6.9042, lng: 80.9139 },
  { si: "මොණරාගල",      en: "Monaragala",    lat: 6.8714, lng: 81.3507 },
  { si: "රත්නපුර",      en: "Ratnapura",     lat: 6.6828, lng: 80.3992 },
  { si: "කෑගල්ල",       en: "Kegalle",       lat: 7.2513, lng: 80.3464 },
  { si: "අවිස්සාවේල්ල", en: "Avissawella",   lat: 6.9548, lng: 80.2094 },
  { si: "හෝමාගම",       en: "Homagama",      lat: 6.8444, lng: 80.0022 },
  { si: "කෝට්ටේ",       en: "Kotte",         lat: 6.8905, lng: 79.9019 }
];

function getPlaceBySinhalaName(name) {
  return SL_PLACES.find(p => p.si === name);
}

// Fills a <select> with the SL_PLACES list (option value = Sinhala
// name, same string already stored as birthPlace everywhere else in
// the app — feed cards, match cards, admin panel — so nothing else
// needs to change to keep displaying it). lat/lng are stashed on
// data-lat/data-lng so callers can read them straight off the
// selected <option> with no separate lookup.
//
// If currentValue doesn't match any listed place (old free-text data
// from before this dropdown existed, or a small town not listed), it
// is kept as an extra selected option so the field still shows what
// was saved — Lagna just can't be computed until the person picks a
// real listed town instead. Nakshatra/Rashi are unaffected either
// way, since those don't depend on birth place.
function populatePlaceSelect(selectEl, currentValue) {
  selectEl.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "-- තෝරන්න --";
  selectEl.appendChild(blank);

  let matched = false;
  for (const p of SL_PLACES) {
    const opt = document.createElement("option");
    opt.value = p.si;
    opt.textContent = p.si;
    opt.dataset.lat = p.lat;
    opt.dataset.lng = p.lng;
    if (currentValue && p.si === currentValue) {
      opt.selected = true;
      matched = true;
    }
    selectEl.appendChild(opt);
  }

  if (currentValue && !matched) {
    const custom = document.createElement("option");
    custom.value = currentValue;
    custom.textContent = currentValue + " (ලැයිස්තුවේ නැත)";
    custom.selected = true;
    selectEl.appendChild(custom);
  }
}
