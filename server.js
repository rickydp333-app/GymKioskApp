const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { createPersistentStore } = require('./lib/persistent-store');
const { createWebsiteSync } = require('./lib/website-sync');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (_error) {
}

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_error) {
}

const app = express();
const PORT = process.env.PORT || 3001;
const STATIC_MOBILE_DIR_CANDIDATES = [
  path.join(__dirname, 'mobile'),
  path.join(__dirname, 'public', 'mobile')
];
const MOBILE_FILE_DIR_CANDIDATES = [
  ...STATIC_MOBILE_DIR_CANDIDATES,
  __dirname
];
const KIOSK_CSS_DIR = path.join(__dirname, 'css');
const KIOSK_JS_DIR = path.join(__dirname, 'js');
const KIOSK_HTML_DIR = __dirname;
const SCREENSAVER_TUTORIAL_CANDIDATES = [
  path.join(__dirname, 'screensaver-tutorial.html'),
  path.join(__dirname, 'assets', 'screensaver-tutorial.html')
];
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_RETENTION_MS = 35 * 24 * 60 * 60 * 1000;
const WORKOUT_RETENTION_DAYS = 120;
const CHALLENGE_RETENTION_DAYS = 60;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const SERVER_LOG_FILE = path.join(__dirname, 'server-log.txt');
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || 'rickyp3@me.com';
const ALERT_EMAIL_FROM = process.env.ALERT_EMAIL_FROM || process.env.ALERT_SMTP_USER || '';
const ALERT_EMAIL_COOLDOWN_MS = Math.max(60_000, Number(process.env.ALERT_EMAIL_COOLDOWN_MS || 10 * 60 * 1000));
const ALERT_EMAIL_ENABLED = String(process.env.ALERT_EMAIL_ENABLED || '1') !== '0';
const API_RATE_LIMIT_WINDOW_MS = Math.max(10_000, Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000));
const API_RATE_LIMIT_MAX = Math.max(30, Number(process.env.API_RATE_LIMIT_MAX || 240));
const KIOSK_DEVICE_KEY = String(process.env.GYMKIOSK_DEVICE_KEY || '');
const WEBSITE_SYNC_KEY = String(process.env.GYMKIOSK_SYNC_KEY || '');
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

ALLOWED_ORIGINS.add('http://localhost:3001');
ALLOWED_ORIGINS.add('http://127.0.0.1:3001');
ALLOWED_ORIGINS.add('https://gymkioskapp.onrender.com');
ALLOWED_ORIGINS.add('https://www.rdpsstrengthandconditioning.ca');

const criticalAlertState = {
  started: false,
  logReadPosition: 0,
  lastSentByFingerprint: new Map(),
  sending: false
};

function createAlertTransporter() {
  if (!nodemailer || !ALERT_EMAIL_ENABLED) return null;

  const smtpHost = process.env.ALERT_SMTP_HOST;
  const smtpPort = Number(process.env.ALERT_SMTP_PORT || 587);
  const smtpSecure = String(process.env.ALERT_SMTP_SECURE || '0') === '1';
  const smtpService = process.env.ALERT_SMTP_SERVICE;
  const smtpUser = process.env.ALERT_SMTP_USER;
  const smtpPass = process.env.ALERT_SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  if (smtpService) {
    return nodemailer.createTransport({
      service: smtpService,
      auth: { user: smtpUser, pass: smtpPass }
    });
  }

  if (smtpHost) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass }
    });
  }

  return null;
}

const alertTransporter = createAlertTransporter();

function isCriticalLogLine(line) {
  const text = String(line || '').toLowerCase();
  if (!text) return false;
  if (text.includes('incorrect admin pin')) return false;
  if (text.includes('login failed')) return false;
  return /(fatal|uncaught|unhandledrejection|exception|critical|\berror\b|eaddrinuse|emfile|enospc|out of memory|heap out of memory|segmentation fault)/i.test(text);
}

function fingerprintForAlert(source, message) {
  return crypto
    .createHash('sha256')
    .update(`${source}:${String(message || '').slice(0, 800)}`)
    .digest('hex');
}

