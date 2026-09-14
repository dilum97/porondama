// panchanga.js — computes Nakshatra + Rashi directly from birth date +
// birth time (Sri Lanka local time), instead of asking the member to
// pick them manually from a dropdown.
//
// How it works:
//   1. Convert the given local birth date+time (Sri Lanka is always
//      UTC+5:30, no DST) to a UTC instant.
//   2. Use astronomy-engine (js/astronomy-engine.min.js, vendored
//      locally — no network call, no API key) to get the Moon's
//      apparent geocentric ecliptic longitude at that instant. This
//      is a "tropical" longitude (measured from the equinox).
//   3. Subtract the Lahiri ayanamsa for that date to convert it to
//      the "sidereal" longitude used by Vedic/Sinhala astrology.
//   4. 27 nakshatras divide the 360° sidereal circle into equal
//      13°20' slices, and 12 rashis divide it into equal 30° slices
//      — so the sidereal longitude alone determines both, with no
//      lookup table needed.
//
// Nakshatra/Rashi only need birth date + birth time. Lagna
// (Ascendant, see calculateLagna below) additionally needs the birth
// place's lat/lng — the member picks that from the SL_PLACES
// dropdown in data/places.js.

const SL_UTC_OFFSET_MINUTES = 5 * 60 + 30;

// Lahiri ayanamsa, linear approximation anchored at J2000.0
// (23.85° on 2000-01-01, precessing ~50.2388475 arcsec/year).
// Accurate to within roughly 1 arcminute across 1900–2100 — far
// tighter than the 13°20'/30° slices we're placing it into.
function lahiriAyanamsaDegrees(astroTime) {
  const yearsSinceJ2000 = astroTime.tt / 365.25;
  return 23.85 + yearsSinceJ2000 * (50.2388475 / 3600);
}

function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

// birthDateStr: "YYYY-MM-DD", birthTimeStr: "HH:MM" (24h, Sri Lanka
// local time — same strings already stored as birthDate/birthTime).
// Returns { nakshatraId, rashiId, pada, siderealLongitude } or null
// if the inputs aren't usable yet (e.g. still typing).
function calculateNakshatraRashi(birthDateStr, birthTimeStr) {
  if (!birthDateStr || !birthTimeStr) return null;
  const dateParts = birthDateStr.split("-").map(Number);
  const timeParts = birthTimeStr.split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) return null;
  const [y, m, d] = dateParts;
  const [hh, mm] = timeParts;
  if ([y, m, d, hh, mm].some(n => Number.isNaN(n))) return null;

  const localAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
  const utcInstant = new Date(localAsUtc - SL_UTC_OFFSET_MINUTES * 60000);

  const astroTime = Astronomy.MakeTime(utcInstant);
  const moonTropicalLon = Astronomy.EclipticGeoMoon(utcInstant).lon;
  const ayanamsa = lahiriAyanamsaDegrees(astroTime);
  const siderealLon = normalizeDegrees(moonTropicalLon - ayanamsa);

  const nakshatraSpan = 360 / 27;      // 13°20'
  const padaSpan = nakshatraSpan / 4;  // 3°20'
  const nakshatraIndex = Math.floor(siderealLon / nakshatraSpan);
  const pada = Math.floor((siderealLon % nakshatraSpan) / padaSpan) + 1;

  const rashiIndex = Math.floor(siderealLon / 30);

  return {
    nakshatraId: nakshatraIndex + 1, // matches NAKSHATRAS ids (1 = Ashwini)
    rashiId: rashiIndex + 1,          // matches RASHIS ids (1 = Mesha)
    pada,
    siderealLongitude: siderealLon
  };
}

// Lagna (Ascendant) — the sidereal rashi rising on the eastern
// horizon at the moment of birth. Unlike Rashi above (which comes
// from the Moon's position and only needs date+time), this needs the
// birth place's latitude/longitude too, because the same moment
// looks different against the horizon depending on where on Earth
// you're standing.
//
// Standard Ascendant formula:
//   LST  = Greenwich Apparent Sidereal Time (from astronomy-engine,
//          accurate — not the linear GMST approximation some quick
//          references use) + geographic longitude
//   Asc  = atan2(-cos(LST), sin(LST)*cos(obliquity) + tan(lat)*sin(obliquity))
// then convert the resulting tropical degree to sidereal with the
// same Lahiri ayanamsa used for Nakshatra/Rashi above.
//
// birthDateStr/birthTimeStr: same as calculateNakshatraRashi. lat/lng
// in decimal degrees (lng east-positive), from the selected option in
// an SL_PLACES dropdown (see data/places.js -> populatePlaceSelect).
// Returns { lagnaRashiId, lagnaDegreeInRashi, siderealAscendant } or
// null if any input is missing/unusable.
function calculateLagna(birthDateStr, birthTimeStr, lat, lng) {
  if (!birthDateStr || !birthTimeStr) return null;
  if (lat === undefined || lat === null || lat === "" ||
      lng === undefined || lng === null || lng === "") return null;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;

  const dateParts = birthDateStr.split("-").map(Number);
  const timeParts = birthTimeStr.split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) return null;
  const [y, m, d] = dateParts;
  const [hh, mm] = timeParts;
  if ([y, m, d, hh, mm].some(n => Number.isNaN(n))) return null;

  const localAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
  const utcInstant = new Date(localAsUtc - SL_UTC_OFFSET_MINUTES * 60000);
  const astroTime = Astronomy.MakeTime(utcInstant);

  const gastHours = Astronomy.SiderealTime(astroTime); // Greenwich apparent sidereal time, 0-24h
  const lstDeg = normalizeDegrees(gastHours * 15 + lngNum);
  const obliquityDeg = Astronomy.e_tilt(astroTime).tobl; // true obliquity of the ecliptic

  const L = lstDeg * Math.PI / 180;
  const phi = latNum * Math.PI / 180;
  const eps = obliquityDeg * Math.PI / 180;

  // NOTE: the sign convention here is atan2(+cos L, -(...)), not the
  // atan2(-cos L, +(...)) form some quick references give — that
  // version was checked against this file's own astronomy-engine
  // Horizon()/rising-point calculation and turned out to return the
  // Descendant (180° off) instead of the Ascendant. This form was
  // verified to match the geometric horizon-crossing result.
  const ascRad = Math.atan2(
    Math.cos(L),
    -(Math.sin(L) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
  );
  const tropicalAscDeg = normalizeDegrees(ascRad * 180 / Math.PI);

  const ayanamsa = lahiriAyanamsaDegrees(astroTime);
  const siderealAsc = normalizeDegrees(tropicalAscDeg - ayanamsa);

  const rashiIndex = Math.floor(siderealAsc / 30);

  return {
    lagnaRashiId: rashiIndex + 1, // matches RASHIS ids (1 = Mesha), same table Rashi uses
    lagnaDegreeInRashi: siderealAsc % 30,
    siderealAscendant: siderealAsc
  };
}
