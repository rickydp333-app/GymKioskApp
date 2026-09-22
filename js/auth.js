console.log('AUTH.JS LOADED');

/*
  IMPORTANT RULE:
  - auth.js MUST NOT control screen navigation
  - auth.js MUST NOT attach click listeners to .user
  - auth.js ONLY provides helper logic (admin, future PINs, validation)
*/

/* ======================================================
   ADMIN CONFIG
====================================================== */

// Change this to any secure code you want
const ADMIN_CODE = '3333';

/* ======================================================
   ADMIN CODE VALIDATION (CALLED FROM UI IF NEEDED)
====================================================== */

function validateAdminCode(input) {
  return input === ADMIN_CODE;
}

// Expose safely if needed later
window.validateAdminCode = validateAdminCode;

/* ======================================================
   USER HELPERS (NON-NAVIGATIONAL)
====================================================== */

// Create user data if it does not exist
function ensureUserExists(username) {
  if (!username) return;

  const key = `user_${username}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify({
      name: username,
      created: new Date().toISOString(),
      favorites: [],
      plans: []
    }));
  }
}

window.ensureUserExists = ensureUserExists;

/* ======================================================
   FUTURE PIN SUPPORT (NOT ACTIVE YET)
====================================================== */

// Placeholder only — does nothing yet
function validateUserPin(username, pin) {
  return true;
}

window.validateUserPin = validateUserPin;