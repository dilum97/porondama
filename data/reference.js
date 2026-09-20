/**
 * reference.js
 * ------------------------------------------------------------------
 * Static reference data: 27 nakshatra (birth stars) and 12 rashi
 * (zodiac signs), tagged with the koota/porondam properties used by
 * matching.js to compute an approximate porondam score.
 *
 * ====================================================================
 * PORONDAM-20 MIGRATION STATUS (see matching.js for the scoring code)
 * ====================================================================
 * The site is being converted from the original 8-factor Vedic
 * Ashtakoota-style engine to the traditional Sri Lankan "Porondam 20"
 * system, sourced from a photographed printed jyotisha reference book
 * (chapter "පොරොන්දම් පරීක්ෂාව", pages 163-170 + the නැකැත් ගණ යෝති
 * ව්‍යක්ෂාදි වකුය table, page 37).
 *
 *   ✅ Implemented from the book (13 original + 4 new = 17 of 20):
 *      1. නැකත් (tara/star)   8. රජ්ජු         14. පක්ෂි (bird)
 *      2. ගණ                  9. වශ්‍ය          15. භූත (element)
 *      3. යෝනි                10. වර්ණ          16. ගෝත්‍ර (minor)
 *      4. රාශි                11. වේධ           17. දින (weekday)
 *      5. රාශ්‍යාධිපති        12. වෘක්ෂ
 *      6. මහේන්ද්‍ර            13. නාඩි
 *      7. ස්ත්‍රී දීර්ඝ
 *
 *   ℹ️ ආයුෂ (18) — implemented but shown as an INFO tag, not scored
 *      into the total (per Dilum's own call — it's a life-span
 *      comparison, not a pass/fail porondam). See ayushInfo().
 *
 *   ⏳ Still NOT implemented — 2 of 20:
 *      19. ලිංග — the book's page 167 paragraph on this is garbled/
 *          contradictory in the photo (lists both "same-gender best"
 *          and "same-gender worst" cases in the same paragraph).
 *          Rather than guess which reading is right, this is left out
 *          until a clearer photo of that paragraph is available.
 *      20. ග්‍රහ — the book's rules (page 169-170) need each person's
 *          actual planetary positions (Kuja/Sikuru/Guru etc. sputas
 *          and their trikona/kendra aspects to each other), not just
 *          Moon-derived nakshatra/rashi. This site's panchanga.js only
 *          computes the Moon's position, so there's no data to score
 *          this against — would need a full 9-planet ephemeris engine
 *          first (much bigger job than a lookup table).
 *
 *   ⚠️ VARNA DISCREPANCY — the book's varna column (page 37) uses a
 *      6-category repeating cycle (බ්‍රාහ්මණ/ක්ෂත්‍රිය/වෛශ්‍ය/ශුද්‍ර/
 *      පංචම/සංකර, cycling every 6 nakshatra) which does NOT match the
 *      4-category varna values already in NAKSHATRAS below (from the
 *      original web-cross-check). They disagree on most nakshatra.
 *      Left the existing values untouched rather than silently
 *      overwrite them — flag for Dilum to decide which source wins.
 *
 * ====================================================================
 * NAKSHATRA/RASHI/LAGNA AUTO-CALCULATION (see js/panchanga.js)
 * ====================================================================
 * Nakshatra and Rashi (chandra rashi / moon sign) are computed from
 * birth date + birth time using real Moon-position astronomy (Lahiri
 * ayanamsa) — the member no longer picks them from a dropdown.
 *
 * Lagna (Ascendant) is a separate value from Rashi — it's the sign
 * rising on the eastern horizon at birth, not the Moon's sign — and
 * needs the birth place's lat/lng + local sidereal time on top of
 * date+time. birthPlace is now a dropdown of major Sri Lankan towns
 * (see data/places.js -> SL_PLACES/populatePlaceSelect) so those
 * coordinates are available; calculateLagna() in panchanga.js uses
 * them. Lagna reuses the same RASHIS table/ids as Rashi above (it's
 * just a different degree on the same 12-sign wheel), it's just not
 * derived from the same input.
 *
 *   When those tables arrive, add them the same way: a data table
 *   here + a *Score() function in matching.js + one more entry in
 *   the `factors` array. match.html needs NO changes — it renders
 *   whatever is in `factors` generically.
 * ====================================================================
 *
 * IMPORTANT: Sinhala name spellings can vary between traditions/
 * regions — have someone who reads Sinhala astrology text double-
 * check the `si` fields before this goes live. This tool is a fun/
 * approximate pre-screen, not a replacement for a real astrologer's
 * kendara reading (see the disclaimer already on match.html).
 *
 * No Firebase needed for this file — it's static and can be served
 * straight from GitHub Pages.
 * ------------------------------------------------------------------
 */

