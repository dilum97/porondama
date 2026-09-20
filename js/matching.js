/**
 * matching.js
 * ------------------------------------------------------------------
 * Approximate porondam (kendara compatibility) engine.
 *
 * Mid-migration from the original 8-factor Vedic Ashtakoota-style
 * engine to the traditional Sri Lankan "Porondam 20" system — see
 * the migration-status note at the top of data/reference.js. All 20
 * factors are now scored, though ග්‍රහ (grahaScore below) is a
 * simplified subset of the book's full chapter 20 — see that
 * function's comment for exactly what's left out and why. This is a
 * simplified/approximate implementation for a fun pre-screen tool —
 * NOT a substitute for a full reading by a qualified astrologer. That
 * disclaimer is already shown on match.html; keep it there.
 *
 * Depends on: data/reference.js (getNakshatra, getRashi, YONI_ENEMIES,
 * VEDHA_PAIRS, LORD_RELATION) being loaded first.
 *
 * Usage:
 *   const result = calculatePorondam(
 *     { nakshatraId, rashiId },   // person A (boy)
 *     { nakshatraId, rashiId }    // person B (girl)
 *   );
 *   // result = { totalScore, totalMax, percentage, factors, doshas }
 * ------------------------------------------------------------------
 */

function rashiDistance(fromId, toId) {
  // 1-12 distance counting inclusive, wraps around the zodiac
  let d = (toId - fromId + 12) % 12;
  return d === 0 ? 12 : d;
}

function nakshatraDistance(fromId, toId) {
  let d = (toId - fromId + 27) % 27;
  return d === 0 ? 27 : d + 1; // count inclusive, 1-27
}

function yoniScore(yoniA, yoniB) {
  if (yoniA === yoniB) return { score: 4, max: 4 };
  const isEnemy = YONI_ENEMIES.some(([a, b]) =>
    (a === yoniA && b === yoniB) || (a === yoniB && b === yoniA)
  );
  return isEnemy ? { score: 0, max: 4 } : { score: 2, max: 4 };
}

function ganaScore(ganaA, ganaB) {
  if (ganaA === ganaB) return { score: 6, max: 6 };
  // Deva-Manushya or Manushya-Deva: good; anything with Rakshasa vs
  // the other two: weak
  const pair = [ganaA, ganaB].sort().join("-");
  if (pair === "1-2") return { score: 5, max: 6 };
  if (pair === "1-3") return { score: 1, max: 6 };
  if (pair === "2-3") return { score: 3, max: 6 };
  return { score: 3, max: 6 };
}

function nadiScore(nadiA, nadiB) {
  // Same nadi = Nadi Dosha, considered the most important to avoid
  return nadiA === nadiB ? { score: 0, max: 8 } : { score: 8, max: 8 };
}

function varnaScore(varnaA_boy, varnaB_girl) {
  // Ch.16: same varna = very good; boy's rank <= girl's (1=Brahmin
  // highest) = good; girl's rank higher than boy's = very bad.
  if (varnaA_boy === varnaB_girl) return { score: 2, max: 2 };
  return varnaA_boy <= varnaB_girl ? { score: 1, max: 2 } : { score: 0, max: 2 };
}

function vashyaScore(vA, vB) {
  if (vA === vB) return { score: 2, max: 2 };
  // a few classically-compatible cross-group pairs
  const compatible = [[2, 1], [1, 2], [2, 3], [3, 2]];
  const ok = compatible.some(([a, b]) => a === vA && b === vB);
  return ok ? { score: 1, max: 2 } : { score: 0, max: 2 };
}

function rashiScore(rashiDist) {
  // Bhakoot koota: 2,4,5,7,9,10,11,12(=same via wrap) generally
  // favourable; 6 and 8 are the classic "Bhakoot Dosha" positions
  const bad = [6, 8];
  return bad.includes(rashiDist) ? { score: 0, max: 7 } : { score: 7, max: 7 };
}

function lordScore(lordA, lordB) {
  const rel = (LORD_RELATION[lordA] && LORD_RELATION[lordA][lordB] !== undefined)
    ? LORD_RELATION[lordA][lordB] : 1;
  // rel: 2 friend, 1 neutral, 0 enemy -> scale to /5
  return { score: rel === 2 ? 5 : rel === 1 ? 3 : 0, max: 5 };
}

function starCountScore(nakDistBoyToGirl) {
  // Simplified Mahendra/Stree-Deergha style check: favourable when
  // the count from boy's star to girl's star is >= 13 and not a
  // multiple of 9 (a rough stand-in for the classical tara/count rules)
  const goodDistance = nakDistBoyToGirl >= 13;
  const badTara = nakDistBoyToGirl % 9 === 0;
  if (goodDistance && !badTara) return { score: 4, max: 4 };
  if (goodDistance || !badTara) return { score: 2, max: 4 };
  return { score: 0, max: 4 };
}

