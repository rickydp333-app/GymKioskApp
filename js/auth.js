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
let adminValidationGeneration = 0;
let adminValidationError = '';
window.getAdminValidationError = () => adminValidationError;
window.cancelAdminValidation = () => { adminValidationGeneration++; adminSessionToken = null; };

/* ======================================================
   ADMIN CODE VALIDATION (CALLED FROM UI IF NEEDED)
====================================================== */

async function validateAdminCode(input) {
  const generation = ++adminValidationGeneration;
  adminSessionToken = null;
  adminValidationError = '';
  if (!window.electron?.validateAdminPin) {
    adminValidationError = 'Administrator login is unavailable. Open the installed RDP-GYM app, or cancel and restart it.';
    return false;
  }
  let timeout;
  try {
    const result = await Promise.race([
      window.electron.validateAdminPin(String(input)),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Login timed out. Please try again or cancel.')), 8000); })
    ]);
    if (generation !== adminValidationGeneration) return false;
    if (result?.success && result.token) {
      adminSessionToken = result.token;
      return true;
    }
    adminValidationError = result?.lockedUntil > Date.now()
      ? 'Too many attempts. Wait one minute before trying again. You can still cancel.'
      : result?.error || 'That administrator PIN was not accepted. Try again or cancel.';
    return false;
  } catch (error) {
    if (generation === adminValidationGeneration) adminValidationError = 'Unable to check the PIN. Please cancel and reopen administrator login. ' + (error.message || '');
    return false;
  } finally {
    clearTimeout(timeout);
  }
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