// gana: 1=Deva, 2=Manushya, 3=Rakshasa
// nadi: 1=Adi, 2=Madhya, 3=Antya
// yoni: animal id, 1-14 (see YONI_LIST below) — matched pairs share
//       an id or a "friendly" pairing in YONI_COMPAT
// varna: 1=Brahmin(highest) .. 4=Shudra — boy's varna >= girl's is ideal
// rajju: 1=Pada, 2=Ooru, 3=Nabhi, 4=Bahu, 5=Shira — same rajju group
//        between boy/girl is "රජ්ජු දෝෂය" (inauspicious). Source:
//        web-cross-checked, groups of 6/6/6/6/3 covering all 27 nakshatra.
// vruksha: "kiri" (11 nakshatra, milk-tree — favourable for children)
//        or "hara" (16 nakshatra, non-milk-tree). Source: web-cross-checked.
const YONI_LIST = [
  "අශ්වයා", "අලියා", "බැටළුවා", "සර්පයා", "බල්ලා", "බළලා", "මීයා",
  "සිංහයා", "මීහරකා", "කොටියා", "මුවා", "වඳුරා", "නාකුලයා (මුගටියා)", "එළුවා"
];

const NAKSHATRAS = [
  { id: 1,  en: "Ashwini",           si: "අස්විද",     gana: 1, nadi: 1, yoni: 1,  varna: 3, rajju: 1, vruksha: "hara" },
  { id: 2,  en: "Bharani",           si: "බෙරණ",       gana: 2, nadi: 2, yoni: 2,  varna: 4, rajju: 2, vruksha: "hara" },
  { id: 3,  en: "Krittika",          si: "කැති",       gana: 3, nadi: 3, yoni: 3,  varna: 1, rajju: 3, vruksha: "hara" },
  { id: 4,  en: "Rohini",            si: "රෙහෙන",      gana: 2, nadi: 2, yoni: 4,  varna: 4, rajju: 4, vruksha: "hara" },
  { id: 5,  en: "Mrigashira",        si: "රිකිරි",     gana: 1, nadi: 3, yoni: 4,  varna: 3, rajju: 5, vruksha: "hara" },
  { id: 6,  en: "Ardra",             si: "අද",         gana: 2, nadi: 1, yoni: 5,  varna: 4, rajju: 4, vruksha: "hara" },
  { id: 7,  en: "Punarvasu",         si: "පුනාවස",     gana: 1, nadi: 2, yoni: 6,  varna: 3, rajju: 3, vruksha: "hara" },
  { id: 8,  en: "Pushya",            si: "පුස",        gana: 1, nadi: 3, yoni: 14, varna: 2, rajju: 2, vruksha: "kiri" },
  { id: 9,  en: "Ashlesha",          si: "අස්ලිස",     gana: 3, nadi: 1, yoni: 6,  varna: 4, rajju: 1, vruksha: "kiri" },
  { id: 10, en: "Magha",             si: "මා",         gana: 3, nadi: 2, yoni: 7,  varna: 4, rajju: 1, vruksha: "kiri" },
  { id: 11, en: "Purva Phalguni",    si: "පුවපල්",     gana: 2, nadi: 3, yoni: 7,  varna: 1, rajju: 2, vruksha: "kiri" },
  { id: 12, en: "Uttara Phalguni",   si: "උත්‍රපල්",   gana: 2, nadi: 1, yoni: 9,  varna: 2, rajju: 3, vruksha: "kiri" },
  { id: 13, en: "Hasta",             si: "හත",         gana: 1, nadi: 2, yoni: 9,  varna: 3, rajju: 4, vruksha: "hara" },
  { id: 14, en: "Chitra",            si: "සිත",        gana: 3, nadi: 3, yoni: 10, varna: 4, rajju: 5, vruksha: "hara" },
  { id: 15, en: "Swati",             si: "සා",         gana: 1, nadi: 1, yoni: 9,  varna: 4, rajju: 4, vruksha: "hara" },
  { id: 16, en: "Vishakha",          si: "විසා",       gana: 3, nadi: 2, yoni: 10, varna: 4, rajju: 3, vruksha: "hara" },
  { id: 17, en: "Anuradha",          si: "අනුර",       gana: 1, nadi: 3, yoni: 11, varna: 4, rajju: 2, vruksha: "hara" },
  { id: 18, en: "Jyeshtha",          si: "දෙට",        gana: 3, nadi: 1, yoni: 11, varna: 2, rajju: 1, vruksha: "kiri" },
  { id: 19, en: "Mula",              si: "මුල",        gana: 3, nadi: 2, yoni: 5,  varna: 4, rajju: 1, vruksha: "kiri" },
  { id: 20, en: "Purva Ashadha",     si: "පුවසල",      gana: 2, nadi: 3, yoni: 12, varna: 1, rajju: 2, vruksha: "hara" },
  { id: 21, en: "Uttara Ashadha",    si: "උත්‍රසල",    gana: 2, nadi: 1, yoni: 13, varna: 2, rajju: 3, vruksha: "kiri" },
  { id: 22, en: "Shravana",          si: "සුවන",       gana: 1, nadi: 2, yoni: 12, varna: 4, rajju: 4, vruksha: "kiri" },
  { id: 23, en: "Dhanishtha",        si: "දෙනට",       gana: 3, nadi: 3, yoni: 8,  varna: 4, rajju: 4, vruksha: "hara" },
  { id: 24, en: "Shatabhisha",       si: "සතබිස",      gana: 3, nadi: 1, yoni: 1,  varna: 4, rajju: 5, vruksha: "hara" },
  { id: 25, en: "Purva Bhadrapada",  si: "පුවපුටුප",   gana: 2, nadi: 2, yoni: 8,  varna: 1, rajju: 3, vruksha: "kiri" },
  { id: 26, en: "Uttara Bhadrapada", si: "උත්‍රපුටුප", gana: 2, nadi: 3, yoni: 4,  varna: 2, rajju: 2, vruksha: "hara" },
  { id: 27, en: "Revati",            si: "රේවතී",      gana: 1, nadi: 1, yoni: 2,  varna: 4, rajju: 1, vruksha: "kiri" }
];

