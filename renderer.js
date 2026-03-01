/* =========================================
   RENDERER.JS – ELECTRON RENDERER BOOTSTRAP
   ========================================= */

/*
  This file intentionally stays minimal.

  All logic lives in:
  - auth.js   → user login / PIN
  - ui.js     → muscle & exercise UI
  - api.js    → workout data (offline-first)
  - reset.js  → kiosk auto-reset
*/

/* =========================================
   BASIC SAFETY CHECKS
========================================= */

window.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer loaded');

  // Prevent drag & drop (kiosk safety)
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());

  // Disable context menu (right-click)
  document.addEventListener('contextmenu', e => e.preventDefault());
});

/* =========================================
   OPTIONAL DEBUG HELPERS (DEV ONLY)
========================================= */

// Uncomment ONLY during development
/*
window.debugReset = () => {
  if (typeof triggerAutoReset === 'function') {
    triggerAutoReset();
  }
};
*/