// --- Porondam-20 additions -------------------------------------------

function rajjuScore(rajjuA, rajjuB) {
  // Same rajju group between boy & girl = "රජ්ජු දෝෂය" (inauspicious)
  return rajjuA === rajjuB ? { score: 0, max: 3 } : { score: 3, max: 3 };
}

function vedhaScore(nakIdA, nakIdB) {
  const isVedha = VEDHA_PAIRS.some(([a, b]) =>
    (a === nakIdA && b === nakIdB) || (a === nakIdB && b === nakIdA)
  );
  return isVedha ? { score: 0, max: 2 } : { score: 2, max: 2 };
}

function vrukshaScore(vrukshaA, vrukshaB) {
  // Source only explicitly confirms both-"kiri" as very favourable
  // (child blessing); both-"hara" is treated as neutral-favourable by
  // extension, a mixed pair as partial. Flag for re-check.
  if (vrukshaA === vrukshaB) return { score: 2, max: 2 };
  return { score: 1, max: 2 };
}

function mahendraScore(nakDistGirlToBoy) {
  // Counting from the girl's nakshatra to the boy's; favourable when
  // the count lands on 4, 7, 10, 13, 16, 19, 22 or 25
  const favourable = [4, 7, 10, 13, 16, 19, 22, 25];
  return favourable.includes(nakDistGirlToBoy) ? { score: 2, max: 2 } : { score: 0, max: 2 };
}

function streeDeerghaScore(nakDistGirlToBoy) {
  // Favourable when the count from the girl's nakshatra to the boy's
  // is more than 14
  return nakDistGirlToBoy > 14 ? { score: 2, max: 2 } : { score: 0, max: 2 };
}

function pakshiScore(nakIdA, nakIdB) {
  const a = pakshiOf(nakIdA), b = pakshiOf(nakIdB);
  const key = a <= b ? `${a}-${b}` : `${b}-${a}`;
  const rel = PAKSHI_RELATION[key] !== undefined ? PAKSHI_RELATION[key] : 1;
  return { score: rel, max: 2 };
}

function bhutaScore(nakIdA, nakIdB) {
  const a = bhutaOf(nakIdA), b = bhutaOf(nakIdB);
  const key = a <= b ? `${a}-${b}` : `${b}-${a}`;
  const rel = BUTHA_RELATION[key] !== undefined ? BUTHA_RELATION[key] : 1;
  return { score: rel, max: 2 };
}

function gothraScore(nakIdA, nakIdB) {
  const ga = gothraOf(nakIdA), gb = gothraOf(nakIdB);
  // Only a real dosha when both share the *same named* (non-default)
  // gothra; a shared default ("සාමාන්ය") isn't the same koota concern.
  const sameNamed = ga === gb && ga !== "සාමාන්ය";
  return { score: sameNamed ? 0 : 1, max: 1 };
}

function lingaScore(lingaBoy, lingaGirl) {
  const rel = LINGA_RELATION[`${lingaBoy}-${lingaGirl}`];
  return { score: rel !== undefined ? rel : 1, max: 2 };
}

// Ch.20 ග්‍රහ පොරොන්දම — SIMPLIFIED. The book's full chapter (pages
// 169-170) has two halves: (a) malefic-strength/combustion/affliction
// rules around each person's own Lagna/7th/8th houses, which need
// planetary *dignity* (exaltation, debilitation, combustion, weakness)
// on top of position — a much bigger undertaking than a lookup table
// — and (b) six clear cross-chart comparison rules (page 170, items
// 1/2/4/5/6) that only need rashi + degree, which is what this scores.
// Left OUT: the page-169 malefic-affliction rules, and page-170 items
// 7-9 (their Lagna-aspect wording was too ambiguous to encode with
// confidence). So this is a partial/approximate reading of ග්‍රහ
// පොරොන්දම, not the full traditional check — consistent with the
// "not a substitute for a qualified astrologer" disclaimer already on
// match.html.
function trikonaMatch(sputaA, sputaB, orbDegrees) {
  if (!sputaA || !sputaB) return false;
  const rashiDiff = ((sputaB.rashiId - sputaA.rashiId) % 12 + 12) % 12;
  const isTrikona = rashiDiff === 0 || rashiDiff === 4 || rashiDiff === 8; // 1st/5th/9th from each other
  if (!isTrikona) return false;
  const degDiff = Math.abs(sputaA.degreeInRashi - sputaB.degreeInRashi);
  return Math.min(degDiff, 30 - degDiff) <= orbDegrees;
}