// --- Porondam-20 additions from the book (page 37 table + ch.13-18) --
//
// Pakshi (bird) and Butha (element) are each assigned to nakshatra in
// five clean, contiguous ranges — the book's table only prints a new
// name where the group changes (1, 6, 12, 17, 23), leaving the rest
// blank/carried-forward, which is why these are ranges rather than a
// per-nakshatra table like the others.
function pakshiOf(nakId) {
  if (nakId <= 5) return 1;   // රාජාලියා (eagle)  — 1-5
  if (nakId <= 11) return 2;  // බකමුණා (owl)      — 6-11
  if (nakId <= 16) return 3;  // කපුටා (crow)      — 12-16
  if (nakId <= 22) return 4;  // කුකුළා (rooster)  — 17-22
  return 5;                   // මොණරා (peacock)   — 23-27
}
const PAKSHI_NAMES = { 1: "රාජාලියා", 2: "බකමුණා", 3: "කපුටා", 4: "කුකුළා", 5: "මොණරා" };
// Ch.13 friend/enemy statements, resolved into one symmetric table.
// 2=friend/same-species, 1=neutral(සම), 0=enemy(සතුරු)
const PAKSHI_RELATION = {
  "1-1": 2, "2-2": 2, "3-3": 2, "4-4": 2, "5-5": 2,
  "1-2": 0, "1-4": 0, "1-5": 0, "1-3": 1,
  "2-4": 0, "2-5": 0, "2-3": 0,
  "4-5": 2, "3-5": 2,
  "3-4": 1
};

function bhutaOf(nakId) {
  if (nakId <= 5) return 1;   // පෘථිවි (earth) — 1-5
  if (nakId <= 11) return 2;  // ආපෝ (water)    — 6-11
  if (nakId <= 16) return 3;  // තේජෝ (fire)    — 12-16
  if (nakId <= 22) return 4;  // වායෝ (air)     — 17-22
  return 5;                   // ආකාශ (space)   — 23-27
}
const BUTHA_NAMES = { 1: "පෘථිවි", 2: "ආපෝ", 3: "තේජෝ", 4: "වායෝ", 5: "ආකාශ" };
// Ch.14 statements. Pairs the book doesn't explicitly mention
// (earth-water, earth-air, water-space) are marked neutral(1) rather
// than guessed good/bad.
const BUTHA_RELATION = {
  "1-1": 2, "2-2": 2, "3-3": 2, "4-4": 2, "5-5": 2,
  "1-3": 0, "1-5": 0,
  "2-3": 0,
  "2-4": 1,
  "3-4": 2, "3-5": 2,
  "4-5": 2,
  "1-2": 1, "1-4": 1, "2-5": 1
};

