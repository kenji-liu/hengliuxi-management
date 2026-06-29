/**
 * Stable cache/version guard.
 *
 * The previous implementation redirected to ?_reset=<timestamp> whenever the
 * stored data version differed. That caused reload loops in the in-app browser
 * and made the page appear to jump. Keep this file lightweight: record the
 * expected app version, but never navigate or clear data automatically.
 */
(function () {
  const TARGET_VERSION = "3.4-fish-photo";
  const FLAG_KEY = "hengliuxi_app_version_seen";

  try {
    const previous = localStorage.getItem(FLAG_KEY);
    if (previous !== TARGET_VERSION) {
      localStorage.setItem(FLAG_KEY, TARGET_VERSION);
      console.info(`[CACHE] App version marker updated: ${previous || "none"} -> ${TARGET_VERSION}`);
    }
  } catch (error) {
    console.warn("[CACHE] Version marker unavailable:", error);
  }
})();
