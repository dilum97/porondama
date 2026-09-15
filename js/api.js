/**
 * api.js (Firebase edition)
 * ------------------------------------------------------------------
 * Drop-in replacement for the old fetch("/api/...")-based api.js.
 * Keeps the exact same apiCall(url, options) interface so login.html,
 * register.html, profile.html, dashboard.html and match.html did not
 * need to change — only the script tags loaded before this file did
 * (see index.html/each page's <head>/<script> order).
 *
 * Load order required in every HTML page:
 *   1. Firebase SDK (compat) <script> tags
 *   2. firebase-config.js
 *   3. data/reference.js
 *   4. js/matching.js
 *   5. js/cloudinary.js
 *   6. js/api.js   <-- this file
 * ------------------------------------------------------------------
 *
 * NEW (feed + messaging):
 *   - GET  /api/feed             -> people I'm >=50% matched with who
 *                                    have a profile photo (for the
 *                                    Home tab scroll feed)
 *   - GET  /api/users/:id        -> public info for one user
 *   - GET  /api/conversations    -> my conversation list, newest first
 *   - GET  /api/messages/:id     -> one-shot message history with :id
 *   - POST /api/messages/:id     -> send a message to :id
 *   - subscribeToConversations(cb) / subscribeToMessages(otherUid, cb)
 *     are realtime (onSnapshot) helpers used by the Messages tab —
 *     they live outside apiCall() since they are streaming, not
 *     request/response.
 *
 * Firestore collections used by messaging (create these Security
 * Rules in the Firebase console — Firestore Database -> Rules):
 *   match /messages/{msgId} {
 *     allow read: if request.auth != null &&
 *       request.auth.uid in resource.data.participants;
 *     allow create: if request.auth != null &&
 *       request.resource.data.fromUid == request.auth.uid &&
 *       request.auth.uid in request.resource.data.participants &&
 *       request.resource.data.toUid in request.resource.data.participants;
 *   }
 *   match /conversations/{convId} {
 *     allow read, write: if request.auth != null &&
 *       request.auth.uid in resource.data.participants;
 *     allow create: if request.auth != null &&
 *       request.auth.uid in request.resource.data.participants;
 *   }
 *   match /notifications/{notifId} {
 *     allow create: if request.auth != null &&
 *       request.resource.data.actorUid == request.auth.uid;
 *     allow read, update, delete: if request.auth != null &&
 *       request.auth.uid == resource.data.userId;
 *   }
 * IMPORTANT: message docs must include a `participants: [fromUid, toUid]`
 * array field (same idea as conversations) — Firestore rejects any
 * list/onSnapshot query with "Missing or insufficient permissions"
 * unless the query's own where() filters line up with the fields the
 * rule checks. Filtering only by conversationId while the rule checks
 * fromUid/toUid does NOT satisfy that, even when the data itself would
 * pass — hence the extra .where("participants","array-contains",uid).
 *
 * The first time /api/conversations, /api/messages/:id, or
 * subscribeToConversations/subscribeToMessages runs, Firestore may
 * print a console error with a link to auto-create the required
 * composite index — just click that link once per query.
 * ------------------------------------------------------------------
 */

function showError(el, message) {
  el.textContent = message;
  el.style.display = "block";
}

function populateSelect(select, items, labelFn) {
  select.innerHTML = '<option value="">-- Select --</option>' +
    items.map(i => `<option value="${i.id}">${labelFn(i)}</option>`).join("");
}

async function loadReference() {
  return getReferenceLists();
}

// ---- internal helpers --------------------------------------------

function currentUid() {
  const u = auth.currentUser;
  if (!u) throw new Error("ලොග් වී නැත");
  return u.uid;
}

// Like currentUid(), but waits for Firebase to finish restoring the
// session first. On a fresh page load (e.g. opening match.html
// directly, or a full-page location.href navigation) auth.currentUser
// is still null for a brief moment while Firebase checks local
// storage — using currentUid() there throws a false "ලොග් වී නැත"
// error even though the user IS logged in. Every apiCall() endpoint
// below that needs the current user should use this instead.
async function requireUid() {
  const user = await waitForAuthReady();
  if (!user) throw new Error("ලොග් වී නැත");
  return user.uid;
}