// Gothra (ch.15) — book's own text calls this a minor/non-essential
// porondam. The table only names a gothra for 5 of the 27 nakshatra
// (5, 9, 13, 17, 21); the rest share an unnamed/common gothra. Rule:
// same gothra = inauspicious, different = fine.
const GOTHRA_BY_NAK = { 5: "අති", 9: "වශිෂ්ට", 13: "අංගිර", 17: "පුලස්ති", 21: "පුලග" };
function gothraOf(nakId) { return GOTHRA_BY_NAK[nakId] || "සාමාන්ය"; }

// Vedha (nakshatra "enmity") pairs — standard Vedic vedha-koota table,
// each pair mutually inauspicious. Dhanishtha (23) has no vedha partner.
// Moderate confidence — this is the widely-published cross-tradition
// table, not independently re-verified against a Sinhala-specific text;
// re-check against the printed reference book when it arrives.
const VEDHA_PAIRS = [
  [1, 18], [2, 17], [3, 16], [4, 15], [5, 14], [6, 24], [7, 20],
  [8, 21], [9, 19], [10, 27], [11, 26], [12, 25], [13, 22]
];

// Rashi (moon sign) with lord (adhipati) and vashya (dominance) group
// vashya: 1=Chatushpada(quadruped) 2=Manava(human) 3=Jalachara(aquatic)
//         4=Vanachara(wild) 5=Keeta(insect)
const RASHIS = [
  { id: 1,  en: "Mesha",       si: "මේෂ",     lord: "Mangala",  vashya: 1 },
  { id: 2,  en: "Vrishabha",   si: "වෘෂභ",    lord: "Sikuru",   vashya: 1 },
  { id: 3,  en: "Mithuna",     si: "මිථුන",   lord: "Budha",    vashya: 2 },
  { id: 4,  en: "Karka",       si: "කටක",     lord: "Sanda",    vashya: 3 },
  { id: 5,  en: "Simha",       si: "සිංහ",    lord: "Ravi",     vashya: 4 },
  { id: 6,  en: "Kanya",       si: "කන්‍යා",  lord: "Budha",    vashya: 2 },
  { id: 7,  en: "Tula",        si: "තුලා",    lord: "Sikuru",   vashya: 2 },
  { id: 8,  en: "Vrischika",   si: "වෘශ්චික", lord: "Kuja",     vashya: 5 },
  { id: 9,  en: "Dhanu",       si: "ධනු",     lord: "Guru",     vashya: 2 },
  { id: 10, en: "Makara",      si: "මකර",     lord: "Senasuru", vashya: 1 },
  { id: 11, en: "Kumbha",      si: "කුම්භ",   lord: "Senasuru", vashya: 2 },
  { id: 12, en: "Meena",       si: "මීන",     lord: "Guru",     vashya: 3 }
];

// Friend / neutral / enemy grid between rashi lords, used for the
// "Rashi Adhipathi Porondama" (planetary-lord-friendship) factor.
// 2 = friend, 1 = neutral, 0 = enemy
const LORD_RELATION = {
  Ravi:     { Ravi:2, Sanda:2, Kuja:2, Budha:1, Guru:2, Sikuru:0, Senasuru:0 },
  Sanda:    { Ravi:2, Sanda:2, Kuja:1, Budha:2, Guru:1, Sikuru:1, Senasuru:1 },
  Kuja:     { Ravi:2, Sanda:2, Kuja:2, Budha:0, Guru:2, Sikuru:1, Senasuru:1 },
  Budha:    { Ravi:2, Sanda:0, Kuja:1, Budha:2, Guru:1, Sikuru:2, Senasuru:1 },
  Guru:     { Ravi:2, Sanda:2, Kuja:2, Budha:0, Guru:2, Sikuru:0, Senasuru:1 },
  Sikuru:   { Ravi:0, Sanda:1, Kuja:1, Budha:2, Guru:0, Sikuru:2, Senasuru:2 },
  Senasuru: { Ravi:0, Sanda:0, Kuja:1, Budha:1, Guru:1, Sikuru:2, Senasuru:2 }
};

// Yoni friend/enemy adjustments beyond an exact id match (id: 0 pts,
// natural-enemy pair: -pts, everything else: partial credit)
const YONI_ENEMIES = [
  [1, 12], [2, 11], [3, 10], [4, 13], [5, 6], [7, 9], [8, 14]
];

function getNakshatra(id) { return NAKSHATRAS.find(n => n.id === Number(id)); }
function getRashi(id) { return RASHIS.find(r => r.id === Number(id)); }

// Exposed for the register/profile <select> dropdowns
function getReferenceLists() {
  return {
    nakshatras: NAKSHATRAS.map(n => ({ id: n.id, si: n.si, en: n.en })),
    rashis: RASHIS.map(r => ({ id: r.id, si: r.si, en: r.en }))
  };
}