function grahaScore(grahaBoy, grahaGirl) {
  if (!grahaBoy || !grahaGirl) return null; // no data yet (older profile, or not saved) -> factor skipped
  const orb = 3; // degrees — "අංශක සම" (same degree) tolerance
  let points = 0;
  // (1) girl's Ravi rashi === boy's Chandra rashi
  if (grahaGirl.ravi.rashiId === grahaBoy.chandra.rashiId) points++;
  // (2) boy's Ravi rashi === girl's Chandra rashi
  if (grahaBoy.ravi.rashiId === grahaGirl.chandra.rashiId) points++;
  // (4) girl's Ravi <-> boy's Chandra, trikona same-degree
  if (trikonaMatch(grahaGirl.ravi, grahaBoy.chandra, orb)) points++;
  if (trikonaMatch(grahaBoy.ravi, grahaGirl.chandra, orb)) points++;
  // (5) both Chandra sputas, trikona same-degree
  if (trikonaMatch(grahaGirl.chandra, grahaBoy.chandra, orb)) points++;
  // (6) both Ravi sputas, trikona same-degree
  if (trikonaMatch(grahaGirl.ravi, grahaBoy.ravi, orb)) points++;
  return { score: points, max: 6 };
}

// Ch.18: weekday-counting rule, counted from the girl's day of week.
// Same day, or 1-4 days after = auspicious; 5-6 days after = not.
// birthDateStr: "YYYY-MM-DD". Returns null (factor skipped) if either
// birth date is missing — can't be guessed.
function dinaScore(boyBirthDateStr, girlBirthDateStr) {
  if (!boyBirthDateStr || !girlBirthDateStr) return null;
  const boyDay = new Date(boyBirthDateStr + "T00:00:00").getDay();
  const girlDay = new Date(girlBirthDateStr + "T00:00:00").getDay();
  if (isNaN(boyDay) || isNaN(girlDay)) return null;
  const diff = (boyDay - girlDay + 7) % 7; // 0 = same day
  const bad = diff === 5 || diff === 6;
  return { score: bad ? 0 : 2, max: 2 };
}

// Ch.12: Ayush (life-span) koota, now counted into the total score
// per Dilum's call (so all implementable factors reach 20). The
// book's text only *describes* whose life-span number is bigger —
// it never labels either direction inauspicious — so equal shesha
// scores full (harmonious match) and an unequal one scores partial
// rather than zero, since the book gives no basis for a "bad" case.
// Classical method: count nakshatra-to-nakshatra (inclusive) each
// direction, add 27, then reduce mod 28 (0 -> treated as 28).
function ayushScore(nakIdA, nakIdB) {
  const girlToBoy = ((nakshatraDistance(nakIdA, nakIdB) + 27 - 1) % 28) + 1;
  const boyToGirl = ((nakshatraDistance(nakIdB, nakIdA) + 27 - 1) % 28) + 1;
  const equal = girlToBoy === boyToGirl;
  const longerIsGirl = girlToBoy < boyToGirl;
  return {
    score: equal ? 2 : 1,
    max: 2,
    label: equal ? "සම ආයුෂ ලකුණු" : (longerIsGirl ? "ස්ත්‍රියගේ ආයුෂ ලකුණු වැඩි" : "පුරුෂයාගේ ආයුෂ ලකුණු වැඩි")
  };
}

/**
 * @param {{nakshatraId:number, rashiId:number, birthDate?:string}} boy
 * @param {{nakshatraId:number, rashiId:number, birthDate?:string}} girl
 */