async function getUserDoc(uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) throw new Error("පරිශීලක තොරතුරු හමු නොවීය");
  return { id: snap.id, ...snap.data() };
}

async function waitForAuthReady() {
  if (auth.currentUser) return auth.currentUser;
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(user => { unsub(); resolve(user); });
  });
}

// Accounts created before the approval-workflow update have no
// `status` field at all — treat those as already-approved so
// existing members don't suddenly disappear from feeds/matches.
// New accounts now start as "incomplete" (still filling in Settings,
// not yet in the admin queue), then "pending" once they submit for
// review (enforced in firestore.rules too), then "approved" by the
// admin.
function isApproved(u) {
  return u.status === "approved" || u.status === undefined;
}

// Presence heartbeat — call every ~30s from an approved, logged-in
// session (see dashboard.html) so admin.html can show who's online.
// "Online" is just "lastSeen within the last couple of minutes",
// computed client-side in admin.html — there's no separate presence
// system here, just a timestamp bumped on the user's own doc, which
// the existing update rule already allows (status is left untouched).
async function updateLastSeen() {
  try {
    const uid = await requireUid();
    await db.collection("users").doc(uid).update({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { /* best-effort — a missed heartbeat is not worth surfacing */ }
}

function orderByGender(me, other) {
  // Porondam factors like varna/star-count are directional
  // (boy -> girl). Default to `me` as boy unless `me` is female.
  if (me.gender === "female") return { boy: other, girl: me };
  return { boy: me, girl: other };
}

function toPublicUser(u) {
  return {
    id: u.id,
    name: u.name,
    birthPlace: u.birthPlace || "",
    birthDate: u.birthDate || "",
    photoURL: u.photoURL || "",
    bio: u.bio || "",
    education: u.education || "",
    profession: u.profession || "",
    religion: u.religion || "",
    ethnicity: u.ethnicity || "",
    height: u.height || "",
    facebook: u.facebook || "",
    whatsapp: u.whatsapp || "",
    photos: Array.isArray(u.photos) ? u.photos : []
  };
}

// Age in whole years from a "YYYY-MM-DD" birth date string, or null
// if the date is missing/invalid. Shared by dashboard.html and
// match.html (both already load this file).
function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const dob = new Date(birthDateStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthdayThisYear = (today.getMonth() < dob.getMonth())
    || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthdayThisYear) age--;
  return age >= 0 ? age : null;
}

// conversationId is deterministic for a pair of uids so both sides
// always land on the same conversation/message thread regardless of
// who started it.
function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

// A conversation is unread for `uid` only if the other person sent
// the last message AND `uid` hasn't opened/read the thread since
// then (readAt[uid] missing, or older than lastMessageAt). This
// replaces the old "lastSenderId !== me" check, which never cleared
// once you'd actually read a message — it only reset when YOU sent a
// reply.
function isConversationUnread(data, uid) {
  if (data.lastSenderId === uid || !data.lastMessageAt) return false;
  const readTs = data.readAt && data.readAt[uid];
  if (!readTs) return true;
  try { return readTs.toMillis() < data.lastMessageAt.toMillis(); }
  catch { return true; }
}

// Call when the user opens (or is actively viewing) a conversation,
// so the unread flag clears. Best-effort: a brand-new conversation
// with no Firestore doc yet (first message not sent either way) has
// nothing to mark, so failures here are swallowed rather than
// blocking the chat UI.
async function markConversationRead(otherUid) {
  try {
    const uid = await requireUid();
    const convId = conversationIdFor(uid, otherUid);
    // Dot-notation key so merge:true only touches this user's entry
    // inside the readAt map, instead of replacing the whole map (a
    // plain nested-object merge in Firestore overwrites the entire
    // nested field rather than merging its keys).
    await db.collection("conversations").doc(convId).set({
      [`readAt.${uid}`]: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("markConversationRead failed:", err);
  }
}

// Step 1: just the Firebase Auth popup + a check of whether this
// Google account already has a Firestore profile. Does NOT create
// the profile — that only happens once the person has agreed to the
// registration notice (see completeGoogleSignup below). This lets
// login.html decide: existing account -> straight into the site,
// brand-new account -> show the notice first.
async function googleSignInAuthOnly() {
  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await auth.signInWithPopup(provider);
  const user = result.user;
  const snap = await db.collection("users").doc(user.uid).get();
  return { user, isNewUser: !snap.exists };
}

// Step 2: create the Firestore profile doc for a brand-new Google
// account. Called only after the person agrees to the notice.
async function completeGoogleSignup(user) {
  // No fields are required here anymore — not even a photo. The
  // person is dropped straight into Settings (dashboard.html locks
  // them to a Settings-only view while status is "incomplete") to
  // fill in everything, including photo, then explicitly submits for
  // admin review — see the `submit: true` branch of PUT /api/me below.
  const photoURL = user.photoURL || "";
  await db.collection("users").doc(user.uid).set({
    name: user.displayName || "",
    usernameLower: "",
    authProvider: "google",
    gender: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    nakshatraId: null,
    rashiId: null,
    lagnaRashiId: null,
    bio: "",
    education: "",
    profession: "",
    facebook: "",
    whatsapp: "",
    photoURL,
    photos: photoURL ? [photoURL] : [],
    status: "incomplete",
    disabled: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  // NOTE: this account is "incomplete", not "pending" yet — it won't
  // show up in the admin's request queue (GET /api/admin/requests
  // only reads status=="pending") until the person finishes their
  // profile in Settings and hits "submit for review".
}

// ---- main entry point: same signature as the old fetch-based one --

// Called the moment a profile becomes "complete" (has nakshatraId +
// rashiId) — at registration, or later via Settings for accounts that
// started incomplete (e.g. Google sign-in). Notifies every existing
// opposite-gender, non-disabled user who is a 75%+ match, so people
// don't have to open their own feed to find out a new match joined.
async function notifyMatchesForNewProfile(uid) {
  try {
    const me = await getUserDoc(uid);
    if (!me.nakshatraId || !me.rashiId) return;
    const snap = await db.collection("users").get();
    const batch = db.batch();
    let count = 0;
    snap.forEach(doc => {
      if (doc.id === uid) return;
      const other = { id: doc.id, ...doc.data() };
      if (other.disabled || !isApproved(other)) return;
      if (me.gender && other.gender && other.gender === me.gender) return;
      if (!other.nakshatraId || !other.rashiId) return;
      const { boy, girl } = orderByGender(me, other);
      const result = calculatePorondam(
        { nakshatraId: boy.nakshatraId, rashiId: boy.rashiId },
        { nakshatraId: girl.nakshatraId, rashiId: girl.rashiId }
      );
      if (result.percentage < 75) return;
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: other.id,
        type: "match",
        actorUid: uid,
        subjectUid: uid,
        subjectName: me.name || "",
        subjectPhoto: me.photoURL || "",
        text: `${result.percentage}% ගැලපීමක් සමඟ අලුත් සාමාජිකයෙක්!`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      count++;
    });
    if (count > 0) await batch.commit();
  } catch (e) { console.warn("notifyMatchesForNewProfile failed:", e); }
}

async function apiCall(url, options = {}) {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : {};

  try {
    // POST /api/register — just creates the account (name + username
    // + password) with status "incomplete". No profile details or
    // photo are collected here anymore — the person is sent straight
    // to Settings to fill those in and submit for review (mirrors
    // completeGoogleSignup above). It only becomes a "pending" admin
    // request once they hit submit from Settings.
    if (url === "/api/register" && method === "POST") {
      const email = usernameToEmail(body.username);
      const existing = await db.collection("users")
        .where("usernameLower", "==", body.username.trim().toLowerCase()).limit(1).get();
      if (!existing.empty) throw new Error("මෙම පරිශීලක නාමය දැනටමත් භාවිතයේ ඇත");

      const cred = await auth.createUserWithEmailAndPassword(email, body.password);
      await db.collection("users").doc(cred.user.uid).set({
        name: body.name || "",
        usernameLower: body.username.trim().toLowerCase(),
        gender: "",
        birthDate: "",
        birthTime: "",
        birthPlace: "",
        nakshatraId: null,
        rashiId: null,
        lagnaRashiId: null,
        bio: "",
        education: "",
        profession: "",
        facebook: "",
        whatsapp: "",
        photoURL: "",
        photos: [],
        status: "incomplete",
        disabled: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { ok: true };
    }

    // POST /api/login
    if (url === "/api/login" && method === "POST") {
      const email = usernameToEmail(body.username);
      try {
        await auth.signInWithEmailAndPassword(email, body.password);
      } catch (err) {
        throw new Error("පරිශීලක නාමය හෝ මුරපදය වැරදිය");
      }
      return { ok: true };
    }

    // POST /api/logout
    if (url === "/api/logout" && method === "POST") {
      await auth.signOut();
      return { ok: true };
    }

    // GET /api/me
    if (url === "/api/me" && method === "GET") {
      const user = await waitForAuthReady();
      if (!user) throw new Error("ලොග් වී නැත");
      const profile = await getUserDoc(user.uid);
      return { user: profile };
    }

    // PUT /api/me
    if (url === "/api/me" && method === "PUT") {
      const uid = await requireUid();
      const beforeDoc = await getUserDoc(uid).catch(() => null);
      const update = {
        name: body.name,
        gender: body.gender,
        birthDate: body.birthDate || "",
        birthTime: body.birthTime || "",
        birthPlace: body.birthPlace || "",
        bio: body.bio || "",
        education: body.education || "",
        profession: body.profession || "",
        facebook: body.facebook || "",
        whatsapp: body.whatsapp || "",
        religion: body.religion || "",
        ethnicity: body.ethnicity || "",
        height: body.height || "",
        nakshatraId: Number(body.nakshatraId),
        rashiId: Number(body.rashiId),
        lagnaRashiId: body.lagnaRashiId ? Number(body.lagnaRashiId) : null
      };
      if (body.photoURL) update.photoURL = body.photoURL;
      if (Array.isArray(body.photos)) {
        update.photos = body.photos;
        // Keep the legacy single photoURL (used in cards/rings/avatars
        // across the app) pointed at the first gallery photo so older
        // UI that only knows about photoURL still shows a picture.
        if (!body.photoURL) update.photoURL = body.photos[0] || "";
      }

      // submit: true — the person hit "සමාලෝචනය සඳහා යවන්න" (send for
      // review) in Settings. Only meaningful for accounts still stuck
      // at status "incomplete" (fresh signups that haven't been sent
      // to the admin queue yet). Validate the profile is actually
      // usable before it ever reaches the admin, then flip it to
      // "pending" so it shows up in GET /api/admin/requests.
      if (body.submit && beforeDoc && beforeDoc.status === "incomplete") {
        const finalPhotos = update.photos || (beforeDoc.photos || []);
        const hasPhoto = (update.photoURL || beforeDoc.photoURL || finalPhotos[0]);
        const missing = [];
        if (!update.name) missing.push("නම");
        if (!update.gender) missing.push("ස්ත්‍රී/පුරුෂ භාවය");
        if (!update.nakshatraId) missing.push("නැකත");
        if (!update.rashiId) missing.push("රාශිය");
        if (!hasPhoto) missing.push("ඡායාරූපය");
        if (missing.length) {
          throw new Error("සමාලෝචනය සඳහා යැවීමට පෙර මේවා සම්පූර්ණ කරන්න: " + missing.join(", "));
        }
        update.status = "pending";
      }

      await db.collection("users").doc(uid).update(update);

      const wasComplete = !!(beforeDoc && beforeDoc.nakshatraId && beforeDoc.rashiId);
      const isComplete = !!(update.nakshatraId && update.rashiId);
      if (!wasComplete && isComplete && beforeDoc && isApproved(beforeDoc)) {
        await notifyMatchesForNewProfile(uid);
      }
      return { ok: true };
    }

    // GET /api/reference
    if (url === "/api/reference" && method === "GET") {
      return getReferenceLists();
    }

    // GET /api/users/:id  (lightweight public lookup, used when
    // opening a fresh conversation from a link before any message
    // history/match calc exists)
    const userDetailPrefix = "/api/users/";
    if (url.startsWith(userDetailPrefix) && method === "GET") {
      const otherId = url.slice(userDetailPrefix.length);
      const other = await getUserDoc(otherId);
      return { user: toPublicUser(other) };
    }

    // GET /api/matches
    if (url === "/api/matches" && method === "GET") {
      const uid = await requireUid();
      const me = await getUserDoc(uid);
      const snap = await db.collection("users").get();
      const matches = [];
      snap.forEach(doc => {
        if (doc.id === uid) return;
        const other = { id: doc.id, ...doc.data() };
        if (other.disabled || !isApproved(other)) return;
        if (me.gender && other.gender && other.gender === me.gender) return;
        if (!other.nakshatraId || !other.rashiId) return;
        const { boy, girl } = orderByGender(me, other);
        const result = calculatePorondam(
          { nakshatraId: boy.nakshatraId, rashiId: boy.rashiId },
          { nakshatraId: girl.nakshatraId, rashiId: girl.rashiId }
        );
        matches.push({
          user: toPublicUser(other),
          percentage: result.percentage,
          totalScore: result.totalScore,
          totalMax: result.totalMax,
          doshas: result.doshas
        });
      });
      matches.sort((a, b) => b.percentage - a.percentage);
      return { matches };
    }

    // GET /api/matches/:id
    const matchDetailPrefix = "/api/matches/";
    if (url.startsWith(matchDetailPrefix) && method === "GET") {
      const uid = await requireUid();
      const otherId = url.slice(matchDetailPrefix.length);
      const me = await getUserDoc(uid);
      const other = await getUserDoc(otherId);
      const { boy, girl } = orderByGender(me, other);
      const result = calculatePorondam(
        { nakshatraId: boy.nakshatraId, rashiId: boy.rashiId },
        { nakshatraId: girl.nakshatraId, rashiId: girl.rashiId }
      );
      return {
        user: toPublicUser(other),
        percentage: result.percentage,
        totalScore: result.totalScore,
        totalMax: result.totalMax,
        doshas: result.doshas,
        factors: result.factors.map(f => ({ nameSi: f.nameSi, score: f.score, max: f.max }))
      };
    }

    // GET /api/feed — people I'm strongly (>=50%) matched with, who
    // also have a profile photo, for the Home tab scroll feed.
    if (url === "/api/feed" && method === "GET") {
      const uid = await requireUid();
      const me = await getUserDoc(uid);
      const snap = await db.collection("users").get();
      const feed = [];
      snap.forEach(doc => {
        if (doc.id === uid) return;
        const other = { id: doc.id, ...doc.data() };
        if (other.disabled || !isApproved(other)) return;
        if (me.gender && other.gender && other.gender === me.gender) return;
        if (!other.nakshatraId || !other.rashiId || !other.photoURL) return;
        const { boy, girl } = orderByGender(me, other);
        const result = calculatePorondam(
          { nakshatraId: boy.nakshatraId, rashiId: boy.rashiId },
          { nakshatraId: girl.nakshatraId, rashiId: girl.rashiId }
        );
        if (result.percentage < 50) return;
        feed.push({
          user: toPublicUser(other),
          percentage: result.percentage,
          totalScore: result.totalScore,
          totalMax: result.totalMax
        });
      });
      feed.sort((a, b) => b.percentage - a.percentage);

      // Notify me about matches I haven't seen before (best-effort —
      // never let a notification hiccup break the feed response).
      try {
        const seen = new Set(me.seenMatchIds || []);
        const freshMatches = feed.filter(f => !seen.has(f.user.id));
        if (freshMatches.length > 0) {
          const batch = db.batch();
          freshMatches.forEach(f => {
            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
              userId: uid,
              type: "match",
              actorUid: uid,
              subjectUid: f.user.id,
              subjectName: f.user.name,
              subjectPhoto: f.user.photoURL || "",
              text: `${f.percentage}% ගැලපීමක්!`,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              read: false
            });
          });
          batch.update(db.collection("users").doc(uid), {
            seenMatchIds: firebase.firestore.FieldValue.arrayUnion(...freshMatches.map(f => f.user.id))
          });
          await batch.commit();
        }
      } catch (e) { console.warn("match notification failed:", e); }

      return { feed };
    }

    // GET /api/conversations — one-shot list (subscribeToConversations
    // below is the realtime version used by the Messages tab)
    if (url === "/api/conversations" && method === "GET") {
      const uid = await requireUid();
      const snap = await db.collection("conversations")
        .where("participants", "array-contains", uid)
        .orderBy("lastMessageAt", "desc")
        .get();
      const conversations = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        const otherId = data.participants.find(p => p !== uid);
        let otherUser;
        try { otherUser = toPublicUser(await getUserDoc(otherId)); } catch { continue; }
        conversations.push({
          id: doc.id,
          user: otherUser,
          lastMessage: data.lastMessage || "",
          lastMessageAt: data.lastMessageAt,
          lastSenderId: data.lastSenderId,
          unread: isConversationUnread(data, uid)
        });
      }
      return { conversations };
    }

    // GET /api/messages/:id — one-shot history with user :id
    const messagesPrefix = "/api/messages/";
    if (url.startsWith(messagesPrefix) && method === "GET") {
      const uid = await requireUid();
      const otherId = url.slice(messagesPrefix.length);
      const convId = conversationIdFor(uid, otherId);
      const snap = await db.collection("messages")
        .where("conversationId", "==", convId)
        .where("participants", "array-contains", uid)
        .orderBy("createdAt", "asc")
        .get();
      const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { messages };
    }

    // POST /api/messages/:id — send a message to user :id
    if (url.startsWith(messagesPrefix) && method === "POST") {
      const uid = await requireUid();
      const otherId = url.slice(messagesPrefix.length);
      const text = (body.text || "").trim();
      if (!text) throw new Error("පණිවිඩය හිස්ය");
      if (otherId === uid) throw new Error("ඔබටම පණිවිඩයක් යැවිය නොහැක");

      const convId = conversationIdFor(uid, otherId);
      const now = firebase.firestore.FieldValue.serverTimestamp();

      const messageDoc = {
        conversationId: convId,
        fromUid: uid,
        toUid: otherId,
        participants: [uid, otherId],
        text,
        createdAt: now
      };
      // Optional "reply to" reference — just a lightweight snapshot of
      // the quoted message's id/text at send time (not a live link),
      // so the quote still renders even if the original is edited or
      // later deleted.
      if (body.replyTo && body.replyTo.id && body.replyTo.text) {
        messageDoc.replyTo = { id: body.replyTo.id, text: String(body.replyTo.text).slice(0, 200) };
      }

      await db.collection("messages").add(messageDoc);

      await db.collection("conversations").doc(convId).set({
        participants: [uid, otherId],
        lastMessage: text,
        lastMessageAt: now,
        lastSenderId: uid
      }, { merge: true });

      // Best-effort notification for the recipient. actorUid must equal
      // the auth'd caller (that's what the security rule checks) —
      // subjectUid/Name/Photo describe the OTHER party for display and
      // for opening the right chat when the notification is tapped.
      try {
        const senderDoc = await getUserDoc(uid);
        await db.collection("notifications").add({
          userId: otherId,
          type: "message",
          actorUid: uid,
          subjectUid: uid,
          subjectName: senderDoc.name || "",
          subjectPhoto: senderDoc.photoURL || "",
          text: text.length > 60 ? text.slice(0, 60) + "…" : text,
          createdAt: now,
          read: false
        });
      } catch (e) { console.warn("message notification failed:", e); }

      return { ok: true };
    }

    // ---- admin endpoints (gated on ADMIN_UID from firebase-config.js)
    // NOTE: this client-side check only hides/blocks the UI politely.
    // The real enforcement is in firestore.rules, which must have the
    // same UID hardcoded for the update/delete rules on /users to
    // actually deny anyone else.

    // GET /api/admin/users — approved/active members for the "site
    // එකේ ඉන්න අය" admin table. Pending requests are a separate
    // endpoint (GET /api/admin/requests) so the two lists never mix.
    if (url === "/api/admin/users" && method === "GET") {
      const uid = await requireUid();
      if (uid !== ADMIN_UID) throw new Error("Access denied");
      const snap = await db.collection("users").get();
      const users = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => isApproved(u))
        .map(u => ({
          id: u.id,
          name: u.name || "",
          usernameLower: u.usernameLower || "",
          gender: u.gender || "",
          birthDate: u.birthDate || "",
          birthTime: u.birthTime || "",
          birthPlace: u.birthPlace || "",
          nakshatraId: u.nakshatraId || null,
          rashiId: u.rashiId || null,
          lagnaRashiId: u.lagnaRashiId || null,
          height: u.height || "",
          religion: u.religion || "",
          ethnicity: u.ethnicity || "",
          education: u.education || "",
          profession: u.profession || "",
          bio: u.bio || "",
          facebook: u.facebook || "",
          whatsapp: u.whatsapp || "",
          photoURL: u.photoURL || "",
          photos: Array.isArray(u.photos) ? u.photos : [],
          disabled: !!u.disabled,
          createdAt: u.createdAt || null,
          lastSeen: u.lastSeen || null
        }));
      users.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      return { users };
    }

    // GET /api/admin/requests — accounts awaiting approval, oldest
    // first (first come, first reviewed). Returns the FULL submitted
    // profile (not just a summary) since the admin panel opens a
    // detail card with everything the person filled in before
    // approving/rejecting.
    if (url === "/api/admin/requests" && method === "GET") {
      const uid = await requireUid();
      if (uid !== ADMIN_UID) throw new Error("Access denied");
      const snap = await db.collection("users").where("status", "==", "pending").get();
      const requests = snap.docs.map(d => {
        const u = d.data();
        return {
          id: d.id,
          name: u.name || "",
          usernameLower: u.usernameLower || "",
          gender: u.gender || "",
          birthDate: u.birthDate || "",
          birthTime: u.birthTime || "",
          birthPlace: u.birthPlace || "",
          nakshatraId: u.nakshatraId || null,
          rashiId: u.rashiId || null,
          lagnaRashiId: u.lagnaRashiId || null,
          height: u.height || "",
          religion: u.religion || "",
          ethnicity: u.ethnicity || "",
          education: u.education || "",
          profession: u.profession || "",
          bio: u.bio || "",
          facebook: u.facebook || "",
          whatsapp: u.whatsapp || "",
          photoURL: u.photoURL || "",
          photos: Array.isArray(u.photos) ? u.photos : [],
          createdAt: u.createdAt || null
        };
      });
      requests.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      return { requests };
    }

    // PUT /api/admin/requests/:id/approve — flips status to approved,
    // notifies the new member, and (since they now have a complete
    // porondam profile) notifies existing matching members too.
    const approvePrefix = "/api/admin/requests/";
    if (url.startsWith(approvePrefix) && url.endsWith("/approve") && method === "PUT") {
      const uid = await requireUid();
      if (uid !== ADMIN_UID) throw new Error("Access denied");
      const targetId = url.slice(approvePrefix.length, -"/approve".length);
      // The actual approval (this line) is what matters — the two
      // notification steps below are a nice-to-have, so a permission
      // hiccup on notification writes must never surface as an error
      // once the member is already approved and live on the site.
      await db.collection("users").doc(targetId).update({ status: "approved" });
      try {
        await db.collection("notifications").add({
          userId: targetId,
          type: "approved",
          actorUid: uid,
          subjectUid: uid,
          subjectName: "Porondama",
          subjectPhoto: "",
          text: "ඔබගේ ලියාපදිංචිය අනුමත කරන ලදී! සයිට් එක සක්‍රීයයි — ඔබගේ සහකාරිය දැන් තෝරගන්න 💛",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      } catch (e) { console.warn("approval notification failed:", e); }
      await notifyMatchesForNewProfile(targetId);
      return { ok: true };
    }

    // DELETE /api/admin/requests/:id — reject a pending request. Just
    // removes the Firestore profile (same limitation as deleting an
    // approved user — the Auth account itself needs the Admin SDK /
    // Firebase Console to remove).
    if (url.startsWith(approvePrefix) && method === "DELETE") {
      const uid = await requireUid();
      if (uid !== ADMIN_UID) throw new Error("Access denied");
      const targetId = url.slice(approvePrefix.length);
      await db.collection("users").doc(targetId).delete();
      return { ok: true };
    }

    // PUT /api/admin/users/:id — toggle disabled (hides from matches/feed)
    const adminUserPrefix = "/api/admin/users/";
    if (url.startsWith(adminUserPrefix) && method === "PUT") {
      const uid = await requireUid();
      if (uid !== ADMIN_UID) throw new Error("Access denied");
      const targetId = url.slice(adminUserPrefix.length);
      await db.collection("users").doc(targetId).update({ disabled: !!body.disabled });
      return { ok: true };
    }

    // DELETE /api/admin/users/:id — removes the Firestore profile only.
    // The Firebase Auth account itself can't be deleted from client
    // code (needs the Admin SDK / a Cloud Function); this just takes
    // the profile out of Firestore so they stop appearing anywhere
    // and can't log in to a working account.
    if (url.startsWith(adminUserPrefix) && method === "DELETE") {
      const uid = await requireUid();
      if (uid !== ADMIN_UID) throw new Error("Access denied");
      const targetId = url.slice(adminUserPrefix.length);
      await db.collection("users").doc(targetId).delete();
      return { ok: true };
    }

    throw new Error("Unknown endpoint: " + method + " " + url);
  } catch (err) {
    throw new Error(err.message || "Something went wrong");
  }
}

// ---- realtime helpers (Messages tab) ------------------------------
// These stream live updates via Firestore onSnapshot instead of
// request/response, so they sit outside apiCall(). Each returns an
// unsubscribe function — call it when the user leaves the tab/chat.

function subscribeToConversations(callback, onError) {
  const uid = currentUid();
  return db.collection("conversations")
    .where("participants", "array-contains", uid)
    .orderBy("lastMessageAt", "desc")
    .onSnapshot(async snap => {
      const conversations = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        const otherId = data.participants.find(p => p !== uid);
        let otherUser;
        try { otherUser = toPublicUser(await getUserDoc(otherId)); } catch { continue; }
        conversations.push({
          id: doc.id,
          user: otherUser,
          lastMessage: data.lastMessage || "",
          lastMessageAt: data.lastMessageAt,
          lastSenderId: data.lastSenderId,
          unread: isConversationUnread(data, uid)
        });
      }
      callback(conversations);
    }, err => { if (onError) onError(err); });
}

function subscribeToMessages(otherUid, callback, onError) {
  const uid = currentUid();
  const convId = conversationIdFor(uid, otherUid);
  return db.collection("messages")
    .where("conversationId", "==", convId)
    .where("participants", "array-contains", uid)
    .orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(messages);
    }, err => { if (onError) onError(err); });
}

// Realtime notification bell feed — newest 30 for the current user.
// A single equality filter (userId ==) + orderBy on a different field
// (createdAt) does NOT need a composite index in Firestore, unlike the
// messages/conversations queries above.
function subscribeToNotifications(callback, onError) {
  const uid = currentUid();
  return db.collection("notifications")
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(30)
    .onSnapshot(snap => {
      const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(notifications);
    }, err => { if (onError) onError(err); });
}

async function markNotificationRead(notifId) {
  try { await db.collection("notifications").doc(notifId).update({ read: true }); }
  catch (e) { console.warn("markNotificationRead failed:", e); }
}

// Removes the conversation summary doc from the current user's
// conversation list. Deliberately does NOT delete the underlying
// message docs, so re-opening the chat (e.g. from the other person's
// side, or a new message) will still show prior history. This is
// allowed under the existing Firestore rules ("allow read, write" on
// /conversations for participants).
async function deleteConversationWith(otherUid) {
  const uid = await requireUid();
  const convId = conversationIdFor(uid, otherUid);
  await db.collection("conversations").doc(convId).delete();
}

// Permanently deletes one or more message docs (for both participants).
// REQUIRES a Firestore Security Rules update — the rules shown at the
// top of this file only grant `read` and `create` on /messages/{msgId}.
// Add this rule in Firebase Console -> Firestore Database -> Rules so
// deleting messages is allowed:
//
//   match /messages/{msgId} {
//     allow read: if request.auth != null &&
//       request.auth.uid in resource.data.participants;
//     allow create: if request.auth != null &&
//       request.resource.data.fromUid == request.auth.uid &&
//       request.auth.uid in request.resource.data.participants &&
//       request.resource.data.toUid in request.resource.data.participants;
//     allow delete: if request.auth != null &&
//       request.auth.uid in resource.data.participants;
//   }
//
// Until that rule is added, deleting a message will fail with a
// "Missing or insufficient permissions" error.
async function deleteMessages(msgIds) {
  await requireUid();
  const batch = db.batch();
  msgIds.forEach(id => batch.delete(db.collection("messages").doc(id)));
  await batch.commit();
}

async function markAllNotificationsRead(notifIds) {
  if (!notifIds.length) return;
  try {
    const batch = db.batch();
    notifIds.forEach(id => batch.update(db.collection("notifications").doc(id), { read: true }));
    await batch.commit();
  } catch (e) { console.warn("markAllNotificationsRead failed:", e); }
}
