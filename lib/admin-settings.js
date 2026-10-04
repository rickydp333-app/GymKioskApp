'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPin(pin, record) {
  if (!record?.salt || !record?.hash) return false;
  const candidate = Buffer.from(hashPin(pin, record.salt).hash, 'hex');
  const expected = Buffer.from(record.hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function isValidKioskDeviceKey(value) {
  if (typeof value !== 'string') return false;
  if (/^[a-f0-9]{64}$/i.test(value)) return true;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64');
  return decoded.length === 32 && decoded.toString('base64') === value;
}

function createAdminSettings(userDataDir) {
  const settingsPath = path.join(userDataDir, 'secure-settings.json');
  fs.mkdirSync(userDataDir, { recursive: true });

  function read() {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (_error) {
      const initial = {
        version: 1,
        adminPin: hashPin('3333'),
        websiteSync: {
          url: 'https://api.rdpsstrengthandconditioning.ca/api/kiosk-sync',
          key: crypto.randomBytes(32).toString('hex'),
          kioskId: 'rdps-main-kiosk'
        },
        updatedAt: new Date().toISOString()
      };
      write(initial);
      return initial;
    }
  }

  function write(settings) {
    const tempPath = `${settingsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempPath, settingsPath);
  }

  function validate(pin) {
    return verifyPin(pin, read().adminPin);
  }

  function change(currentPin, nextPin) {
    if (!validate(currentPin)) return { success: false, error: 'Current PIN is incorrect.' };
    if (!/^\d{4,8}$/.test(String(nextPin || ''))) {
      return { success: false, error: 'The new PIN must contain 4 to 8 digits.' };
    }
    const settings = read();
    settings.adminPin = hashPin(nextPin);
    settings.updatedAt = new Date().toISOString();
    write(settings);
    return { success: true };
  }

  function setKioskDeviceKey(key, safeStorage) {
    const normalized = String(key || '').trim();
    if (!isValidKioskDeviceKey(normalized)) {
      return { success: false, error: 'Device key must be a Render-generated 256-bit key or 64 hexadecimal characters.' };
    }
    if (!safeStorage?.isEncryptionAvailable()) {
      return { success: false, error: 'Secure device-key storage is unavailable.' };
    }
    const settings = read();
    settings.kioskDeviceKeyEncrypted = safeStorage.encryptString(normalized).toString('base64');
    settings.updatedAt = new Date().toISOString();
    write(settings);
    return { success: true };
  }

  function getKioskDeviceKey(safeStorage) {
    const encrypted = read().kioskDeviceKeyEncrypted;
    if (!encrypted || !safeStorage?.isEncryptionAvailable()) return null;
    try {
      const key = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
      return isValidKioskDeviceKey(key) ? key : null;
    } catch (_error) {
      return null;
    }
  }

  function getSyncEnvironment() {
    const settings = read();
    if (!settings.websiteSync?.key) {
      settings.websiteSync = {
        url: 'https://api.rdpsstrengthandconditioning.ca/api/kiosk-sync',
        key: crypto.randomBytes(32).toString('hex'),
        kioskId: 'rdps-main-kiosk'
      };
      settings.updatedAt = new Date().toISOString();
      write(settings);
    }
    return {
      GYMKIOSK_SYNC_URL: settings.websiteSync.url,
      GYMKIOSK_SYNC_KEY: settings.websiteSync.key,
      GYMKIOSK_KIOSK_ID: settings.websiteSync.kioskId
    };
  }

  return { settingsPath, validate, change, setKioskDeviceKey, getKioskDeviceKey, getSyncEnvironment };
}

module.exports = { createAdminSettings, hashPin, verifyPin };
