const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

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
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_RETENTION_MS = 35 * 24 * 60 * 60 * 1000;
const WORKOUT_RETENTION_DAYS = 120;
const CHALLENGE_RETENTION_DAYS = 60;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

const STATIC_MOBILE_DIR = STATIC_MOBILE_DIR_CANDIDATES.find(isDirectory) || null;
const MOBILE_FILE_DIRS = MOBILE_FILE_DIR_CANDIDATES.filter(isDirectory);

// Middleware
app.use(cors());
app.use(express.json());
if (STATIC_MOBILE_DIR) {
  app.use(express.static(STATIC_MOBILE_DIR));
} else {
  console.warn('⚠ No mobile static directory found. Static web assets may be unavailable.');
}
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

// ========================================
// FILE STORAGE SETUP
// ========================================
const DATA_DIR = path.join(__dirname, 'data');
const WORKOUTS_FILE = path.join(DATA_DIR, 'workouts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CALENDARS_FILE = path.join(DATA_DIR, 'calendars.json');
const FRIEND_CHALLENGES_FILE = path.join(DATA_DIR, 'friend-challenges.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load workouts from file or initialize empty
function loadWorkouts() {
  try {
    if (fs.existsSync(WORKOUTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(WORKOUTS_FILE, 'utf8'));
      const map = new Map(data);
      console.log(`✓ Loaded ${map.size} workouts from file`);
      return map;
    }
  } catch (err) {
    console.warn('⚠ Error loading workouts file:', err.message);
  }
  return new Map();
}

// Load users from file or initialize empty
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const map = new Map(data);
      console.log(`✓ Loaded ${map.size} users from file`);
      return map;
    }
  } catch (err) {
    console.warn('⚠ Error loading users file:', err.message);
  }
  return new Map();
}

// Load calendars from file or initialize empty
function loadCalendars() {
  try {
    if (fs.existsSync(CALENDARS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CALENDARS_FILE, 'utf8'));
      const map = new Map(data);
      console.log(`✓ Loaded ${map.size} calendars from file`);
      return map;
    }
  } catch (err) {
    console.warn('⚠ Error loading calendars file:', err.message);
  }
  return new Map();
}

// Load friend challenges from file or initialize empty
function loadFriendChallenges() {
  try {
    if (fs.existsSync(FRIEND_CHALLENGES_FILE)) {
      const data = JSON.parse(fs.readFileSync(FRIEND_CHALLENGES_FILE, 'utf8'));
      const list = Array.isArray(data) ? data : [];
      console.log(`✓ Loaded ${list.length} friend challenges from file`);
      return list;
    }
  } catch (err) {
    console.warn('⚠ Error loading friend challenges file:', err.message);
  }
  return [];
}

// Save workouts to file
function saveWorkouts() {
  try {
    const data = Array.from(workouts.entries());
    writeJsonAtomic(WORKOUTS_FILE, data);
  } catch (err) {
    console.error('✗ Error saving workouts:', err.message);
  }
}

// Save users to file
function saveUsers() {
  try {
    const data = Array.from(users.entries());
    writeJsonAtomic(USERS_FILE, data);
  } catch (err) {
    console.error('✗ Error saving users:', err.message);
  }
}

// Save calendars to file
function saveCalendars() {
  try {
    const data = Array.from(calendars.entries());
    writeJsonAtomic(CALENDARS_FILE, data);
  } catch (err) {
    console.error('✗ Error saving calendars:', err.message);
  }
}

// Save friend challenges to file
function saveFriendChallenges() {
  try {
    writeJsonAtomic(FRIEND_CHALLENGES_FILE, friendChallenges);
  } catch (err) {
    console.error('✗ Error saving friend challenges:', err.message);
  }
}

