/**
 * service-worker.js
 * ------------------------------------------------------------------
 * The site no longer needs offline support. This SW's only job now
 * is to clean up after itself: unregister, delete any old shell
 * caches from earlier versions (porondama-shell-v1..v5), and get out
 * of the way so every request goes straight to the network. This
 * file (and js/sw-register.js) can be deleted entirely once existing
 * visitors have loaded this version at least once.
 * ------------------------------------------------------------------
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((client) => client.navigate(client.url)))
  );
});
