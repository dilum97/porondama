/**
 * service-worker.js
 * ------------------------------------------------------------------
 * Caches the app "shell" (HTML/CSS/JS/reference data) on-device so the
 * site still opens with no internet connection. This is separate from
 * Firestore's own offline persistence (enabled in firebase-config.js),
 * which caches the actual data (profile, matches, chat history).
 *
 * Bump CACHE_NAME whenever you want to force everyone's cached shell
 * to refresh (old caches are deleted automatically on activate).
 * ------------------------------------------------------------------
 */
const CACHE_NAME = "porondama-shell-v4";

const ASSETS_TO_CACHE = [
  "index.html",
  "login.html",
  "register.html",
  "dashboard.html",
  "match.html",
  "profile.html",
  "admin.html",
  "admin-login.html",
  "manifest.json",
  "css/style.css",
  "js/firebase-config.js",
  "js/api.js",
  "js/matching.js",
  "js/cloudinary.js",
  "data/reference.js",
  "img/icon-192.png",
  "img/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle our own same-origin GET requests for the shell files.
  // Firebase/Firestore/Cloudinary/Google-font requests pass straight
  // through untouched — they have their own retry/offline behaviour.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      // Serve cached instantly if we have it (fast + works offline),
      // and refresh the cache in the background when online.
      return cached || networkFetch;
    })
  );
});
