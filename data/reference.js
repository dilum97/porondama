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
 * system. Progress so far — 13 of 20 factors implemented:
 *
 *   ✅ Implemented (web-cross-checked against 2+ independent sources):
 *      1. නැකත් (tara/star count)   8. රජ්ජු        11. වේධ
 *      2. ගණ                        9. වශ්‍ය         12. වෘක්ෂ
 *      3. යෝනි                     10. වර්ණ
 *      4. රාශි                     13. නාඩි
 *      5. රාශ්‍යාධිපති
 *      6. මහේන්ද්‍ර
 *      7. ස්ත්‍රී දීර්ඝ
 *
 *   ⏳ NOT yet implemented — deliberately left out rather than
 *      guessed, because reliable sources conflicted or were missing
 *      (an AI-generated "reference" was cross-checked and rejected —
 *      see chat history). Waiting on a photographed page from a
 *      printed porondam/jyotisha reference book:
 *      14. ආයුෂ   15. පක්ෂි   16. භූත   17. ගෝත්‍ර
 *      18. ලිංග   19. දින    20. ග්‍රහ
 *      (Note: list numbering above is for tracking only, not the
 *      canonical Porondam-20 order. ලිංග — male/female/neuter
 *      nature per nakshatra — hasn't been researched at all yet;
 *      it's not just missing a table, it's missing entirely.)
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
