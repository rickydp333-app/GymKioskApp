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

let adminSessionToken = null;

/* ======================================================
   ADMIN CODE VALIDATION (CALLED FROM UI IF NEEDED)
====================================================== */

async function validateAdminCode(input) {
  if (!window.electron?.validateAdminPin) return false;
  const result = await window.electron.validateAdminPin(input);
  if (result?.success && result.token) {
    adminSessionToken = result.token;
    return true;
  }
  return false;
}

// Expose safely if needed later
window.validateAdminCode = validateAdminCode;
window.getAdminSessionToken = () => adminSessionToken;
window.clearAdminSessionToken = () => { adminSessionToken = null; };

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