function getLastLogLines(limit = 40) {
  try {
    if (!fs.existsSync(SERVER_LOG_FILE)) return '';
    const content = fs.readFileSync(SERVER_LOG_FILE, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    return lines.slice(-limit).join('\n');
  } catch (_error) {
    return '';
  }
}

async function maybeSendCriticalEmail({ source, message }) {
  if (!alertTransporter || !ALERT_EMAIL_FROM || !ALERT_EMAIL_TO || !ALERT_EMAIL_ENABLED) return;
  if (!isCriticalLogLine(message)) return;

  const now = Date.now();
  const fingerprint = fingerprintForAlert(source, message);
  const lastSentAt = criticalAlertState.lastSentByFingerprint.get(fingerprint) || 0;
  if (now - lastSentAt < ALERT_EMAIL_COOLDOWN_MS) return;
  if (criticalAlertState.sending) return;

  criticalAlertState.sending = true;
  criticalAlertState.lastSentByFingerprint.set(fingerprint, now);

  try {
    const recentLogs = getLastLogLines(50);
    await alertTransporter.sendMail({
      from: ALERT_EMAIL_FROM,
      to: ALERT_EMAIL_TO,
      subject: `[GymKiosk][CRITICAL] ${source}`,
      text: [
        `Timestamp: ${new Date().toISOString()}`,
        `Source: ${source}`,
        '',
        'Critical message:',
        String(message || ''),
        '',
        'Recent log lines:',
        recentLogs || '(No server-log.txt content available)'
      ].join('\n')
    });
    console.log(`📧 Critical alert email sent to ${ALERT_EMAIL_TO} (${source})`);
  } catch (error) {
    process.stderr.write(`Critical email alert failed: ${error.message}\n`);
    console.error(`Critical email alert failed (${source}):`, error.message);
  } finally {
    criticalAlertState.sending = false;
  }
}

function monitorServerLogFileForCriticalErrors() {
  if (criticalAlertState.started) return;
  criticalAlertState.started = true;

  try {
    if (fs.existsSync(SERVER_LOG_FILE)) {
      criticalAlertState.logReadPosition = fs.statSync(SERVER_LOG_FILE).size;
    }
  } catch (_error) {
    criticalAlertState.logReadPosition = 0;
  }

  const originalConsoleError = console.error.bind(console);
  console.error = (...args) => {
    originalConsoleError(...args);
    const message = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    maybeSendCriticalEmail({ source: 'console.error', message }).catch(() => {});
  };

  process.on('uncaughtException', (error) => {
    const message = error?.stack || error?.message || String(error);
    maybeSendCriticalEmail({ source: 'uncaughtException', message }).catch(() => {});
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason?.stack || reason?.message || String(reason);
    maybeSendCriticalEmail({ source: 'unhandledRejection', message }).catch(() => {});
  });

  fs.watchFile(SERVER_LOG_FILE, { interval: 2000 }, (curr, prev) => {
    if (curr.size <= 0) {
      criticalAlertState.logReadPosition = 0;
      return;
    }

    if (curr.size < criticalAlertState.logReadPosition) {
      criticalAlertState.logReadPosition = 0;
    }

    if (curr.size === prev.size || curr.size === criticalAlertState.logReadPosition) {
      return;
    }

    const start = criticalAlertState.logReadPosition;
    const length = curr.size - start;
    const fd = fs.openSync(SERVER_LOG_FILE, 'r');

    try {
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, start);
      const chunk = buffer.toString('utf8');
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      lines.forEach((line) => {
        if (isCriticalLogLine(line)) {
          maybeSendCriticalEmail({ source: 'server-log.txt', message: line }).catch(() => {});
        }
      });
      criticalAlertState.logReadPosition = curr.size;
    } finally {
      fs.closeSync(fd);
    }
  });

  if (ALERT_EMAIL_ENABLED) {
    if (alertTransporter && ALERT_EMAIL_FROM && ALERT_EMAIL_TO) {
      console.log(`📧 Critical email alerts enabled for ${ALERT_EMAIL_TO}`);
    } else {
      console.warn('⚠ Critical email alerts are configured off or missing SMTP env vars (ALERT_SMTP_USER/PASS + host/service).');
    }
  }
}

function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

const STATIC_MOBILE_DIR = STATIC_MOBILE_DIR_CANDIDATES.find(isDirectory) || null;
const MOBILE_FILE_DIRS = MOBILE_FILE_DIR_CANDIDATES.filter(isDirectory);
monitorServerLogFileForCriticalErrors();

const apiRateLimiterState = new Map();

function getRequestClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function apiRateLimit(req, res, next) {
  const now = Date.now();
  const key = getRequestClientKey(req);
  const bucket = apiRateLimiterState.get(key);

  if (!bucket || bucket.resetAt <= now) {
    apiRateLimiterState.set(key, { count: 1, resetAt: now + API_RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  bucket.count += 1;
  if (bucket.count > API_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of apiRateLimiterState.entries()) {
    if (!entry || entry.resetAt <= now) {
      apiRateLimiterState.delete(key);
    }
  }
}, API_RATE_LIMIT_WINDOW_MS).unref();

// Middleware
app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  }
}));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !isAllowedCorsOrigin(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  next();
});
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:3001 http://localhost:3001 https://gymkioskapp.onrender.com https://www.rdpsstrengthandconditioning.ca");
  next();
});
app.use(express.json({ limit: '256kb', strict: true }));
app.use('/api', apiRateLimit);
if (STATIC_MOBILE_DIR) {
  app.use(express.static(STATIC_MOBILE_DIR));
} else {
  console.warn('⚠ No mobile static directory found. Static web assets may be unavailable.');
}
if (isDirectory(KIOSK_CSS_DIR)) {
  app.use('/css', express.static(KIOSK_CSS_DIR));
}
if (isDirectory(KIOSK_JS_DIR)) {
  app.use('/js', express.static(KIOSK_JS_DIR));
}
app.get('/assets/branding/logo.png', (req, res) => {
  const logoFileCandidates = [
    path.join(__dirname, 'assets', 'branding', 'logo.png'),
    path.join(process.cwd(), 'assets', 'branding', 'logo.png')
  ];

  for (const logoPath of logoFileCandidates) {
    if (logoPath && fs.existsSync(logoPath)) {
      return res.sendFile(logoPath);
    }
  }

  const fallbackLogoSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="180" viewBox="0 0 900 180">',
    '<rect width="100%" height="100%" rx="20" fill="#0f172a"/>',
    '<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#d4af37">RDPs STRENGTH &amp; CONDITIONING</text>',
    '</svg>'
  ].join('');

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).send(fallbackLogoSvg);
});
app.use('/assets', express.static(path.join(__dirname, 'assets'))); // Serve exercise videos and images

