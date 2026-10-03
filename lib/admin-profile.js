'use strict';
const fs = require('fs');
const path = require('path');

function resolveAdminProfile(appData, temp) {
  const destination = path.join(appData, 'GymKioskApp', 'session-admin');
  const legacy = path.join(temp, 'GymKioskApp', 'session-admin');
  if (!fs.existsSync(destination) && fs.existsSync(legacy)) {
    // Copy first and rename only after success. Never overwrite a current profile.
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const staging = fs.mkdtempSync(path.join(path.dirname(destination), 'session-admin-migration-'));
    fs.cpSync(legacy, staging, { recursive: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.renameSync(staging, destination);
  }
  fs.mkdirSync(destination, { recursive: true });
  return destination;
}

module.exports = { resolveAdminProfile };