function writeJsonAtomic(filePath, payload) {
  const tempPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;
  const content = JSON.stringify(payload, null, 2);

  fs.writeFileSync(tempPath, content, 'utf8');

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  fs.renameSync(tempPath, filePath);
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

// ========================================
// USER AUTHENTICATION
// ========================================

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Check if user exists
  for (let user of users.values()) {
    if (user.email === email) {
      return res.status(409).json({ error: 'Email already registered' });
    }
  }

  const userId = uuidv4();
  const passwordInfo = hashPassword(password);
  users.set(userId, {
    email,
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
    email
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  let userId = null;
  for (let [id, user] of users.entries()) {
    if (user.email !== email) {
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
    email
  });
});

// ========================================
// WORKOUT MANAGEMENT
// ========================================

// Create workout from kiosk (no authentication required)
app.post('/api/workouts/create', (req, res) => {
  const { workoutId, data } = req.body;

  if (!workoutId || !data) {
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
  saveUsers();

  res.json({
    success: true,
    workoutId,
    shareUrl: `/workout/${workoutId}`
  });
});

// Get workout by ID (shareable link)

// Create favorites share
app.post('/api/favorites/create', (req, res) => {
  const { favoritesId, data } = req.body;

  if (!favoritesId || !data) {
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
  const sessionId = req.headers['authorization']?.replace('Bearer ', '');

  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Session expired' });
  }

  const user = users.get(session.userId);
  const userWorkouts = user.workouts.map(wId => {
    const w = workouts.get(wId);
    return {
      id: wId,
      created: w.created,
      completed: w.completed,
      exercises: w.data.exercises.length
    };
  });

  res.json({
    success: true,
    workouts: userWorkouts
  });
});

// Update workout (mark as completed, track progress)
app.put('/api/workouts/:workoutId', (req, res) => {
  const { workoutId } = req.params;
  const { completed, progress } = req.body;
  const sessionId = req.headers['authorization']?.replace('Bearer ', '');

  const workout = workouts.get(workoutId);
  if (!workout) {
    return res.status(404).json({ error: 'Workout not found' });
  }

  if (completed !== undefined) {
    workout.completed = completed;
  }
  if (progress !== undefined) {
    workout.progress = progress;
  }

  // Save to file
  saveWorkouts();

  res.json({
    success: true,
    workout
  });
});

// ========================================
// SYNC TO KIOSK
// ========================================

// Endpoint for kiosk to retrieve completed workouts
app.get('/api/sync/:userId', (req, res) => {
  const { userId } = req.params;
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
app.post('/api/calendar/create', (req, res) => {
  const { calendarId, data, userName } = req.body;

  if (!calendarId || !data) {
    return res.status(400).json({ error: 'Calendar ID and data required' });
  }

  calendars.set(calendarId, {
    userName: userName || 'User',
    data,
    created: new Date()
  });

  saveCalendars();

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
app.get('/api/friend-challenges/pending/:username', (req, res) => {
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
app.get('/api/friend-challenges', (req, res) => {
  res.json({
    success: true,
    challenges: friendChallenges
  });
});

// Create friend challenge (simplified - just tracks challenger and challenged user)
app.post('/api/friend-challenges', (req, res) => {
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

  res.json({
    success: true,
    challenge: entry
  });
});

// Decline/remove a friend challenge
app.delete('/api/friend-challenges/:challengeId', (req, res) => {
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

app.get('/api/info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const ipAddress = Object.values(interfaces)
    .flat()
    .find(addr => addr.family === 'IPv4' && !addr.internal)?.address || 'localhost';

  res.json({
    server: 'GymKiosk Mobile Server',
    version: '1.0.0',
    port: PORT,
    ipAddress,
    workoutCount: workouts.size,
    userCount: users.size,
    calendarCount: calendars.size
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Diagnostic endpoint for QR code troubleshooting
app.get('/api/diagnostics', (req, res) => {
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
  sendMobileFile(res, 'viewer.html', ['index.html']);
});

app.get('/meal/:mealPlanId', (req, res) => {
  sendMobileFile(res, 'viewer-meal.html', ['viewer.html', 'index.html']);
});

app.get('/favorites/:favoritesId', (req, res) => {
  sendMobileFile(res, 'favorites.html', ['viewer.html', 'index.html']);
});

app.get('/diagnostics', (req, res) => {
  sendMobileFile(res, 'diagnostics.html', ['index.html']);
});

app.get('/calendar/:calendarId', (req, res) => {
  sendMobileFile(res, 'calendar.html', ['index.html']);
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
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