function sendMobileFile(res, preferredFile, fallbackFiles = []) {
  const candidates = [preferredFile, ...fallbackFiles].filter(Boolean);

  for (const dir of MOBILE_FILE_DIRS) {
    for (const filename of candidates) {
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
  }

  return res.status(503).send('Mobile web files are not available on this deployment yet.');
}

function sendFirstExistingFile(res, absolutePaths = []) {
  for (const filePath of absolutePaths) {
    if (filePath && fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  return res.status(404).send('Requested file is not available on this deployment.');
}

// ========================================
// FILE STORAGE SETUP
// ========================================
const persistentStore = createPersistentStore({ sourceDataDir: path.join(__dirname, 'data') });
const websiteSync = createWebsiteSync({ store: persistentStore });
const DATA_DIR = persistentStore.dataDir;
const WORKOUTS_FILE = persistentStore.databasePath;
const USERS_FILE = persistentStore.databasePath;
const CALENDARS_FILE = persistentStore.databasePath;
const FRIEND_CHALLENGES_FILE = persistentStore.databasePath;

// Load workouts from file or initialize empty
function loadWorkouts() {
  try {
    const map = persistentStore.readMap('workouts');
    console.log(`✓ Loaded ${map.size} workouts from SQLite`);
    return map;
  } catch (err) {
    console.warn('⚠ Error loading workouts file:', err.message);
  }
  return new Map();
}

// Load users from file or initialize empty
function loadUsers() {
  try {
    const map = persistentStore.readMap('users');
    console.log(`✓ Loaded ${map.size} users from SQLite`);
    return map;
  } catch (err) {
    console.warn('⚠ Error loading users file:', err.message);
  }
  return new Map();
}

// Load calendars from file or initialize empty
function loadCalendars() {
  try {
    const map = persistentStore.readMap('calendars');
    console.log(`✓ Loaded ${map.size} calendars from SQLite`);
    return map;
  } catch (err) {
    console.warn('⚠ Error loading calendars file:', err.message);
  }
  return new Map();
}

// Load friend challenges from file or initialize empty
function loadFriendChallenges() {
  try {
    const list = persistentStore.readList('friend-challenges');
    console.log(`✓ Loaded ${list.length} friend challenges from SQLite`);
    return list;
  } catch (err) {
    console.warn('⚠ Error loading friend challenges file:', err.message);
  }
  return [];
}

// Save workouts to file
function saveWorkouts() {
  try {
    persistentStore.writeMap('workouts', workouts);
  } catch (err) {
    console.error('✗ Error saving workouts:', err.message);
  }
}

// Save users to file
function saveUsers() {
  try {
    persistentStore.writeMap('users', users);
  } catch (err) {
    console.error('✗ Error saving users:', err.message);
  }
}

// Save calendars to file
function saveCalendars() {
  try {
    persistentStore.writeMap('calendars', calendars);
  } catch (err) {
    console.error('✗ Error saving calendars:', err.message);
  }
}

// Save friend challenges to file
function saveFriendChallenges() {
  try {
    persistentStore.writeList('friend-challenges', friendChallenges);
  } catch (err) {
    console.error('✗ Error saving friend challenges:', err.message);
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  const computedBuffer = Buffer.from(computed, 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');

  if (computedBuffer.length !== hashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, hashBuffer);
}

function toTimestamp(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function cleanupRuntimeData() {
  const now = Date.now();
  let removedSessions = 0;
  let removedWorkouts = 0;
  let removedChallenges = 0;

  for (const [sessionId, session] of sessions.entries()) {
    const sessionAge = now - (session.expiresAt || now);
    if (!session || session.expiresAt < now || sessionAge > SESSION_RETENTION_MS) {
      sessions.delete(sessionId);
      removedSessions += 1;
    }
  }

  const workoutCutoff = now - (WORKOUT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  for (const [workoutId, workout] of workouts.entries()) {
    if (workout?.type === 'favorites') continue;
    const createdTs = toTimestamp(workout?.created);
    if (createdTs && createdTs < workoutCutoff) {
      workouts.delete(workoutId);
      removedWorkouts += 1;
    }
  }

  const challengeCutoff = now - (CHALLENGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  for (let index = friendChallenges.length - 1; index >= 0; index -= 1) {
    const createdTs = toTimestamp(friendChallenges[index]?.created);
    if (createdTs && createdTs < challengeCutoff) {
      friendChallenges.splice(index, 1);
      removedChallenges += 1;
    }
  }

  if (removedWorkouts > 0) saveWorkouts();
  if (removedChallenges > 0) saveFriendChallenges();

  if (removedSessions || removedWorkouts || removedChallenges) {
    console.log(`🧹 Cleanup complete: sessions=${removedSessions}, workouts=${removedWorkouts}, challenges=${removedChallenges}`);
  }
}

// In-memory storage (loaded from files)
const users = loadUsers(); // userId -> { email, password, workouts }
const workouts = loadWorkouts(); // workoutId -> { userId, data, created }
const calendars = loadCalendars(); // calendarId -> { userName, data, created }
const friendChallenges = loadFriendChallenges(); // array of friend challenge entries
const sessions = new Map(); // sessionId -> { userId, expiresAt }

function getAuthenticatedUser(req, res) {
  const sessionId = req.headers['authorization']?.replace('Bearer ', '');
  if (!sessionId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    res.status(401).json({ error: 'Session expired' });
    return null;
  }

  const user = users.get(session.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }

  return { sessionId, userId: session.userId, user };
}

function isLoopbackRequest(req) {
  const address = req.socket?.remoteAddress || req.ip || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function requireKioskMutationAuth(req, res, next) {
  if (isLoopbackRequest(req)) return next();
  const supplied = String(req.headers['x-gymkiosk-key'] || '');
  if (KIOSK_DEVICE_KEY && supplied.length === KIOSK_DEVICE_KEY.length) {
    const valid = crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(KIOSK_DEVICE_KEY));
    if (valid) return next();
  }
  return res.status(401).json({ error: 'Kiosk device authorization required' });
}

function isValidIdentifier(value, maxLength = 128) {
  return typeof value === 'string' && value.length >= 8 && value.length <= maxLength && /^[a-zA-Z0-9_-]+$/.test(value);
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasValidWebsiteSyncKey(req) {
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!WEBSITE_SYNC_KEY || supplied.length !== WEBSITE_SYNC_KEY.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(WEBSITE_SYNC_KEY));
}

function getExerciseCount(workoutData = {}) {
  const exercises = Array.isArray(workoutData.exercises) ? workoutData.exercises : [];
  if (!exercises.length) return 0;

  if (Array.isArray(exercises[0]?.dayExercises)) {
    return exercises.reduce((total, dayGroup) => {
      const dayExercises = Array.isArray(dayGroup.dayExercises) ? dayGroup.dayExercises.length : 0;
      return total + dayExercises;
    }, 0);
  }

  return exercises.length;
}

function buildUserStats(userId) {
  const user = users.get(userId);
  const workoutIds = Array.isArray(user?.workouts) ? user.workouts : [];
  const ownedWorkouts = workoutIds
    .map((workoutId) => ({ workoutId, workout: workouts.get(workoutId) }))
    .filter((entry) => !!entry.workout);

  const totalWorkouts = ownedWorkouts.length;
  const completedWorkouts = ownedWorkouts.filter((entry) => !!entry.workout.completed).length;
  const totalExercises = ownedWorkouts.reduce((sum, entry) => sum + getExerciseCount(entry.workout.data), 0);

  const lastWorkoutMs = ownedWorkouts.reduce((latest, entry) => {
    const createdAt = entry.workout?.created || entry.workout?.data?.created;
    const createdMs = toTimestamp(createdAt);
    return Math.max(latest, createdMs);
  }, 0);

  return {
    userId,
    email: user?.email || null,
    totalWorkouts,
    completedWorkouts,
    totalExercises,
    completionRate: totalWorkouts ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
    lastWorkoutAt: lastWorkoutMs ? new Date(lastWorkoutMs).toISOString() : null
  };
}

// ========================================
// USER AUTHENTICATION
// ========================================

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'Password must contain 10 to 128 characters' });
  }

  // Check if user exists
  for (let user of users.values()) {
    if (String(user.email).toLowerCase() === normalizedEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }
  }

  const userId = uuidv4();
  const passwordInfo = hashPassword(password);
  users.set(userId, {
    email: normalizedEmail,
    passwordHash: passwordInfo.hash,
    passwordSalt: passwordInfo.salt,
    workouts: []
  });

  // Save to file
  saveUsers();

  const sessionId = uuidv4();
  sessions.set(sessionId, { userId, expiresAt: Date.now() + SESSION_TTL_MS });

  res.json({
    success: true,
    sessionId,
    userId,
    email: normalizedEmail
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  let userId = null;
  for (let [id, user] of users.entries()) {
    if (String(user.email).toLowerCase() !== normalizedEmail) {
      continue;
    }

    if (user.passwordHash && user.passwordSalt) {
      if (verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        userId = id;
      }
      break;
    }

    if (user.password === password) {
      const passwordInfo = hashPassword(password);
      user.passwordHash = passwordInfo.hash;
      user.passwordSalt = passwordInfo.salt;
      delete user.password;
      users.set(id, user);
      saveUsers();
      userId = id;
      break;
    }

    break;
  }

  if (!userId) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionId = uuidv4();
  sessions.set(sessionId, { userId, expiresAt: Date.now() + SESSION_TTL_MS });

  res.json({
    success: true,
    sessionId,
    userId,
    email: normalizedEmail
  });
});

// ========================================
// WORKOUT MANAGEMENT
// ========================================

// Create workout from kiosk (no authentication required)
app.post('/api/workouts/create', requireKioskMutationAuth, (req, res) => {
  const { workoutId, data } = req.body;

  if (!isValidIdentifier(workoutId) || !isPlainObject(data)) {
    return res.status(400).json({ error: 'Workout ID and data required' });
  }

  // Store workout with auto-generated ID to match the kiosk-generated ID
  workouts.set(workoutId, {
    userId: null, // Kiosk workouts have no user
    data: data,
    created: new Date(),
    completed: false
  });

  // Save to file
  saveWorkouts();
  websiteSync.enqueue('workout.created', { workoutId, data, created: new Date().toISOString() });

  res.json({
    success: true,
    workoutId,
    shareUrl: `/workout/${workoutId}`
  });
});

// Create/Save workout (authenticated)
app.post('/api/workouts', (req, res) => {
  const { workoutData } = req.body;
  const sessionId = req.headers['authorization']?.replace('Bearer ', '');

  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Session expired' });
  }

  const workoutId = uuidv4();
  const user = users.get(session.userId);

  workouts.set(workoutId, {
    userId: session.userId,
    data: workoutData,
    created: new Date(),
    completed: false
  });

  user.workouts.push(workoutId);

  // Save to file
  saveWorkouts();
  websiteSync.enqueue('workout.created', { workoutId, userId: session.userId, data: workoutData, created: new Date().toISOString() });
  saveUsers();

  res.json({
    success: true,
    workoutId,
    shareUrl: `/workout/${workoutId}`
  });
});

// Get workout by ID (shareable link)

// Create favorites share
app.post('/api/favorites/create', requireKioskMutationAuth, (req, res) => {
  const { favoritesId, data } = req.body;

  if (!isValidIdentifier(favoritesId) || !isPlainObject(data)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Store favorites with type flag
  workouts.set(favoritesId, {
    type: 'favorites',
    data,
    created: new Date().toISOString(),
    username: data.username
  });

  saveWorkouts();
  websiteSync.enqueue('favorites.created', { favoritesId, data, created: new Date().toISOString() });

  res.json({
    success: true,
    favoritesId,
    shareUrl: `/favorites/${favoritesId}`
  });
});

// Get favorites by ID (shareable link)
app.get('/api/favorites/:favoritesId', (req, res) => {
  const { favoritesId } = req.params;
  const favorites = workouts.get(favoritesId);

  if (!favorites || favorites.type !== 'favorites') {
    return res.status(404).json({
      success: false,
      message: 'Favorites not found'
    });
  }

  res.json({
    success: true,
    data: favorites.data,
    created: favorites.created,
    username: favorites.username
  });
});


app.get('/api/workouts/:workoutId', (req, res) => {
  const { workoutId } = req.params;
  const workout = workouts.get(workoutId);

  if (!workout) {
    return res.status(404).json({ error: 'Workout not found' });
  }

  res.json({
    success: true,
    workoutId,
    data: workout.data,
    created: workout.created
  });
});

// Get user's workouts
app.get('/api/user/workouts', (req, res) => {
  const auth = getAuthenticatedUser(req, res);
  if (!auth) return;

  const userWorkouts = auth.user.workouts.map(wId => {
    const w = workouts.get(wId);
    if (!w) return null;
    return {
      id: wId,
      created: w.created,
      completed: w.completed,
      exercises: getExerciseCount(w.data)
    };
  }).filter(Boolean);

  res.json({
    success: true,
    workouts: userWorkouts
  });
});

// Update workout (mark as completed, track progress)
app.put('/api/workouts/:workoutId', (req, res) => {
  const { workoutId } = req.params;
  const { completed, progress } = req.body;
  const auth = getAuthenticatedUser(req, res);
  if (!auth) return;

  const workout = workouts.get(workoutId);
  if (!workout) {
    return res.status(404).json({ error: 'Workout not found' });
  }

  if (workout.userId && workout.userId !== auth.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!workout.userId) {
    workout.userId = auth.userId;
  }

  if (!Array.isArray(auth.user.workouts)) {
    auth.user.workouts = [];
  }
  if (!auth.user.workouts.includes(workoutId)) {
    auth.user.workouts.push(workoutId);
  }

  if (completed !== undefined) {
    workout.completed = completed;
  }
  if (progress !== undefined) {
    workout.progress = progress;
  }

  // Save to file
  saveWorkouts();
  saveUsers();

  res.json({
    success: true,
    workout
  });
});

app.get('/api/user/stats', (req, res) => {
  const auth = getAuthenticatedUser(req, res);
  if (!auth) return;

  const stats = buildUserStats(auth.userId);
  res.json({
    success: true,
    stats
  });
});

// ========================================
// SYNC TO KIOSK
// ========================================

// Endpoint for kiosk to retrieve completed workouts
app.get('/api/sync/:userId', (req, res) => {
  const auth = getAuthenticatedUser(req, res);
  if (!auth) return;

  const { userId } = req.params;
  if (auth.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const user = users.get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const completedWorkouts = user.workouts
    .map(wId => workouts.get(wId))
    .filter(w => w && w.completed)
    .map(w => ({
      id: w.userId,
      data: w.data,
      completed: w.completed,
      progress: w.progress,
      created: w.created
    }));

  res.json({
    success: true,
    userId,
    completedWorkouts
  });
});

// ========================================
// CALENDAR SHARING
// ========================================

// Create calendar share from kiosk (no authentication required)
app.post('/api/calendar/create', requireKioskMutationAuth, (req, res) => {
  const { calendarId, data, userName } = req.body;

  if (!isValidIdentifier(calendarId) || !isPlainObject(data)) {
    return res.status(400).json({ error: 'Calendar ID and data required' });
  }

  calendars.set(calendarId, {
    userName: userName || 'User',
    data,
    created: new Date()
  });

  saveCalendars();
  websiteSync.enqueue('calendar.created', { calendarId, userName: userName || 'User', data, created: new Date().toISOString() });

  res.json({
    success: true,
    calendarId,
    shareUrl: `/calendar/${calendarId}`
  });
});

// Get calendar by ID (shareable link)
app.get('/api/calendar/:calendarId', (req, res) => {
  const { calendarId } = req.params;
  const calendar = calendars.get(calendarId);

  if (!calendar) {
    return res.status(404).json({ error: 'Calendar not found' });
  }

  res.json({
    success: true,
    calendarId,
    userName: calendar.userName,
    data: calendar.data,
    created: calendar.created
  });
});

// ========================================
// FRIEND CHALLENGES
// ========================================

// Get pending challenges for a user (new daily challenge system)
app.get('/api/friend-challenges/pending/:username', requireKioskMutationAuth, (req, res) => {
  const { username } = req.params;
  
  // Get challenges where this user was challenged to today's daily challenge
  const today = new Date().toDateString();
  console.log(`\n📋 Checking pending challenges for user: "${username}"`);
  console.log(`   Today's date: ${today}`);
  console.log(`   Total challenges in system: ${friendChallenges.length}`);
  
  const pendingChallenges = friendChallenges.filter(challenge => {
    const challengeDate = new Date(challenge.created).toDateString();
    const isToday = challengeDate === today;
    // Case-insensitive username comparison
    const isMatch = challenge.challenged_user.toLowerCase() === username.toLowerCase();
    
    console.log(`   - Challenge: ${challenge.challenger} → ${challenge.challenged_user}, Date: ${challengeDate}, Match: ${isMatch && isToday}`);
    
    return isMatch && isToday;
  });

  console.log(`   Final count: ${pendingChallenges.length}\n`);

  res.json({
    success: true,
    pendingChallenges
  });
});

// Get all friend challenges (legacy - for history)
app.get('/api/friend-challenges', requireKioskMutationAuth, (req, res) => {
  res.json({
    success: true,
    challenges: friendChallenges
  });
});

// Create friend challenge (simplified - just tracks challenger and challenged user)
app.post('/api/friend-challenges', requireKioskMutationAuth, (req, res) => {
  const { challenge } = req.body;

  if (!challenge || !challenge.challenger || !challenge.challenged_user) {
    return res.status(400).json({ error: 'Challenger and challenged_user required' });
  }

  const entry = {
    id: challenge.id || uuidv4(),
    created: new Date().toISOString(),
    challenger: challenge.challenger,
    challenged_user: challenge.challenged_user,
    // Uses today's daily challenge (NOT custom exercises/difficulty)
    dailyChallenge: true
  };

  friendChallenges.unshift(entry);
  if (friendChallenges.length > 500) {
    friendChallenges.length = 500;
  }
  saveFriendChallenges();
  websiteSync.enqueue('challenge.created', entry);

  res.json({
    success: true,
    challenge: entry
  });
});

// Decline/remove a friend challenge
app.delete('/api/friend-challenges/:challengeId', requireKioskMutationAuth, (req, res) => {
  const { challengeId } = req.params;
  
  console.log(`\n🗑️ DELETE request for challenge ID: "${challengeId}"`);
  console.log(`📋 Total challenges in system: ${friendChallenges.length}`);
  console.log(`📋 Challenge IDs in system:`, friendChallenges.map(c => c.id));
  
  const initialLength = friendChallenges.length;
  const index = friendChallenges.findIndex(c => c.id === challengeId);
  
  console.log(`🔍 Search result - exact match found at index: ${index}`);
  
  if (index === -1) {
    console.log(`❌ Challenge not found!`);
    return res.status(404).json({ error: 'Challenge not found' });
  }
  
  const removedChallenge = friendChallenges.splice(index, 1)[0];
  saveFriendChallenges();
  websiteSync.enqueue('challenge.deleted', { id: removedChallenge.id, deletedAt: new Date().toISOString() });
  
  console.log(`✅ Declined and removed challenge: ${JSON.stringify(removedChallenge)}`);
  
  res.json({
    success: true,
    message: 'Challenge declined and removed',
    challengeId: challengeId
  });
});


// ========================================
// SYSTEM INFO
// ========================================

app.post('/api/kiosk-sync', (req, res) => {
  if (!WEBSITE_SYNC_KEY) return res.status(503).json({ error: 'Website synchronization is not configured' });
  if (!hasValidWebsiteSyncKey(req)) return res.status(401).json({ error: 'Invalid synchronization credential' });

  const kioskId = String(req.body?.kioskId || '');
  const events = req.body?.events;
  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(kioskId) || !Array.isArray(events) || events.length > 100) {
    return res.status(400).json({ error: 'Invalid synchronization batch' });
  }

  const allowedEventTypes = new Set([
    'workout.created',
    'workout.updated',
    'favorites.created',
    'calendar.created',
    'challenge.created',
    'challenge.deleted'
  ]);
  const validEvents = events.filter((event) => (
    Number.isSafeInteger(Number(event?.id)) &&
    allowedEventTypes.has(event?.event_type) &&
    isPlainObject(event?.payload)
  ));
  if (validEvents.length !== events.length) return res.status(400).json({ error: 'Invalid synchronization event' });

  const accepted = persistentStore.receiveSync(kioskId, validEvents);
  return res.json({ success: true, accepted, received: validEvents.length });
});

app.get('/api/info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const ipAddress = Object.values(interfaces)
    .flat()
    .find(addr => addr.family === 'IPv4' && !addr.internal)?.address || 'localhost';

  res.json({
    server: 'GymKiosk Mobile Server',
    version: require('./package.json').version,
    port: PORT,
    ipAddress,
    workoutCount: workouts.size,
    userCount: users.size,
    calendarCount: calendars.size
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), websiteSync: websiteSync.status() });
});

app.get('/api/sync-status', (req, res) => {
  if (!isLoopbackRequest(req)) return res.status(403).json({ error: 'Sync status is available on the kiosk only' });
  res.json({ success: true, sync: websiteSync.status() });
});

// Diagnostic endpoint for QR code troubleshooting
app.get('/api/diagnostics', (req, res) => {
  if (!isLoopbackRequest(req)) return res.status(403).json({ error: 'Diagnostics are available on the kiosk only' });
  const interfaces = os.networkInterfaces();
  const ipAddress = Object.values(interfaces)
    .flat()
    .find(addr => addr.family === 'IPv4' && !addr.internal)?.address || 'localhost';

  res.json({
    status: 'ok',
    server: {
      port: PORT,
      ipAddress: ipAddress,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    storage: {
      workoutCount: workouts.size,
      recentWorkouts: Array.from(workouts.entries())
        .slice(-5)
        .map(([id, data]) => ({
          id,
          created: data.created,
          exerciseCount: data.data.exercises?.length || 0
        })),
      userCount: users.size,
      calendarCount: calendars.size
    },
    networkInfo: {
      hostname: os.hostname(),
      platform: os.platform(),
      networkInterfaces: Object.keys(interfaces).map(iface => ({
        name: iface,
        addresses: interfaces[iface]
          .filter(addr => addr.family === 'IPv4')
          .map(addr => ({ address: addr.address, internal: addr.internal }))
      }))
    }
  });
});

// ========================================
// SERVE MOBILE APP
// ========================================

app.get('/workout/:workoutId', (req, res) => {
  sendMobileFile(res, 'viewer.html');
});

app.get('/meal/:mealPlanId', (req, res) => {
  sendMobileFile(res, 'viewer-meal.html', ['viewer.html']);
});

app.get('/favorites/:favoritesId', (req, res) => {
  sendMobileFile(res, 'favorites.html', ['viewer.html']);
});

app.get('/diagnostics', (req, res) => {
  sendMobileFile(res, 'diagnostics.html');
});

app.get('/calendar/:calendarId', (req, res) => {
  sendMobileFile(res, 'calendar.html');
});

app.get('/stats', (req, res) => {
  sendMobileFile(res, 'stats.html', ['dashboard.html']);
});

app.get('/kiosk', (req, res) => {
  sendFirstExistingFile(res, [path.join(KIOSK_HTML_DIR, 'index.html')]);
});

app.get('/kiosk/index.html', (req, res) => {
  sendFirstExistingFile(res, [path.join(KIOSK_HTML_DIR, 'index.html')]);
});

app.get('/screensaver-tutorial.html', (req, res) => {
  sendFirstExistingFile(res, SCREENSAVER_TUTORIAL_CANDIDATES);
});

app.get('/kiosk/screensaver-tutorial.html', (req, res) => {
  sendFirstExistingFile(res, SCREENSAVER_TUTORIAL_CANDIDATES);
});

app.get('/', (req, res) => {
  sendMobileFile(res, 'index.html', ['viewer.html']);
});

// ========================================
// START SERVER
// ========================================

const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`GymKiosk Mobile Server RUNNING`);
  console.log(`========================================`);
  console.log(`Port: ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  const interfaces = os.networkInterfaces();
  const ipAddress = Object.values(interfaces)
    .flat()
    .find(addr => addr.family === 'IPv4' && !addr.internal)?.address || 'localhost';
  console.log(`Network: http://${ipAddress}:${PORT}`);
  console.log(`========================================`);
  console.log(`Data Storage: ${DATA_DIR}`);
  console.log(`  - Workouts: ${WORKOUTS_FILE}`);
  console.log(`  - Users: ${USERS_FILE}`);
  console.log(`  - Calendars: ${CALENDARS_FILE}`);
  console.log(`========================================\n`);
});

cleanupRuntimeData();
websiteSync.start();
const cleanupTimer = setInterval(cleanupRuntimeData, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

// Keep the server running
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  clearInterval(cleanupTimer);
  websiteSync.stop();
  server.close(() => {
    persistentStore.close();
    console.log('Server closed');
    process.exit(0);
  });
});


