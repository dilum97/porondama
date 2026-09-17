// Offline caching was removed — this only cleans up service workers
// that older visitors may still have registered from before. Once
// GitHub Pages has served this for a while, this file and its
// <script> tag can be deleted from every .html page.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});
  });
}