function calculatePorondam(boy, girl) {
  const nakBoy = getNakshatra(boy.nakshatraId);
  const nakGirl = getNakshatra(girl.nakshatraId);
  const rashiBoy = getRashi(boy.rashiId);
  const rashiGirl = getRashi(girl.rashiId);

  if (!nakBoy || !nakGirl || !rashiBoy || !rashiGirl) {
    throw new Error("නැකත/රාශිය දත්ත අසම්පූර්ණයි");
  }

  const rDist = rashiDistance(rashiBoy.id, rashiGirl.id);
  const nDist = nakshatraDistance(nakBoy.id, nakGirl.id);
  const nDistGirlToBoy = nakshatraDistance(nakGirl.id, nakBoy.id);

  const gana = ganaScore(nakBoy.gana, nakGirl.gana);
  const nadi = nadiScore(nakBoy.nadi, nakGirl.nadi);
  const yoni = yoniScore(nakBoy.yoni, nakGirl.yoni);
  const rashi = rashiScore(rDist);
  const lord = lordScore(rashiBoy.lord, rashiGirl.lord);
  const vashya = vashyaScore(rashiBoy.vashya, rashiGirl.vashya);
  const varna = varnaScore(nakBoy.varna, nakGirl.varna);
  const starCount = starCountScore(nDist);
  const rajju = rajjuScore(nakBoy.rajju, nakGirl.rajju);
  const vedha = vedhaScore(nakBoy.id, nakGirl.id);
  const vruksha = vrukshaScore(nakBoy.vruksha, nakGirl.vruksha);
  const mahendra = mahendraScore(nDistGirlToBoy);
  const streeDeergha = streeDeerghaScore(nDistGirlToBoy);
  const pakshi = pakshiScore(nakBoy.id, nakGirl.id);
  const bhuta = bhutaScore(nakBoy.id, nakGirl.id);
  const gothra = gothraScore(nakBoy.id, nakGirl.id);
  const linga = lingaScore(nakBoy.linga, nakGirl.linga);
  const ayush = ayushScore(nakBoy.id, nakGirl.id);
  const dina = dinaScore(boy.birthDate, girl.birthDate); // null if no birthDate on either side
  const graha = grahaScore(boy.graha, girl.graha); // null if no grahaSputa saved on either side

  const factors = [
    { key: "gana",         nameSi: "ගණ පොරොන්දම",           ...gana },
    { key: "nadi",         nameSi: "නාඩි පොරොන්දම",         ...nadi },
    { key: "yoni",         nameSi: "යෝනි පොරොන්දම",         ...yoni },
    { key: "rashi",        nameSi: "රාශි පොරොන්දම",         ...rashi },
    { key: "lord",         nameSi: "රාශි අධිපති පොරොන්දම",  ...lord },
    { key: "vashya",       nameSi: "වශ්‍ය පොරොන්දම",        ...vashya },
    { key: "varna",        nameSi: "වර්ණ පොරොන්දම",         ...varna },
    { key: "starCount",    nameSi: "නැකත් (තාරා) පොරොන්දම", ...starCount },
    { key: "rajju",        nameSi: "රජ්ජු පොරොන්දම",        ...rajju },
    { key: "vedha",        nameSi: "වේධ පොරොන්දම",          ...vedha },
    { key: "vruksha",      nameSi: "වෘක්ෂ පොරොන්දම",        ...vruksha },
    { key: "mahendra",     nameSi: "මහේන්ද්‍ර පොරොන්දම",    ...mahendra },
    { key: "streeDeergha", nameSi: "ස්ත්‍රී දීර්ඝ පොරොන්දම", ...streeDeergha },
    { key: "pakshi",       nameSi: "පක්ෂි පොරොන්දම",         ...pakshi },
    { key: "bhuta",        nameSi: "භූත පොරොන්දම",           ...bhuta },
    { key: "gothra",       nameSi: "ගෝත්‍ර පොරොන්දම",        ...gothra },
    { key: "linga",        nameSi: "ලිංග පොරොන්දම",          ...linga },
    { key: "ayush",        nameSi: "ආයුෂ පොරොන්දම",          ...ayush }
  ];
  if (dina) factors.push({ key: "dina", nameSi: "දින පොරොන්දම", ...dina });
  if (graha) factors.push({ key: "graha", nameSi: "ග්‍රහ පොරොන්දම", ...graha });

  const totalScore = factors.reduce((s, f) => s + f.score, 0);
  const totalMax = factors.reduce((s, f) => s + f.max, 0);

  const doshas = [];
  if (nadi.score === 0) doshas.push("නාඩි දෝෂය");
  if (rashi.score === 0) doshas.push("භකූට දෝෂය");
  if (yoni.score === 0) doshas.push("යෝනි විරෝධය");
  if (gana.score <= 1) doshas.push("ගණ විරෝධය");
  if (rajju.score === 0) doshas.push("රජ්ජු දෝෂය");
  if (vedha.score === 0) doshas.push("වේධ දෝෂය");
  if (bhuta.score === 0) doshas.push("භූත දෝෂය");
  if (pakshi.score === 0) doshas.push("පක්ෂි විරෝධය");
  if (linga.score === 0) doshas.push("ලිංග අගුහය");

  return {
    totalScore,
    totalMax,
    percentage: Math.round((totalScore / totalMax) * 100),
    // count-based reading, matching how Dilum described it: "X / 8 porondam matched"
    matchedCount: factors.filter(f => f.score === f.max).length,
    factorCount: factors.length,
    factors,
    doshas
  };
}
