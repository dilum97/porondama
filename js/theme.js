/**
 * theme.js
 * ------------------------------------------------------------------
 * Site-wide theme switcher. Three themes: "emerald" (default —
 * matches the site's original look), "blue" (White & Blue) and
 * "black" (Black & Gold). All the actual colors live in css/style.css
 * as CSS variables under :root / html[data-theme="blue"] /
 * html[data-theme="black"] — this file only remembers the choice
 * (localStorage) and applies it.
 *
 * Loaded as the very first <script> in <head>, right after the
 * style.css <link>, on every page — so the right theme is set on
 * <html> before the page paints (no flash of the wrong theme).
 * ------------------------------------------------------------------
 */
const THEME_STORAGE_KEY = "porondamaTheme";

function applyTheme(theme) {
  if (theme === "emerald" || !theme) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function setTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || "emerald";
}

// Apply immediately on load (this script runs before <body>, so
// document.documentElement already exists).
applyTheme(getSavedTheme());
