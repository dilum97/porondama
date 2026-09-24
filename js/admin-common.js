/**
 * admin-common.js
 * ------------------------------------------------------------------
 * Small helpers shared by admin.html and admin-user.html so the two
 * pages don't each carry their own copy.
 *
 * Load AFTER data/reference.js (needs NAKSHATRAS / RASHIS) and after
 * firebase-config.js (needs ADMIN_UID + auth).
 * ------------------------------------------------------------------
 */

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s == null ? "" : s;
  return div.innerHTML;
}

// Accepts a Firestore Timestamp OR a plain millisecond number (the
// pendingPhotos entries store `at` as Date.now()).
function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (ts.toMillis) return ts.toMillis();
  if (ts.toDate) return ts.toDate().getTime();
  return 0;
}

function timeAgo(ts) {
  const ms = toMillis(ts);
  if (!ms) return "";
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

// "Online" = presence heartbeat (updateLastSeen() in api.js, every
// 30s from dashboard.html) seen within the last 2 minutes.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
function isOnline(u) {
  const ms = toMillis(u && u.lastSeen);
  return !!ms && (Date.now() - ms) < ONLINE_WINDOW_MS;
}

function nakshatraName(id) {
  const n = (typeof NAKSHATRAS !== "undefined" ? NAKSHATRAS : []).find(x => x.id === Number(id));
  return n ? (n.en || n.si) : null;
}
function rashiName(id) {
  const r = (typeof RASHIS !== "undefined" ? RASHIS : []).find(x => x.id === Number(id));
  return r ? (r.en || r.si) : null;
}

// ---------------- toast ----------------
let _adminToastEl = null;
let _adminToastTimer = null;
function adminToast(msg) {
  if (!_adminToastEl) {
    _adminToastEl = document.createElement("div");
    _adminToastEl.className = "toast";
    document.body.appendChild(_adminToastEl);
  }
  _adminToastEl.textContent = msg;
  _adminToastEl.classList.add("show");
  clearTimeout(_adminToastTimer);
  _adminToastTimer = setTimeout(() => _adminToastEl.classList.remove("show"), 2600);
}

// ---------------- small text-input dialog ----------------
// Replaces window.prompt() so the dark theme is kept. Resolves with
// the entered string (may be "" when required is false) or null if
// the admin cancelled.
function askAdminText(opts) {
  const o = Object.assign({
    title: "",
    message: "",
    placeholder: "",
    confirmLabel: "OK",
    required: false,
    danger: false,
    maxLength: 300
  }, opts || {});
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:440px;">
        <h3 style="margin:0 0 4px;">${escapeHtml(o.title)}</h3>
        ${o.message ? `<div class="admin-dialog-msg">${escapeHtml(o.message)}</div>` : ""}
        <textarea class="admin-textarea" maxlength="${o.maxLength}" placeholder="${escapeHtml(o.placeholder)}"></textarea>
        <div class="admin-dialog-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancel</button>
          <button type="button" class="btn ${o.danger ? "btn-danger" : "btn-primary"}" data-act="ok">${escapeHtml(o.confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const ta = overlay.querySelector("textarea");
    ta.focus();
    const done = (val) => { overlay.remove(); resolve(val); };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) done(null); });
    overlay.querySelector('[data-act="cancel"]').addEventListener("click", () => done(null));
    overlay.querySelector('[data-act="ok"]').addEventListener("click", () => {
      const v = ta.value.trim();
      if (o.required && !v) { ta.focus(); return; }
      done(v);
    });
  });
}

// ---------------- full-screen photo viewer (next/prev) ----------------
let _lbUrls = [];
let _lbIndex = 0;
let _lbEl = null;
function _lbRender() {
  _lbEl.querySelector("img").src = _lbUrls[_lbIndex];
  const multi = _lbUrls.length > 1;
  _lbEl.querySelector(".lightbox-prev").style.display = multi ? "flex" : "none";
  _lbEl.querySelector(".lightbox-next").style.display = multi ? "flex" : "none";
}
function closeAdminLightbox() {
  if (_lbEl) { _lbEl.remove(); _lbEl = null; }
}
function openAdminLightbox(urls, index) {
  closeAdminLightbox();
  _lbUrls = urls;
  _lbIndex = index || 0;
  _lbEl = document.createElement("div");
  _lbEl.className = "lightbox";
  _lbEl.innerHTML = `
    <button type="button" class="lightbox-close">✕</button>
    <button type="button" class="lightbox-nav lightbox-prev">‹</button>
    <img src="" alt="">
    <button type="button" class="lightbox-nav lightbox-next">›</button>`;
  _lbEl.addEventListener("click", (e) => { if (e.target === _lbEl) closeAdminLightbox(); });
  _lbEl.querySelector(".lightbox-close").addEventListener("click", closeAdminLightbox);
  _lbEl.querySelector(".lightbox-prev").addEventListener("click", () => {
    _lbIndex = (_lbIndex - 1 + _lbUrls.length) % _lbUrls.length; _lbRender();
  });
  _lbEl.querySelector(".lightbox-next").addEventListener("click", () => {
    _lbIndex = (_lbIndex + 1) % _lbUrls.length; _lbRender();
  });
  document.body.appendChild(_lbEl);
  _lbRender();
}
document.addEventListener("keydown", (e) => {
  if (!_lbEl) return;
  if (e.key === "Escape") closeAdminLightbox();
  if (e.key === "ArrowLeft") _lbEl.querySelector(".lightbox-prev").click();
  if (e.key === "ArrowRight") _lbEl.querySelector(".lightbox-next").click();
});

// ---------------- auth guard ----------------
// Resolves with the signed-in admin user, or redirects to the admin
// login page and resolves null.
async function requireAdminOrRedirect() {
  const user = await new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(u => { unsub(); resolve(u); });
  });
  if (!user || user.uid !== ADMIN_UID) {
    location.href = "admin-login.html";
    return null;
  }
  return user;
}
