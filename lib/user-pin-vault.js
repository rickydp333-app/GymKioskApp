'use strict';

// Windows protects these values for the current OS account. Authentication
// still uses the salted hash; revealing a value requires an admin session.
function registerUserPinVault({ ipcMain, safeStorage, isAdmin }) {
  ipcMain.handle('user-pin-protect', (_event, pin) => {
    if (!/^\d{4}$/.test(String(pin))) throw new Error('PIN must be exactly 4 digits.');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Protected PIN storage is unavailable.');
    return safeStorage.encryptString(String(pin)).toString('base64');
  });
  ipcMain.handle('admin-user-pin-reveal', (_event, payload = {}) => {
    if (!isAdmin(payload.token)) return { success: false, error: 'Sign in as administrator again.' };
    try {
      if (typeof payload.encrypted !== 'string' || payload.encrypted.length > 8192) throw new Error();
      const pin = safeStorage.decryptString(Buffer.from(payload.encrypted, 'base64'));
      if (!/^\d{4}$/.test(pin)) throw new Error();
      return { success: true, pin };
    } catch {
      return { success: false, error: 'Reset this PIN to make it visible on this computer.' };
    }
  });
}

module.exports = { registerUserPinVault };
