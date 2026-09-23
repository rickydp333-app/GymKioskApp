console.log('UI.JS LOADED');

/* ===============================
   GLOBAL STATE
================================ */
window.currentUser = null;
let enteredUserPin = '';
let enteredAdminPin = '';
let pendingUser = null;
let selectedAdminUser = null; // Track which user is selected for deletion
let adminSelectedUser = null;
let currentWorkout = null; // Store current workout for sharing
let kioskIP = 'localhost'; // Will be updated
const DISCLAIMER_ACCEPTANCE_KEY = 'gymKiosk_disclaimerAccepted_v1';
const SCREENSAVER_AUTO_LOGOUT_KEY = 'gymKiosk_screensaverAutoLogout_v1';
const SERVER_BASE_OVERRIDE_KEY = 'gymkiosk_server_base_url';
const LAST_PUBLIC_SERVER_BASE_URL_KEY = 'gymkiosk_public_server_base_url';
const LEGACY_PUBLIC_SERVER_BASE_URL = 'https://api.rdpsstrengthandconditioning.ca';
const UI_DEFAULT_SERVER_BASE_URL = 'https://app.rdpsplace.me';
const UI_DEFAULT_LOCAL_SERVER_BASE_URL = 'http://localhost:3001';
const ALLOWED_PUBLIC_SERVER_HOSTS = new Set([
  'www.rdpsstrengthandconditioning.ca',
  'rdpsstrengthandconditioning.ca',
  'app.rdpsplace.me',
  'gymkioskapp.onrender.com'
]);

function isAllowedPublicServerBase(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    return ALLOWED_PUBLIC_SERVER_HOSTS.has(String(parsed.hostname || '').toLowerCase());
  } catch (_error) {
    return false;
  }
}

function isVerboseUiTraceEnabled() {
  try {
    if (window.GYMKIOSK_UI_TRACE === true) return true;
    return localStorage.getItem('gymkiosk_ui_trace') === '1';
  } catch (_error) {
    return false;
  }
}

function verboseUiTrace(...args) {
  if (isVerboseUiTraceEnabled()) {
    console.trace(...args);
  }
}

function verboseUiLog(...args) {
  if (isVerboseUiTraceEnabled()) {
    console.log(...args);
  }
}

// Activity tracking
const ACTIVITY_STORAGE_KEY = 'gymActivityStats';
let lastSessionUser = null;

// Calendar tracking
const WORKOUT_CALENDAR_KEY = 'gymKiosk_workoutCalendar';
let currentCalendarMonth = new Date();
let currentCalendarYear = new Date().getFullYear();

// Difficulty filter state
let currentDifficultyFilter = 'all';
let currentFilteredExercises = [];
let currentDifficultyFilterContext = 'muscle';
let selectedStretchBodyPart = null;

// Full-body generator state
let selectedExerciseCount = 8;
let selectedDifficultyLevel = 'mixed';
let guidedGoal = null;
let guidedTime = null;
let guidedDifficulty = null;
let currentCoachInterview = null;
let currentCoachPlanBundle = null;

// Workout builder selections
let selectedMuscle = null;
let selectedGoal = null;
let selectedTime = null;
let selectedSport = '';
let selectedBuildType = 'single'; // 'single' or 'weekly'
let selectedWorkoutType = 'muscle'; // 'muscle' or 'stretch'

// Nutrition builder selections
let selectedNutritionGoal = null;
let selectedNutritionPlanType = 'single'; // 'single' or 'weekly'

// Facial recognition state
let faceRecognitionStream = null;
let faceRecognitionAnimationFrame = null;
let faceRecognitionDetector = null;
let faceRecognitionRunning = false;
let faceRecognitionStableDetections = 0;
let faceRecognitionHasGreeted = false;
const FACE_CHECKIN_STORAGE_KEY = 'gymKiosk_faceCheckIns';
const FACE_GREETING_DAILY_KEY = 'gymKiosk_faceGreetingDaily';
const FACE_DETECTION_THRESHOLD_KEY = 'gymKiosk_faceDetectionStableFrames';
const AMBIENT_SILENT_HOURS_ENABLED_KEY = 'gymKiosk_ambientSilentHoursEnabled';
const AMBIENT_SILENT_HOURS_START_KEY = 'gymKiosk_ambientSilentStart';
const AMBIENT_SILENT_HOURS_END_KEY = 'gymKiosk_ambientSilentEnd';
const AUDIO_OUTPUT_DEVICE_KEY = 'gymKiosk_audioOutputDeviceId';
const NATIVE_VOICE_NAME_KEY = 'gymKiosk_nativeVoiceName';
let faceDetectionStableFrameThreshold = 6;

// Face login/enrollment state
let faceAuthStream = null;
let faceAuthAnimationFrame = null;
let faceAuthDetector = null;
let faceAuthRunning = false;
let faceAuthMode = null;
let faceAuthTargetUsername = null;
let faceAuthCompletionContext = 'profile';
let faceAuthStableDetections = 0;
let faceAuthSamples = [];
let faceAuthLoginMatches = 0;
let faceAuthHasCompleted = false;
const FACE_AUTH_SIGNATURE_SIZE = 32;
const FACE_AUTH_MATCH_THRESHOLD = 0.83;
const FACE_AUTH_ENROLLMENT_SAMPLES = 3;
const FACE_API_MODEL_PATH = 'assets/face-models';
const FACE_API_MODEL_PATH_CANDIDATES = [
  FACE_API_MODEL_PATH,
  './assets/face-models',
  '/assets/face-models'
];
let faceDetectionBackend = 'unknown';
let faceDetectionBackendReady = false;
let faceDetectionBackendPromise = null;
let faceDetectionLastError = null;

// Ambient auto-greeting on user screen
let ambientFaceStream = null;
let ambientFaceDetector = null;
let ambientFaceRunning = false;
let ambientFaceAnimationFrame = null;
let ambientFaceStableDetections = 0;
let ambientFaceLastGreetingAt = 0;
const AMBIENT_FACE_GREETING_THRESHOLD = 4;
const AMBIENT_FACE_GREETING_COOLDOWN_MS = 90000;

// Voice interaction state
let voiceRecognitionInstance = null;
let voiceInteractionListening = false;
let voiceInteractionAutoRestart = false;
let voiceInteractionSupported = null;
let audioOutputRoutingSupport = null;
let cachedNativeVoiceOptions = null;

function getPreferredNativeVoiceName() {
  try {
    return localStorage.getItem(NATIVE_VOICE_NAME_KEY) || '';
  } catch (_error) {
    return '';
  }
}

function setPreferredNativeVoiceName(voiceName) {
  try {
    if (!voiceName) {
      localStorage.removeItem(NATIVE_VOICE_NAME_KEY);
      return;
    }

    localStorage.setItem(NATIVE_VOICE_NAME_KEY, voiceName);
  } catch (error) {
    console.warn('Unable to save preferred native voice:', error?.message || error);
  }
}

async function getAvailableNativeVoices() {
  if (!window.electron?.listNativeVoices) return [];
  if (cachedNativeVoiceOptions) return cachedNativeVoiceOptions;

  try {
    const response = await window.electron.listNativeVoices();
    if (!response?.success || !Array.isArray(response.voices)) {
      cachedNativeVoiceOptions = [];
      return cachedNativeVoiceOptions;
    }

    cachedNativeVoiceOptions = response.voices;
    return cachedNativeVoiceOptions;
  } catch (error) {
    console.warn('Unable to list native voices:', error?.message || error);
    cachedNativeVoiceOptions = [];
    return cachedNativeVoiceOptions;
  }
}

function getPreferredAudioOutputDeviceId() {
  try {
    return localStorage.getItem(AUDIO_OUTPUT_DEVICE_KEY) || 'default';
  } catch (_error) {
    return 'default';
  }
}

function setPreferredAudioOutputDeviceId(deviceId) {
  try {
    localStorage.setItem(AUDIO_OUTPUT_DEVICE_KEY, deviceId || 'default');
  } catch (error) {
    console.warn('Unable to save preferred audio output device:', error?.message || error);
  }
}

function supportsAudioOutputRouting() {
  if (audioOutputRoutingSupport !== null) return audioOutputRoutingSupport;

  audioOutputRoutingSupport = Boolean(
    window.navigator?.mediaDevices &&
    typeof window.navigator.mediaDevices.enumerateDevices === 'function' &&
    window.HTMLMediaElement?.prototype &&
    typeof window.HTMLMediaElement.prototype.setSinkId === 'function'
  );

  return audioOutputRoutingSupport;
}

async function getAvailableAudioOutputDevices() {
  if (!supportsAudioOutputRouting()) return [];

  try {
    const devices = await window.navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audiooutput')
      .map((device, index) => ({
        deviceId: device.deviceId || `audiooutput-${index}`,
        label: device.label || `Speaker ${index + 1}`
      }));
  } catch (error) {
    console.warn('Unable to enumerate audio output devices:', error?.message || error);
    return [];
  }
}

async function applyPreferredAudioOutputToMediaElement(mediaElement) {
  if (!mediaElement || !supportsAudioOutputRouting()) return false;

  const deviceId = getPreferredAudioOutputDeviceId();
  if (!deviceId || typeof mediaElement.setSinkId !== 'function') return false;

  try {
    await mediaElement.setSinkId(deviceId);
    return true;
  } catch (error) {
    console.warn(`Unable to route media element audio to ${deviceId}:`, error?.message || error);
    return false;
  }
}

async function applyPreferredAudioOutputToAllMediaElements() {
  if (!supportsAudioOutputRouting()) return;

  const mediaElements = Array.from(document.querySelectorAll('audio, video'));
  await Promise.all(mediaElements.map(mediaElement => applyPreferredAudioOutputToMediaElement(mediaElement)));
}

function applyPreferredAudioOutputWhenReady(mediaElement) {
  if (!mediaElement) return;

  const handler = () => {
    applyPreferredAudioOutputToMediaElement(mediaElement).catch(() => {});
  };

  if (mediaElement.readyState >= 1) {
    handler();
    return;
  }

  mediaElement.addEventListener('loadedmetadata', handler, { once: true });
}

// Generated plan state (for edits/swaps)
window.currentBuilderPlan = null;
window.currentNutritionPlan = null;

/* ===============================
   IDLE MODE
================================ */

/* ===============================
   CORE SCREEN FUNCTIONS (High Priority)
=============================== */
/* ===============================
   INITIALIZE BLOCKING FLAGS
================================ */
document.getUserTileClickBlocked = false; // Initialize flag
let currentScreenId = null;
const screenHistoryStack = [];

function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
}

function showScreen(id, options = {}) {
  const { skipHistory = false } = options;

  verboseUiLog(`📺 showScreen("${id}") called at ${new Date().toLocaleTimeString()}`);
  verboseUiTrace(`📺 Stack trace for showScreen("${id}")`);
  
  // Log stack trace if switching to userScreen (to see what's triggering it)
  if (id === 'userScreen' && window.currentUser && window.currentUser !== 'guest' && window.currentUser !== 'admin') {
    console.error(`❌ CRITICAL WARNING: Switching to userScreen while user is logged in! Current user: ${window.currentUser}`);
    console.error('Stack trace:', new Error().stack);
  }

  if (!skipHistory && currentScreenId && currentScreenId !== id) {
    screenHistoryStack.push(currentScreenId);
  }

  // Stop camera processing when leaving the facial recognition screen.
  if (currentScreenId === 'facialRecognitionScreen' && id !== 'facialRecognitionScreen') {
    stopFacialRecognitionScan();
  }

  // Stop microphone listening when leaving voice-enabled screens.
  if ((currentScreenId === 'voiceInteractionScreen' || currentScreenId === 'facialRecognitionScreen') && id !== currentScreenId) {
    stopVoiceInteractionListening();
  }

  // Stop ambient face greeting when leaving the profile selection screen.
  if (currentScreenId === 'userScreen' && id !== 'userScreen') {
    stopAmbientFaceGreeting();
  }
  
  hideAllScreens();
  const el = document.getElementById(id);
  if (!el) return console.error('Screen not found:', id);
  
  // Explicitly show by removing hidden class and clearing inline display styles
  el.classList.remove('hidden');
  el.style.display = '';  // Clear inline display so CSS takes over
  el.style.visibility = 'visible';
  el.style.pointerEvents = 'auto';
  el.style.zIndex = '1';
  verboseUiLog(`📺 Screen "${id}" made visible - class removed`);

  currentScreenId = id;
  updateTopControls(id);

  if (id === 'adminPanel') {
    initializeAdminAudioOutputControls();
    updateAdminAudioOutputUI().catch(() => {});
    initializeAdminDiagnosticsControls();
  }

  applyPreferredAudioOutputToAllMediaElements().catch(() => {});

  if (id === 'facialRecognitionScreen') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
  
  setTimeout(() => el.classList.add('active'), 10);
}

function goToPreviousScreen() {
  const previousScreenId = screenHistoryStack.pop();

  if (!previousScreenId) {
    resetToStart();
    return;
  }

  showScreen(previousScreenId, { skipHistory: true });
}

function showMainActionsScreen() {
  console.log('📺 showMainActionsScreen() called for user:', window.currentUser);
  
  const userDisplay = document.getElementById('currentUserDisplay');
  if (userDisplay) {
    userDisplay.textContent = window.currentUser || 'User';
  }

  if (window.currentUser && window.currentUser !== 'guest' && window.currentUser !== 'admin') {
    if (lastSessionUser !== window.currentUser) {
      bumpUserSession(window.currentUser);
      lastSessionUser = window.currentUser;
    }
  }

  updateActivityLeaderboard();
  
  // CRITICAL: Show the main screen FIRST
  console.log('📺 Showing mainActionsScreen immediately...');
  showScreen('mainActionsScreen');
  console.log('✅ mainActionsScreen is now visible');
  
  // Check for pending friend challenges (completely non-blocking, fire and forget)
  console.log('🔄 Starting background notification check...');
  try {
    checkAndShowChallengeNotification().catch(err => {
      console.error('⚠️ Notification check error (non-fatal):', err.message);
    });
  } catch (err) {
    console.error('⚠️ Notification check exception (non-fatal):', err.message);
  }
  
  // 🔓 UNBLOCK user tile clicks now that auth is complete
  setTimeout(() => {
    document.getUserTileClickBlocked = false;
    console.log('🔓 User tile clicks re-enabled after auth');
  }, 150);
}

function getFaceRecognitionElements() {
  return {
    video: document.getElementById('faceRecognitionVideo'),
    status: document.getElementById('faceRecognitionStatus'),
    startBtn: document.getElementById('startFaceRecognitionBtn'),
    stopBtn: document.getElementById('stopFaceRecognitionBtn')
  };
}

function setFaceRecognitionStatus(message, mode = 'neutral') {
  const { status } = getFaceRecognitionElements();
  if (!status) return;

  status.textContent = message;

  if (mode === 'success') {
    status.style.borderColor = 'rgba(16, 185, 129, 0.7)';
    status.style.color = '#d1fae5';
    return;
  }

  if (mode === 'error') {
    status.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    status.style.color = '#fecaca';
    return;
  }

  status.style.borderColor = 'rgba(255, 255, 255, 0.12)';
  status.style.color = 'var(--text-primary)';
}

function getAmbientFaceElements() {
  return {
    panel: document.getElementById('ambientFaceGreetingPanel'),
    video: document.getElementById('ambientFaceVideo'),
    status: document.getElementById('ambientFaceStatus')
  };
}

function setAmbientFaceStatus(message, mode = 'neutral') {
  const { status } = getAmbientFaceElements();
  if (!status) return;

  status.textContent = message;

  if (mode === 'success') {
    status.style.borderColor = 'rgba(16, 185, 129, 0.7)';
    status.style.color = '#d1fae5';
    return;
  }

  if (mode === 'error') {
    status.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    status.style.color = '#fecaca';
    return;
  }

  status.style.borderColor = 'rgba(255, 255, 255, 0.12)';
  status.style.color = 'var(--text-primary)';
}

function findBestAmbientFaceProfileMatch(descriptor) {
  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return null;
  }

  const users = getUsers().filter(user => isUserFaceLoginEnabled(user));
  if (!users.length) {
    return null;
  }

  let bestMatch = null;

  for (const user of users) {
    const similarity = compareFaceDescriptors(user.faceSignature, descriptor);
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { user, similarity };
    }
  }

  if (!bestMatch || bestMatch.similarity < FACE_AUTH_MATCH_THRESHOLD) {
    return null;
  }

  return bestMatch;
}

function buildAmbientGreetingPayload(video, faceDetection) {
  const descriptor = createFaceDescriptorFromVideo(video, faceDetection);
  let matched = findBestAmbientFaceProfileMatch(descriptor);

  // Backward compatibility: older enrollments may have stored grayscale signatures.
  // If face-api produced an embedding and no match was found, retry with a grayscale signature.
  if (!matched && Array.isArray(faceDetection?.descriptor) && faceDetection.descriptor.length > 0) {
    const legacyDescriptor = createFaceDescriptorFromVideo(video, {
      ...faceDetection,
      descriptor: null
    });
    matched = findBestAmbientFaceProfileMatch(legacyDescriptor);
  }

  if (matched?.user?.username) {
    return {
      greeting: `Welcome back, ${matched.user.username}! Please select your profile to begin.`,
      matchedUsername: matched.user.username,
      matchedSimilarity: matched.similarity
    };
  }

  return {
    greeting: 'Welcome! I could not find your profile yet. How can I help you today?',
    matchedUsername: null,
    matchedSimilarity: 0
  };
}

function stopAmbientFaceGreeting() {
  ambientFaceRunning = false;
  ambientFaceStableDetections = 0;

  if (ambientFaceAnimationFrame) {
    cancelAnimationFrame(ambientFaceAnimationFrame);
    ambientFaceAnimationFrame = null;
  }

  const { video } = getAmbientFaceElements();

  if (ambientFaceStream) {
    ambientFaceStream.getTracks().forEach(track => track.stop());
    ambientFaceStream = null;
  }

  if (video) {
    video.srcObject = null;
  }
}

async function runAmbientFaceGreetingLoop() {
  if (!ambientFaceRunning) return;

  if (currentScreenId !== 'userScreen') {
    stopAmbientFaceGreeting();
    return;
  }

  const { video } = getAmbientFaceElements();

  if (video && ambientFaceDetector && video.readyState >= 2) {
    try {
      const faces = await detectFacesInVideo(video, { requireDescriptor: true });

      if (faces.length > 0) {
        ambientFaceStableDetections = Math.min(ambientFaceStableDetections + 1, 20);
      } else {
        ambientFaceStableDetections = Math.max(ambientFaceStableDetections - 1, 0);
      }

      if (ambientFaceStableDetections >= AMBIENT_FACE_GREETING_THRESHOLD) {
        const now = Date.now();
        const greetingPayload = buildAmbientGreetingPayload(video, faces[0] || null);
        if ((now - ambientFaceLastGreetingAt) >= AMBIENT_FACE_GREETING_COOLDOWN_MS) {
          if (isWithinAmbientGreetingSilentHours()) {
            const silentMessage = greetingPayload.matchedUsername
              ? `Face detected: ${greetingPayload.matchedUsername}. Silent hours are active, so greeting audio is muted.`
              : 'Face detected. Silent hours are active, so greeting audio is muted.';
            setAmbientFaceStatus(silentMessage, 'neutral');
          } else {
            ambientFaceLastGreetingAt = now;
            ambientFaceStableDetections = 0;
            const greeting = greetingPayload.greeting;
            setAmbientFaceStatus(greeting, 'success');
            speakVoiceResponse(greeting);
          }
        } else {
          const readyMessage = greetingPayload.matchedUsername
            ? `Face detected: ${greetingPayload.matchedUsername}. Ready to begin when you are.`
            : 'Face detected. Ready to begin when you are.';
          setAmbientFaceStatus(readyMessage, 'success');
        }
      } else {
        setAmbientFaceStatus('Scanning for a face to auto-greet...', 'neutral');
      }
    } catch (error) {
      console.warn('Ambient face detection error:', error?.message || error);
      setAmbientFaceStatus('Face detection error. Retrying automatically...', 'error');
    }
  }

  ambientFaceAnimationFrame = requestAnimationFrame(runAmbientFaceGreetingLoop);
}

async function startAmbientFaceGreeting() {
  const { panel, video } = getAmbientFaceElements();
  if (!panel || !video) return;

  if (ambientFaceRunning) return;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    setAmbientFaceStatus('Camera API is unavailable on this device.', 'error');
    return;
  }

  stopAmbientFaceGreeting();
  setAmbientFaceStatus('Starting camera for automatic greeting...', 'neutral');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 360 },
        facingMode: 'user'
      },
      audio: false
    });

    ambientFaceStream = stream;
    video.srcObject = stream;
    await video.play();

    const backend = await ensureFaceDetectionBackend();
    if (backend === 'unsupported') {
      ambientFaceDetector = null;
      const detail = faceDetectionLastError ? ` Details: ${faceDetectionLastError}` : '';
      setAmbientFaceStatus(`Face detection could not start.${detail}`, 'error');
      stopAmbientFaceGreeting();
      return;
    }

    ambientFaceDetector = backend;
    ambientFaceRunning = true;
    ambientFaceStableDetections = 0;
    setAmbientFaceStatus('Auto-greeting is active. Walk up to the kiosk to be greeted.', 'neutral');
    runAmbientFaceGreetingLoop();
  } catch (error) {
    console.warn('Unable to start ambient face greeting:', error?.message || error);
    setAmbientFaceStatus(`Unable to access camera: ${error?.message || 'Unknown error'}`, 'error');
    stopAmbientFaceGreeting();
  }
}

function clampFaceDetectionThreshold(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 6;
  return Math.min(20, Math.max(3, parsed));
}

function getFaceDetectionStableFrameThreshold() {
  try {
    const raw = localStorage.getItem(FACE_DETECTION_THRESHOLD_KEY);
    if (raw === null) return faceDetectionStableFrameThreshold;
    return clampFaceDetectionThreshold(raw);
  } catch (_error) {
    return faceDetectionStableFrameThreshold;
  }
}

function setFaceDetectionStableFrameThreshold(value) {
  const clamped = clampFaceDetectionThreshold(value);
  faceDetectionStableFrameThreshold = clamped;
  localStorage.setItem(FACE_DETECTION_THRESHOLD_KEY, String(clamped));
  return clamped;
}

function isAmbientGreetingSilentHoursEnabled() {
  return localStorage.getItem(AMBIENT_SILENT_HOURS_ENABLED_KEY) === 'true';
}

function setAmbientGreetingSilentHoursEnabled(enabled) {
  localStorage.setItem(AMBIENT_SILENT_HOURS_ENABLED_KEY, enabled ? 'true' : 'false');
}

function normalizeSilentTime(value, fallback) {
  const candidate = String(value || '').trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(candidate)) return candidate;
  return fallback;
}

function getAmbientGreetingSilentHoursWindow() {
  const start = normalizeSilentTime(localStorage.getItem(AMBIENT_SILENT_HOURS_START_KEY), '22:00');
  const end = normalizeSilentTime(localStorage.getItem(AMBIENT_SILENT_HOURS_END_KEY), '06:00');
  return { start, end };
}

function setAmbientGreetingSilentHoursWindow(start, end) {
  const normalizedStart = normalizeSilentTime(start, '22:00');
  const normalizedEnd = normalizeSilentTime(end, '06:00');
  localStorage.setItem(AMBIENT_SILENT_HOURS_START_KEY, normalizedStart);
  localStorage.setItem(AMBIENT_SILENT_HOURS_END_KEY, normalizedEnd);
  return { start: normalizedStart, end: normalizedEnd };
}

function parseTimeToMinutes(timeString) {
  const [hours, minutes] = String(timeString).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
}

function isWithinAmbientGreetingSilentHours(now = new Date()) {
  if (!isAmbientGreetingSilentHoursEnabled()) return false;

  const { start, end } = getAmbientGreetingSilentHoursWindow();
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === null || endMinutes === null) return false;
  if (startMinutes === endMinutes) return true;

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function updateAdminFaceDetectionThresholdUI() {
  const input = document.getElementById('adminFaceDetectionThreshold');
  const status = document.getElementById('adminFaceDetectionThresholdStatus');
  const current = getFaceDetectionStableFrameThreshold();

  if (input) input.value = String(current);
  if (status) {
    status.textContent = `Current stable frame threshold: ${current}`;
    status.classList.add('is-on');
    status.classList.remove('is-off');
  }
}

function updateAdminAmbientSilentHoursUI() {
  const toggleBtn = document.getElementById('adminToggleAmbientSilentHours');
  const status = document.getElementById('adminAmbientSilentHoursStatus');
  const startInput = document.getElementById('adminAmbientSilentStart');
  const endInput = document.getElementById('adminAmbientSilentEnd');
  const enabled = isAmbientGreetingSilentHoursEnabled();
  const { start, end } = getAmbientGreetingSilentHoursWindow();

  if (toggleBtn) {
    toggleBtn.textContent = enabled
      ? 'Ambient Greeting Silent Hours: ON'
      : 'Ambient Greeting Silent Hours: OFF';
  }

  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;

  if (status) {
    status.textContent = enabled
      ? `Current status: ON (${start} to ${end})`
      : 'Current status: OFF';
    status.classList.toggle('is-on', enabled);
    status.classList.toggle('is-off', !enabled);
  }
}

async function updateAdminAudioOutputUI() {
  const select = document.getElementById('adminAudioOutputSelect');
  const saveBtn = document.getElementById('adminSaveAudioOutput');
  const refreshBtn = document.getElementById('adminRefreshAudioOutputs');
  const status = document.getElementById('adminAudioOutputStatus');

  if (!select || !status) return;

  if (!supportsAudioOutputRouting()) {
    select.innerHTML = '<option value="default">Default system speaker</option>';
    select.value = 'default';
    select.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;
    status.textContent = 'Per-device speaker routing is not available in this runtime. Voice replies still use the OS default output.';
    status.classList.remove('is-on');
    status.classList.add('is-off');
    return;
  }

  const devices = await getAvailableAudioOutputDevices();
  const preferredDeviceId = getPreferredAudioOutputDeviceId();
  const options = [
    { deviceId: 'default', label: 'Default system speaker' },
    ...devices.filter(device => device.deviceId !== 'default')
  ];

  select.innerHTML = options
    .map(device => `<option value="${device.deviceId}">${device.label}</option>`)
    .join('');

  const selectedDevice = options.find(device => device.deviceId === preferredDeviceId) || options[0];
  select.value = selectedDevice.deviceId;
  select.disabled = false;
  if (saveBtn) saveBtn.disabled = false;
  if (refreshBtn) refreshBtn.disabled = false;

  status.textContent = selectedDevice.deviceId === 'default'
    ? 'Current output: default system speaker. Voice replies remain on the OS default output.'
    : `Current output: ${selectedDevice.label}. Voice replies remain on the OS default output.`;
  status.classList.add('is-on');
  status.classList.remove('is-off');
}

function initializeAdminAudioOutputControls() {
  const select = document.getElementById('adminAudioOutputSelect');
  const saveBtn = document.getElementById('adminSaveAudioOutput');
  const refreshBtn = document.getElementById('adminRefreshAudioOutputs');

  if (saveBtn && saveBtn.dataset.bound !== '1') {
    saveBtn.dataset.bound = '1';
    saveBtn.addEventListener('click', async () => {
      const nextDeviceId = select?.value || 'default';
      setPreferredAudioOutputDeviceId(nextDeviceId);
      await applyPreferredAudioOutputToAllMediaElements();
      await updateAdminAudioOutputUI();
    });
  }

  if (refreshBtn && refreshBtn.dataset.bound !== '1') {
    refreshBtn.dataset.bound = '1';
    refreshBtn.addEventListener('click', async () => {
      await updateAdminAudioOutputUI();
    });
  }
}

async function updateAdminNativeVoiceUI() {
  const select = document.getElementById('adminNativeVoiceSelect');
  const saveBtn = document.getElementById('adminSaveNativeVoice');
  const refreshBtn = document.getElementById('adminRefreshNativeVoices');
  const testBtn = document.getElementById('adminTestNativeVoice');
  const status = document.getElementById('adminNativeVoiceStatus');

  if (!select || !status) return;

  const voices = await getAvailableNativeVoices();
  const preferredVoiceName = getPreferredNativeVoiceName();

  if (!voices.length) {
    select.innerHTML = '<option value="">Default Windows voice</option>';
    select.value = '';
    select.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = !window.electron?.listNativeVoices;
    if (testBtn) testBtn.disabled = true;
    status.textContent = 'No native Windows voices were returned. Voice replies will use the current default voice when available.';
    status.classList.remove('is-on');
    status.classList.add('is-off');
    return;
  }

  const options = [
    { name: '', language: '', id: '' },
    ...voices
  ];

  select.innerHTML = options
    .map((voice) => {
      if (!voice.name) {
        return '<option value="">Default Windows voice</option>';
      }

      const label = voice.language ? `${voice.name} (${voice.language})` : voice.name;
      return `<option value="${voice.name}">${label}</option>`;
    })
    .join('');

  const selectedVoice = options.find((voice) => voice.name === preferredVoiceName) || options[0];
  select.value = selectedVoice.name;
  select.disabled = false;
  if (saveBtn) saveBtn.disabled = false;
  if (refreshBtn) refreshBtn.disabled = false;
  if (testBtn) testBtn.disabled = false;

  status.textContent = selectedVoice.name
    ? `Current voice: ${selectedVoice.name}${selectedVoice.language ? ` (${selectedVoice.language})` : ''}`
    : 'Current voice: default Windows voice';
  status.classList.add('is-on');
  status.classList.remove('is-off');
}

async function previewNativeVoice(voiceName = '') {
  const sample = voiceName
    ? `Hello, this is ${voiceName}. Welcome to RDP Strength and Conditioning.`
    : 'Hello, this is the default Windows voice. Welcome to RDP Strength and Conditioning.';

  if (window.electron?.speakNativeText) {
    try {
      await window.electron.stopNativeSpeech?.();
      const response = await window.electron.speakNativeText({ text: sample, voiceName });
      if (response?.success) return true;
    } catch (error) {
      console.warn('Unable to preview native voice:', error?.message || error);
    }
  }

  if (!window.speechSynthesis) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sample);
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn('Unable to preview browser voice:', error?.message || error);
    return false;
  }
}

function initializeAdminNativeVoiceControls() {
  const select = document.getElementById('adminNativeVoiceSelect');
  const saveBtn = document.getElementById('adminSaveNativeVoice');
  const refreshBtn = document.getElementById('adminRefreshNativeVoices');
  const testBtn = document.getElementById('adminTestNativeVoice');

  if (saveBtn && saveBtn.dataset.bound !== '1') {
    saveBtn.dataset.bound = '1';
    saveBtn.addEventListener('click', async () => {
      setPreferredNativeVoiceName(select?.value || '');
      await updateAdminNativeVoiceUI();
    });
  }

  if (refreshBtn && refreshBtn.dataset.bound !== '1') {
    refreshBtn.dataset.bound = '1';
    refreshBtn.addEventListener('click', async () => {
      cachedNativeVoiceOptions = null;
      await updateAdminNativeVoiceUI();
    });
  }

  if (testBtn && testBtn.dataset.bound !== '1') {
    testBtn.dataset.bound = '1';
    testBtn.addEventListener('click', async () => {
      const voiceName = select?.value || '';
      const status = document.getElementById('adminNativeVoiceStatus');
      const ok = await previewNativeVoice(voiceName);

      if (status) {
        status.textContent = ok
          ? `Previewing voice: ${voiceName || 'default Windows voice'}`
          : 'Voice preview failed. Check native voice support and try again.';
        status.classList.toggle('is-on', ok);
        status.classList.toggle('is-off', !ok);
      }
    });
  }
}

function updateAdminDiagnosticsStatus(message, mode = 'neutral') {
  const status = document.getElementById('adminDiagnosticsStatus');
  if (!status) return;

  status.textContent = message;
  status.classList.toggle('is-on', mode === 'success');
  status.classList.toggle('is-off', mode !== 'success');
}

async function probeMediaInput(constraints) {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return { ok: false, error: 'MediaDevices API unavailable' };
  }

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getTracks()[0] || null;
    const settings = track && typeof track.getSettings === 'function' ? track.getSettings() : null;
    return { ok: true, settings };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  } finally {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }
}

async function runAdminDeviceDiagnostics() {
  updateAdminDiagnosticsStatus('Running diagnostics...', 'neutral');

  const enumerateAvailable = Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function');
  let devices = [];

  if (enumerateAvailable) {
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (error) {
      console.warn('Unable to enumerate media devices for diagnostics:', error?.message || error);
    }
  }

  const audioInputs = devices.filter((device) => device.kind === 'audioinput');
  const videoInputs = devices.filter((device) => device.kind === 'videoinput');
  const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');

  const [cameraProbe, microphoneProbe, nativeVoices] = await Promise.all([
    probeMediaInput({ video: true, audio: false }),
    probeMediaInput({ audio: true, video: false }),
    getAvailableNativeVoices()
  ]);

  const cameraSummary = cameraProbe.ok
    ? `Camera OK${cameraProbe.settings?.deviceId ? ' (' + cameraProbe.settings.deviceId + ')' : ''}`
    : `Camera unavailable: ${cameraProbe.error || 'Unknown error'}`;

  const microphoneSummary = microphoneProbe.ok
    ? `Microphone OK${microphoneProbe.settings?.deviceId ? ' (' + microphoneProbe.settings.deviceId + ')' : ''}`
    : `Microphone unavailable: ${microphoneProbe.error || 'Unknown error'}`;

  const speakerSummary = audioOutputs.length
    ? `Speakers detected: ${audioOutputs.length}`
    : 'No speaker outputs detected';

  const voiceSummary = nativeVoices.length
    ? `Voices detected: ${nativeVoices.slice(0, 4).map((voice) => voice.name).join(', ')}${nativeVoices.length > 4 ? ', ...' : ''}`
    : 'No native Windows voices detected';

  const enumeratedSummary = `Enumerated devices: ${videoInputs.length} camera, ${audioInputs.length} microphone, ${audioOutputs.length} speaker output`;
  const passed = cameraProbe.ok || microphoneProbe.ok || audioOutputs.length > 0 || nativeVoices.length > 0;
  updateAdminDiagnosticsStatus(`${enumeratedSummary}. ${cameraSummary}. ${microphoneSummary}. ${speakerSummary}. ${voiceSummary}.`, passed ? 'success' : 'error');
}

function initializeAdminDiagnosticsControls() {
  const button = document.getElementById('adminRunDiagnostics');
  if (!button || button.dataset.bound === '1') return;

  button.dataset.bound = '1';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await runAdminDeviceDiagnostics();
    } finally {
      button.disabled = false;
    }
  });
}

function saveFaceCheckInRecord() {
  try {
    const raw = localStorage.getItem(FACE_CHECKIN_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const records = Array.isArray(existing) ? existing : [];

    records.push({
      user: window.currentUser || 'guest',
      timestamp: new Date().toISOString()
    });

    localStorage.setItem(FACE_CHECKIN_STORAGE_KEY, JSON.stringify(records.slice(-200)));
  } catch (error) {
    console.warn('Unable to save face check-in record:', error?.message || error);
  }
}

function getTodayDateKey() {
  return new Date().toISOString().split('T')[0];
}

function hasFaceGreetingToday(userName) {
  const userKey = String(userName || 'guest').toLowerCase();
  const today = getTodayDateKey();

  try {
    const raw = localStorage.getItem(FACE_GREETING_DAILY_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map && map[userKey] === today;
  } catch (_error) {
    return false;
  }
}

function markFaceGreetingToday(userName) {
  const userKey = String(userName || 'guest').toLowerCase();
  const today = getTodayDateKey();

  try {
    const raw = localStorage.getItem(FACE_GREETING_DAILY_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[userKey] = today;
    localStorage.setItem(FACE_GREETING_DAILY_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('Unable to save daily face greeting marker:', error?.message || error);
  }
}

function saveFaceCheckInToCalendar() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const existing = getWorkoutForDate(dateStr);

  const faceCheckInMeta = {
    timestamp: now.toISOString(),
    user: window.currentUser || 'guest'
  };

  if (existing && typeof existing === 'object') {
    saveWorkoutToCalendarDate(now, {
      ...existing,
      faceCheckIn: faceCheckInMeta,
      updated: now.toISOString()
    });
    return 'merged';
  }

  saveWorkoutToCalendarDate(now, {
    type: 'face-checkin',
    focusMuscle: 'Face Check-In',
    created: now.toISOString(),
    user: window.currentUser,
    faceCheckIn: faceCheckInMeta,
    exercises: [
      {
        name: 'Facial Recognition Check-In',
        sets: 1,
        reps: 'Confirmed',
        primary: ['Attendance'],
        secondary: ['Identity Verification'],
        description: 'Camera-based face presence check recorded.'
      }
    ]
  });

  return 'created';
}

function stopFacialRecognitionScan() {
  faceRecognitionRunning = false;
  faceRecognitionStableDetections = 0;
  faceRecognitionHasGreeted = false;

  if (faceRecognitionAnimationFrame) {
    cancelAnimationFrame(faceRecognitionAnimationFrame);
    faceRecognitionAnimationFrame = null;
  }

  const { video } = getFaceRecognitionElements();

  if (faceRecognitionStream) {
    faceRecognitionStream.getTracks().forEach(track => track.stop());
    faceRecognitionStream = null;
  }

  if (video) {
    video.srcObject = null;
  }

}

async function completeFaceRecognitionGreeting() {
  if (faceRecognitionHasGreeted) return;
  faceRecognitionHasGreeted = true;

  const userName = window.currentUser || 'Member';
  const alreadyCheckedInToday = hasFaceGreetingToday(userName);

  let calendarMessage = 'Welcome back! You are already checked in for today.';

  if (!alreadyCheckedInToday) {
    saveFaceCheckInRecord();
    const calendarSaveState = saveFaceCheckInToCalendar();
    markFaceGreetingToday(userName);
    calendarMessage = calendarSaveState === 'merged'
      ? 'Today already had a workout entry, so your face check-in was added to it.'
      : 'A dated face check-in entry was added to today in the calendar.';
  }

  setFaceRecognitionStatus(`Welcome, ${userName}! Face check-in recorded.`, 'success');
  stopFacialRecognitionScan();
  await showAlert('Welcome', `Hello ${userName}! ${calendarMessage}`);
}

async function runFaceRecognitionDetectionLoop() {
  if (!faceRecognitionRunning) return;

  const { video } = getFaceRecognitionElements();

  if (video && faceRecognitionDetector && video.readyState >= 2) {
    try {
      const faces = await detectFacesInVideo(video);

      if (faces.length > 0) {
        faceRecognitionStableDetections = Math.min(faceRecognitionStableDetections + 1, 20);
      } else {
        faceRecognitionStableDetections = Math.max(faceRecognitionStableDetections - 1, 0);
      }

      if (faceRecognitionStableDetections >= getFaceDetectionStableFrameThreshold()) {
        setFaceRecognitionStatus('Face recognized. Greeting member...', 'success');
        await completeFaceRecognitionGreeting();
        return;
      } else {
        setFaceRecognitionStatus('Scanning for a face... Center your face in the camera view.', 'neutral');
      }
    } catch (error) {
      console.warn('Face detection error:', error?.message || error);
      setFaceRecognitionStatus('Face detection encountered an error. Try restarting scan.', 'error');
    }
  }

  faceRecognitionAnimationFrame = requestAnimationFrame(runFaceRecognitionDetectionLoop);
}

async function startFacialRecognitionScan() {
  const { video } = getFaceRecognitionElements();

  if (!video) return;

  stopAmbientFaceGreeting();

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    setFaceRecognitionStatus('Camera API is unavailable on this device.', 'error');
    return;
  }

  stopFacialRecognitionScan();
  faceRecognitionHasGreeted = false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    faceRecognitionStream = stream;
    video.srcObject = stream;
    await video.play();

    setFaceRecognitionStatus('Camera started. Loading face detection models...', 'neutral');
    const backend = await ensureFaceDetectionBackend();

    if (backend === 'unsupported') {
      faceRecognitionDetector = null;
      faceRecognitionRunning = false;
      const detail = faceDetectionLastError ? ` Details: ${faceDetectionLastError}` : '';
      setFaceRecognitionStatus(`Face detection models could not be loaded in this runtime.${detail}`, 'error');
      return;
    }

    faceRecognitionDetector = backend;
    faceRecognitionRunning = true;
    faceRecognitionStableDetections = 0;
    setFaceRecognitionStatus('Camera started. Scanning for a face...', 'neutral');
    runFaceRecognitionDetectionLoop();
  } catch (error) {
    console.error('Unable to start facial recognition scan:', error);
    setFaceRecognitionStatus(`Unable to access camera: ${error?.message || 'Unknown error'}`, 'error');
  }
}

function initializeFacialRecognitionScreen() {
  const { startBtn, stopBtn } = getFaceRecognitionElements();

  setFaceRecognitionStatus('Camera is off. Tap “Start Camera Scan” to begin automatic detection.', 'neutral');
  setVoiceInteractionTranscript('—');
  setVoiceInteractionStatus('Microphone is off. Tap “Start Voice Commands”.', 'neutral');

  if (startBtn && startBtn.dataset.bound !== '1') {
    startBtn.dataset.bound = '1';
    startBtn.addEventListener('click', async () => {
      await startFacialRecognitionScan();
      if (!voiceInteractionListening) {
        startVoiceInteractionListening();
      }
    });
  }

  if (stopBtn && stopBtn.dataset.bound !== '1') {
    stopBtn.dataset.bound = '1';
    stopBtn.addEventListener('click', () => {
      stopFacialRecognitionScan();
      setFaceRecognitionStatus('Camera stopped.', 'neutral');
    });
  }

  const faceVoiceStartBtn = document.getElementById('startFaceVoiceInteractionBtn');
  const faceVoiceStopBtn = document.getElementById('stopFaceVoiceInteractionBtn');
  const faceVoiceHelpBtn = document.getElementById('faceVoiceInteractionHelpBtn');

  if (faceVoiceStartBtn && faceVoiceStartBtn.dataset.bound !== '1') {
    faceVoiceStartBtn.dataset.bound = '1';
    faceVoiceStartBtn.addEventListener('click', startVoiceInteractionListening);
  }

  if (faceVoiceStopBtn && faceVoiceStopBtn.dataset.bound !== '1') {
    faceVoiceStopBtn.dataset.bound = '1';
    faceVoiceStopBtn.addEventListener('click', stopVoiceInteractionListening);
  }

  if (faceVoiceHelpBtn && faceVoiceHelpBtn.dataset.bound !== '1') {
    faceVoiceHelpBtn.dataset.bound = '1';
    faceVoiceHelpBtn.addEventListener('click', () => {
      const helpText = getVoiceCommandHelpText();
      setVoiceInteractionStatus(helpText, 'neutral');
      speakVoiceResponse(helpText);
    });
  }

  if (currentScreenId === 'facialRecognitionScreen' && !voiceInteractionListening) {
    startVoiceInteractionListening();
  }
}

function getActiveVoiceInteractionElements() {
  if (currentScreenId === 'facialRecognitionScreen') {
    return {
      status: document.getElementById('faceVoiceInteractionStatus'),
      transcript: document.getElementById('faceVoiceInteractionTranscript'),
      startBtn: document.getElementById('startFaceVoiceInteractionBtn'),
      stopBtn: document.getElementById('stopFaceVoiceInteractionBtn'),
      helpBtn: document.getElementById('faceVoiceInteractionHelpBtn')
    };
  }

  return {
    status: document.getElementById('voiceInteractionStatus'),
    transcript: document.getElementById('voiceInteractionTranscript'),
    startBtn: document.getElementById('startVoiceInteractionBtn'),
    stopBtn: document.getElementById('stopVoiceInteractionBtn'),
    helpBtn: document.getElementById('voiceInteractionHelpBtn')
  };
}

function getVoiceInteractionElements() {
  return getActiveVoiceInteractionElements();
}

function setVoiceInteractionStatus(message, mode = 'neutral') {
  const { status } = getVoiceInteractionElements();
  if (!status) return;

  status.textContent = message;

  if (mode === 'success') {
    status.style.borderColor = 'rgba(16, 185, 129, 0.7)';
    status.style.color = '#d1fae5';
    return;
  }

  if (mode === 'error') {
    status.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    status.style.color = '#fecaca';
    return;
  }

  status.style.borderColor = 'rgba(255, 255, 255, 0.12)';
  status.style.color = 'var(--text-primary)';
}

function setVoiceInteractionTranscript(value) {
  const { transcript } = getVoiceInteractionElements();
  if (!transcript) return;
  transcript.textContent = value || '—';
}

async function speakVoiceResponse(message) {
  if (!message) return;

  if (window.electron?.speakNativeText) {
    try {
      await window.electron.stopNativeSpeech?.();
      const nativeResponse = await window.electron.speakNativeText({
        text: message,
        voiceName: getPreferredNativeVoiceName()
      });

      if (nativeResponse?.success) {
        return;
      }

      console.warn('Native speech failed, falling back to browser speech:', nativeResponse?.error || 'Unknown error');
    } catch (error) {
      console.warn('Native speech failed, falling back to browser speech:', error?.message || error);
    }
  }

  if (!window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Speech synthesis failed:', error?.message || error);
  }
}

function supportsVoiceInteraction() {
  if (voiceInteractionSupported !== null) return voiceInteractionSupported;
  voiceInteractionSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  return voiceInteractionSupported;
}

function normalizeVoiceCommand(command) {
  return String(command || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getVoiceMuscleMatch(command) {
  const map = {
    chest: ['chest'],
    shoulders: ['shoulder', 'shoulders'],
    back: ['back'],
    biceps: ['bicep', 'biceps'],
    triceps: ['tricep', 'triceps'],
    legs: ['leg', 'legs', 'quads', 'hamstrings'],
    abs: ['abs', 'abdominals'],
    core: ['core'],
    traps: ['traps', 'trap']
  };

  for (const [muscleKey, aliases] of Object.entries(map)) {
    if (aliases.some(alias => command.includes(alias))) {
      return muscleKey;
    }
  }
  return null;
}

function getVoiceStretchMatch(command) {
  const map = {
    back: ['back'],
    chest: ['chest'],
    'legs-glutes': ['legs', 'glutes', 'hamstring', 'quad'],
    'hips-pelvis': ['hip', 'hips', 'pelvis'],
    'neck-shoulders': ['neck', 'shoulder', 'shoulders'],
    'spine-core': ['spine', 'core'],
    'arms-wrists': ['arm', 'arms', 'wrist', 'wrists']
  };

  for (const [stretchKey, aliases] of Object.entries(map)) {
    if (aliases.some(alias => command.includes(alias))) {
      return stretchKey;
    }
  }
  return null;
}

function getVoiceCommandHelpText() {
  return 'Try commands like: open muscle groups, show stretches, build workout, nutrition, open calendar, daily challenge, analytics, personal records, interactive coach, start listening, stop listening, home, or log out.';
}

function executeVoiceCommand(rawCommand) {
  const command = normalizeVoiceCommand(rawCommand);
  if (!command) return { handled: false, response: 'I did not hear a command. Please try again.' };

  if (command.includes('help') || command.includes('commands')) {
    return { handled: true, response: getVoiceCommandHelpText() };
  }

  if (command.includes('log out') || command.includes('logout') || command.includes('sign out') || command.includes('start over')) {
    resetToStart();
    return { handled: true, response: 'Logging out now.' };
  }

  if (command.includes('home') || command.includes('main menu')) {
    showMainActionsScreen();
    return { handled: true, response: 'Returning to the main menu.' };
  }

  if (command.includes('calendar')) {
    showWorkoutCalendar();
    return { handled: true, response: 'Opening your workout calendar.' };
  }

  if (command.includes('challenge')) {
    showDailyChallengeScreen();
    return { handled: true, response: 'Opening daily challenge.' };
  }

  if (command.includes('analytics')) {
    renderAnalyticsScreen();
    return { handled: true, response: 'Opening analytics.' };
  }

  if (command.includes('personal record') || command.includes('pr')) {
    showScreen('personalRecordsScreen');
    renderPersonalRecordsScreen();
    return { handled: true, response: 'Opening personal records.' };
  }

  if (command.includes('interactive coach') || command.includes('coach')) {
    renderInteractiveCoachScreen({ resetInterview: true });
    return { handled: true, response: 'Opening interactive coach.' };
  }

  if (command.includes('start listening') || command.includes('microphone on')) {
    startVoiceInteractionListening();
    return { handled: true, response: 'Starting voice commands now.' };
  }

  if (command.includes('stop listening') || command.includes('microphone off')) {
    stopVoiceInteractionListening();
    return { handled: true, response: 'Stopping voice commands now.' };
  }

  if (command.includes('nutrition') || command.includes('meal')) {
    showScreen('nutritionBuilderScreen');
    initializeNutritionBuilder();
    if (typeof initializeFeaturedRecipes === 'function') {
      initializeFeaturedRecipes('featuredRecipesContainer');
    }
    return { handled: true, response: 'Opening training nutrition guide.' };
  }

  if (command.includes('full body')) {
    showScreen('fullBodyGeneratorScreen');
    initializeFullBodyGenerator();
    return { handled: true, response: 'Opening full body workout generator.' };
  }

  if (command.includes('build workout') || command.includes('build a workout') || command.includes('builder')) {
    showScreen('builderScreen');
    initializeBuilderTiles();
    return { handled: true, response: 'Opening workout builder.' };
  }

  if (command.includes('stretch')) {
    const stretchMatch = getVoiceStretchMatch(command);
    if (stretchMatch) {
      loadStretchesForBodyPart(stretchMatch);
      return { handled: true, response: 'Opening requested stretch category.' };
    }

    showStretchCategoriesDirect();
    return { handled: true, response: 'Opening stretch categories.' };
  }

  if (command.includes('muscle') || command.includes('exercise') || getVoiceMuscleMatch(command)) {
    const muscleMatch = getVoiceMuscleMatch(command);
    if (muscleMatch) {
      loadExercisesForMuscle(muscleMatch);
      return { handled: true, response: `Opening ${muscleMatch} exercises.` };
    }

    showMuscleGroupsDirect();
    return { handled: true, response: 'Opening muscle groups.' };
  }

  return {
    handled: false,
    response: `I heard "${command}", but I do not have an action for that yet. ${getVoiceCommandHelpText()}`
  };
}

function stopVoiceInteractionListening() {
  voiceInteractionAutoRestart = false;
  voiceInteractionListening = false;

  if (voiceRecognitionInstance) {
    try {
      voiceRecognitionInstance.stop();
    } catch (_error) {
      // Ignore errors from duplicate stop calls.
    }
  }

  window.electron?.stopNativeSpeech?.().catch?.(() => {});

  setVoiceInteractionStatus('Microphone stopped.', 'neutral');
}

function createVoiceRecognitionInstance() {
  const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!RecognitionCtor) return null;

  const recognition = new RecognitionCtor();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;

  recognition.onstart = () => {
    voiceInteractionListening = true;
    setVoiceInteractionStatus('Listening... Speak a command when ready.', 'success');
  };

  recognition.onresult = (event) => {
    const index = event.results.length - 1;
    const transcript = event.results[index]?.[0]?.transcript || '';
    setVoiceInteractionTranscript(transcript);

    const result = executeVoiceCommand(transcript);
    setVoiceInteractionStatus(result.response, result.handled ? 'success' : 'error');
    speakVoiceResponse(result.response);
  };

  recognition.onerror = (event) => {
    const code = event?.error || 'unknown';
    const message = code === 'not-allowed'
      ? 'Microphone permission was denied. Please allow microphone access and try again.'
      : `Voice recognition error: ${code}`;
    setVoiceInteractionStatus(message, 'error');
  };

  recognition.onend = () => {
    voiceInteractionListening = false;
    if (voiceInteractionAutoRestart && (currentScreenId === 'voiceInteractionScreen' || currentScreenId === 'facialRecognitionScreen')) {
      try {
        recognition.start();
      } catch (_error) {
        setVoiceInteractionStatus('Unable to restart listening automatically.', 'error');
      }
      return;
    }

    if (currentScreenId === 'voiceInteractionScreen' || currentScreenId === 'facialRecognitionScreen') {
      const idleMessage = currentScreenId === 'facialRecognitionScreen'
        ? 'Microphone is idle. Tap “Start Voice Commands” to continue.'
        : 'Microphone is idle. Tap “Start Listening” to continue.';
      setVoiceInteractionStatus(idleMessage, 'neutral');
    }
  };

  return recognition;
}

function startVoiceInteractionListening() {
  if (!supportsVoiceInteraction()) {
    setVoiceInteractionStatus('Speech recognition is not available in this runtime.', 'error');
    return;
  }

  if (!voiceRecognitionInstance) {
    voiceRecognitionInstance = createVoiceRecognitionInstance();
  }

  if (!voiceRecognitionInstance) {
    setVoiceInteractionStatus('Unable to initialize speech recognition.', 'error');
    return;
  }

  voiceInteractionAutoRestart = true;

  if (voiceInteractionListening) {
    setVoiceInteractionStatus('Already listening. Speak a command now.', 'success');
    return;
  }

  try {
    voiceRecognitionInstance.start();
  } catch (error) {
    setVoiceInteractionStatus(`Unable to start microphone: ${error?.message || 'Unknown error'}`, 'error');
  }
}

function initializeVoiceInteractionScreen() {
  const { startBtn, stopBtn, helpBtn } = getVoiceInteractionElements();

  setVoiceInteractionTranscript('—');
  setVoiceInteractionStatus('Microphone is off. Tap “Start Listening”.', 'neutral');

  if (startBtn && startBtn.dataset.bound !== '1') {
    startBtn.dataset.bound = '1';
    startBtn.addEventListener('click', startVoiceInteractionListening);
  }

  if (stopBtn && stopBtn.dataset.bound !== '1') {
    stopBtn.dataset.bound = '1';
    stopBtn.addEventListener('click', stopVoiceInteractionListening);
  }

  if (helpBtn && helpBtn.dataset.bound !== '1') {
    helpBtn.dataset.bound = '1';
    helpBtn.addEventListener('click', () => {
      const helpText = getVoiceCommandHelpText();
      setVoiceInteractionStatus(helpText, 'neutral');
      speakVoiceResponse(helpText);
    });
  }

  if (!supportsVoiceInteraction()) {
    setVoiceInteractionStatus('Speech recognition is not available in this runtime.', 'error');
  }
}

function getFaceAuthElements() {
  return {
    modal: document.getElementById('faceAuthModal'),
    title: document.getElementById('faceAuthTitle'),
    description: document.getElementById('faceAuthDescription'),
    video: document.getElementById('faceAuthVideo'),
    status: document.getElementById('faceAuthStatus'),
    startBtn: document.getElementById('startFaceAuthBtn'),
    stopBtn: document.getElementById('stopFaceAuthBtn'),
    cancelBtn: document.getElementById('cancelFaceAuthBtn'),
    closeBtn: document.getElementById('closeFaceAuthModal'),
    loginBtn: document.getElementById('userFaceLoginBtn'),
    userPinTitle: document.getElementById('userPinTitle')
  };
}

function setFaceAuthStatus(message, mode = 'neutral') {
  const { status } = getFaceAuthElements();
  if (!status) return;

  status.textContent = message;

  if (mode === 'success') {
    status.style.borderColor = 'rgba(16, 185, 129, 0.7)';
    status.style.color = '#d1fae5';
    return;
  }

  if (mode === 'error') {
    status.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    status.style.color = '#fecaca';
    return;
  }

  status.style.borderColor = 'rgba(255, 255, 255, 0.12)';
  status.style.color = 'var(--text-primary)';
}

function isUserFaceLoginEnabled(user) {
  return Boolean(user?.faceLoginEnabled && Array.isArray(user.faceSignature) && user.faceSignature.length > 0);
}

function updateUserPinModalLoginControls(user) {
  const { loginBtn, userPinTitle } = getFaceAuthElements();
  if (userPinTitle) {
    userPinTitle.textContent = 'Enter PIN';
  }

  if (loginBtn) {
    loginBtn.classList.add('hidden');
    loginBtn.disabled = true;
  }
}

async function ensureFaceDetectionBackend() {
  if (faceDetectionBackendReady) return faceDetectionBackend;
  if (faceDetectionBackendPromise) return faceDetectionBackendPromise;

  faceDetectionBackendPromise = (async () => {
    faceDetectionLastError = null;

    if (window.faceapi && window.tf) {
      try {
        try {
          await window.tf.setBackend('webgl');
        } catch (_error) {
          await window.tf.setBackend('cpu');
        }
        await window.tf.ready();

        const attemptedErrors = [];
        for (const modelPath of FACE_API_MODEL_PATH_CANDIDATES) {
          try {
            await Promise.all([
              window.faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
              window.faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
              window.faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
            ]);
            faceDetectionBackend = 'face-api';
            faceDetectionBackendReady = true;
            faceDetectionLastError = null;
            return faceDetectionBackend;
          } catch (modelError) {
            attemptedErrors.push(`${modelPath}: ${modelError?.message || modelError}`);
          }
        }

        faceDetectionLastError = attemptedErrors.join(' | ');
        console.warn('Face-api model load failed, trying native detector:', faceDetectionLastError);
      } catch (error) {
        faceDetectionLastError = error?.message || String(error);
        console.warn('Face-api initialization failed, trying native detector:', faceDetectionLastError);
      }
    }

    if (typeof FaceDetector === 'function') {
      faceDetectionBackend = 'native';
      faceDetectionBackendReady = true;
      return faceDetectionBackend;
    }

    faceDetectionBackend = 'unsupported';
    faceDetectionBackendReady = false;
    return faceDetectionBackend;
  })();

  try {
    return await faceDetectionBackendPromise;
  } finally {
    faceDetectionBackendPromise = null;
  }
}

async function detectFacesInVideo(video, { requireDescriptor = false } = {}) {
  const backend = await ensureFaceDetectionBackend();

  if (backend === 'face-api') {
    const detectorOptions = new window.faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.2
    });

    const detections = requireDescriptor
      ? await window.faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks().withFaceDescriptors()
      : await window.faceapi.detectAllFaces(video, detectorOptions);

    return detections.map(detection => ({
      boundingBox: detection.detection?.box || detection.box || null,
      descriptor: detection.descriptor ? Array.from(detection.descriptor) : null
    }));
  }

  if (backend === 'native') {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const detections = await detector.detect(video);
    return detections.map(detection => ({
      boundingBox: detection.boundingBox || detection.box || detection.detection?.box || null,
      descriptor: null
    }));
  }

  return [];
}

function createFaceDescriptorFromVideo(video, faceDetection) {
  if (!video || !faceDetection) return null;

  if (Array.isArray(faceDetection.descriptor) && faceDetection.descriptor.length > 0) {
    return faceDetection.descriptor;
  }

  const faceBox = faceDetection.boundingBox || faceDetection.box || faceDetection.detection?.box;
  if (!faceBox) return null;

  const canvas = document.createElement('canvas');
  canvas.width = FACE_AUTH_SIGNATURE_SIZE;
  canvas.height = FACE_AUTH_SIGNATURE_SIZE;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  const paddingX = Math.max(faceBox.width * 0.18, 10);
  const paddingY = Math.max(faceBox.height * 0.18, 10);

  const sourceX = Math.max(0, faceBox.x - paddingX);
  const sourceY = Math.max(0, faceBox.y - paddingY);
  const sourceWidth = Math.min(video.videoWidth - sourceX, faceBox.width + paddingX * 2);
  const sourceHeight = Math.min(video.videoHeight - sourceY, faceBox.height + paddingY * 2);

  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  try {
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const values = [];

    for (let index = 0; index < data.length; index += 4) {
      const gray = (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114);
      values.push(gray / 255);
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance) || 1;

    return values.map(value => (value - mean) / standardDeviation);
  } catch (error) {
    console.warn('Unable to build face descriptor:', error?.message || error);
    return null;
  }
}

function averageFaceDescriptors(descriptors) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) return null;

  const descriptorLength = descriptors[0]?.length || 0;
  if (!descriptorLength) return null;

  const averaged = new Array(descriptorLength).fill(0);
  for (const descriptor of descriptors) {
    if (!Array.isArray(descriptor) || descriptor.length !== descriptorLength) return null;
    for (let index = 0; index < descriptorLength; index += 1) {
      averaged[index] += descriptor[index];
    }
  }

  return averaged.map(value => value / descriptors.length);
}

function compareFaceDescriptors(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude) || 1;
  return dotProduct / denominator;
}

function getFaceAuthTargetUser() {
  if (!faceAuthTargetUsername) return null;
  return getUsers().find(user => user.username === faceAuthTargetUsername) || null;
}

function saveFaceLoginProfile(username, descriptor) {
  if (!username || !Array.isArray(descriptor) || descriptor.length === 0) return false;

  const users = getUsers();
  const user = users.find(entry => entry.username === username);
  if (!user) return false;

  user.faceLoginEnabled = true;
  user.faceSignature = descriptor;
  user.faceEnrolledAt = new Date().toISOString();
  saveUsers(users);
  return true;
}

function clearFaceLoginProfile(username) {
  if (!username) return false;

  const users = getUsers();
  const user = users.find(entry => entry.username === username);
  if (!user) return false;

  user.faceLoginEnabled = false;
  user.faceSignature = null;
  user.faceEnrolledAt = null;
  saveUsers(users);
  return true;
}

function stopFaceAuthSession({ hideModal = true, restorePinModal = false } = {}) {
  faceAuthRunning = false;
  faceAuthStableDetections = 0;
  faceAuthSamples = [];
  faceAuthLoginMatches = 0;
  faceAuthHasCompleted = false;

  if (faceAuthAnimationFrame) {
    cancelAnimationFrame(faceAuthAnimationFrame);
    faceAuthAnimationFrame = null;
  }

  const { video, modal } = getFaceAuthElements();

  if (faceAuthStream) {
    faceAuthStream.getTracks().forEach(track => track.stop());
    faceAuthStream = null;
  }

  if (video) {
    video.srcObject = null;
  }

  if (hideModal && modal) {
    modal.classList.add('hidden');
  }

  if (restorePinModal && pendingUser) {
    document.getElementById('userPinModal')?.classList.remove('hidden');
  }
}

async function completeFaceEnrollment() {
  if (faceAuthHasCompleted) return;
  faceAuthHasCompleted = true;

  const username = faceAuthTargetUsername;
  const descriptor = averageFaceDescriptors(faceAuthSamples);
  stopFaceAuthSession({ hideModal: true, restorePinModal: false });

  if (!username || !descriptor || !saveFaceLoginProfile(username, descriptor)) {
    setFaceAuthStatus('Unable to save the face profile. Please try again.', 'error');
    await showAlert('Face Enrollment Failed', 'We could not save this face profile.');
    return;
  }

  setFaceAuthStatus(`Face login is now enabled for ${username}.`, 'success');
  await showAlert('Face Login Enabled', `Face recognition has been saved for ${username}.`);

  if (faceAuthCompletionContext === 'admin') {
    showScreen('adminPanel');
    window.adminModule?.populateAdminUserList?.({
      getUsers,
      getSelectedAdminUser: () => selectedAdminUser
    });
  } else if (window.currentUser === username) {
    showMainActionsScreen();
  } else {
    showScreen('userScreen');
    showDisclaimerIfNeeded(true);
  }
}

async function completeFaceLogin(user, similarity) {
  if (faceAuthHasCompleted) return;
  faceAuthHasCompleted = true;

  stopFaceAuthSession({ hideModal: true, restorePinModal: false });

  window.currentUser = user.username;
  pendingUser = null;
  enteredUserPin = '';
  document.getUserTileClickBlocked = false;
  updateUserPinDisplay();

  hideAllScreens();
  showMainActionsScreen();

  setFaceAuthStatus(`Welcome, ${user.username}! Face matched.`, 'success');
  await showAlert('Face Login Successful', `Face recognition matched ${user.username} (${Math.round(similarity * 100)}% confidence).`);
}

async function runFaceAuthDetectionLoop() {
  if (!faceAuthRunning) return;

  const { video } = getFaceAuthElements();

  if (video && faceAuthDetector && video.readyState >= 2) {
    try {
      const faces = await detectFacesInVideo(video, { requireDescriptor: true });

      if (faces.length > 0) {
        faceAuthStableDetections = Math.min(faceAuthStableDetections + 1, 20);
      } else {
        faceAuthStableDetections = Math.max(faceAuthStableDetections - 1, 0);
      }

      if (faceAuthStableDetections >= getFaceDetectionStableFrameThreshold()) {
        const descriptor = createFaceDescriptorFromVideo(video, faces[0]);

        if (!descriptor) {
          setFaceAuthStatus('Unable to capture a face profile from the camera view.', 'error');
        } else if (faceAuthMode === 'enroll') {
          faceAuthSamples.push(descriptor);
          setFaceAuthStatus(`Captured face sample ${faceAuthSamples.length} of ${FACE_AUTH_ENROLLMENT_SAMPLES}. Hold still...`, 'neutral');

          if (faceAuthSamples.length >= FACE_AUTH_ENROLLMENT_SAMPLES) {
            await completeFaceEnrollment();
            return;
          }
        } else if (faceAuthMode === 'login') {
          const user = getFaceAuthTargetUser();
          if (!user?.faceSignature) {
            setFaceAuthStatus('This profile does not have a stored face login yet. Use PIN instead.', 'error');
          } else {
            const similarity = compareFaceDescriptors(user.faceSignature, descriptor);
            if (similarity >= FACE_AUTH_MATCH_THRESHOLD) {
              faceAuthLoginMatches += 1;
              setFaceAuthStatus(`Face matched. Confirming login... (${Math.round(similarity * 100)}%)`, 'success');

              if (faceAuthLoginMatches >= 2) {
                await completeFaceLogin(user, similarity);
                return;
              }
            } else {
              faceAuthLoginMatches = 0;
              setFaceAuthStatus('Face not recognized yet. Adjust your position or use PIN.', 'neutral');
            }
          }
        }
      } else {
        const waitingMessage = faceAuthMode === 'enroll'
          ? 'Hold your face steady to begin enrollment...'
          : 'Center your face in the frame to log in...';
        setFaceAuthStatus(waitingMessage, 'neutral');
      }
    } catch (error) {
      console.warn('Face auth detection error:', error?.message || error);
      setFaceAuthStatus('Face detection encountered an error. Try restarting the camera.', 'error');
    }
  }

  faceAuthAnimationFrame = requestAnimationFrame(runFaceAuthDetectionLoop);
}

async function startFaceAuthSession(mode, username, options = {}) {
  const { video, modal } = getFaceAuthElements();

  if (!video || !modal) return;

  stopAmbientFaceGreeting();

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    setFaceAuthStatus('Camera API is unavailable on this device.', 'error');
    return;
  }

  stopFaceAuthSession({ hideModal: false, restorePinModal: false });

  faceAuthMode = mode;
  faceAuthTargetUsername = username || null;
  faceAuthCompletionContext = options.completionContext || (mode === 'enroll' ? 'profile' : 'login');
  faceAuthStableDetections = 0;
  faceAuthSamples = [];
  faceAuthLoginMatches = 0;
  faceAuthHasCompleted = false;

  const user = username ? getUsers().find(entry => entry.username === username) : null;
  const title = document.getElementById('faceAuthTitle');
  const description = document.getElementById('faceAuthDescription');

  if (title) {
    title.textContent = mode === 'enroll' ? 'Enroll Face Login' : 'Face Login';
  }

  if (description) {
    description.textContent = mode === 'enroll'
      ? 'Look at the camera and hold still so we can save a face profile for this account.'
      : `Look at the camera to log in as ${username || 'this user'}.`;
  }

  modal.classList.remove('hidden');
  setFaceAuthStatus(mode === 'enroll'
    ? 'Starting camera for face enrollment...'
    : `Starting camera for ${username || 'face login'}...`, 'neutral');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    faceAuthStream = stream;
    video.srcObject = stream;
    await video.play();

    setFaceAuthStatus('Camera started. Loading face detection models...', 'neutral');
    const backend = await ensureFaceDetectionBackend();

    if (backend === 'unsupported') {
      faceAuthDetector = null;
      faceAuthRunning = false;
      const detail = faceDetectionLastError ? ` Details: ${faceDetectionLastError}` : '';
      setFaceAuthStatus(`Face detection models could not be loaded in this runtime.${detail}`, 'error');
      return;
    }

    faceAuthDetector = backend;
    faceAuthRunning = true;

    if (mode === 'login' && !isUserFaceLoginEnabled(user)) {
      setFaceAuthStatus('This profile does not have a saved face login yet. Use PIN instead.', 'error');
    } else {
      setFaceAuthStatus(mode === 'enroll'
        ? 'Camera started. Keep your face centered to capture samples.'
        : 'Camera started. Hold still so we can match your face.', 'neutral');
      runFaceAuthDetectionLoop();
    }
  } catch (error) {
    console.error('Unable to start face auth session:', error);
    setFaceAuthStatus(`Unable to access camera: ${error?.message || 'Unknown error'}`, 'error');
  }
}

const GUIDED_TITLE_MAP = {
  muscle: {
    chest: 'Chest',
    shoulders: 'Shoulders',
    back: 'Back',
    biceps: 'Biceps',
    triceps: 'Triceps',
    legs: 'Legs',
    abs: 'Abs',
    core: 'Core',
    traps: 'Traps'
  },
  stretch: {
    back: 'Back Mobility',
    chest: 'Chest Openers',
    'legs-glutes': 'Legs & Glutes',
    'hips-pelvis': 'Hips & Pelvis',
    'neck-shoulders': 'Neck & Shoulders',
    'spine-core': 'Spine & Core',
    'arms-wrists': 'Arms & Wrists'
  }
};

const GUIDED_GOAL_CONFIG = {
  strength: {
    label: 'Build Strength',
    type: 'muscle',
    description: 'Prioritizes large muscle groups with enough exercise depth to build a strong session.',
    options: ['legs', 'back', 'chest', 'shoulders']
  },
  'upper-body': {
    label: 'Upper Body',
    type: 'muscle',
    description: 'Keeps the session focused on pushing and pulling muscles above the waist.',
    options: ['chest', 'back', 'shoulders', 'triceps', 'biceps']
  },
  'lower-body': {
    label: 'Lower Body',
    type: 'muscle',
    description: 'Targets legs and stabilizers so the member can move straight into a lower-body session.',
    options: ['legs', 'core', 'back']
  },
  'posture-core': {
    label: 'Posture & Core',
    type: 'muscle',
    description: 'Favors muscles that support posture, trunk strength, and upper-back control.',
    options: ['core', 'back', 'traps', 'shoulders']
  },
  recovery: {
    label: 'Recovery & Mobility',
    type: 'stretch',
    description: 'Switches to guided mobility when the member wants to loosen up instead of lifting hard.',
    options: ['hips-pelvis', 'back', 'spine-core', 'neck-shoulders', 'legs-glutes']
  }
};

function getGuidedTimeLabel(minutes) {
  if (minutes <= 5) return '5-minute reset';
  if (minutes <= 10) return '10-minute focused block';
  return '20+ minute session';
}

function getGuidedDifficultyLabel(level) {
  if (!level) return 'All levels';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function formatGuidedTargetLabel(targetType, targetKey) {
  return GUIDED_TITLE_MAP[targetType]?.[targetKey] || targetKey;
}

function getGuidedCollection(targetType, targetKey) {
  if (targetType === 'stretch') {
    return window.LOCAL_EXERCISES?.stretchesByBodyPart?.[targetKey] || [];
  }

  return window.LOCAL_EXERCISES?.[targetKey] || [];
}

function filterGuidedCollectionByDifficulty(collection, difficulty) {
  if (!difficulty) return collection;
  return collection.filter(item => (item.difficulty || 'beginner') === difficulty);
}

function resetGuidedEntryState() {
  guidedGoal = null;
  guidedTime = null;
  guidedDifficulty = null;

  document.querySelectorAll('#guidedEntryScreen [data-guided-group]').forEach(tile => {
    tile.classList.remove('selected');
  });

  const panel = document.getElementById('guidedPromptPanel');
  const card = document.getElementById('guidedRecommendationCard');

  if (panel) {
    panel.classList.add('hidden');
  }

  if (card) {
    card.classList.add('hidden');
    card.innerHTML = '';
  }
}

function showMuscleGroupsDirect() {
  currentDifficultyFilterContext = 'muscle';
  currentDifficultyFilter = 'all';
  selectedStretchBodyPart = null;
  updateDifficultyFilterButtons();
  showScreen('muscleScreen');
}

function showStretchCategoriesDirect() {
  currentDifficultyFilterContext = 'stretch';
  currentDifficultyFilter = 'all';
  updateDifficultyFilterButtons();
  showScreen('stretchScreen');
}

function openGuidedEntryScreen() {
  resetGuidedEntryState();
  showScreen('guidedEntryScreen');
}

function chooseGuidedRecommendation(config, difficulty) {
  const scoredOptions = config.options.map(targetKey => {
    const fullList = getGuidedCollection(config.type, targetKey);
    const difficultyMatches = filterGuidedCollectionByDifficulty(fullList, difficulty);

    return {
      targetKey,
      totalCount: fullList.length,
      difficultyCount: difficultyMatches.length,
      previewList: difficultyMatches.length ? difficultyMatches : fullList
    };
  });

  scoredOptions.sort((left, right) => {
    const leftScore = left.difficultyCount || left.totalCount;
    const rightScore = right.difficultyCount || right.totalCount;
    return rightScore - leftScore;
  });

  return scoredOptions;
}

function openGuidedTarget(targetType, targetKey) {
  if (targetType === 'stretch') {
    loadStretchesForBodyPart(targetKey);
    return;
  }

  loadExercisesForMuscle(targetKey);
}

function renderGuidedRecommendation() {
  const card = document.getElementById('guidedRecommendationCard');
  if (!card) return;

  if (!guidedGoal || !guidedTime || !guidedDifficulty) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }

  const config = GUIDED_GOAL_CONFIG[guidedGoal];
  if (!config) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }

  const rankedOptions = chooseGuidedRecommendation(config, guidedDifficulty);
  const topChoice = rankedOptions[0];
  if (!topChoice) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }

  const previewItems = topChoice.previewList.slice(0, 3).map(item => item.name);
  const alternatives = rankedOptions.slice(1, 4);
  const browseLabel = config.type === 'stretch' ? 'Browse All Stretch Categories' : 'Browse All Muscle Groups';
  const openLabel = config.type === 'stretch' ? 'Open Recommended Stretches' : 'Open Recommended Exercises';
  const availabilityCount = topChoice.difficultyCount || topChoice.totalCount;
  const timeCopy = guidedTime <= 5
    ? 'This keeps the member in a tight, low-friction block.'
    : guidedTime <= 10
      ? 'This gives enough room for a focused circuit without overwhelming choices.'
      : 'This supports a fuller session with more exercise variety.';

  card.innerHTML = `
    <div class="guided-recommendation-kicker">${getGuidedTimeLabel(guidedTime)} • ${getGuidedDifficultyLabel(guidedDifficulty)}</div>
    <h3 class="guided-recommendation-title">Start with ${formatGuidedTargetLabel(config.type, topChoice.targetKey)}</h3>
    <p class="guided-recommendation-copy">${config.description} ${timeCopy}</p>
    <div class="guided-stat-row">
      <span class="guided-stat-pill">Goal: ${config.label}</span>
      <span class="guided-stat-pill">Matching options: ${availabilityCount}</span>
      <span class="guided-stat-pill">Type: ${config.type === 'stretch' ? 'Mobility / Stretching' : 'Strength / Exercise'}</span>
    </div>
    <div class="guided-recommendation-actions">
      <button id="guidedStartRecommendation" class="primary-btn" type="button">${openLabel}</button>
      <button id="guidedBrowseAllBtn" class="control-btn" type="button">${browseLabel}</button>
    </div>
    <div class="guided-section-label">Sample movements</div>
    <div class="guided-preview-list">
      ${previewItems.map(item => `<span class="guided-preview-pill">${item}</span>`).join('')}
    </div>
    ${alternatives.length ? `
      <div class="guided-section-label">Other good fits</div>
      <div class="guided-alt-row">
        ${alternatives.map(option => `<button class="guided-alt-btn" type="button" data-guided-target-type="${config.type}" data-guided-target-key="${option.targetKey}">${formatGuidedTargetLabel(config.type, option.targetKey)}</button>`).join('')}
      </div>
    ` : ''}
  `;

  card.classList.remove('hidden');

  document.getElementById('guidedStartRecommendation')?.addEventListener('click', () => {
    openGuidedTarget(config.type, topChoice.targetKey);
  });

  document.getElementById('guidedBrowseAllBtn')?.addEventListener('click', () => {
    if (config.type === 'stretch') {
      showStretchCategoriesDirect();
      return;
    }

    showMuscleGroupsDirect();
  });

  card.querySelectorAll('[data-guided-target-key]').forEach(button => {
    button.addEventListener('click', () => {
      openGuidedTarget(button.dataset.guidedTargetType, button.dataset.guidedTargetKey);
    });
  });
}

function updateGuidedSelection(group, value) {
  if (group === 'goal') guidedGoal = value;
  if (group === 'time') guidedTime = Number(value);
  if (group === 'difficulty') guidedDifficulty = value;

  document.querySelectorAll(`#guidedEntryScreen [data-guided-group="${group}"]`).forEach(tile => {
    tile.classList.toggle('selected', tile.dataset.value === value);
  });

  renderGuidedRecommendation();
}

function createDefaultCoachInterview() {
  return {
    workoutGoal: '',
    planHorizon: '',
    bodyFocus: '',
    timeAvailable: '',
    experienceLevel: '',
    recoveryState: '',
    nutritionGoal: '',
    sport: ''
  };
}

function resetCoachInterviewState() {
  currentCoachInterview = createDefaultCoachInterview();
  currentCoachPlanBundle = null;
}

function ensureCoachInterviewState() {
  if (!currentCoachInterview) {
    resetCoachInterviewState();
  }
}

function getCoachOptionLabel(group, value) {
  const labels = {
    workoutGoal: {
      strength: 'Strength',
      hypertrophy: 'Muscle Growth',
      fatloss: 'Fat Loss',
      balance: 'Balance & Coordination',
      flexibility: 'Flexibility & Mobility',
      functional: 'Functional Training'
    },
    planHorizon: {
      single: 'Single Session',
      weekly: 'Weekly Plan'
    },
    bodyFocus: {
      'full-body': 'Full Body',
      'upper-body': 'Upper Body',
      'lower-body': 'Lower Body',
      push: 'Push Focus',
      pull: 'Pull Focus',
      'mobility-reset': 'Mobility Reset'
    },
    timeAvailable: {
      30: '30 Minutes',
      45: '45 Minutes',
      60: '60 Minutes',
      90: '90 Minutes'
    },
    experienceLevel: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced'
    },
    recoveryState: {
      fresh: 'Fresh and ready',
      normal: 'Normal energy',
      sore: 'Sore / beat up'
    }
  };

  return labels[group]?.[value] || value || 'Not selected';
}

function getCoachPromptCount(interview) {
  return [
    interview.workoutGoal,
    interview.planHorizon,
    interview.bodyFocus,
    interview.timeAvailable,
    interview.experienceLevel,
    interview.recoveryState,
    interview.nutritionGoal
  ].filter(Boolean).length;
}

function getCoachFocusDefinition(interview) {
  const isMobility = interview.bodyFocus === 'mobility-reset' || interview.workoutGoal === 'flexibility';

  if (isMobility) {
    return {
      type: 'stretch',
      label: 'Mobility Reset',
      targets: ['hips-pelvis', 'back', 'spine-core', 'neck-shoulders']
    };
  }

  if (interview.bodyFocus === 'upper-body') {
    return {
      type: 'combined',
      label: 'Upper Body',
      targets: ['chest', 'back', 'shoulders', 'triceps', 'biceps']
    };
  }

  if (interview.bodyFocus === 'lower-body') {
    return {
      type: 'combined',
      label: 'Lower Body',
      targets: ['legs', 'core', 'back']
    };
  }

  if (interview.bodyFocus === 'push') {
    return {
      type: 'preset',
      label: 'Push Focus',
      targets: ['push']
    };
  }

  if (interview.bodyFocus === 'pull') {
    return {
      type: 'preset',
      label: 'Pull Focus',
      targets: ['pull']
    };
  }

  return {
    type: 'combined',
    label: 'Full Body',
    targets: ['legs', 'back', 'chest', 'shoulders', 'core']
  };
}

function collectCoachExercisePool(focusDefinition) {
  if (focusDefinition.type === 'stretch') {
    return focusDefinition.targets.flatMap(target => window.LOCAL_EXERCISES?.stretchesByBodyPart?.[target] || []);
  }

  if (focusDefinition.type === 'preset') {
    if (focusDefinition.targets[0] === 'push') {
      return [
        ...(window.LOCAL_EXERCISES?.chest || []),
        ...(window.LOCAL_EXERCISES?.shoulders || []),
        ...(window.LOCAL_EXERCISES?.triceps || [])
      ];
    }

    if (focusDefinition.targets[0] === 'pull') {
      return [
        ...(window.LOCAL_EXERCISES?.back || []),
        ...(window.LOCAL_EXERCISES?.biceps || [])
      ];
    }
  }

  return focusDefinition.targets.flatMap(target => window.LOCAL_EXERCISES?.[target] || []);
}

function getCoachAdjustedConfig(interview, options = {}) {
  const { weekly = false, stretch = false } = options;
  const baseGoal = stretch ? 'flexibility' : interview.workoutGoal;
  const config = { ...getWorkoutConfig(baseGoal, Number(interview.timeAvailable)) };

  if (interview.experienceLevel === 'beginner') {
    config.count = Math.max(3, config.count - 1);
    if (typeof config.sets === 'number') {
      config.sets = Math.max(2, config.sets - 1);
    }
  }

  if (interview.experienceLevel === 'advanced' && !stretch) {
    config.count += 1;
  }

  if (interview.recoveryState === 'sore') {
    config.count = Math.max(3, config.count - 1);
    if (typeof config.sets === 'number') {
      config.sets = Math.max(2, config.sets - 1);
    }
  }

  if (weekly) {
    config.count = Math.max(3, config.count - 1);
  }

  return config;
}

function createCoachExerciseList(pool, interview, options = {}) {
  const { countOverride = null } = options;
  const focusDefinition = getCoachFocusDefinition(interview);
  const isStretch = focusDefinition.type === 'stretch';
  const excluded = getExcludedExercisesSet();
  const uniquePool = [];
  const seen = new Set();

  pool.forEach(exercise => {
    if (!exercise?.name || seen.has(exercise.name)) return;
    seen.add(exercise.name);
    uniquePool.push(exercise);
  });

  const available = uniquePool.filter(exercise => !excluded.has(exercise.name));
  const source = available.length ? available : uniquePool;
  const config = getCoachAdjustedConfig(interview, { weekly: options.weekly, stretch: isStretch });
  const limit = countOverride || config.count;

  return source
    .map(exercise => ({ ...exercise, score: scoreExercise(exercise, isStretch ? 'flexibility' : interview.workoutGoal) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(exercise => ({
      name: exercise.name,
      sets: isStretch ? 3 : config.sets,
      reps: isStretch ? '30-60 seconds' : config.reps,
      primary: exercise.primary || [],
      secondary: exercise.secondary || [],
      howTo: exercise.howTo || [],
      image: exercise.image || ''
    }));
}

function generateCoachSingleWorkout(interview) {
  const focusDefinition = getCoachFocusDefinition(interview);
  const pool = collectCoachExercisePool(focusDefinition);
  const exercises = createCoachExerciseList(pool, interview);

  return {
    format: 'single',
    focusLabel: focusDefinition.label,
    isStretch: focusDefinition.type === 'stretch',
    exercises,
    summary: `Built as a ${getCoachOptionLabel('planHorizon', interview.planHorizon).toLowerCase()} with ${getCoachOptionLabel('experienceLevel', interview.experienceLevel).toLowerCase()} volume for a ${getCoachOptionLabel('recoveryState', interview.recoveryState).toLowerCase()} day.`
  };
}

function getCoachWeeklyTargets(interview) {
  if (interview.bodyFocus === 'mobility-reset' || interview.workoutGoal === 'flexibility') {
    return [
      { label: 'Hips & Pelvis', type: 'stretch', target: 'hips-pelvis' },
      { label: 'Back Recovery', type: 'stretch', target: 'back' },
      { label: 'Spine & Core Mobility', type: 'stretch', target: 'spine-core' },
      { label: 'Neck & Shoulders Reset', type: 'stretch', target: 'neck-shoulders' }
    ];
  }

  if (interview.bodyFocus === 'upper-body') {
    return [
      { label: 'Chest Strength', type: 'muscle', target: 'chest' },
      { label: 'Back Pull', type: 'muscle', target: 'back' },
      { label: 'Shoulders', type: 'muscle', target: 'shoulders' },
      { label: 'Arms Finisher', type: 'combined', targets: ['biceps', 'triceps'] }
    ];
  }

  if (interview.bodyFocus === 'lower-body') {
    return [
      { label: 'Leg Strength', type: 'muscle', target: 'legs' },
      { label: 'Core Stability', type: 'muscle', target: 'core' },
      { label: 'Posterior Chain', type: 'muscle', target: 'back' },
      { label: 'Lower Body Recovery', type: 'stretch', target: 'legs-glutes' }
    ];
  }

  if (interview.bodyFocus === 'push') {
    return [
      { label: 'Push Day A', type: 'preset', target: 'push' },
      { label: 'Pull Balance', type: 'preset', target: 'pull' },
      { label: 'Leg Support', type: 'muscle', target: 'legs' },
      { label: 'Push Day B', type: 'preset', target: 'push' }
    ];
  }

  if (interview.bodyFocus === 'pull') {
    return [
      { label: 'Pull Day A', type: 'preset', target: 'pull' },
      { label: 'Leg Support', type: 'muscle', target: 'legs' },
      { label: 'Core Support', type: 'muscle', target: 'core' },
      { label: 'Pull Day B', type: 'preset', target: 'pull' }
    ];
  }

  return [
    { label: 'Push Focus', type: 'preset', target: 'push' },
    { label: 'Leg Day', type: 'muscle', target: 'legs' },
    { label: 'Pull Focus', type: 'preset', target: 'pull' },
    { label: 'Core & Posture', type: 'combined', targets: ['core', 'back', 'traps'] }
  ];
}

function getCoachWeeklyDayCount(interview) {
  let dayCount = 4;

  if (interview.experienceLevel === 'beginner') {
    dayCount = 3;
  }

  if (interview.experienceLevel === 'advanced') {
    dayCount = 5;
  }

  if (interview.recoveryState === 'sore') {
    dayCount = Math.max(2, dayCount - 1);
  }

  return dayCount;
}

function collectCoachWeeklyPool(day) {
  if (day.type === 'stretch') {
    return window.LOCAL_EXERCISES?.stretchesByBodyPart?.[day.target] || [];
  }

  if (day.type === 'preset') {
    return collectCoachExercisePool({ type: 'preset', targets: [day.target] });
  }

  if (day.type === 'combined') {
    return day.targets.flatMap(target => window.LOCAL_EXERCISES?.[target] || []);
  }

  return window.LOCAL_EXERCISES?.[day.target] || [];
}

function generateCoachWeeklyWorkout(interview) {
  const templates = getCoachWeeklyTargets(interview);
  const dayCount = getCoachWeeklyDayCount(interview);
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const plan = {};

  templates.slice(0, dayCount).forEach((template, index) => {
    const pool = collectCoachWeeklyPool(template);
    const exercises = createCoachExerciseList(pool, interview, { weekly: true });
    plan[daysOfWeek[index]] = {
      title: template.label,
      exercises
    };
  });

  return {
    format: 'weekly',
    focusLabel: getCoachOptionLabel('bodyFocus', interview.bodyFocus),
    isStretch: interview.bodyFocus === 'mobility-reset' || interview.workoutGoal === 'flexibility',
    days: plan,
    summary: `Structured as ${dayCount} training days so the weekly load matches a ${getCoachOptionLabel('experienceLevel', interview.experienceLevel).toLowerCase()} member who feels ${getCoachOptionLabel('recoveryState', interview.recoveryState).toLowerCase()}.`
  };
}

function generateCoachPlanBundle(interview, username) {
  const workoutPlan = interview.planHorizon === 'weekly'
    ? generateCoachWeeklyWorkout(interview)
    : generateCoachSingleWorkout(interview);
  const nutritionPlan = interview.planHorizon === 'weekly'
    ? generateWeeklyNutritionPlan(interview.nutritionGoal)
    : generateSingleDayNutritionPlan(interview.nutritionGoal);
  const historyAvailable = Boolean(getMuscleGroupDistribution(username));

  return {
    workoutPlan,
    nutritionPlan,
    narrative: `Based on your answers, I matched a ${getCoachOptionLabel('workoutGoal', interview.workoutGoal).toLowerCase()} training plan with a ${getCoachOptionLabel('workoutGoal', interview.nutritionGoal).toLowerCase()} food plan, tuned for ${getCoachOptionLabel('timeAvailable', interview.timeAvailable).toLowerCase()} and a ${getCoachOptionLabel('experienceLevel', interview.experienceLevel).toLowerCase()} training level.${interview.sport ? ` I also kept ${interview.sport.replace('-', ' ')} in mind when shaping the plan.` : ''}`,
    notes: [
      interview.recoveryState === 'sore'
        ? 'Recovery note: keep 1-2 reps in reserve and move deliberately through the session.'
        : 'Recovery note: use challenging but controlled effort, and keep technique clean.',
      interview.experienceLevel === 'beginner'
        ? 'Execution note: start with the first 3-4 movements and focus on learning form before adding load.'
        : 'Execution note: use the full movement list and scale load to match the target rep range.',
      historyAvailable
        ? 'Personalization note: your recent training history is shown below so you can compare this plan with what you usually do.'
        : 'Personalization note: once you complete a few sessions, the coach will start adjusting plans based on your history.'
    ]
  };
}

function buildCoachShareExercises(workoutPlan) {
  if (!workoutPlan) return [];

  if (workoutPlan.format === 'weekly' && workoutPlan.days) {
    return Object.entries(workoutPlan.days).map(([day, info]) => ({
      day,
      dayExercises: Array.isArray(info?.exercises) ? info.exercises : []
    }));
  }

  return Array.isArray(workoutPlan.exercises) ? workoutPlan.exercises : [];
}

async function shareCoachPlanToPhone(bundle, interview) {
  if (!bundle?.workoutPlan) {
    throw new Error('No workout plan is available to share yet.');
  }

  if (typeof displayQRCodeModal !== 'function') {
    throw new Error('QR module is not available.');
  }

  const workoutId = generateUUID();
  const exercises = buildCoachShareExercises(bundle.workoutPlan);
  const coachPlanToShare = {
    id: workoutId,
    type: 'coach-plan',
    planFormat: bundle.workoutPlan.format,
    focusLabel: bundle.workoutPlan.focusLabel,
    narrative: bundle.narrative,
    notes: bundle.notes || [],
    coachInterview: {
      workoutGoal: interview?.workoutGoal || '',
      planHorizon: interview?.planHorizon || '',
      bodyFocus: interview?.bodyFocus || '',
      timeAvailable: interview?.timeAvailable || '',
      experienceLevel: interview?.experienceLevel || '',
      recoveryState: interview?.recoveryState || '',
      nutritionGoal: interview?.nutritionGoal || '',
      sport: interview?.sport || ''
    },
    exercises,
    nutritionPlan: bundle.nutritionPlan || null,
    created: new Date().toISOString(),
    user: window.currentUser
  };

  try {
    await saveWorkoutToServer(workoutId, coachPlanToShare);
  } catch (saveError) {
    console.warn('UI.JS: Coach workout save failed; still opening QR modal:', saveError?.message || saveError);
  }

  await displayQRCodeModal(workoutId, kioskIP);
}

async function shareCoachNutritionToPhone(bundle, interview) {
  if (!bundle?.nutritionPlan) {
    throw new Error('No nutrition plan is available to share yet.');
  }

  if (typeof displayMealPlanQRCodeModal !== 'function') {
    throw new Error('QR module is not available.');
  }

  const planId = generateUUID();
  const nutritionToShare = {
    id: planId,
    type: bundle.workoutPlan?.format === 'weekly' ? 'weekly' : 'single',
    goal: interview?.nutritionGoal || interview?.workoutGoal || 'strength',
    meals: bundle.nutritionPlan,
    created: new Date().toISOString(),
    user: window.currentUser
  };

  try {
    await saveNutritionToServer(planId, nutritionToShare);
  } catch (saveError) {
    console.warn('UI.JS: Coach nutrition save failed; still opening QR modal:', saveError?.message || saveError);
  }

  await displayMealPlanQRCodeModal(planId, kioskIP);
}

function buildCoachQuestionTile(group, value, label) {
  ensureCoachInterviewState();
  const isSelected = String(currentCoachInterview[group]) === String(value);
  return `<button class="builder-tile${isSelected ? ' selected' : ''}" type="button" data-coach-group="${group}" data-coach-value="${value}">${label}</button>`;
}

function renderCoachPlanHtml(bundle) {
  if (!bundle?.workoutPlan || !bundle?.nutritionPlan) {
    return '';
  }

  const workoutHtml = bundle.workoutPlan.format === 'weekly'
    ? Object.entries(bundle.workoutPlan.days).map(([day, info]) => `
        <div class="coach-day-block">
          <div class="coach-day-title">${day}: ${info.title}</div>
          <ul class="coach-list">
            ${info.exercises.map(exercise => `<li><strong>${exercise.name}</strong> — ${exercise.sets} sets × ${exercise.reps}</li>`).join('')}
          </ul>
        </div>
      `).join('')
    : `
      <ul class="coach-list">
        ${bundle.workoutPlan.exercises.map(exercise => `<li><strong>${exercise.name}</strong> — ${exercise.sets} sets × ${exercise.reps}</li>`).join('')}
      </ul>
    `;

  const nutritionIsWeekly = Boolean(bundle.nutritionPlan.Monday || bundle.nutritionPlan.Tuesday);
  const nutritionHtml = nutritionIsWeekly
    ? Object.entries(bundle.nutritionPlan).slice(0, 4).map(([day, meals]) => `
        <div class="coach-day-block">
          <div class="coach-day-title">${day}</div>
          <ul class="coach-list">
            <li><strong>Breakfast:</strong> ${meals.breakfast?.name || '—'}</li>
            <li><strong>Lunch:</strong> ${meals.lunch?.name || '—'}</li>
            <li><strong>Dinner:</strong> ${meals.dinner?.name || '—'}</li>
            <li><strong>Pre-workout:</strong> ${meals.preWorkout?.name || '—'}</li>
            <li><strong>Post-workout:</strong> ${meals.postWorkout?.name || '—'}</li>
          </ul>
        </div>
      `).join('')
    : `
      <ul class="coach-list">
        <li><strong>Breakfast:</strong> ${bundle.nutritionPlan.breakfast?.name || '—'}</li>
        <li><strong>Lunch:</strong> ${bundle.nutritionPlan.lunch?.name || '—'}</li>
        <li><strong>Dinner:</strong> ${bundle.nutritionPlan.dinner?.name || '—'}</li>
        <li><strong>Snacks:</strong> ${bundle.nutritionPlan.snacks?.name || '—'}</li>
        <li><strong>Pre-workout:</strong> ${bundle.nutritionPlan.preWorkout?.name || '—'}</li>
        <li><strong>Post-workout:</strong> ${bundle.nutritionPlan.postWorkout?.name || '—'}</li>
      </ul>
    `;

  return `
    <div class="coach-plan-card">
      <h4>Your Coach Summary</h4>
      <p class="coach-summary-copy">${bundle.narrative}</p>
      <div class="coach-plan-meta">
        <span class="coach-plan-pill">Workout: ${bundle.workoutPlan.focusLabel}</span>
        <span class="coach-plan-pill">Format: ${bundle.workoutPlan.format === 'weekly' ? 'Weekly structure' : 'Single session'}</span>
        <span class="coach-plan-pill">Nutrition goal: ${getCoachOptionLabel('workoutGoal', currentCoachInterview.nutritionGoal)}</span>
      </div>
      <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 0 0 18px;">
        <button id="coachSharePlanQrBtn" class="primary-btn" type="button">📱 Send Full Plan to Phone with QR Code</button>
        <button id="coachShareNutritionQrBtn" class="primary-btn" type="button">🥗 Send Nutrition to Phone with QR Code</button>
      </div>
      <ul class="coach-note-list">
        ${bundle.notes.map(note => `<li>${note}</li>`).join('')}
      </ul>
    </div>
    <div class="coach-plan-grid">
      <div class="coach-plan-card">
        <h4>Workout Plan</h4>
        <p class="coach-summary-copy" style="margin-bottom: 14px;">${bundle.workoutPlan.summary}</p>
        ${workoutHtml}
      </div>
      <div class="coach-plan-card">
        <h4>Nutrition Plan</h4>
        <p class="coach-summary-copy" style="margin-bottom: 14px;">Built to support your selected training goal with simple, gym-friendly meals.</p>
        ${nutritionHtml}
      </div>
    </div>
  `;
}

function renderCoachHistoryHtml(username) {
  const distribution = getMuscleGroupDistribution(username);
  const muscleRec = getMuscleGroupRecommendationWithReason(username);
  const timing = getOptimalWorkoutTime(username);
  const warnings = getImbalanceWarnings(username);

  if (!distribution) {
    return `
      <div class="coach-history-card">
        <h4>No training history yet</h4>
        <p class="coach-summary-copy">Answer the interview above and I will build your first workout and nutrition plan. As you log workouts, this section will start highlighting your trends and gaps.</p>
      </div>
    `;
  }

  const topDistribution = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([muscle, pct]) => `${muscle.charAt(0).toUpperCase() + muscle.slice(1)} ${pct}%`)
    .join(' • ');

  return `
    <div class="coach-history-card">
      <h4>Your Recent Pattern</h4>
      <p class="coach-summary-copy">Recent training distribution: <strong>${topDistribution}</strong></p>
      ${muscleRec ? `<p class="coach-summary-copy" style="margin-top: 10px;">Balance cue: ${muscleRec.reason}</p>` : ''}
      ${timing ? `<p class="coach-summary-copy" style="margin-top: 10px;">Best consistency window: <strong>${timing.displayTime}</strong>. ${timing.message}</p>` : ''}
      ${warnings.length ? `<ul class="coach-note-list" style="margin-top: 12px;">${warnings.slice(0, 2).map(warning => `<li>${warning.message}</li>`).join('')}</ul>` : ''}
    </div>
  `;
}

/* ===============================
   IDLE MODE
================================ */
let idleTimer = null;
const IDLE_TIMEOUT = 60000; // 60 seconds (adjust if needed)

function startIdleTimer() {
  // Do not show idle during PIN or admin
  if (
    !document.getElementById('userPinModal')?.classList.contains('hidden') ||
    !document.getElementById('adminPinModal')?.classList.contains('hidden')
  ) {
    return;
  }

  clearTimeout(idleTimer);
  idleTimer = setTimeout(showIdleVideo, IDLE_TIMEOUT);
}

function showIdleVideo() {
  const overlay = document.getElementById('idleOverlay');
  const video = document.getElementById('idleVideo');
  if (!overlay || !video) return;

  overlay.classList.remove('hidden');
  video.currentTime = 0;
  video.play().catch(() => {});
}

function hideIdleVideo() {
  const overlay = document.getElementById('idleOverlay');
  const video = document.getElementById('idleVideo');
  if (!overlay || !video) return;

  overlay.classList.add('hidden');
  video.pause();
}

/* ===============================
   CUSTOM CONFIRMATION DIALOG
================================ */
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalConfirm');
    const cancelBtn = document.getElementById('confirmModalCancel');

    if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
      // Fallback to native confirm if modal not found
      resolve(confirm(message));
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');

    // Remove old listeners by cloning buttons
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const cleanup = () => {
      modal.classList.add('hidden');
    };

    newConfirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    newCancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    });
  });
}

/* ===============================
   CUSTOM ALERT DIALOG
================================ */
function showAlert(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('alertModal');
    const titleEl = document.getElementById('alertModalTitle');
    const messageEl = document.getElementById('alertModalMessage');
    const okBtn = document.getElementById('alertModalOk');

    if (!modal || !titleEl || !messageEl || !okBtn) {
      // Fallback to native alert if modal not found
      alert(message);
      resolve();
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');

    // Remove old listeners by cloning button
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    const cleanup = () => {
      modal.classList.add('hidden');
    };

    newOkBtn.addEventListener('click', () => {
      cleanup();
      resolve();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup();
        resolve();
      }
    });
  });
}

function hasAcceptedDisclaimer() {
  return localStorage.getItem(DISCLAIMER_ACCEPTANCE_KEY) === 'true';
}

function isScreensaverAutoLogoutEnabled() {
  const stored = localStorage.getItem(SCREENSAVER_AUTO_LOGOUT_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

function setScreensaverAutoLogoutEnabled(enabled) {
  localStorage.setItem(SCREENSAVER_AUTO_LOGOUT_KEY, enabled ? 'true' : 'false');
}

function updateAdminAutoLogoutButtonLabel() {
  const btn = document.getElementById('adminToggleAutoLogout');
  const statusEl = document.getElementById('adminAutoLogoutStatus');
  const enabled = isScreensaverAutoLogoutEnabled();

  if (btn) {
    btn.textContent = enabled
      ? '🔒 Screensaver Auto-Logout: ON'
      : '🔓 Screensaver Auto-Logout: OFF';
  }

  if (statusEl) {
    statusEl.textContent = enabled ? 'Current status: ON' : 'Current status: OFF';
    statusEl.classList.toggle('is-on', enabled);
    statusEl.classList.toggle('is-off', !enabled);
  }
}

window.isScreensaverAutoLogoutEnabled = isScreensaverAutoLogoutEnabled;

function getConfiguredServerBaseUrl() {
  const configured =
    window.GYMKIOSK_SERVER_BASE_URL ||
    localStorage.getItem(SERVER_BASE_OVERRIDE_KEY) ||
    UI_DEFAULT_SERVER_BASE_URL;

  // Auto-migrate old production hostname to the new canonical domain.
  const normalizedConfigured = String(configured).replace(/\/+$/, '');
  if (normalizedConfigured === LEGACY_PUBLIC_SERVER_BASE_URL) {
    return UI_DEFAULT_SERVER_BASE_URL;
  }

  if (!isAllowedPublicServerBase(normalizedConfigured)) {
    return UI_DEFAULT_SERVER_BASE_URL;
  }

  return normalizedConfigured;
}

// QR mode is now always PUBLIC; admin toggle is disabled
function isPublicQrModeEnabled() { return true; }
function setPublicQrModeEnabled(enabled) { /* no-op */ }

function updateAdminQrModeButtonLabel() {
  const btn = document.getElementById('adminToggleQrMode');
  const statusEl = document.getElementById('adminQrModeStatus');
  if (btn) btn.textContent = '🌐 QR Mode: PUBLIC (locked)';
  if (statusEl) {
    statusEl.textContent = `Current QR mode: PUBLIC (${UI_DEFAULT_SERVER_BASE_URL})`;
    statusEl.classList.add('is-on');
    statusEl.classList.remove('is-off');
  }
}

function showDisclaimerIfNeeded(forceShow = false) {
  const modal = document.getElementById('disclaimerModal');
  if (!modal) return;

  if (!forceShow && hasAcceptedDisclaimer()) {
    modal.classList.add('hidden');
    return;
  }

  modal.classList.remove('hidden');
}

window.showDisclaimerIfNeeded = showDisclaimerIfNeeded;

const auditAdminAction = (...args) => {
  if (window.runtimeUtils?.auditAdminAction) {
    return window.runtimeUtils.auditAdminAction(...args);
  }
  return Promise.resolve();
};

const setupGlobalErrorHandlers = () => {
  if (window.runtimeUtils?.setupGlobalErrorHandlers) {
    window.runtimeUtils.setupGlobalErrorHandlers();
  }
};

function initializeDisclaimerFlow() {
  const acceptBtn = document.getElementById('acceptDisclaimerBtn');
  const modal = document.getElementById('disclaimerModal');
  if (!acceptBtn || !modal) return;

  const newAcceptBtn = acceptBtn.cloneNode(true);
  acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);

  newAcceptBtn.addEventListener('click', () => {
    localStorage.setItem(DISCLAIMER_ACCEPTANCE_KEY, 'true');
    modal.classList.add('hidden');
  });

  showDisclaimerIfNeeded();
}

/* ===============================
   GET KIOSK IP ADDRESS
================================ */
function getKioskIP() {
  // Try to get IP from window location or use localhost
  if (window.location.hostname && window.location.hostname !== '127.0.0.1') {
    kioskIP = window.location.hostname;
  }
}

function getServerBaseUrl() {
  return getConfiguredServerBaseUrl();
}

function getLocalServerBaseUrl() {
  const configuredLocal =
    localStorage.getItem('gymkiosk_local_server_base_url') ||
    UI_DEFAULT_LOCAL_SERVER_BASE_URL;

  return String(configuredLocal).replace(/\/+$/, '');
}

function isHtmlApiResponse(response) {
  const contentType = (response?.headers?.get('content-type') || '').toLowerCase();
  return contentType.includes('text/html');
}

function shouldFallbackToLocal(response, requestPath) {
  const normalizedPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
  if (!normalizedPath.startsWith('/api/')) return false;
  if (!response) return true;
  if (response.status >= 500 || response.status === 404) return true;
  if (response.ok && isHtmlApiResponse(response)) return true;
  return false;
}

async function fetchApiWithFallback(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const remoteBase = getServerBaseUrl();
  const localBase = getLocalServerBaseUrl();
  const primaryUrl = `${remoteBase}${normalizedPath}`;
  const localUrl = `${localBase}${normalizedPath}`;
  const canTryLocal = remoteBase !== localBase;

  let primaryError = null;

  try {
    const primaryResponse = await fetch(primaryUrl, options);
    if (!canTryLocal || !shouldFallbackToLocal(primaryResponse, normalizedPath)) {
      return primaryResponse;
    }

    console.warn('UI.JS: Primary API unavailable, falling back to local server:', primaryUrl, '->', localUrl);
  } catch (error) {
    primaryError = error;
    if (!canTryLocal) {
      throw error;
    }
    console.warn('UI.JS: Primary API request failed, trying local fallback:', error.message);
  }

  try {
    return await fetch(localUrl, options);
  } catch (localError) {
    if (primaryError) {
      throw primaryError;
    }
    throw localError;
  }
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getServerBaseUrl()}${normalizedPath}`;
}

/* ===============================
   UUID GENERATOR
================================ */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ===============================
   SAVE WORKOUT TO SERVER
================================ */
async function saveWorkoutToServer(workoutId, workoutData) {
  try {
    console.log('UI.JS: Saving workout to server - ID:', workoutId);
    console.log('UI.JS: Workout data exercises count:', workoutData.exercises?.length);
    
    // Save workout so it can be accessed via QR code from mobile
    // Send the full exercise objects with all properties
    const response = await fetchApiWithFallback('/api/workouts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutId,
        data: {
          exercises: workoutData.exercises, // Pass full exercise objects with howTo, primary, secondary, etc
          created: workoutData.created,
          user: workoutData.user,
          type: workoutData.type || 'workout',
          title: workoutData.title || '',
          muscle: workoutData.muscle || '',
          bodyPart: workoutData.bodyPart || ''
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UI.JS: Failed to save workout to server - Status:', response.status);
      console.error('UI.JS: Server response:', errorText);
      console.error('UI.JS: ⚠️  Is Express server running? Check: npm run server');
      return;
    }

    const result = await response.json();
    console.log('UI.JS: ✓ Workout saved to server successfully!');
    console.log('UI.JS: Shareability: Mobile users can access at /workout/' + workoutId);
  } catch (error) {
    console.error('UI.JS: Error saving workout to server:', error);
    console.error('UI.JS: ⚠️  Make sure Express server is running on port 3001');
    console.error('UI.JS: Run: npm run server');
    // Don't throw - QR code generation will still work, just warning that sync might not work
  }
}

/* ===============================
   WEIGHT/REPS & PR TRACKING
================================ */

/**
 * Estimate one-rep max using Epley formula: 1RM = Weight × (1 + (Reps/30))
 */
function estimateOneRepMax(weight, reps) {
  if (!weight || !reps || reps <= 0) return weight;
  return Math.round(weight * (1 + (reps / 30)));
}

/**
 * Get user's personal record for an exercise
 */
function getPersonalRecord(username, exerciseName) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user || !user.personalRecords) return null;
  return user.personalRecords[exerciseName] || null;
}

/**
 * Get previous attempt(s) for an exercise
 */
function getPreviousAttempt(username, exerciseName) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user || !user.exerciseHistory) return null;
  
  const history = user.exerciseHistory[exerciseName];
  if (!history || history.length === 0) return null;
  
  // Return the most recent attempt
  return history[history.length - 1];
}

/**
 * Check if this is a new PR set
 */
function isPRSet(username, exerciseName, sets) {
  if (!sets || sets.length === 0) return false;
  
  const currentPR = getPersonalRecord(username, exerciseName);
  if (!currentPR) return true; // First time doing this exercise
  
  // Check if any set exceeds the current PR
  return sets.some(set => {
    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps) || 0;
    
    // Beat PR if: higher weight at same reps, or same weight with more reps
    if (weight > currentPR.weight) return true;
    if (weight === currentPR.weight && reps > currentPR.reps) return true;
    
    return false;
  });
}

/**
 * Update personal records after completing an exercise
 */
function updatePersonalRecords(username, exerciseName, sets) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user) return;
  
  // Initialize if needed
  if (!user.personalRecords) user.personalRecords = {};
  if (!user.exerciseHistory) user.exerciseHistory = {};
  
  // Find the best set
  let bestSet = { weight: 0, reps: 0 };
  sets.forEach(set => {
    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps) || 0;
    
    // Compare using 1RM estimate
    const currentOneRM = estimateOneRepMax(bestSet.weight, bestSet.reps);
    const setOneRM = estimateOneRepMax(weight, reps);
    
    if (setOneRM > currentOneRM) {
      bestSet = { weight, reps };
    }
  });
  
  if (bestSet.weight > 0 && bestSet.reps > 0) {
    const currentPR = user.personalRecords[exerciseName];
    const currentOneRM = currentPR ? estimateOneRepMax(currentPR.weight, currentPR.reps) : 0;
    const newOneRM = estimateOneRepMax(bestSet.weight, bestSet.reps);
    
    // Update PR if this is a new record
    if (newOneRM > currentOneRM) {
      user.personalRecords[exerciseName] = {
        weight: bestSet.weight,
        reps: bestSet.reps,
        estimatedMax: estimateOneRepMax(bestSet.weight, bestSet.reps),
        date: new Date().toISOString().split('T')[0]
      };
    }
  }
  
  // Record in exercise history
  if (!user.exerciseHistory[exerciseName]) {
    user.exerciseHistory[exerciseName] = [];
  }
  
  user.exerciseHistory[exerciseName].push({
    sets: sets,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  saveUsers(users);
  return isPRSet(username, exerciseName, sets);
}

/**
 * Show PR celebration modal
 */
function showPRCelebration(exerciseName) {
  const modal = document.createElement('div');
  modal.id = 'prCelebrationModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    animation: prPulse 0.6s ease-out;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  `;
  
  content.innerHTML = `
    <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
    <div style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 10px;">NEW PERSONAL RECORD!</div>
    <div style="font-size: 22px; color: rgba(255, 255, 255, 0.95); margin-bottom: 20px;">${exerciseName}</div>
    <div style="font-size: 16px; color: rgba(255, 255, 255, 0.85);">You've set a new personal record!</div>
    <div style="margin-top: 30px; font-size: 14px; color: rgba(255, 255, 255, 0.75);">Great effort! Keep crushing it! 💪</div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Add animation styles
  if (!document.getElementById('prAnimationStyles')) {
    const style = document.createElement('style');
    style.id = 'prAnimationStyles';
    style.textContent = `
      @keyframes prPulse {
        0% {
          transform: scale(0.5);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Remove after 3 seconds
  setTimeout(() => {
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.5s';
    setTimeout(() => modal.remove(), 500);
  }, 3000);
}

/**
 * Render the Personal Records dashboard screen
 */
function renderPersonalRecordsScreen() {
  const screen = document.getElementById('personalRecordsScreen');
  const container = document.getElementById('prContainer');
  if (!screen || !container) return;

  container.innerHTML = '';

  const users = getUsers();
  const user = users.find(u => u.username === window.currentUser);

  if (!user || !user.personalRecords || Object.keys(user.personalRecords).length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 20px;">📊</div>
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">No Personal Records Yet</div>
        <div style="color: #888; margin-bottom: 20px;">Log weights while completing exercises to track your progress!</div>
        <button class="primary-btn" onclick="showMuscleGroupsDirect()">Start Workout</button>
      </div>
    `;
  } else {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 20px;
      text-align: center;
    `;
    header.innerHTML = `
      <div style="font-size: 24px; font-weight: bold;">🏆 My Personal Records</div>
      <div style="margin-top: 8px; opacity: 0.9;">Your strongest lifts tracked</div>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    `;

    Object.entries(user.personalRecords).forEach(([exerciseName, pr]) => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #f5f5f5;
        border: 2px solid #10b981;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      `;

      card.innerHTML = `
        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 12px;">${exerciseName}</div>
        <div style="font-size: 14px; color: #666; margin-bottom: 4px;">
          <strong>${pr.weight} lbs</strong> × ${pr.reps} rep${pr.reps > 1 ? 's' : ''}
        </div>
        <div style="font-size: 12px; color: #999; margin-bottom: 12px;">
          Estimated 1RM: <strong>${pr.estimatedMax} lbs</strong>
        </div>
        <div style="font-size: 11px; color: #999;">
          Set on ${new Date(pr.date).toLocaleDateString()}
        </div>
      `;

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  const backBtn = document.getElementById('backFromPRs');
  if (backBtn && !backBtn.dataset.listenerBound) {
    backBtn.dataset.listenerBound = 'true';
    backBtn.addEventListener('click', () => {
      showScreen('mainActionsScreen');
    });
  }

  showScreen('personalRecordsScreen');
}

/* ===============================
   WORKOUT BUILDER LOGIC
================================ */

/* ===============================
   WORKOUT BUILDER – SCORING ENGINE
================================ */

function scoreExercise(ex, goal) {
  // Tunable weights
  const WEIGHTS = {
    compoundStrength: 5,
    difficultyBonus: 3,
    compoundHypertrophy: 3,
    isolationHypertrophy: 2,
    baseFatloss: 2,
    compoundFatloss: 2,
    equipmentBarbell: 3,
    equipmentDumbbell: 2,
    equipmentBodyweight: 1,
    tempoExplosive: 2,
    tempoSlow: 1,
    tempoFast: 1,
    balanceBonus: 4,
    flexibilityBonus: 3,
    functionalBonus: 4
  };

  let score = 0;
  const type = (ex.type || 'isolation').toLowerCase();
  const difficulty = (ex.difficulty || 'beginner').toLowerCase();
  const equipment = (ex.equipment || 'bodyweight').toLowerCase();
  const tempo = (ex.tempo || 'normal').toLowerCase();

  // Goal-based scoring
  if (goal === 'strength') {
    if (type === 'compound') score += WEIGHTS.compoundStrength;
    if (difficulty === 'intermediate' || difficulty === 'advanced') score += WEIGHTS.difficultyBonus;
    if (tempo === 'explosive') score += WEIGHTS.tempoExplosive;
  }

  if (goal === 'hypertrophy') {
    if (type === 'compound') score += WEIGHTS.compoundHypertrophy;
    if (type === 'isolation') score += WEIGHTS.isolationHypertrophy;
    if (tempo === 'slow') score += WEIGHTS.tempoSlow;
  }

  if (goal === 'fatloss') {
    score += WEIGHTS.baseFatloss;
    if (type === 'compound') score += WEIGHTS.compoundFatloss;
    if (tempo === 'fast') score += WEIGHTS.tempoFast;
  }

  if (goal === 'balance') {
    // Favor exercises with balance components
    if (ex.name.toLowerCase().includes('single') || ex.name.toLowerCase().includes('bosu') || 
        ex.name.toLowerCase().includes('stability')) {
      score += WEIGHTS.balanceBonus;
    }
    if (type === 'compound') score += WEIGHTS.compoundHypertrophy;
  }

  if (goal === 'flexibility') {
    // Favor stretching and mobility exercises
    if (ex.secondary && ex.secondary.some(s => s.toLowerCase().includes('mobility') || s.toLowerCase().includes('flexibility'))) {
      score += WEIGHTS.flexibilityBonus;
    }
    score += WEIGHTS.baseFatloss;
  }

  if (goal === 'functional') {
    // Favor compound movements and real-world patterns
    if (type === 'compound') score += WEIGHTS.functionalBonus;
    if (ex.name.toLowerCase().includes('functional') || ex.name.toLowerCase().includes('carry') ||
        ex.name.toLowerCase().includes('crawl')) {
      score += WEIGHTS.functionalBonus;
    }
  }

  // Equipment preference (small boost for free-weight compound options)
  if (equipment === 'barbell') score += WEIGHTS.equipmentBarbell;
  else if (equipment === 'dumbbell') score += WEIGHTS.equipmentDumbbell;
  else if (equipment === 'bodyweight') score += WEIGHTS.equipmentBodyweight;

  return score;
}

function getWorkoutConfig(goal, time) {
  if (goal === 'strength') {
    if (time <= 30) return { sets: 4, reps: '4–6', count: 4 };
    if (time <= 45) return { sets: 5, reps: '3–5', count: 5 };
    if (time <= 60) return { sets: 5, reps: '3–5', count: 6 };
    if (time <= 90) return { sets: 5, reps: '3–5', count: 8 };
    return { sets: 5, reps: '3–5', count: 10 };
  }

  if (goal === 'hypertrophy') {
    if (time <= 30) return { sets: 3, reps: '8–12', count: 4 };
    if (time <= 45) return { sets: 4, reps: '8–15', count: 5 };
    if (time <= 60) return { sets: 4, reps: '8–15', count: 6 };
    if (time <= 90) return { sets: 4, reps: '8–15', count: 8 };
    return { sets: 4, reps: '8–15', count: 10 };
  }

  if (goal === 'fatloss') {
    if (time <= 30) return { sets: 3, reps: '12–20', count: 5 };
    if (time <= 45) return { sets: 4, reps: '12–20', count: 6 };
    if (time <= 60) return { sets: 4, reps: '12–20', count: 7 };
    if (time <= 90) return { sets: 4, reps: '12–20', count: 9 };
    return { sets: 4, reps: '12–20', count: 12 };
  }

  if (goal === 'balance') {
    if (time <= 30) return { sets: 3, reps: '10–15', count: 4 };
    if (time <= 45) return { sets: 3, reps: '10–15', count: 5 };
    if (time <= 60) return { sets: 3, reps: '10–15', count: 6 };
    if (time <= 90) return { sets: 3, reps: '10–15', count: 8 };
    return { sets: 3, reps: '10–15', count: 10 };
  }

  if (goal === 'flexibility') {
    if (time <= 30) return { sets: 3, reps: '30s hold', count: 5 };
    if (time <= 45) return { sets: 3, reps: '30s hold', count: 6 };
    if (time <= 60) return { sets: 3, reps: '30s hold', count: 7 };
    if (time <= 90) return { sets: 3, reps: '45s hold', count: 9 };
    return { sets: 3, reps: '45s hold', count: 12 };
  }

  if (goal === 'functional') {
    if (time <= 30) return { sets: 3, reps: '8–12', count: 4 };
    if (time <= 45) return { sets: 3, reps: '8–12', count: 5 };
    if (time <= 60) return { sets: 3, reps: '8–12', count: 6 };
    if (time <= 90) return { sets: 3, reps: '8–12', count: 8 };
    return { sets: 3, reps: '8–12', count: 10 };
  }

  // Default fallback
  return { sets: 3, reps: '8–12', count: 5 };
}

function generateWorkoutPlan({ muscle, goal, time, isStretch = false }) {
  if (!muscle || !goal || !time) return null;

  let exercises;
  if (isStretch) {
    // Get exercises from stretches by body part
    exercises = window.LOCAL_EXERCISES?.stretchesByBodyPart?.[muscle];
  } else if (muscle === 'push') {
    // Combine chest, shoulders, and triceps for push workout
    const chest = window.LOCAL_EXERCISES?.chest || [];
    const shoulders = window.LOCAL_EXERCISES?.shoulders || [];
    const triceps = window.LOCAL_EXERCISES?.triceps || [];
    exercises = [...chest, ...shoulders, ...triceps];
  } else if (muscle === 'pull') {
    // Combine back and biceps for pull workout
    const back = window.LOCAL_EXERCISES?.back || [];
    const biceps = window.LOCAL_EXERCISES?.biceps || [];
    exercises = [...back, ...biceps];
  } else {
    // Get exercises from regular muscle groups
    exercises = window.LOCAL_EXERCISES?.[muscle];
  }

  if (!exercises || !exercises.length) return null;

  const excluded = getExcludedExercisesSet();
  const available = exercises.filter(ex => !excluded.has(ex.name));
  const pool = available.length ? available : exercises;

  const config = getWorkoutConfig(goal, time);

  const scored = pool.map(ex => ({
    ...ex,
    score: scoreExercise(ex, goal)
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, config.count).map(ex => ({
    name: ex.name,
    sets: isStretch ? 3 : config.sets,
    reps: isStretch ? '30-60 seconds' : config.reps,
    howTo: ex.howTo || [],
    primary: ex.primary || [],
    secondary: ex.secondary || [],
    description: ex.description || '',
    image: ex.image || ''
  }));
}

function generateWeeklyPlan({ goal, time, isStretch = false }) {
  if (!goal || !time) return null;

  let muscleGroups;
  if (isStretch) {
    // Get all stretch categories
    const stretchCategories = window.LOCAL_EXERCISES?.stretchesByBodyPart || {};
    muscleGroups = Object.keys(stretchCategories).filter(
      key => Array.isArray(stretchCategories[key])
    );
  } else {
    // Get all muscle groups
    muscleGroups = Object.keys(window.LOCAL_EXERCISES || {}).filter(
      key => key !== 'stretchesByBodyPart' && typeof window.LOCAL_EXERCISES[key] === 'object' && Array.isArray(window.LOCAL_EXERCISES[key])
    );
  }

  if (muscleGroups.length === 0) return null;

  let selectedMuscles;
  if (isStretch) {
    // For stretches, use all available categories
    selectedMuscles = muscleGroups.slice(0, 7); // Max 7 days
  } else {
    // Select muscles for the week - can use push/pull split
    const primaryMuscles = ['push', 'pull', 'legs', 'shoulders', 'chest', 'back'];
    selectedMuscles = primaryMuscles.filter(m => {
      // Push and pull are always available
      if (m === 'push' || m === 'pull') return true;
      return muscleGroups.includes(m);
    }).slice(0, 6);
    
    // If we don't have enough, add more from available muscles
    if (selectedMuscles.length < 5) {
      const remaining = muscleGroups.filter(m => !selectedMuscles.includes(m));
      selectedMuscles = [...selectedMuscles, ...remaining.slice(0, 5 - selectedMuscles.length)];
    }
  }

  const weeklyPlan = {};
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Create a workout for each day, rotating through muscle groups or stretch categories
  selectedMuscles.forEach((muscle, index) => {
    const day = daysOfWeek[index];
    let exercises;
    
    if (isStretch) {
      exercises = window.LOCAL_EXERCISES?.stretchesByBodyPart?.[muscle];
    } else if (muscle === 'push') {
      // Combine chest, shoulders, triceps for push day
      const chest = window.LOCAL_EXERCISES?.chest || [];
      const shoulders = window.LOCAL_EXERCISES?.shoulders || [];
      const triceps = window.LOCAL_EXERCISES?.triceps || [];
      exercises = [...chest, ...shoulders, ...triceps];
    } else if (muscle === 'pull') {
      // Combine back and biceps for pull day
      const back = window.LOCAL_EXERCISES?.back || [];
      const biceps = window.LOCAL_EXERCISES?.biceps || [];
      exercises = [...back, ...biceps];
    } else {
      exercises = window.LOCAL_EXERCISES?.[muscle];
    }
    
    if (!exercises || !exercises.length) return;

    const excluded = getExcludedExercisesSet();
    const available = exercises.filter(ex => !excluded.has(ex.name));
    const pool = available.length ? available : exercises;

    const config = getWorkoutConfig(goal, time);
    
    const scored = pool.map(ex => ({
      ...ex,
      score: scoreExercise(ex, goal)
    }));

    scored.sort((a, b) => b.score - a.score);

    weeklyPlan[day] = {
      muscle: muscle,
      exercises: scored.slice(0, config.count).map(ex => ({
        name: ex.name,
        sets: isStretch ? 3 : config.sets,
        reps: isStretch ? '30-60 seconds' : config.reps,
        howTo: ex.howTo || [],
        primary: ex.primary || [],
        secondary: ex.secondary || [],
        description: ex.description || '',
        image: ex.image || ''
      }))
    };
  });

  return weeklyPlan;
}

function renderWorkoutBuilderResult(plan) {
  const container = document.getElementById('builderResult');
  if (!container) return;

  container.innerHTML = '';

  if (!plan) {
    container.innerHTML = '<p>Please select all options.</p>';
    return;
  }

  window.currentBuilderPlan = plan;

  // Check if it's a weekly plan (object with days) or single workout (array)
  const isWeeklyPlan = plan && typeof plan === 'object' && !Array.isArray(plan);

  if (isWeeklyPlan) {
    // Render weekly plan
    renderWeeklyPlanResult(plan, container);
  } else {
    // Render single workout
    renderSingleWorkoutResult(plan, container);
  }
}

function getSupplementSuggestionsForPlan(exercises) {
  const exerciseCount = exercises.length;
  const includesLowerBody = exercises.some(ex => (ex.primary || []).some(m => ['Legs', 'Glutes'].includes(m)));
  const includesCore = exercises.some(ex => (ex.primary || []).some(m => ['Abs', 'Core'].includes(m)));

  // Difficulty is not defined for builder plans, so infer based on volume
  const difficultyLevel = exerciseCount >= 8 ? 'intermediate' : 'beginner';

  return getSupplementSuggestions({
    difficultyLevel,
    exerciseCount,
    includesLowerBody,
    includesCore
  });
}

function renderSingleWorkoutResult(plan, container) {
  // Add buttons at the top
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;';
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'primary-btn';
  saveBtn.style.flex = '1';
  saveBtn.textContent = '💾 Save to Calendar';
  saveBtn.onclick = () => {
    saveWorkoutToCalendarDate(new Date(), {
      exercises: plan,
      created: new Date().toISOString(),
      user: window.currentUser,
      type: 'builder'
    });
    showAlert('Success', 'Workout saved to calendar!');
  };
  buttonContainer.appendChild(saveBtn);
  
  const shareBtn = document.createElement('button');
  shareBtn.className = 'primary-btn';
  shareBtn.style.flex = '1';
  shareBtn.textContent = '📱 Send to Phone with QR Code';
  shareBtn.onclick = () => shareBuilderWorkout(plan);
  buttonContainer.appendChild(shareBtn);
  
  container.appendChild(buttonContainer);

  plan.forEach((ex, idx) => {
    const card = document.createElement('div');
    card.className = 'workout-card';
    
    // Build the howTo section if available
    let howToHtml = '';
    if (ex.howTo && Array.isArray(ex.howTo) && ex.howTo.length > 0) {
      howToHtml = '<div class="exercise-howto" style="margin-top: 12px; font-size: 0.9rem;"><strong>How to perform:</strong><ol style="margin: 8px 0; padding-left: 20px;">';
      ex.howTo.forEach(step => {
        howToHtml += `<li style="margin-bottom: 4px;">${step}</li>`;
      });
      howToHtml += '</ol></div>';
    }
    
    card.innerHTML = `
      <strong>${ex.name}</strong><br>
      ${ex.sets} sets × ${ex.reps}
      ${howToHtml}
    `;

    const swapBtn = document.createElement('button');
    swapBtn.className = 'primary-btn';
    swapBtn.style.cssText = 'margin-top: 10px; padding: 8px 12px; font-size: 14px; background: rgba(var(--color-gold-rgb), 0.15); border: 1px solid var(--color-gold); color: var(--color-gold);';
    swapBtn.textContent = '🔄 Swap Exercise';
    swapBtn.onclick = () => {
      const options = getBuilderSwapExerciseOptions({
        workoutType: selectedWorkoutType,
        focus: selectedMuscle
      });
      openSwapModal({
        title: 'Swap Exercise',
        currentName: ex.name,
        options,
        onConfirm: selected => {
          const updated = {
            name: selected.name,
            sets: ex.sets,
            reps: ex.reps,
            howTo: selected.howTo || [],
            primary: selected.primary || [],
            secondary: selected.secondary || [],
            description: selected.description || ''
          };
          const activePlan = Array.isArray(window.currentBuilderPlan) ? window.currentBuilderPlan : plan;
          if (activePlan && activePlan[idx]) {
            activePlan[idx] = updated;
            window.currentBuilderPlan = activePlan;
            renderWorkoutBuilderResult(activePlan);
            maybeExcludeFromFuture('exercise', ex.name);
          }
        }
      });
    };

    card.appendChild(swapBtn);
    container.appendChild(card);
  });

  // Suggested supplements panel
  const supplementList = getSupplementSuggestionsForPlan(plan);
  const suppDiv = document.createElement('div');
  suppDiv.style.cssText = 'margin-top: 20px; padding: 16px; background: #10151f; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px;';
  suppDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 10px; color: #f5f7fa;">💊 Suggested Supplements</div>
    <ul style="margin: 0; padding-left: 20px; color: #c4cfe0;">
      ${supplementList.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
    </ul>
    <div style="margin-top: 8px; font-size: 12px; color: #8b95a8;">General guidance only. Consult a professional if needed.</div>
  `;
  container.appendChild(suppDiv);

  // Recovery tips panel
  const recoveryTips = getRecoveryTips({
    exerciseCount: plan.length,
    includesLowerBody: plan.some(ex => (ex.primary || []).some(m => ['Legs', 'Glutes'].includes(m))),
    includesCore: plan.some(ex => (ex.primary || []).some(m => ['Abs', 'Core'].includes(m)))
  });
  const recoveryDiv = document.createElement('div');
  recoveryDiv.style.cssText = 'margin-top: 16px; padding: 16px; background: #0f141c; border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px;';
  recoveryDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 10px; color: #f5f7fa;">🛌 Proper Recovery</div>
    <ul style="margin: 0; padding-left: 20px; color: #c4cfe0;">
      ${recoveryTips.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
    </ul>
  `;
  container.appendChild(recoveryDiv);
}

function renderWeeklyPlanResult(weeklyPlan, container) {
  // Add buttons at the top
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;';
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'primary-btn';
  saveBtn.style.flex = '1';
  saveBtn.textContent = '💾 Save to Calendar';
  saveBtn.onclick = () => {
    // Save workout for each day of the week
    const today = new Date();
    const daysOfWeek = Object.keys(weeklyPlan);
    let currentDate = new Date(today);
    
    daysOfWeek.forEach(day => {
      if (weeklyPlan[day]) {
        saveWorkoutToCalendarDate(currentDate, {
          exercises: weeklyPlan[day].exercises,
          focusMuscle: weeklyPlan[day].muscle,
          created: new Date().toISOString(),
          user: window.currentUser,
          type: 'weekly',
          dayOfWeek: day
        });
      }
      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    });
    showAlert('Success', 'Weekly workout plan saved to calendar!');
  };
  buttonContainer.appendChild(saveBtn);
  
  const shareBtn = document.createElement('button');
  shareBtn.className = 'primary-btn';
  shareBtn.style.flex = '1';
  shareBtn.textContent = '📱 Send Weekly Plan to Phone with QR Code';
  shareBtn.onclick = () => shareWeeklyPlan(weeklyPlan);
  buttonContainer.appendChild(shareBtn);
  
  container.appendChild(buttonContainer);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  daysOfWeek.forEach(day => {
    if (!weeklyPlan[day]) return;

    const daySection = document.createElement('div');
    daySection.style.marginBottom = '24px';
    daySection.style.borderLeft = '4px solid var(--color-blue)';
    daySection.style.paddingLeft = '16px';

    const dayTitle = document.createElement('h4');
    dayTitle.style.margin = '0 0 12px 0';
    dayTitle.style.fontSize = '1.2rem';
    dayTitle.style.color = 'var(--color-blue)';
    dayTitle.textContent = `${day} - ${weeklyPlan[day].muscle.charAt(0).toUpperCase() + weeklyPlan[day].muscle.slice(1)}`;
    daySection.appendChild(dayTitle);

    weeklyPlan[day].exercises.forEach((ex, index) => {
      const card = document.createElement('div');
      card.className = 'workout-card';
      card.style.marginBottom = '12px';
      
      let howToHtml = '';
      if (ex.howTo && Array.isArray(ex.howTo) && ex.howTo.length > 0) {
        howToHtml = '<div class="exercise-howto" style="margin-top: 8px; font-size: 0.85rem;"><strong>How:</strong><ul style="margin: 4px 0; padding-left: 18px;">';
        ex.howTo.forEach(step => {
          howToHtml += `<li style="margin-bottom: 2px;">${step}</li>`;
        });
        howToHtml += '</ul></div>';
      }
      
      card.innerHTML = `
        <strong>${ex.name}</strong><br>
        ${ex.sets} sets × ${ex.reps}
        ${howToHtml}
      `;

      const swapBtn = document.createElement('button');
      swapBtn.className = 'primary-btn';
      swapBtn.style.cssText = 'margin-top: 8px; padding: 6px 10px; font-size: 13px; background: rgba(var(--color-gold-rgb), 0.15); border: 1px solid var(--color-gold); color: var(--color-gold);';
      swapBtn.textContent = '🔄 Swap Exercise';
      swapBtn.onclick = () => {
        const options = getBuilderSwapExerciseOptions({
          workoutType: selectedWorkoutType,
          day,
          weeklyPlan
        });
        openSwapModal({
          title: `Swap Exercise (${day})`,
          currentName: ex.name,
          options,
          onConfirm: selected => {
            const updated = {
              name: selected.name,
              sets: ex.sets,
              reps: ex.reps,
              howTo: selected.howTo || [],
              primary: selected.primary || [],
              secondary: selected.secondary || [],
              description: selected.description || ''
            };
            const plan = window.currentBuilderPlan || weeklyPlan;
            if (plan?.[day]?.exercises?.length) {
              plan[day].exercises[index] = updated;
              window.currentBuilderPlan = plan;
              renderWorkoutBuilderResult(plan);
              maybeExcludeFromFuture('exercise', ex.name);
            }
          }
        });
      };

      card.appendChild(swapBtn);
      daySection.appendChild(card);
    });

    container.appendChild(daySection);
  });

  // Suggested supplements panel (based on all exercises)
  const weeklyExercises = [];
  Object.values(weeklyPlan).forEach(dayPlan => {
    if (dayPlan?.exercises?.length) {
      weeklyExercises.push(...dayPlan.exercises);
    }
  });

  if (weeklyExercises.length) {
    const supplementList = getSupplementSuggestionsForPlan(weeklyExercises);
    const suppDiv = document.createElement('div');
    suppDiv.style.cssText = 'margin-top: 20px; padding: 16px; background: #10151f; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px;';
    suppDiv.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 10px; color: #f5f7fa;">💊 Suggested Supplements</div>
      <ul style="margin: 0; padding-left: 20px; color: #c4cfe0;">
        ${supplementList.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
      </ul>
      <div style="margin-top: 8px; font-size: 12px; color: #8b95a8;">General guidance only. Consult a professional if needed.</div>
    `;
    container.appendChild(suppDiv);

    const recoveryTips = getRecoveryTips({
      exerciseCount: weeklyExercises.length,
      includesLowerBody: weeklyExercises.some(ex => (ex.primary || []).some(m => ['Legs', 'Glutes'].includes(m))),
      includesCore: weeklyExercises.some(ex => (ex.primary || []).some(m => ['Abs', 'Core'].includes(m)))
    });
    const recoveryDiv = document.createElement('div');
    recoveryDiv.style.cssText = 'margin-top: 16px; padding: 16px; background: #0f141c; border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px;';
    recoveryDiv.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 10px; color: #f5f7fa;">🛌 Proper Recovery</div>
      <ul style="margin: 0; padding-left: 20px; color: #c4cfe0;">
        ${recoveryTips.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
      </ul>
    `;
    container.appendChild(recoveryDiv);
  }
}

async function shareWeeklyPlan(weeklyPlan) {
  if (!weeklyPlan) return;

  // Flatten weekly plan into a single exercise array for sharing
  const exercises = [];
  Object.values(weeklyPlan).forEach(dayPlan => {
    exercises.push({
      day: dayPlan.muscle,
      dayExercises: dayPlan.exercises
    });
  });

  // Create workout for sharing
  const workoutId = generateUUID();
  const workoutToShare = {
    id: workoutId,
    exercises: exercises,
    created: new Date().toISOString(),
    user: window.currentUser
  };

  console.log('UI.JS: Sharing weekly plan with days:', exercises);

  // Save workout to server first, then show QR
  await saveWorkoutToServer(workoutId, workoutToShare);
  
  // Mark workout as completed today and save workout data
  const today = new Date();
  saveWorkoutToCalendarDate(today, workoutToShare);

  // Display QR code
  displayQRCodeModal(workoutId, kioskIP);
}

async function shareBuilderWorkout(plan) {
  if (!plan || !plan.length) return;

  // The plan already has all exercise details (howTo, primary, secondary, etc)
  // Just use it directly for sharing
  const exercises = plan.map(planEx => ({
    name: planEx.name,
    sets: planEx.sets,
    reps: planEx.reps,
    howTo: planEx.howTo || [],
    primary: planEx.primary || [],
    secondary: planEx.secondary || [],
    description: planEx.description || ''
  }));

  // Create workout for sharing
  const workoutId = generateUUID();
  const workoutToShare = {
    id: workoutId,
    exercises: exercises,
    created: new Date().toISOString(),
    user: window.currentUser
  };

  console.log('UI.JS: Sharing workout with exercises:', exercises);

  // Save workout to server first, then show QR
  await saveWorkoutToServer(workoutId, workoutToShare);
  
  // Mark workout as completed today and save workout data
  const today = new Date();
  saveWorkoutToCalendarDate(today, workoutToShare);

  // Display QR code
  displayQRCodeModal(workoutId, kioskIP);
}

/* ===============================
   NUTRITION BUILDER LOGIC
================================ */

function generateSingleDayNutritionPlan(goal) {
  if (!goal) return null;

  const meals = window.LOCAL_MEALS?.[goal];
  if (!meals) return null;

  const excluded = getExcludedMealsSet();
  const pickMeal = list => {
    if (!Array.isArray(list) || !list.length) return null;
    const filtered = list.filter(m => !excluded.has(m.name));
    const pool = filtered.length ? filtered : list;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Return one day plan with all meal categories
  const dayPlan = {
    breakfast: pickMeal(meals.breakfast),
    lunch: pickMeal(meals.lunch),
    dinner: pickMeal(meals.dinner),
    snacks: pickMeal(meals.snacks),
    preWorkout: pickMeal(meals.preWorkout),
    postWorkout: pickMeal(meals.postWorkout)
  };

  return dayPlan;
}

function generateWeeklyNutritionPlan(goal) {
  if (!goal) return null;

  const meals = window.LOCAL_MEALS?.[goal];
  if (!meals) return null;

  const excluded = getExcludedMealsSet();
  const pickMeal = list => {
    if (!Array.isArray(list) || !list.length) return null;
    const filtered = list.filter(m => !excluded.has(m.name));
    const pool = filtered.length ? filtered : list;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weeklyPlan = {};

  daysOfWeek.forEach(day => {
    weeklyPlan[day] = {
      breakfast: pickMeal(meals.breakfast),
      lunch: pickMeal(meals.lunch),
      dinner: pickMeal(meals.dinner),
      snacks: pickMeal(meals.snacks),
      preWorkout: pickMeal(meals.preWorkout),
      postWorkout: pickMeal(meals.postWorkout)
    };
  });

  return weeklyPlan;
}

function renderNutritionPlanResult(plan) {
  const container = document.getElementById('nutritionResult');
  if (!container) return;

  container.innerHTML = '';

  if (!plan) {
    container.innerHTML = '<p>Please select a goal.</p>';
    return;
  }

  window.currentNutritionPlan = plan;

  // Check if single day or weekly plan
  const isWeeklyPlan = plan && typeof plan === 'object' && !Array.isArray(plan) && 
                      (plan.Monday || plan.Tuesday || plan.Wednesday);

  if (isWeeklyPlan) {
    renderWeeklyNutritionPlanResult(plan, container);
  } else {
    renderSingleDayNutritionPlanResult(plan, container);
  }
}

function renderSingleDayNutritionPlanResult(dayPlan, container) {
  // Add disclaimer
  const disclaimer = document.createElement('div');
  disclaimer.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
  disclaimer.style.border = '1px solid rgba(212, 175, 55, 0.3)';
  disclaimer.style.borderRadius = 'var(--radius)';
  disclaimer.style.padding = '12px 16px';
  disclaimer.style.marginBottom = '24px';
  disclaimer.style.fontSize = '0.9rem';
  disclaimer.style.color = 'var(--color-gold)';
  disclaimer.innerHTML = '⚠️ <strong>Disclaimer:</strong> This is general nutrition guidance, not medical advice. Consult a registered dietitian for personalized nutrition plans.';
  container.appendChild(disclaimer);

  // Add buttons at the top
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;';
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'primary-btn';
  saveBtn.style.flex = '1';
  saveBtn.textContent = '💾 Save to Calendar';
  saveBtn.onclick = () => {
    saveMealPlanToCalendarDate(new Date(), {
      meals: dayPlan,
      goal: selectedNutritionGoal,
      created: new Date().toISOString(),
      user: window.currentUser,
      type: 'single'
    });
    showAlert('Success', 'Meal plan saved to calendar!');
  };
  buttonContainer.appendChild(saveBtn);
  
  const shareBtn = document.createElement('button');
  shareBtn.className = 'primary-btn';
  shareBtn.style.flex = '1';
  shareBtn.textContent = '🥗 Send Nutrition to Phone with QR Code';
  shareBtn.onclick = () => shareNutritionPlan(dayPlan, 'single');
  buttonContainer.appendChild(shareBtn);
  
  container.appendChild(buttonContainer);

  const mealSections = ['breakfast', 'lunch', 'dinner', 'snacks', 'preWorkout', 'postWorkout'];
  const mealLabels = {
    breakfast: '🌅 Breakfast',
    lunch: '🍽️ Lunch',
    dinner: '🍴 Dinner',
    snacks: '🥜 Snacks',
    preWorkout: '⚡ Pre-Workout',
    postWorkout: '💪 Post-Workout'
  };

  mealSections.forEach(section => {
    const meal = dayPlan[section];
    if (!meal) return;

    const card = document.createElement('div');
    card.className = 'nutrition-card';
    card.style.marginBottom = '16px';
    card.style.padding = '16px';
    card.style.backgroundColor = 'rgba(26, 31, 46, 0.8)';
    card.style.borderLeft = '4px solid var(--color-blue)';
    card.style.borderRadius = 'var(--radius)';

    card.innerHTML = `
      <h4 style="margin: 0 0 8px 0; color: var(--color-blue); font-size: 1.1rem;">${mealLabels[section]}</h4>
      <strong style="font-size: 1rem; color: var(--text-primary);">${meal.name}</strong><br>
      <p style="margin: 8px 0 0 0; font-size: 0.9rem; color: var(--text-secondary);">${meal.focus}</p>
    `;

    const swapBtn = document.createElement('button');
    swapBtn.className = 'primary-btn';
    swapBtn.style.cssText = 'margin-top: 10px; padding: 8px 12px; font-size: 14px; background: rgba(var(--color-gold-rgb), 0.15); border: 1px solid var(--color-gold); color: var(--color-gold);';
    swapBtn.textContent = '🔄 Swap Meal';
    swapBtn.onclick = () => {
      const allOptions = getAllMealOptions(selectedNutritionGoal);
      const excluded = getExcludedMealsSet();
      const options = allOptions.filter(opt => !excluded.has(opt.name));
      openSwapModal({
        title: `Swap ${mealLabels[section]}`,
        currentName: meal.name,
        options,
        onConfirm: selected => {
          dayPlan[section] = selected;
          window.currentNutritionPlan = dayPlan;
          renderNutritionPlanResult(dayPlan);
          maybeExcludeFromFuture('meal', meal.name);
        }
      });
    };

    card.appendChild(swapBtn);
    container.appendChild(card);
  });
}

function renderWeeklyNutritionPlanResult(weeklyPlan, container) {
  // Add disclaimer
  const disclaimer = document.createElement('div');
  disclaimer.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
  disclaimer.style.border = '1px solid rgba(212, 175, 55, 0.3)';
  disclaimer.style.borderRadius = 'var(--radius)';
  disclaimer.style.padding = '12px 16px';
  disclaimer.style.marginBottom = '24px';
  disclaimer.style.fontSize = '0.9rem';
  disclaimer.style.color = 'var(--color-gold)';
  disclaimer.innerHTML = '⚠️ <strong>Disclaimer:</strong> This is general nutrition guidance, not medical advice. Consult a registered dietitian for personalized nutrition plans.';
  container.appendChild(disclaimer);

  // Add buttons at the top
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;';
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'primary-btn';
  saveBtn.style.flex = '1';
  saveBtn.textContent = '💾 Save to Calendar';
  saveBtn.onclick = () => {
    // Save meal plan for each day of the week
    const today = new Date();
    const daysOfWeek = Object.keys(weeklyPlan);
    let currentDate = new Date(today);
    
    daysOfWeek.forEach(day => {
      if (weeklyPlan[day]) {
        saveMealPlanToCalendarDate(currentDate, {
          meals: weeklyPlan[day],
          goal: selectedNutritionGoal,
          created: new Date().toISOString(),
          user: window.currentUser,
          type: 'weekly',
          dayOfWeek: day
        });
      }
      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    });
    showAlert('Success', 'Weekly meal plan saved to calendar!');
  };
  buttonContainer.appendChild(saveBtn);
  
  const shareBtn = document.createElement('button');
  shareBtn.className = 'primary-btn';
  shareBtn.style.flex = '1';
  shareBtn.textContent = '🥗 Send Weekly Nutrition to Phone with QR Code';
  shareBtn.onclick = () => shareNutritionPlan(weeklyPlan, 'weekly');
  buttonContainer.appendChild(shareBtn);
  
  container.appendChild(buttonContainer);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealLabels = {
    breakfast: '🌅 Breakfast',
    lunch: '🍽️ Lunch',
    dinner: '🍴 Dinner',
    snacks: '🥜 Snacks',
    preWorkout: '⚡ Pre-Workout',
    postWorkout: '💪 Post-Workout'
  };

  daysOfWeek.forEach(day => {
    if (!weeklyPlan[day]) return;

    const daySection = document.createElement('div');
    daySection.style.marginBottom = '32px';
    daySection.style.borderLeft = '4px solid var(--color-blue)';
    daySection.style.paddingLeft = '16px';

    const dayTitle = document.createElement('h3');
    dayTitle.style.margin = '0 0 16px 0';
    dayTitle.style.fontSize = '1.3rem';
    dayTitle.style.color = 'var(--color-blue)';
    dayTitle.textContent = day;
    daySection.appendChild(dayTitle);

    ['breakfast', 'lunch', 'dinner', 'snacks', 'preWorkout', 'postWorkout'].forEach(mealType => {
      const meal = weeklyPlan[day][mealType];
      if (!meal) return;

      const card = document.createElement('div');
      card.className = 'nutrition-card';
      card.style.marginBottom = '12px';
      card.style.padding = '12px 14px';
      card.style.backgroundColor = 'rgba(26, 31, 46, 0.6)';
      card.style.borderRadius = 'var(--radius)';

      card.innerHTML = `
        <strong style="color: var(--color-blue); font-size: 0.95rem;">${mealLabels[mealType]}</strong><br>
        <span style="font-weight: 600; color: var(--text-primary);">${meal.name}</span><br>
        <span style="font-size: 0.85rem; color: var(--text-secondary);">${meal.focus}</span>
      `;

      const swapBtn = document.createElement('button');
      swapBtn.className = 'primary-btn';
      swapBtn.style.cssText = 'margin-top: 8px; padding: 6px 10px; font-size: 13px; background: rgba(var(--color-gold-rgb), 0.15); border: 1px solid var(--color-gold); color: var(--color-gold);';
      swapBtn.textContent = '🔄 Swap Meal';
      swapBtn.onclick = () => {
        const allOptions = getAllMealOptions(selectedNutritionGoal);
        const excluded = getExcludedMealsSet();
        const options = allOptions.filter(opt => !excluded.has(opt.name));
        openSwapModal({
          title: `Swap ${mealLabels[mealType]} (${day})`,
          currentName: meal.name,
          options,
          onConfirm: selected => {
            weeklyPlan[day][mealType] = selected;
            window.currentNutritionPlan = weeklyPlan;
            renderNutritionPlanResult(weeklyPlan);
            maybeExcludeFromFuture('meal', meal.name);
          }
        });
      };

      card.appendChild(swapBtn);
      daySection.appendChild(card);
    });

    container.appendChild(daySection);
  });
}

async function saveNutritionToServer(planId, planData) {
  try {
    const response = await fetchApiWithFallback('/api/workouts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutId: planId,
        data: {
          meals: planData.meals,
          type: planData.type,
          goal: planData.goal,
          created: planData.created,
          user: planData.user
        }
      })
    });

    if (!response.ok) {
      console.warn('Failed to save nutrition plan to server:', response.statusText);
      return;
    }

    console.log('Nutrition plan saved to server:', planId);
  } catch (error) {
    console.warn('Error saving nutrition plan to server:', error);
  }
}

function shareNutritionPlan(plan, planType) {
  if (!plan) return;

  const planId = generateUUID();
  const nutritionToShare = {
    id: planId,
    type: planType,
    goal: selectedNutritionGoal,
    meals: plan,
    created: new Date().toISOString(),
    user: window.currentUser
  };

  console.log('UI.JS: Sharing nutrition plan:', planType, nutritionToShare);

  saveNutritionToServer(planId, nutritionToShare);
  
  // Save meal plan to calendar for today
  const today = new Date();
  saveMealPlanToCalendarDate(today, nutritionToShare);
  
  // Display QR code
  displayMealPlanQRCodeModal(planId, kioskIP);
}

// Share full-body generated workout
function shareGeneratedWorkout(exercises) {
  if (!exercises || !exercises.length) return;

  const workoutId = generateUUID();
  const workoutToShare = {
    id: workoutId,
    type: 'fullbody',
    exercises: exercises,
    created: new Date().toISOString(),
    user: window.currentUser
  };

  console.log('UI.JS: Sharing full-body workout:', workoutToShare);

  // Save workout to server
  saveWorkoutToServer(workoutId, workoutToShare);
  
  // Save workout to calendar for today
  const today = new Date();
  saveWorkoutToCalendarDate(today, workoutToShare);
  
  // Display QR code
  displayQRCodeModal(workoutId, kioskIP);
}
function updateTopControls(screenId) {
  const backBtn = document.getElementById('backToMuscles');
  if (!backBtn) return;

  backBtn.style.display = 'block';
}

/* ===============================
   STORAGE HELPERS
================================ */
function getUsers() {
  let raw = [];
  try {
    const parsed = JSON.parse(localStorage.getItem('users') || '[]');
    raw = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('⚠ getUsers(): invalid users JSON in localStorage, resetting to empty list');
    raw = [];
  }
  const filtered = raw.filter(u => u && u.username && u.username.trim());
  console.log('👥 getUsers() - raw:', raw.length, 'filtered:', filtered.length, filtered.map(u => u.username));
  return filtered;
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashUserPin(pin, saltHex = null) {
  const encoder = new TextEncoder();
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g).map((value) => parseInt(value, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 },
    key,
    256
  );
  return { pinHash: bytesToHex(new Uint8Array(bits)), pinSalt: bytesToHex(salt) };
}

async function verifyUserPin(user, pin) {
  if (user?.pinHash && user?.pinSalt) {
    const result = await hashUserPin(pin, user.pinSalt);
    return result.pinHash === user.pinHash;
  }
  return !!user?.pin && String(user.pin) === String(pin);
}

function removeDeprecatedBiometricData() {
  const users = getUsers();
  let changed = false;
  const cleaned = users.map((user) => {
    const next = { ...user };
    ['faceLoginEnabled', 'faceSignature', 'faceEnrolledAt', 'voiceProfile', 'voiceSignature'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(next, field)) {
        delete next[field];
        changed = true;
      }
    });
    return next;
  });
  if (changed) saveUsers(cleaned);

  [
    'gymKiosk_faceCheckIns',
    'gymKiosk_faceGreetingDaily',
    'gymKiosk_faceDetectionStableFrames',
    'gymKiosk_nativeVoiceName'
  ].forEach((key) => localStorage.removeItem(key));
}

// Save completed exercise for today
function saveCompletedExercise(muscle, exerciseName) {
  if (!window.currentUser) return;
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const key = `completedExercises_${window.currentUser}_${today}`;
  const completed = JSON.parse(localStorage.getItem(key) || '{}');
  
  if (!completed[muscle]) {
    completed[muscle] = [];
  }
  
  if (!completed[muscle].includes(exerciseName)) {
    completed[muscle].push(exerciseName);
  }
  
  localStorage.setItem(key, JSON.stringify(completed));
}

// Check if exercise is completed today
function isExerciseCompletedToday(muscle, exerciseName) {
  if (!window.currentUser) return false;
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const key = `completedExercises_${window.currentUser}_${today}`;
  const completed = JSON.parse(localStorage.getItem(key) || '{}');
  
  return completed[muscle]?.includes(exerciseName) || false;
}

function seedDefaultUser() {
  let users = [];
  try {
    const parsed = JSON.parse(localStorage.getItem('users') || '[]');
    users = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('⚠ seedDefaultUser(): invalid users JSON, backing up and restoring defaults');
    const corrupted = localStorage.getItem('users');
    if (corrupted) {
      localStorage.setItem(`users_corrupt_backup_${Date.now()}`, corrupted);
    }
    users = [];
  }

  const validProfiles = users.filter(u => u && typeof u.username === 'string' && u.username.trim());

  console.log('🌱 seedDefaultUser() called - current users:', users.length, users.map(u => u.username));
  console.log('🌱 valid profile users:', validProfiles.length, validProfiles.map(u => u.username));

  if (!validProfiles.length) {
    const defaultUsers = [
      {
        username: 'RICK',
        pin: '1234',
        favorites: { exercises: [], muscles: [] },
        icon: 'user-icon-01.svg',
        color: '#06B6D4',
        personalRecords: {},
        exerciseHistory: {}
      },
      {
        username: 'Mel',
        pin: null,
        favorites: { exercises: [], muscles: [] },
        icon: 'user-icon-02.svg',
        color: '#EC4899',
        personalRecords: {},
        exerciseHistory: {}
      },
      {
        username: 'Kean',
        pin: null,
        favorites: { exercises: [], muscles: [] },
        icon: 'user-icon-03.svg',
        color: '#EF4444',
        personalRecords: {},
        exerciseHistory: {}
      }
    ];

    localStorage.setItem('users', JSON.stringify(defaultUsers));
    console.log('✅ Default users CREATED: RICK, Mel, Kean');
  } else {
    // If mixed valid/invalid records exist, keep only valid profile objects.
    if (validProfiles.length !== users.length) {
      localStorage.setItem('users', JSON.stringify(validProfiles));
      console.log(`🧹 Removed ${users.length - validProfiles.length} invalid user records from localStorage`);
    }

    // Update existing users' colors if needed
    // Update mel's color to pink
    const users2 = JSON.parse(localStorage.getItem('users') || '[]');
    const melUser = users2.find(u => u.username.toLowerCase() === 'mel');
    if (melUser) {
      melUser.color = '#EC4899';
      // Initialize PR tracking if not present
      if (!melUser.personalRecords) melUser.personalRecords = {};
      if (!melUser.exerciseHistory) melUser.exerciseHistory = {};
      localStorage.setItem('users', JSON.stringify(users2));
      console.log('User mel color updated to pink');
    }

    // Update rick's color to aqua
    const users3 = JSON.parse(localStorage.getItem('users') || '[]');
    const rickUser = users3.find(u => u.username.toLowerCase() === 'rick');
    if (rickUser) {
      rickUser.color = '#06B6D4';
      // Initialize PR tracking if not present
      if (!rickUser.personalRecords) rickUser.personalRecords = {};
      if (!rickUser.exerciseHistory) rickUser.exerciseHistory = {};
      localStorage.setItem('users', JSON.stringify(users3));
      console.log('User rick color updated to aqua');
    }

    // Update kean's color to red
    const users4 = JSON.parse(localStorage.getItem('users') || '[]');
    const keanUser = users4.find(u => u.username.toLowerCase() === 'kean');
    if (keanUser) {
      keanUser.color = '#EF4444';
      // Initialize PR tracking if not present
      if (!keanUser.personalRecords) keanUser.personalRecords = {};
      if (!keanUser.exerciseHistory) keanUser.exerciseHistory = {};
      localStorage.setItem('users', JSON.stringify(users4));
      console.log('User kean color updated to red');
    }
  }
}

function cleanupStaleFavorites() {
  const users = getUsers();
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Get all valid exercise names from LOCAL_EXERCISES
  const allValidExercises = [];
  Object.entries(window.LOCAL_EXERCISES || {}).forEach(([key, value]) => {
    // Skip stretchesByBodyPart since it's a nested object, not an array
    if (key === 'stretchesByBodyPart') {
      Object.values(value).forEach(group => {
        if (Array.isArray(group)) {
          group.forEach(ex => allValidExercises.push(ex.name));
        }
      });
    } else if (Array.isArray(value)) {
      value.forEach(ex => allValidExercises.push(ex.name));
    }
  });
  const validNormalized = allValidExercises.map(normalize);
  
  users.forEach(user => {
    if (!user.favorites?.exercises) return;
    
    // Filter out favorites that don't match any real exercise
    const originalCount = user.favorites.exercises.length;
    user.favorites.exercises = user.favorites.exercises.filter(fav => {
      const normalizedFav = normalize(fav);
      return validNormalized.includes(normalizedFav);
    });
    
    if (originalCount !== user.favorites.exercises.length) {
      console.log(`Cleaned up ${originalCount - user.favorites.exercises.length} stale favorites for ${user.username}`);
    }
  });
  
  saveUsers(users);
}

/* ===============================
   FAVORITES SCHEMA
================================ */
function ensureFavorites(user) {
  if (!user.favorites) user.favorites = { exercises: [], muscles: [] };
  if (!Array.isArray(user.favorites.exercises)) user.favorites.exercises = [];
  if (!Array.isArray(user.favorites.muscles)) user.favorites.muscles = [];
}

function getCurrentUserObject() {
  if (!window.currentUser || window.currentUser === 'guest') return null;
  const users = getUsers();
  const user = users.find(u => u.username === window.currentUser);
  if (!user) return null;
  ensureFavorites(user);
  ensurePreferences(user);
  saveUsers(users);
  return user;
}

function ensurePreferences(user) {
  if (!user.preferences) {
    user.preferences = { excludedExercises: [], excludedMeals: [] };
  }
  if (!Array.isArray(user.preferences.excludedExercises)) {
    user.preferences.excludedExercises = [];
  }
  if (!Array.isArray(user.preferences.excludedMeals)) {
    user.preferences.excludedMeals = [];
  }
}

function getCurrentUserPreferences() {
  const user = getCurrentUserObject();
  if (!user) return { excludedExercises: [], excludedMeals: [] };
  ensurePreferences(user);
  return user.preferences;
}

function updateCurrentUserProfile(updater) {
  if (!window.currentUser || window.currentUser === 'guest') return;
  const users = getUsers();
  const index = users.findIndex(u => u.username === window.currentUser);
  if (index === -1) return;
  ensureFavorites(users[index]);
  ensurePreferences(users[index]);
  updater(users[index]);
  saveUsers(users);
}

function addExcludedExercise(name) {
  if (!name) return;
  updateCurrentUserProfile(user => {
    if (!user.preferences.excludedExercises.includes(name)) {
      user.preferences.excludedExercises.push(name);
    }
  });
}

function addExcludedMeal(name) {
  if (!name) return;
  updateCurrentUserProfile(user => {
    if (!user.preferences.excludedMeals.includes(name)) {
      user.preferences.excludedMeals.push(name);
    }
  });
}

function getExcludedExercisesSet() {
  const prefs = getCurrentUserPreferences();
  return new Set(prefs.excludedExercises || []);
}

function getExcludedMealsSet() {
  const prefs = getCurrentUserPreferences();
  return new Set(prefs.excludedMeals || []);
}

function getAllExerciseOptions() {
  const options = [];
  Object.entries(window.LOCAL_EXERCISES || {}).forEach(([key, value]) => {
    if (key === 'stretchesByBodyPart') return;
    if (!Array.isArray(value)) return;
    value.forEach(ex => {
      options.push({
        name: ex.name,
        howTo: ex.howTo || [],
        primary: ex.primary || [],
        secondary: ex.secondary || [],
        description: ex.description || ''
      });
    });
  });

  return options.sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeExerciseOption(ex) {
  if (!ex?.name) return null;
  return {
    name: ex.name,
    howTo: ex.howTo || [],
    primary: ex.primary || [],
    secondary: ex.secondary || [],
    description: ex.description || ''
  };
}

function getBuilderSwapExerciseOptions({
  workoutType = 'muscle',
  focus,
  day,
  weeklyPlan
} = {}) {
  const localExercises = window.LOCAL_EXERCISES || {};
  const buildOptionsFromSource = sourceList => {
    const excluded = getExcludedExercisesSet();
    const seen = new Set();
    return sourceList
      .map(normalizeExerciseOption)
      .filter(opt => opt && !excluded.has(opt.name) && !seen.has(opt.name) && seen.add(opt.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  let source = [];

  if (workoutType === 'stretch') {
    const stretchGroups = localExercises.stretchesByBodyPart || {};
    source = Array.isArray(stretchGroups[focus]) ? stretchGroups[focus] : [];
  } else if (day && weeklyPlan?.[day]?.muscle) {
    const dayFocus = weeklyPlan[day].muscle;
    if (dayFocus === 'push') {
      source = [
        ...(localExercises.chest || []),
        ...(localExercises.shoulders || []),
        ...(localExercises.triceps || [])
      ];
    } else if (dayFocus === 'pull') {
      source = [
        ...(localExercises.back || []),
        ...(localExercises.biceps || [])
      ];
    } else {
      source = localExercises[dayFocus] || [];
    }
  } else if (focus === 'push') {
    source = [
      ...(localExercises.chest || []),
      ...(localExercises.shoulders || []),
      ...(localExercises.triceps || [])
    ];
  } else if (focus === 'pull') {
    source = [
      ...(localExercises.back || []),
      ...(localExercises.biceps || [])
    ];
  } else {
    source = localExercises[focus] || [];
  }

  const strictOptions = buildOptionsFromSource(source);
  if (strictOptions.length) return strictOptions;

  // Fallback: keep swap candidates within the same workout type.
  let fallbackSource = [];
  if (workoutType === 'stretch') {
    Object.values(localExercises.stretchesByBodyPart || {}).forEach(group => {
      if (Array.isArray(group)) fallbackSource.push(...group);
    });
  } else {
    Object.entries(localExercises).forEach(([key, value]) => {
      if (key === 'stretchesByBodyPart') return;
      if (Array.isArray(value)) fallbackSource.push(...value);
    });
  }

  return buildOptionsFromSource(fallbackSource);
}

function getAllMealOptions(goal) {
  const meals = window.LOCAL_MEALS?.[goal];
  if (!meals) return [];

  const list = [];
  Object.values(meals).forEach(group => {
    if (!Array.isArray(group)) return;
    group.forEach(meal => list.push(meal));
  });

  return list.sort((a, b) => a.name.localeCompare(b.name));
}

async function maybeExcludeFromFuture(type, name) {
  if (!name) return;
  const keepOut = await showConfirmDialog(
    'Exclude from Future',
    `Keep "${name}" out of future plans for this user?`
  );
  if (!keepOut) return;
  if (type === 'exercise') {
    addExcludedExercise(name);
  } else if (type === 'meal') {
    addExcludedMeal(name);
  }
}

function openSwapModal({ title, options, currentName, onConfirm }) {
  const modal = document.getElementById('swapModal');
  const titleEl = document.getElementById('swapModalTitle');
  const body = document.getElementById('swapModalBody');
  if (!modal || !titleEl || !body) return;

  const seen = new Set();
  const cleaned = options.filter(opt => {
    if (!opt?.name) return false;
    if (opt.name === currentName) return false;
    if (seen.has(opt.name)) return false;
    seen.add(opt.name);
    return true;
  });

  titleEl.textContent = title || 'Swap Item';
  body.innerHTML = `
    <div style="margin-bottom: 12px; color: var(--text-secondary);">Current: <strong style="color: var(--text-primary);">${currentName || '—'}</strong></div>
    <input id="swapSearch" type="text" placeholder="Search..." style="width: 100%; padding: 10px 12px; margin-bottom: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #0f141c; color: #f5f7fa;" />
    <select id="swapSelect" size="10" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #0f141c; color: #f5f7fa;">
    </select>
    <div style="display: flex; gap: 12px; margin-top: 14px;">
      <button id="swapConfirmBtn" class="primary-btn" style="flex: 1;">Swap</button>
      <button id="swapCancelBtn" class="primary-btn" style="flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);">Cancel</button>
    </div>
  `;

  const select = body.querySelector('#swapSelect');
  const search = body.querySelector('#swapSearch');
  const confirmBtn = body.querySelector('#swapConfirmBtn');
  const cancelBtn = body.querySelector('#swapCancelBtn');

  const renderOptions = (filter = '') => {
    const term = filter.trim().toLowerCase();
    select.innerHTML = '';
    cleaned
      .filter(opt => !term || opt.name.toLowerCase().includes(term))
      .forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.name;
        option.textContent = opt.name;
        select.appendChild(option);
      });
  };

  renderOptions();

  search.addEventListener('input', () => renderOptions(search.value));
  cancelBtn.addEventListener('click', closeSwapModal);
  confirmBtn.addEventListener('click', () => {
    const selectedName = select.value;
    if (!selectedName) {
      alert('Please select an option to swap in.');
      return;
    }
    const selected = cleaned.find(opt => opt.name === selectedName);
    closeSwapModal();
    if (selected && typeof onConfirm === 'function') {
      onConfirm(selected);
    }
  });

  modal.classList.remove('hidden');
}

function closeSwapModal() {
  const modal = document.getElementById('swapModal');
  const body = document.getElementById('swapModalBody');
  if (body) body.innerHTML = '';
  if (modal) modal.classList.add('hidden');
}

/* ===============================
   ACTIVITY TRACKING
================================ */
function getDateKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

function getActivityStats() {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed || { weekly: {}, daily: {} };
  } catch (e) {
    return { weekly: {}, daily: {} };
  }
}

function saveActivityStats(stats) {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(stats));
}

function bumpUserSession(username) {
  if (!username || username === 'guest' || username === 'admin') return;

  const stats = getActivityStats();
  const weekKey = getWeekKey();
  const dateKey = getDateKey();

  if (!stats.weekly[weekKey]) stats.weekly[weekKey] = {};
  if (!stats.daily[dateKey]) stats.daily[dateKey] = {};

  stats.weekly[weekKey][username] = (stats.weekly[weekKey][username] || 0) + 1;
  stats.daily[dateKey][username] = (stats.daily[dateKey][username] || 0) + 1;

  saveActivityStats(stats);
}

function updateActivityLeaderboard() {
  const topUserNameEl = document.getElementById('topUserName');
  const topUserCountEl = document.getElementById('topUserCount');
  const activeMembersTodayEl = document.getElementById('activeMembersToday');

  if (!topUserNameEl || !topUserCountEl || !activeMembersTodayEl) return;

  const stats = getActivityStats();
  const weekKey = getWeekKey();
  const dateKey = getDateKey();
  const weekStats = stats.weekly[weekKey] || {};
  const dayStats = stats.daily[dateKey] || {};

  let topUser = null;
  let topCount = 0;
  Object.entries(weekStats).forEach(([user, count]) => {
    if (count > topCount) {
      topUser = user;
      topCount = count;
    }
  });

  if (topUser) {
    topUserNameEl.textContent = topUser;
    topUserCountEl.textContent = `💪 Top Sessions: ${topCount}`;
  } else {
    topUserNameEl.textContent = 'No activity yet';
    topUserCountEl.textContent = '';
  }

  activeMembersTodayEl.textContent = Object.keys(dayStats).length.toString();
}

function getSupplementSuggestions({ difficultyLevel, exerciseCount, includesLowerBody, includesCore }) {
  const suggestions = [];

  // Base suggestions
  suggestions.push('💧 Hydration: water + electrolytes');
  suggestions.push('🥚 Protein: whey or whole-food protein');

  if (difficultyLevel === 'advanced' || exerciseCount >= 10) {
    suggestions.push('⚡ Creatine monohydrate');
  }

  if (includesLowerBody || includesCore) {
    suggestions.push('🦴 Magnesium (recovery support)');
  }

  if (difficultyLevel === 'beginner') {
    suggestions.push('🌿 Omega-3 (general recovery)');
  }

  return suggestions;
}

function getRecoveryTips({ exerciseCount, includesLowerBody, includesCore }) {
  const tips = [];

  tips.push('🧊 Cool down 5–10 minutes (light walk or bike)');
  tips.push('🛌 Sleep 7–9 hours for recovery');
  tips.push('💧 Rehydrate: water + electrolytes');

  if (exerciseCount >= 8) {
    tips.push('🧘 Stretch 5–8 minutes post‑workout');
  }

  if (includesLowerBody) {
    tips.push('🦵 Light leg mobility + calf/quad/hamstring stretch');
  }

  if (includesCore) {
    tips.push('🧍 Core recovery: gentle spine mobility and breathing');
  }

  return tips;
}

/* ===============================
   SCREEN CONTROL
================================ */

function showExerciseVariantModal(exerciseName) {
  const modal = document.getElementById('exerciseVariantModal');
  if (!modal) return;

  // Set exercise name
  document.getElementById('variantExerciseName').textContent = `${exerciseName} - Training Variants`;

  // Show modal
  modal.classList.remove('hidden');

  // Set initial variant
  setActiveVariant('power');
}

function closeExerciseVariantModal() {
  const modal = document.getElementById('exerciseVariantModal');
  if (modal) modal.classList.add('hidden');
}

function setActiveVariant(variantKey) {
  // Update tabs
  document.querySelectorAll('.variant-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.variant === variantKey) {
      tab.classList.add('active');
    }
  });

  // Update content
  const variant = window.EXERCISE_VARIANTS[variantKey];
  if (!variant) return;

  const content = document.getElementById('variantContent');
  content.innerHTML = `
    <div class="variant-section">
      <div class="variant-row">
        <div class="variant-item">
          <strong>📊 Reps</strong>
          <span>${variant.reps}</span>
        </div>
        <div class="variant-item">
          <strong>🏋️ Sets</strong>
          <span>${variant.sets}</span>
        </div>
      </div>
      <div class="variant-row">
        <div class="variant-item">
          <strong>⏱️ Tempo</strong>
          <span>${variant.tempo}</span>
        </div>
        <div class="variant-item">
          <strong>⏳ Rest</strong>
          <span>${variant.rest}</span>
        </div>
      </div>
      <div class="variant-row">
        <div class="variant-item">
          <strong>⚖️ Weight</strong>
          <span>${variant.weight}</span>
        </div>
        <div class="variant-item">
          <strong>🎯 Focus</strong>
          <span>${variant.focus}</span>
        </div>
      </div>
    </div>

    <div class="variant-section">
      <h3>💪 Key Benefits</h3>
      <ul class="variant-list">
        ${variant.benefits.map(b => `<li>✓ ${b}</li>`).join('')}
      </ul>
    </div>

    <div class="variant-section">
      <h3>📋 Form Tips</h3>
      <ul class="variant-list">
        ${variant.form.map(f => `<li>→ ${f}</li>`).join('')}
      </ul>
    </div>

    <div class="variant-section">
      <h3>📅 When to Use</h3>
      <p style="color: var(--text-primary); line-height: 1.6;">${variant.when}</p>
    </div>
  `;
}

/* ===============================
   FRIEND CHALLENGE NOTIFICATION SYSTEM
================================ */
async function checkAndShowChallengeNotification() {
  console.log('📞 checkAndShowChallengeNotification() called for user:', window.currentUser);
  
  if (!window.currentUser || window.currentUser === 'guest' || window.currentUser === 'admin') {
    console.log('⏭️ Skipping - invalid user:', window.currentUser);
    return;
  }

  try {
    // Fetch pending challenges for this user from server
    const url = buildApiUrl(`/api/friend-challenges/pending/${window.currentUser}`);
    console.log('📡 Fetching from:', url);
    
    const response = await fetchApiWithFallback(`/api/friend-challenges/pending/${window.currentUser}`);
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      console.warn('⚠️ Endpoint returned:', response.status);
      return; // Non-fatal error
    }

    const data = await response.json();
    const pendingChallenges = data.pendingChallenges || [];
    
    console.log('📊 Found', pendingChallenges.length, 'pending challenges');

    // Show notification if there are pending challenges
    if (pendingChallenges.length > 0) {
      const firstChallenge = pendingChallenges[0];
      console.log('🎯 Showing notification from:', firstChallenge.challenger);
      
      // Try to show the styled modal
      try {
        showChallengeNotificationModal(firstChallenge);
        console.log('✅ Modal shown successfully');
      } catch (modalErr) {
        console.error('⚠️ Modal error (non-fatal):', modalErr.message);
      }
    } else {
      console.log('📭 No pending challenges for', window.currentUser);
    }
  } catch (error) {
    console.error('⚠️ Non-fatal error checking challenges:', error.message);
    // Do NOT throw - this is a background operation
  }
}

function showChallengeNotificationModal(challenge) {
  console.log('UI.JS: showChallengeNotificationModal called with:', challenge);
  
  const modal = document.getElementById('challengeNotificationModal');
  if (!modal) {
    console.error('UI.JS: challengeNotificationModal element not found!');
    return;
  }

  // Get today's challenge details
  const dailyChallenge = getTodaysChallenge();
  console.log('UI.JS: Today\'s challenge:', dailyChallenge);
  
  if (!dailyChallenge) {
    console.error('UI.JS: No daily challenge available!');
    return;
  }

  // Update modal content
  const messageEl = document.getElementById('challengeNotificationMessage');
  const detailsEl = document.getElementById('challengeNotificationDetails');
  const declineBtn = document.getElementById('challengeNotificationDecline');
  const acceptBtn = document.getElementById('challengeNotificationAccept');
  const viewBtn = document.getElementById('challengeNotificationView');

  console.log('UI.JS: Modal elements found - message:', !!messageEl, 'details:', !!detailsEl, 'decline:', !!declineBtn, 'accept:', !!acceptBtn, 'view:', !!viewBtn);

  if (messageEl) {
    messageEl.textContent = `${challenge.challenger} has challenged you to today's Daily Challenge!`;
  }

  if (detailsEl) {
    detailsEl.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong style="display: block; margin-bottom: 6px; color: var(--color-gold);">Today's Challenge: ${dailyChallenge.name}</strong>
        <div style="font-size: 14px; line-height: 1.5;">
          <div style="margin-bottom: 8px;"><strong>Difficulty:</strong> <span style="text-transform: uppercase;">${dailyChallenge.difficulty}</span></div>
          <div style="margin-bottom: 8px;"><strong>Points:</strong> ${dailyChallenge.points}</div>
          <div><strong>Exercises:</strong> ${dailyChallenge.exercises.length} exercises</div>
        </div>
      </div>
    `;
  }

  // Remove old event listeners and set up new ones
  if (declineBtn) {
    const newDeclineBtn = declineBtn.cloneNode(true);
    declineBtn.parentNode.replaceChild(newDeclineBtn, declineBtn);
    newDeclineBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔴 Decline Challenge button clicked');
      console.log('📋 Full challenge object:', JSON.stringify(challenge, null, 2));
      console.log('🆔 Challenge ID:', challenge.id);
      
      if (!challenge.id) {
        console.error('❌ ERROR: Challenge has no ID! Cannot decline.');
        alert('Error: Could not identify challenge to decline.');
        return;
      }
      
      // Call API to remove the challenge from the server BEFORE closing modal
      try {
        const deleteUrl = buildApiUrl(`/api/friend-challenges/${challenge.id}`);
        console.log('🗑️ Sending DELETE request to:', deleteUrl);
        
        const response = await fetchApiWithFallback(`/api/friend-challenges/${challenge.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('📡 DELETE Response Status:', response.status);
        
        // Try to parse as JSON, but handle non-JSON responses
        let responseData;
        try {
          responseData = await response.json();
        } catch (parseErr) {
          console.warn('⚠️ Response was not JSON, status:', response.status);
          responseData = { error: 'Non-JSON response from server' };
        }
        
        console.log('📡 DELETE Response Data:', responseData);
        
        if (response.ok) {
          console.log('✅ Challenge declined and removed from server successfully');
          modal.style.display = 'none';
          // Force a refresh of pending challenges when modal reopens
          localStorage.removeItem(`challenge_shown_${challenge.id}`);
        } else {
          console.error('❌ Failed to remove challenge from server:', response.status, responseData);
          alert('Failed to decline challenge (Error ' + response.status + '): ' + (responseData.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('❌ Error declining challenge:', err.message, err);
        alert('Error declining challenge: ' + err.message);
      }
    });
  }

  if (acceptBtn) {
    const newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    newAcceptBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 ACCEPT CHALLENGE: Button clicked at', new Date().toLocaleTimeString());
      console.log('🎯 ACCEPT CHALLENGE: Current user:', window.currentUser);
      console.log('🎯 ACCEPT CHALLENGE: Modal display before hide:', modal.style.display);
      modal.style.display = 'none';
      console.log('🎯 ACCEPT CHALLENGE: Modal hidden');
      // Mark challenge as accepted
      localStorage.setItem(`challenge_accepted_${window.currentUser}`, new Date().toDateString());
      console.log('🎯 ACCEPT CHALLENGE: Flag set in localStorage');
      // Go directly to daily challenge screen
      console.log('🎯 ACCEPT CHALLENGE: Calling showDailyChallengeScreen()');
      verboseUiTrace('🎯 ACCEPT CHALLENGE: Stack trace for showDailyChallengeScreen call');
      showDailyChallengeScreen();
      console.log('🎯 ACCEPT CHALLENGE: showDailyChallengeScreen() returned');
    });
  }

  if (viewBtn) {
    const newViewBtn = viewBtn.cloneNode(true);
    viewBtn.parentNode.replaceChild(newViewBtn, viewBtn);
    newViewBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('UI.JS: View Challenge button clicked');
      modal.style.display = 'none';
      // Go to daily challenge screen
      showDailyChallengeScreen();
    });
  }

  // Show the modal
  console.log('UI.JS: Showing challenge notification modal');
  modal.style.display = 'flex';
}

/* ===============================
   HOW TO GUIDES
================================ */
const HOW_TO_GUIDES = {
  trackWorkout: {
    title: '📊 How to Track Your Workouts',
    steps: [
      'After selecting a muscle group, you\'ll see a list of exercises.',
      'For each exercise, read the "How to perform" instructions and watch any available videos.',
      'Tap the "Complete" button at the bottom of each exercise card when you finish that exercise.',
      'A checkmark will appear, showing the exercise is marked as completed.',
      'Your completed exercises are saved to your profile automatically.',
      'View your workout history in your profile to see all completed workouts and stats.'
    ],
    tips: [
      'The checkmark on completed exercises helps you track your progress during the workout.',
      'Your profile shows workout distribution across muscle groups so you can maintain balanced training.',
      'Track the same exercises multiple times to unlock progression suggestions for increasing difficulty.',
      'Use the "Smart Recommendations" section in your profile to see personalized workout suggestions based on your history.',
      'The system learns your preferences - the more you work out, the better the recommendations become.',
      'Check your "Badges in Progress" to see which workout milestones you\'re close to achieving.'
    ]
  },
  buildWorkout: {
    title: '🏋️ How to Build a Workout',
    steps: [
      'From the main screen, tap “Build a Workout”.',
      'Choose Single Day or Weekly plan.',
      'Choose workout type (Muscle or Stretch), then select the category you want to train.',
      'Pick your difficulty (if shown) and review the exercise list.',
      'Scroll through the exercises and read the how-to steps.',
      'Tap “Share” to send the workout to your phone (optional).'
    ],
    tips: [
      'Aim for 6–10 exercises per workout for most sessions.',
      'Mix push/pull/legs or upper/lower to balance fatigue.',
      'Use the difficulty filter to quickly switch between all/beginner/intermediate/advanced movements.'
    ]
  },
  fullBodyWorkout: {
    title: '⚡ How to Build a Full-Body Workout',
    steps: [
      'From the main screen, tap “Full-Body Workout”.',
      'Choose how many exercises you want (6, 8, 10, or 12).',
      'Pick a difficulty level or “Mixed”.',
      'Toggle “Include Stretches” if you want a cool-down.',
      'Tap “Generate Workout” and review the list.',
      'Tap “Share” to open a QR code for your phone.'
    ],
    tips: [
      'Full-body is great 2–4 days per week with rest days between.',
      'Use “Mixed” for balanced challenge across movement types.',
      'Stretches are best after the workout, not before.',
      'If you switch sections, filters reset to “All” so you always start from the full list.'
    ]
  },
  nutritionPlan: {
    title: '🥗 How to Build a Nutrition Plan',
    steps: [
      'From the main screen, tap “Training Nutrition & Fuel Guide”.',
      'Choose Single Day or Weekly plan.',
      'Select your training goal (Strength, Muscle Growth, Fat Loss, etc.).',
      'Tap “Generate Nutrition Plan”.',
      'Scroll to see meals for breakfast, lunch, dinner, snacks, pre- and post-workout.',
      'Check “Featured Fuel of the Day” for new meal ideas.'
    ],
    tips: [
      'Eat protein with every meal for recovery and muscle growth.',
      'Pre-workout fuel should be easy to digest and higher in carbs.',
      'Post-workout meals should include protein + carbs within 60 minutes.'
    ]
  },
  favoritesList: {
    title: '⭐ How to Build Your Favorites List',
    steps: [
      'Open Muscle Groups or Stretches and pick a category.',
      'Tap the ⭐ icon on any exercise card to favorite it.',
      'Use the ⭐ “My Favorites” button on the top-left to view saved items.',
      'Tap the ⭐ again to remove a favorite.'
    ],
    tips: [
      'Favorites are saved to your profile and stay after you exit.',
      'Use favorites to build a go-to routine you can repeat weekly.',
      'Favorites can include both strength exercises and stretches.'
    ]
  },
  sendToPhone: {
    title: '📲 How to Send Info to Your Phone',
    steps: [
      'After generating content, tap the matching share action: Workout QR, Meal Plan QR, Favorites QR, Calendar QR, or Share My Stats QR.',
      'A QR code modal appears with both a scannable code and a copyable link.',
      'Scan with your phone camera, or tap “Copy Link” and open it manually on mobile.',
      'Workout, meal, favorites, and calendar links open directly in the mobile viewer.',
      'Stats QR opens the /stats page, which requires mobile sign-in and only shows that signed-in user’s stats.'
    ],
    tips: [
      'Each share link includes a fresh query nonce to reduce stale-cache opens.',
      'If a page looks stale, open the QR link in a private tab and rescan.',
      'Stats are protected by session auth, so one user cannot view another user’s stats data.'
    ]
  },
  phoneWorkout: {
    title: '📱 How to Build a Workout on Your Phone',
    steps: [
      'Scan a QR code from the kiosk to open the mobile page.',
      'Sign in from the mobile home page when prompted (required for saving progress and viewing private stats).',
      'Use the mobile workout view to follow the exercises.',
      'If a builder screen is available, pick muscle groups and confirm.',
      'Save the workout and keep it open during your session.'
    ],
    tips: [
      'Rotate your phone to landscape for a bigger view.',
      'Bookmark the workout link to revisit it later.',
      'Open /stats after sign-in to view your private progress summary.'
    ]
  }
};

function renderHowToDetail(topicKey) {
  const detail = document.getElementById('howToDetail');
  const guide = HOW_TO_GUIDES[topicKey];
  if (!detail || !guide) return;

  const stepsHtml = guide.steps.map(step => `<li>${step}</li>`).join('');
  const tipsHtml = guide.tips.map(tip => `<li>${tip}</li>`).join('');

  detail.innerHTML = `
    <div style="max-width: 1000px; margin: 0 auto; padding: 24px; background: rgba(0, 0, 0, 0.3); border-radius: 16px;">
      <h3 style="margin: 0 0 12px 0; color: var(--color-gold);">${guide.title}</h3>
      <h4 style="margin: 16px 0 8px; color: var(--color-blue);">Step-by-step</h4>
      <ol style="margin: 0 0 16px 20px; line-height: 1.6;">${stepsHtml}</ol>
      <h4 style="margin: 16px 0 8px; color: var(--color-blue);">Pro Tips</h4>
      <ul style="margin: 0 0 8px 20px; line-height: 1.6;">${tipsHtml}</ul>
    </div>
  `;
}

function initializeHowToGuide() {
  const tiles = document.querySelectorAll('#howToTopicGrid .builder-tile');
  if (!tiles.length) return;

  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      tiles.forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      renderHowToDetail(tile.dataset.topic);
    });
  });

  tiles[0].click();
}


/* ===============================
   USER SCREEN
================================ */
function renderUserScreen() {
  console.log('👥 renderUserScreen() called at', new Date().toLocaleTimeString());
  console.log('👥 Current user:', window.currentUser);
  verboseUiTrace('👥 renderUserScreen stack trace:');
  
  const grid = document.getElementById('userGrid');
  if (!grid) {
    console.error('❌ userGrid element not found!');
    return;
  }

  const searchInput = document.getElementById('userSearchInput');
  const query = (searchInput?.value || '').trim().toLowerCase();

  grid.innerHTML = '';

  let allUsers = getUsers();
  if (!allUsers.length) {
    console.warn('⚠ renderUserScreen(): no profiles found, reseeding defaults now');
    seedDefaultUser();
    allUsers = getUsers();
  }

  const users = allUsers.filter(user =>
    user.username.toLowerCase().includes(query)
  );

  console.log('📋 renderUserScreen() called - found', users.length, 'users:', users.map(u => u.username));

  users.forEach(user => {
    const d = document.createElement('div');
    d.className = 'user';
    d.dataset.user = user.username;
    
    // Apply custom color if set
    if (user.color) {
      d.style.color = user.color;
    }

    const img = document.createElement('img');
    img.className = 'user-icon';
    img.alt = user.username + ' icon';
    img.src = `assets/icons/${user.icon || 'user-icon-01.svg'}`;

    const span = document.createElement('span');
    span.className = 'user-name';
    span.textContent = user.username;

    d.appendChild(img);
    d.appendChild(span);
    grid.appendChild(d);
  });
  // Removed inline "Create Profile" tile; creation moved to top-left control
  if (!query || 'guest'.includes(query)) {
    ['guest'].forEach(type => {
      const d = document.createElement('div');
      d.className = 'user' + (type === 'admin' ? ' admin-user' : '');
      d.dataset.user = type;
      d.textContent = type === 'guest' ? 'Guest' : 'Admin';
      grid.appendChild(d);
    });
  }

  // Last-resort recovery if profiles are still empty after reseed.
  if (!query && users.length === 0) {
    const emergencyUsers = [
      { username: 'RICK', icon: 'user-icon-01.svg', color: '#06B6D4' },
      { username: 'Mel', icon: 'user-icon-02.svg', color: '#EC4899' },
      { username: 'Kean', icon: 'user-icon-03.svg', color: '#EF4444' }
    ];

    emergencyUsers.forEach(user => {
      const d = document.createElement('div');
      d.className = 'user';
      d.dataset.user = user.username;
      d.style.color = user.color;

      const img = document.createElement('img');
      img.className = 'user-icon';
      img.alt = `${user.username} icon`;
      img.src = `assets/icons/${user.icon}`;

      const span = document.createElement('span');
      span.className = 'user-name';
      span.textContent = user.username;

      d.appendChild(img);
      d.appendChild(span);
      grid.appendChild(d);
    });
  }

  if (!grid.children.length) {
    const empty = document.createElement('div');
    empty.className = 'user-empty';
    empty.textContent = 'No users match that search.';
    grid.appendChild(empty);
  }
}

/* ===============================
   PIN DISPLAYS
================================ */
function updateUserPinDisplay() {
  const el = document.getElementById('userPinDisplay');
  if (el) el.textContent = '•'.repeat(enteredUserPin.length).padEnd(4, '•');
}

function updateAdminPinDisplay() {
  const el = document.getElementById('adminPinDisplay');
  if (el) el.textContent = '•'.repeat(enteredAdminPin.length).padEnd(4, '•');
}

/* ===============================
   FAVORITES
================================ */
function toggleFavoriteExercise(name) {
  if (!window.currentUser || window.currentUser === 'guest') return;

  const users = getUsers();
  const user = users.find(u => u.username === window.currentUser);
  if (!user) return;

  ensureFavorites(user);

  // Normalize for matching
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedName = normalize(name);
  
  // Find existing favorite with normalized matching
  const index = user.favorites.exercises.findIndex(fav => 
    normalize(fav) === normalizedName
  );

  if (index >= 0) {
    user.favorites.exercises.splice(index, 1);
  } else {
    user.favorites.exercises.push(name);
  }

  saveUsers(users);
}

function isFavoriteExercise(name) {
  const user = getCurrentUserObject();
  if (!user?.favorites?.exercises) return false;
  
  // Normalize for matching
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedName = normalize(name);
  
  return user.favorites.exercises.some(fav => 
    normalize(fav) === normalizedName
  );
}

function toggleFavoriteMuscle(muscle) {
  const user = getCurrentUserObject();
  if (!user) return;
  ensureFavorites(user);

  const i = user.favorites.muscles.indexOf(muscle);
  if (i >= 0) user.favorites.muscles.splice(i, 1);
  else user.favorites.muscles.push(muscle);

  saveUsers(getUsers());
}

function isFavoriteMuscle(muscle) {
  return !!getCurrentUserObject()?.favorites?.muscles?.includes(muscle);
}

/* ===============================
   FAVORITES SCREEN
================================ */
function renderFavoritesScreen() {
  const grid = document.getElementById('favoritesGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const user = getCurrentUserObject();
  if (!user || !user.favorites) {
    grid.innerHTML = '<p>No favorites yet.</p>';
    return;
  }

  /* ===============================
     FAVORITE MUSCLE GROUPS
  ================================ */
  if (user.favorites.muscles.length) {
    const h = document.createElement('h2');
    h.textContent = '⭐ Favorite Muscle Groups';
    grid.appendChild(h);

    user.favorites.muscles.forEach(m => {
      const d = document.createElement('div');
      d.className = 'favorite-muscle';
      d.textContent = m.toUpperCase();
      grid.appendChild(d);
    });
  }

  /* ===============================
     FAVORITE EXERCISES
  ================================ */
  if (!user.favorites.exercises.length) {
    if (!user.favorites.muscles.length) {
      grid.innerHTML = '<p>No favorites yet.</p>';
    }
    return;
  }

  const h2 = document.createElement('h2');
  h2.textContent = '⭐ Favorite Exercises';
  grid.appendChild(h2);

  // 🔑 normalize names so matching ALWAYS works
  const normalize = s =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '');

  user.favorites.exercises.forEach(savedName => {
    let found = null;

    Object.values(window.LOCAL_EXERCISES || {}).forEach(group => {
      if (found) return;
      found = group.find(ex =>
        normalize(ex.name).includes(normalize(savedName)) ||
        normalize(savedName).includes(normalize(ex.name))
      );
    });

    if (!found) {
      console.warn('Favorite exercise not found:', savedName);
      return;
    }

    const card = document.createElement('div');
card.className = 'exercise-card';

const favBtn = document.createElement('button');
favBtn.className = 'favorite-btn active';
favBtn.textContent = '⭐ Favorited';

favBtn.addEventListener('click', e => {
  e.stopPropagation();
  toggleFavoriteExercise(found.name);
  renderFavoritesScreen(); // refresh list after removal
});

    card.innerHTML = `
  <h3 class="exercise-name">${found.name} <span style="font-size: 0.85em; margin-left: 8px;">${getDifficultyEmoji(found.difficulty)}</span></h3>

  <div class="exercise-howto">
    <strong>How to perform:</strong>
    <ol>
      ${(found.howTo || []).map(step => `<li>${step}</li>`).join('')}
    </ol>
  </div>

  <div class="exercise-muscles">
    <strong>Primary:</strong> ${(found.primary || []).join(', ') || '—'}<br>
    <strong>Secondary:</strong> ${
      found.secondary?.length ? found.secondary.join(', ') : 'None'
    }
  </div>
`;

card.appendChild(favBtn);
grid.appendChild(card);
  });
}
/* ===============================
  ADMIN SETTINGS
================================ */
function populateAdminUserList() {
  if (window.adminModule?.populateAdminUserList) {
    window.adminModule.populateAdminUserList({
      getUsers,
      saveUsers,
      hashUserPin,
      showAlert,
      showConfirmDialog,
      getSelectedAdminUser: () => selectedAdminUser,
      setSelectedAdminUser: (value) => { selectedAdminUser = value; },
      populateAdminUserList
    });
  }
}

/**
 * Show modal for logging weight/reps when completing an exercise
 */
function showWeightRepsModal(muscle, exercise, onComplete) {
  const modal = document.createElement('div');
  modal.id = 'weightRepsModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 30px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  `;
  
  // Get previous attempt
  const prevAttempt = getPreviousAttempt(window.currentUser, exercise.name);
  
  content.innerHTML = `
    <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #333;">
      ${exercise.name}
    </div>
    <div style="color: #666; margin-bottom: 20px; font-size: 14px;">
      Log your weight and reps (optional)
    </div>
    
    ${prevAttempt ? `
      <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; margin-bottom: 20px; border-radius: 4px; font-size: 13px;">
        <strong>Previous:</strong> ${prevAttempt.sets.map(s => `${s.weight} lbs × ${s.reps}`).join(', ')}
      </div>
    ` : ''}
    
    <div id="setsContainer" style="margin-bottom: 20px;">
      <!-- Sets will be added here -->
    </div>
    
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <button id="addSetBtn" style="flex: 1; padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; color: #2196f3; font-weight: bold; cursor: pointer;">
        + Add Set
      </button>
    </div>

    <div id="numberPadContainer" style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; display: block;">
      <div style="font-size: 12px; color: #666; margin-bottom: 10px;" id="padLabel">Enter weight (lbs):</div>
      <div class="number-pad" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
        <button data-pad-key="1" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">1</button>
        <button data-pad-key="2" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">2</button>
        <button data-pad-key="3" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">3</button>
        <button data-pad-key="4" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">4</button>
        <button data-pad-key="5" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">5</button>
        <button data-pad-key="6" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">6</button>
        <button data-pad-key="7" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">7</button>
        <button data-pad-key="8" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">8</button>
        <button data-pad-key="9" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">9</button>
        <button data-pad-key="." style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">.</button>
        <button data-pad-key="0" style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; cursor: pointer;">0</button>
        <button data-pad-key="clear" style="padding: 12px; background: #ffcdd2; border: 1px solid #ef5350; border-radius: 6px; font-weight: bold; cursor: pointer; color: #ef5350;">C</button>
      </div>
      <button id="padDoneBtn" style="width: 100%; padding: 10px; margin-top: 10px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Done</button>
    </div>
    
    <div style="display: flex; gap: 12px; margin-top: 20px;">
      <button id="skipBtn" style="flex: 1; padding: 12px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; color: #333; font-weight: bold; cursor: pointer;">
        Skip Logging
      </button>
      <button id="submitBtn" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">
        Complete Exercise
      </button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  const setsContainer = content.querySelector('#setsContainer');
  const addSetBtn = content.querySelector('#addSetBtn');
  const skipBtn = content.querySelector('#skipBtn');
  const submitBtn = content.querySelector('#submitBtn');
  const numberPadContainer = content.querySelector('#numberPadContainer');
  
  let setCount = 1;
  const sets = [];
  let currentFocusedInput = null;
  
  function addSetInput() {
    const setDiv = document.createElement('div');
    setDiv.className = 'set-input-group';
    setDiv.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 12px;
      margin-bottom: 12px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 8px;
      align-items: center;
    `;
    
    const setIndex = setCount++;
    const setData = { weight: '', reps: '' };
    sets.push(setData);
    
    setDiv.innerHTML = `
      <input 
        type="number" 
        placeholder="Weight (lbs)" 
        class="set-weight" 
        style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
      />
      <input 
        type="number" 
        placeholder="Reps" 
        class="set-reps" 
        style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
      />
      <button class="remove-set" style="padding: 8px 12px; background: #ffebee; border: 1px solid #ef5350; color: #ef5350; border-radius: 6px; cursor: pointer; font-size: 12px;">
        Remove
      </button>
    `;
    
    const weightInput = setDiv.querySelector('.set-weight');
    const repsInput = setDiv.querySelector('.set-reps');
    const removeBtn = setDiv.querySelector('.remove-set');
    
    // Pre-fill with previous values if available
    if (prevAttempt && prevAttempt.sets[setIndex - 1]) {
      const prevSet = prevAttempt.sets[setIndex - 1];
      weightInput.value = prevSet.weight;
      repsInput.value = prevSet.reps;
    }
    
    // Update set data on input
    weightInput.addEventListener('input', (e) => {
      setData.weight = parseFloat(e.target.value) || 0;
    });
    
    repsInput.addEventListener('input', (e) => {
      setData.reps = parseInt(e.target.value) || 0;
    });

    // Show number pad on focus
    const padLabel = content.querySelector('#padLabel');

    weightInput.addEventListener('focus', () => {
      currentFocusedInput = weightInput;
      numberPadContainer.style.display = 'block';
      padLabel.textContent = 'Enter weight (lbs):';
    });

    repsInput.addEventListener('focus', () => {
      currentFocusedInput = repsInput;
      numberPadContainer.style.display = 'block';
      padLabel.textContent = 'Enter reps:';
    });
    
    removeBtn.addEventListener('click', () => {
      setDiv.remove();
      const idx = sets.indexOf(setData);
      if (idx >= 0) sets.splice(idx, 1);
    });
    
    setsContainer.appendChild(setDiv);
  }
  
  // Add 3 default sets
  addSetInput();
  addSetInput();
  addSetInput();
  
  // Auto-focus first weight input to show keyboard immediately
  const firstWeightInput = setsContainer.querySelector('.set-weight');
  if (firstWeightInput) {
    setTimeout(() => {
      firstWeightInput.focus();
    }, 100);
  }
  
  addSetBtn.addEventListener('click', addSetInput);

  // Number pad functionality
  const padDoneBtn = content.querySelector('#padDoneBtn');
  const padButtons = content.querySelectorAll('[data-pad-key]');

  padButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentFocusedInput) return;

      const key = btn.dataset.padKey;

      if (key === 'clear') {
        currentFocusedInput.value = '';
      } else {
        // Prevent multiple decimals
        if (key === '.' && currentFocusedInput.value.includes('.')) return;
        currentFocusedInput.value += key;
      }

      // Trigger input event to update set data
      currentFocusedInput.dispatchEvent(new Event('input'));
    });
  });

  padDoneBtn.addEventListener('click', () => {
    numberPadContainer.style.display = 'none';
    currentFocusedInput = null;
  });
  
  skipBtn.addEventListener('click', () => {
    modal.remove();
    onComplete();
  });
  
  submitBtn.addEventListener('click', () => {
    // Filter out empty sets
    const filledSets = sets.filter(s => s.weight > 0 && s.reps > 0);
    
    if (filledSets.length > 0) {
      // Update PR tracking
      const isPR = updatePersonalRecords(window.currentUser, exercise.name, filledSets);
      
      if (isPR) {
        showPRCelebration(exercise.name);
      }
    }
    
    modal.remove();
    onComplete();
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/* ===============================
   EXERCISES
================================ */
function toExerciseSlug(name = '') {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[()]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeMediaPath(value = '') {
  return String(value)
    .trim()
    .replace(/\\/g, '/')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\/+/g, '/');
}

function getMediaPathCandidates(primaryPath, fallbackPaths = []) {
  const seen = new Set();
  const addCandidate = (candidate, list) => {
    if (!candidate) return;
    const normalized = normalizeMediaPath(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    list.push(normalized);
  };

  const candidates = [];
  addCandidate(primaryPath, candidates);
  fallbackPaths.forEach((pathCandidate) => addCandidate(pathCandidate, candidates));
  return candidates;
}

function applyImageFallbacks(imgElement, candidates, contextLabel = 'image') {
  if (!imgElement || !Array.isArray(candidates) || candidates.length === 0) {
    if (imgElement) imgElement.style.display = 'none';
    return;
  }

  let candidateIndex = 0;
  imgElement.src = candidates[candidateIndex];

  imgElement.onerror = () => {
    candidateIndex += 1;
    if (candidateIndex < candidates.length) {
      imgElement.src = candidates[candidateIndex];
      return;
    }

    imgElement.style.display = 'none';
    console.log(`Image not found (${contextLabel}):`, candidates.join(' | '));
  };
}

function loadExercisesForMuscle(muscle) {
  const title = document.getElementById('exerciseTitle');
  const grid = document.getElementById('exerciseGrid');
  const img = document.getElementById('muscleHeaderImage');
  const shareBtn = document.getElementById('shareWorkoutBtn');

  if (!title || !grid) return;
  if (!muscle || typeof muscle !== 'string') {
    console.warn('loadExercisesForMuscle called without a valid muscle:', muscle);
    return;
  }

  selectedMuscle = muscle; // Store for filter reapplication
  currentDifficultyFilterContext = 'muscle';
  showScreen('exerciseScreen');
  title.textContent = muscle.toUpperCase();
  grid.innerHTML = '';

  if (img) {
    img.src = `assets/muscles/${muscle}.png`;
    img.onerror = () => (img.style.display = 'none');
    img.style.display = 'block';
  }

  let list = window.LOCAL_EXERCISES?.[muscle] || [];
  if (!list || !list.length) {
    grid.innerHTML = '<p>No exercises available.</p>';
    return;
  }

  // Apply difficulty filter
  list = filterExercisesByDifficulty(list, currentDifficultyFilter);

  // Add difficulty legend at the top
  const legendDiv = document.createElement('div');
  legendDiv.style.cssText = 'grid-column: 1 / -1; padding: 20px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 30px; justify-content: center; flex-wrap: wrap; color: #333;';
  legendDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; color: #333;">
      <span style="font-size: 24px;">🟢</span>
      <span><strong>Beginner</strong></span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; color: #333;">
      <span style="font-size: 24px;">🟡</span>
      <span><strong>Intermediate</strong></span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; color: #333;">
      <span style="font-size: 24px;">🔴</span>
      <span><strong>Advanced</strong></span>
    </div>
  `;
  grid.appendChild(legendDiv);

  // Limit to 15 exercises for display
  const displayList = list.slice(0, 15);

  // Show difficulty filter
  showDifficultyFilter();
  setTimeout(() => setupDifficultyFilter(), 100);
  // Store the exercises for later sharing, but don't create workout yet
  currentWorkout = {
    muscle: muscle,
    exercises: displayList,
    user: window.currentUser
  };

  // Show share button and set up click handler
  if (shareBtn) {
    shareBtn.style.display = 'block';
    shareBtn.textContent = '📱 Send to Phone with QR Code';
    shareBtn.onclick = async () => {
      // Create workout ID only when sharing
      const workoutId = generateUUID();
      const workoutToShare = {
        id: workoutId,
        muscle: currentWorkout.muscle,
        exercises: currentWorkout.exercises,
        created: new Date().toISOString(),
        user: currentWorkout.user
      };
      
      // Save workout to server first, then show QR
      await saveWorkoutToServer(workoutId, workoutToShare);
      
      // Mark workout as completed today and save workout data
      const today = new Date();
      saveWorkoutToCalendarDate(today, workoutToShare);
      
      // Record in analytics for user stats
      if (typeof recordWorkout === 'function' && currentWorkout) {
        recordWorkout(
          [currentWorkout.muscle],
          currentWorkout.exercises?.map(e => e.name || e) || [],
          30
        );
      }
      
      // Display QR code
      displayQRCodeModal(workoutId, kioskIP);
    };
  }

  displayList.forEach((ex, idx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';

    // Use provided image path, slug, or fallback to name conversion
    const slug = ex.slug || toExerciseSlug(ex.name);
    const imagePath = ex.image || `assets/muscles/${muscle}/${slug}.png`;
    const videoPath = `assets/videos/${muscle}/${slug}.mp4`;
    const demoVideoPath = `assets/muscles/${muscle}/${slug}.mp4`;

    // Create image with fallback
    const img = document.createElement('img');
    const imageCandidates = getMediaPathCandidates(imagePath, [
      `assets/muscles/${muscle}/${slug}.png`,
      `assets/muscles/${muscle}/${String(ex.name || '').replace(/[()]/g, '').trim()}.png`,
      `assets/muscles/${muscle}/${String(ex.name || '').trim()}.png`
    ]);
    applyImageFallbacks(img, imageCandidates, ex.name || 'exercise');
    img.alt = ex.name;
    img.className = 'exercise-image';
    img.style.cssText = 'width: 100%; height: 150px; object-fit: contain; border-radius: 8px; margin-bottom: 12px; display: block;';

    // Play demo video on image tap for Close Grip Pulldown
    if (slug === 'close-grip-pulldown') {
      img.style.cursor = 'pointer';
      img.title = 'Tap to play demo';

      img.addEventListener('click', () => {
        const video = document.createElement('video');
        video.src = demoVideoPath;
        video.controls = true;
        video.playsInline = true;
        video.muted = false;
        video.style.cssText = img.style.cssText;
        applyPreferredAudioOutputWhenReady(video);

        video.addEventListener('ended', () => {
          if (video.parentElement) {
            video.parentElement.replaceChild(img, video);
          }
        });

        video.addEventListener('click', () => {
          video.pause();
          if (video.parentElement) {
            video.parentElement.replaceChild(img, video);
          }
        });

        if (img.parentElement) {
          img.parentElement.replaceChild(video, img);
          video.play().catch(() => {});
        }
      });
    }

    card.appendChild(img);

    // Create text content
    const content = document.createElement('div');
    
    const difficultyEmoji = getDifficultyEmoji(ex.difficulty);
    
    content.innerHTML = `
      <h3 class="exercise-name">${ex.name} <span style="font-size: 0.85em; margin-left: 8px;">${difficultyEmoji}</span></h3>

      <div class="exercise-howto">
        <strong>How to perform:</strong>
        <ol>
          ${(ex.howTo || []).map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>

      <div class="exercise-muscles">
        <strong>Primary muscles:</strong>
        ${(ex.primary || []).join(', ') || '—'}<br>
        <strong>Secondary muscles:</strong>
        ${(ex.secondary || []).length ? ex.secondary.join(', ') : 'None'}
      </div>
    `;
    card.appendChild(content);

    // Training Variants button with labels
    const variantContainer = document.createElement('div');
    variantContainer.style.cssText = 'position: absolute; top: 12px; right: 12px; text-align: center;';
    
    const infoBtn = document.createElement('button');
    infoBtn.className = 'info-btn';
    infoBtn.innerHTML = 'ℹ️ Training Info';
    infoBtn.title = 'View training variants';
    infoBtn.style.cssText = 'background: rgba(var(--color-gold-rgb), 0.2); border: 1px solid var(--color-gold); color: var(--color-gold); border-radius: 8px; padding: 8px 12px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.3s; display: block; margin-bottom: 8px;';
    infoBtn.onmouseover = () => infoBtn.style.background = 'var(--color-gold)';
    infoBtn.onmouseout = () => infoBtn.style.background = 'rgba(var(--color-gold-rgb), 0.2)';
    infoBtn.onclick = e => {
      e.stopPropagation();
      showExerciseVariantModal(ex.name);
    };
    
    const variantLabels = document.createElement('div');
    variantLabels.style.cssText = 'font-size: 11px; color: var(--color-gold); line-height: 1.4;';
    variantLabels.innerHTML = `
      <div>⚡ Power variant</div>
      <div>💪 Hypertrophy variant</div>
      <div>🛌 Rehab variant</div>
    `;
    
    variantContainer.appendChild(infoBtn);
    variantContainer.appendChild(variantLabels);
    card.appendChild(variantContainer);

    // ⭐ Favorite button
    const fav = document.createElement('button');
    fav.className = 'favorite-btn';
    fav.textContent = '⭐ Favorite';

    if (isFavoriteExercise(ex.name)) {
      fav.classList.add('active');
    }

    fav.onclick = e => {
      e.stopPropagation();
      toggleFavoriteExercise(ex.name);

      if (isFavoriteExercise(ex.name)) {
        fav.classList.add('active');
      } else {
        fav.classList.remove('active');
      }
    };

    card.appendChild(fav);

    // ✓ Complete Exercise button
    const completeExerciseBtn = document.createElement('button');
    completeExerciseBtn.className = 'complete-exercise-btn';
    completeExerciseBtn.innerHTML = 'Complete';
    completeExerciseBtn.style.cssText = `
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    `;

    // Check if exercise is already completed today
    const isCompletedToday = isExerciseCompletedToday(muscle, ex.name);
    if (isCompletedToday) {
      completeExerciseBtn.innerHTML = '✓ Completed!';
      completeExerciseBtn.style.background = '#059669';
      completeExerciseBtn.disabled = true;
    }

    completeExerciseBtn.onmouseover = () => {
      completeExerciseBtn.style.transform = 'translateY(-2px)';
      completeExerciseBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
    };

    completeExerciseBtn.onmouseout = () => {
      completeExerciseBtn.style.transform = 'translateY(0)';
      completeExerciseBtn.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
    };

    completeExerciseBtn.onclick = e => {
      e.stopPropagation();
      
      if (!window.currentUser || window.currentUser === 'guest') {
        showAlert('Notice', 'Please create a profile to track workouts. Guest mode does not save progress.');
        return;
      }

      // Show weight/reps modal before recording
      showWeightRepsModal(muscle, ex, () => {
        // Record single exercise completion
        if (typeof recordWorkout === 'function') {
          recordWorkout(
            [muscle],           // Muscle group
            [ex.name],          // Single exercise
            15                  // 15 min for single exercise
          );
        }

        // Save to calendar
        const today = new Date();
        saveWorkoutToCalendarDate(today, {
          muscle: muscle,
          exercises: [{ name: ex.name }],
          user: window.currentUser
        });

        // Save completed exercise to localStorage
        saveCompletedExercise(muscle, ex.name);

        // Track progression for recommendations & adaptive difficulty
        trackExerciseProgression(window.currentUser, muscle, ex.name, 12, 'light');

        // Visual feedback - show checkmark and disable button
        completeExerciseBtn.innerHTML = '✓ Completed!';
        completeExerciseBtn.style.background = '#059669';
        completeExerciseBtn.disabled = true;
        console.log('Exercise completed:', ex.name);
      });
    };

    card.appendChild(completeExerciseBtn);
    grid.appendChild(card);
  });
}

/* ===============================
   ANIMATION FALLBACK SETUP
================================ */
function setupAnimationFallback(exerciseName, canvasId) {
  // Wait for canvas to be in DOM
  const canvas = document.getElementById(canvasId);
  const placeholder = document.getElementById(canvasId + '-placeholder');
  const video = canvas?.parentElement?.querySelector('video');
  
  if (!canvas) return;

  // Check if animation exists
  const animationKey = exerciseName.toLowerCase();
  if (!EXERCISE_ANIMATIONS || !EXERCISE_ANIMATIONS[animationKey]) {
    // No animation available
    return;
  }

  // Create animator
  const animator = new ExerciseAnimator(canvasId, exerciseName);

  // Hide video if it fails to load, show animation
  if (video) {
    video.addEventListener('error', () => {
      video.style.display = 'none';
      canvas.style.display = 'block';
      placeholder.style.display = 'none';
      animator.play();
      console.log(`UI.JS: Playing animation for ${exerciseName} (video failed)`);
    });

    video.addEventListener('loadstart', () => {
      placeholder.style.display = 'none';
    });
  }

  // If no video source loads, show animation after delay
  setTimeout(() => {
    if (!video || video.style.display === 'none') {
      if (canvas.style.display === 'none') {
        canvas.style.display = 'block';
        placeholder.style.display = 'none';
        animator.play();
        console.log(`UI.JS: Fallback animation for ${exerciseName}`);
      }
    }
  }, 1000);
}

/* ===============================
   LOAD STRETCHES FOR BODY PART
================================ */
function loadStretchesForBodyPart(bodyPart) {
  const title = document.getElementById('exerciseTitle');
  const grid = document.getElementById('exerciseGrid');
  const img = document.getElementById('muscleHeaderImage');
  const shareBtn = document.getElementById('shareWorkoutBtn');

  if (!title || !grid) return;

  selectedStretchBodyPart = bodyPart;
  currentDifficultyFilterContext = 'stretch';
  showScreen('exerciseScreen');
  
  // Format title nicely (e.g., "neck-shoulders" → "Neck & Shoulders")
  const titleMap = {
    'neck-shoulders': 'Neck & Shoulders',
    'arms-wrists': 'Arms & Wrists',
    'legs-glutes': 'Legs & Glutes',
    'hips-pelvis': 'Hips & Pelvis',
    'spine-core': 'Spine & Core'
  };
  const bodyPartTitle = titleMap[bodyPart] || bodyPart.toUpperCase();
  title.textContent = bodyPartTitle;
  grid.innerHTML = '';

  if (img) img.style.display = 'none';

  const allStretches = window.LOCAL_EXERCISES?.stretchesByBodyPart?.[bodyPart] || [];
  if (!allStretches || !allStretches.length) {
    grid.innerHTML = '<p>No stretches available for this body part.</p>';
    return;
  }

  const stretches = filterExercisesByDifficulty(allStretches, currentDifficultyFilter);

  // Add difficulty legend at the top
  const legendDiv = document.createElement('div');
  legendDiv.style.cssText = 'grid-column: 1 / -1; padding: 20px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 30px; justify-content: center; flex-wrap: wrap; color: #333;';
  legendDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; color: #333;">
      <span style="font-size: 24px;">🟢</span>
      <span><strong>Beginner</strong></span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; color: #333;">
      <span style="font-size: 24px;">🟡</span>
      <span><strong>Intermediate</strong></span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; color: #333;">
      <span style="font-size: 24px;">🔴</span>
      <span><strong>Advanced</strong></span>
    </div>
  `;
  grid.appendChild(legendDiv);

  // Show shared difficulty filter row
  showDifficultyFilter();
  setupDifficultyFilter();

  if (!stretches.length) {
    grid.innerHTML = `<p>No ${currentDifficultyFilter} stretches available for this body part.</p>`;
    if (shareBtn) shareBtn.style.display = 'none';
    return;
  }

  if (shareBtn) {
    shareBtn.style.display = 'block';
    shareBtn.textContent = '📱 Send Stretches to Phone with QR Code';
    shareBtn.onclick = async () => {
      const stretchId = generateUUID();
      const stretchRoutine = {
        id: stretchId,
        type: 'stretch',
        title: `${bodyPartTitle} Stretch Routine`,
        bodyPart,
        exercises: stretches,
        created: new Date().toISOString(),
        user: window.currentUser
      };

      await saveWorkoutToServer(stretchId, stretchRoutine);
      displayQRCodeModal(stretchId, kioskIP, { type: 'stretch' });
    };
  }

  stretches.forEach((stretch, idx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';

    // Create image with fallback
    const imagePath = stretch.image;
    if (imagePath) {
      const img = document.createElement('img');
      const stretchSlug = stretch.slug || toExerciseSlug(stretch.name);
      const stretchImageCandidates = getMediaPathCandidates(imagePath, [
        `assets/stretches/${stretchSlug}.png`,
        `assets/stretches/${String(stretch.name || '').trim()}.png`,
        `assets/stretches/${String(stretch.name || '').replace(/[()]/g, '').trim()}.png`
      ]);
      applyImageFallbacks(img, stretchImageCandidates, stretch.name || 'stretch');
      img.alt = stretch.name;
      img.className = 'exercise-image';
      img.style.cssText = 'width: 100%; height: 150px; object-fit: contain; border-radius: 8px; margin-bottom: 12px; display: block;';

      card.appendChild(img);
    }

    // Create text content
    const content = document.createElement('div');

    const difficultyEmoji = getDifficultyEmoji(stretch.difficulty);

    content.innerHTML = `
      <h3 class="exercise-name">${stretch.name} <span style="font-size: 0.85em; margin-left: 8px;">${difficultyEmoji}</span></h3>

      <div class="exercise-howto">
        <strong>How to perform:</strong>
        <ol>
          ${(stretch.howTo || []).map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>

      <div class="exercise-muscles">
        <strong>Primary stretch:</strong>
        ${(stretch.primary || []).join(', ') || '—'}<br>
        <strong>Secondary stretch:</strong>
        ${(stretch.secondary || []).length ? stretch.secondary.join(', ') : 'None'}
      </div>
    `;
    card.appendChild(content);

    // ⭐ Favorite button
    const fav = document.createElement('button');
    fav.className = 'favorite-btn';
    fav.textContent = '⭐ Favorite';

    if (isFavoriteExercise(stretch.name)) {
      fav.classList.add('active');
    }

    fav.onclick = e => {
      e.stopPropagation();
      toggleFavoriteExercise(stretch.name);

      if (isFavoriteExercise(stretch.name)) {
        fav.classList.add('active');
      } else {
        fav.classList.remove('active');
      }
    };

    card.appendChild(fav);

    grid.appendChild(card);
  });
}

/* ===============================
   DOM READY
================================ */
function initializeApp() {

  removeDeprecatedBiometricData();

    // Add Exit Kiosk App button handler (admin panel)
    const exitKioskAppBtn = document.getElementById('exitKioskApp');
    if (exitKioskAppBtn && window.electron && window.electron.exitApp) {
      exitKioskAppBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit the Kiosk App?')) {
          window.electron.exitApp(window.getAdminSessionToken?.()).then((result) => {
            if (result?.success === false) showAlert('Authorization Required', result.error || 'Please sign in as administrator again.');
          });
        }
      });
    }
  console.log('🚀 initializeApp() START');
  // ensure default users exist (adds Rick if users list is empty)
  seedDefaultUser();
  
  // Clean up any favorites that don't match real exercises
  cleanupStaleFavorites();
  
  console.log('📍 Calling resetToStart()...');
  resetToStart();
  console.log('🚀 initializeApp() user screen should be visible');

  initializeDisclaimerFlow();
  setupGlobalErrorHandlers();
  updateAdminAutoLogoutButtonLabel();
  updateAdminQrModeButtonLabel();
  updateAdminAmbientSilentHoursUI();

  // ATTACH ALL EVENT LISTENERS
  console.log('🔌 Attaching event listeners...');
  
  const userSearchInput = document.getElementById('userSearchInput');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', () => {
      renderUserScreen();
    });
    console.log('✅ userSearchInput listener attached');
  } else {
    console.error('❌ userSearchInput not found!');
  }

  userSearchInput?.addEventListener('focus', () => {
    const searchKeyboardModal = document.getElementById('searchUserKeyboardModal');
    if (searchKeyboardModal) {
      searchKeyboardModal.classList.remove('hidden');
      const input = document.getElementById('userSearchInput');
      // Store reference to search input so keyboard knows where to type
      document.activeKeyboardInput = input;
    }
  });

  userSearchInput?.addEventListener('blur', () => {
    // Close keyboard when search input loses focus
    setTimeout(() => {
      if (document.activeElement?.id !== 'userSearchInput' && !document.activeElement?.classList?.contains('keyboard-key')) {
        document.getElementById('searchUserKeyboardModal')?.classList.add('hidden');
        // Clear the active keyboard input reference
        document.activeKeyboardInput = null;
      }
    }, 100);
  });

  document.getElementById('closeSearchKeyboard')?.addEventListener('click', () => {
    document.getElementById('searchUserKeyboardModal')?.classList.add('hidden');
    document.activeKeyboardInput = null;
  });

  const userGrid = document.getElementById('userGrid');
  console.log('🔌 userGrid element found:', !!userGrid);
  
  if (userGrid) {
    console.log('🔌 Attaching click listener to userGrid...');
    userGrid.addEventListener('click', e => {
        console.log('🖱️ CLICK FIRED on userGrid element');
        console.log('🖱️ Blocked flag status:', document.getUserTileClickBlocked);
        
        // CRITICAL: Prevent any user tile clicks while authentication is in progress
        if (document.getUserTileClickBlocked === true) {
          console.log('⚠️ User tile click blocked - auth in progress');
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        console.log('🖱️ Block check passed, looking for tile...');
        const tile = e.target.closest('.user');
        console.log('🖱️ Tile found:', !!tile, 'Target:', e.target);
        if (!tile) return;

  const name = tile.dataset.user;
  console.log('USER TILE CLICKED:', name);

  // ➕ CREATE PROFILE
  if (name === 'create') {
    console.log('OPEN CREATE USER MODAL');

    const modal = document.getElementById('createUserModal');
    const input = document.getElementById('newUsernameInput');

    if (!modal || !input) {
      console.error('❌ Create user modal or input missing');
      return;
    }

    input.value = '';
    modal.classList.remove('hidden');
    document.activeKeyboardInput = input;
    
    // Ensure input is focused and ready
    setTimeout(() => {
      input.focus();
      input.click();
    }, 50);
    
    return;
  }

  // 👤 GUEST
  if (name === 'guest') {
    window.currentUser = 'guest';
    showMainActionsScreen();
    return;
  }

  // 🔐 ADMIN
  if (name === 'admin') {
    enteredAdminPin = '';
    updateAdminPinDisplay();
    document.getElementById('adminPinModal')?.classList.remove('hidden');
    return;
  }

  // 👤 NORMAL USER → PIN OR FACE LOGIN
  const user = getUsers().find(u => u.username === name);
  if (!user) {
    console.log('❌ User not found:', name);
    return;
  }

  // Block future user tile clicks to prevent auth loop
  document.getUserTileClickBlocked = true;
  console.log('🔒 SETTING FLAG: Blocking user tile clicks (flag is now:', document.getUserTileClickBlocked, ')');
  
  pendingUser = user;
  enteredUserPin = '';
  updateUserPinDisplay();
  updateUserPinModalLoginControls(user);
  const modal = document.getElementById('userPinModal');
  if (!modal) {
    console.error('❌ userPinModal element not found!');
    document.getUserTileClickBlocked = false; // Unblock on error
    return;
  }
  modal.classList.remove('hidden');
  console.log('🔒 PIN modal shown - flag should be true:', document.getUserTileClickBlocked);
});

  // Top-left control buttons
  document.getElementById('openAdminBtn')?.addEventListener('click', () => {
    enteredAdminPin = '';
    updateAdminPinDisplay();
    document.getElementById('adminPinModal')?.classList.remove('hidden');
  });

  document.getElementById('openCreateUserBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('createUserModal');
    const input = document.getElementById('newUsernameInput');
    if (!modal || !input) return;
    input.value = '';
    modal.classList.remove('hidden');
    document.activeKeyboardInput = input;
    setTimeout(() => { input.focus(); input.click(); }, 50);
  });

  document.getElementById('openCreateUserHeaderBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('createUserModal');
    const input = document.getElementById('newUsernameInput');
    if (!modal || !input) return;
    input.value = '';
    modal.classList.remove('hidden');
    document.activeKeyboardInput = input;
    setTimeout(() => { input.focus(); input.click(); }, 50);
  });

  /* ===============================
     MAIN ACTION BUTTONS (After Login)
  ================================ */
  document.getElementById('muscleGroupsBtn')?.addEventListener('click', () => {
    showMuscleGroupsDirect();
  });

  document.getElementById('guidedDirectPathBtn')?.addEventListener('click', () => {
    showMuscleGroupsDirect();
  });

  document.getElementById('guidedPromptToggleBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('guidedPromptPanel');
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('#guidedEntryScreen [data-guided-group]').forEach(tile => {
    tile.addEventListener('click', () => {
      updateGuidedSelection(tile.dataset.guidedGroup, tile.dataset.value);
    });
  });

  document.getElementById('stretchesBtn')?.addEventListener('click', () => {
    currentDifficultyFilterContext = 'stretch';
    currentDifficultyFilter = 'all';
    updateDifficultyFilterButtons();
    showScreen('stretchScreen');
  });

  document.getElementById('buildPlanBtn')?.addEventListener('click', () => {
    showScreen('builderScreen');
    initializeBuilderTiles();
  });

  document.getElementById('buildNutritionBtn')?.addEventListener('click', () => {
    showScreen('nutritionBuilderScreen');
    initializeNutritionBuilder();
    // Load featured recipes from web
    if (typeof initializeFeaturedRecipes === 'function') {
      initializeFeaturedRecipes('featuredRecipesContainer');
    }
  });

  document.getElementById('fullBodyGeneratorBtn')?.addEventListener('click', () => {
    showScreen('fullBodyGeneratorScreen');
    initializeFullBodyGenerator();
  });

  document.getElementById('howToBtn')?.addEventListener('click', () => {
    showScreen('howToScreen');
    initializeHowToGuide();
  });

  document.getElementById('analyticsBtn')?.addEventListener('click', () => {
    renderAnalyticsScreen();
  });

  document.getElementById('myPRsBtn')?.addEventListener('click', () => {
    showScreen('personalRecordsScreen');
    renderPersonalRecordsScreen();
  });

  document.getElementById('interactiveCoachBtn')?.addEventListener('click', () => {
    renderInteractiveCoachScreen({ resetInterview: true });
  });

  initializeDailyChallenge();
  
  // Initialize Custom Icon Selector
  const iconSelector = document.querySelector('.custom-icon-selector');
  const iconSelectorSelected = document.getElementById('iconSelectorSelected');
  const iconSelectorDropdown = document.getElementById('iconSelectorDropdown');
  
  if (iconSelectorSelected) {
    iconSelectorSelected.addEventListener('click', (e) => {
      e.stopPropagation();
      iconSelector?.classList.toggle('open');
    });
  }
  
  // Handle icon option clicks
  document.querySelectorAll('.icon-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Remove selected class from all options
      document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      option.classList.add('selected');
      
      // Update the selected display
      const iconValue = option.dataset.value;
      const iconName = option.dataset.name;
      const iconImg = option.querySelector('img');
      
      if (iconSelectorSelected) {
        const preview = iconSelectorSelected.querySelector('.selected-icon-preview');
        const name = iconSelectorSelected.querySelector('.selected-icon-name');
        
        if (preview && iconImg) {
          preview.src = iconImg.src;
          preview.alt = iconName;
        }
        if (name) {
          name.textContent = iconName;
        }
      }
      
      // Close dropdown
      iconSelector?.classList.remove('open');
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (iconSelector && !iconSelector.contains(e.target)) {
      iconSelector.classList.remove('open');
    }
  });
  
  /* ===============================
     STRETCH SCREEN BODY PARTS
  ================================ */
  document.querySelectorAll('#stretchScreen .muscle').forEach(tile => {
    const bodyPart = tile.dataset.bodyPart;
    if (!bodyPart) return;

    tile.addEventListener('click', () => {
      loadStretchesForBodyPart(bodyPart);
    });
  });

  /* ===============================
     BACK BUTTONS
  ================================ */
  document.getElementById('backFromExercises')?.addEventListener('click', () => {
    console.log('🔙 Back from exercises clicked');
    goToPreviousScreen();
  });

  /* ON-SCREEN KEYBOARDS (CREATE USER AND USER SEARCH) */
  document.querySelectorAll('.keyboard-key').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();

      const keyboardModal = btn.closest('#createUserModal, #searchUserKeyboardModal');
      let input = document.activeKeyboardInput;

      if (keyboardModal?.id === 'createUserModal' && !keyboardModal.contains(input)) {
        input = document.getElementById('newUsernameInput');
      } else if (keyboardModal?.id === 'searchUserKeyboardModal') {
        input = document.getElementById('userSearchInput');
      }

      if (!input) return;

      const key = btn.dataset.key || '';
      const isPinInput = input.id === 'newUserPin';
      const selectionStart = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
      const selectionEnd = Number.isInteger(input.selectionEnd) ? input.selectionEnd : selectionStart;
      let nextValue = input.value;
      let nextCursor = selectionStart;

      if (key === 'backspace') {
        if (selectionStart !== selectionEnd) {
          nextValue = input.value.slice(0, selectionStart) + input.value.slice(selectionEnd);
        } else if (selectionStart > 0) {
          nextValue = input.value.slice(0, selectionStart - 1) + input.value.slice(selectionEnd);
          nextCursor = selectionStart - 1;
        }
      } else {
        if (isPinInput && !/^\d$/.test(key)) return;
        const maxLength = input.maxLength > 0 ? input.maxLength : 40;
        const candidate = input.value.slice(0, selectionStart) + key + input.value.slice(selectionEnd);
        if (candidate.length > maxLength) return;
        nextValue = candidate;
        nextCursor = selectionStart + key.length;
      }

      input.value = nextValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      input.setSelectionRange?.(nextCursor, nextCursor);
      document.activeKeyboardInput = input;
    });
  });

  ['newUsernameInput', 'newUserPin'].forEach(inputId => {
    const input = document.getElementById(inputId);
    input?.addEventListener('focus', () => {
      document.activeKeyboardInput = input;
    });
    input?.addEventListener('click', () => {
      document.activeKeyboardInput = input;
    });
  });

    // Workout Type tiles (Muscle vs Stretch)
    const workoutTypeTiles = document.querySelectorAll('#builderWorkoutTypeGrid .builder-tile');
    const muscleGrid = document.getElementById('builderMuscleGrid');
    const stretchGrid = document.getElementById('builderStretchGrid');
    const muscleGroupTitle = document.getElementById('muscleGroupTitle');

    function syncBuilderWorkoutTypeUI() {
      if (!muscleGrid || !stretchGrid || !muscleGroupTitle) return;

      // Keep one visible grid only: muscle OR stretch.
      if (selectedWorkoutType === 'stretch') {
        muscleGrid.style.display = 'none';
        stretchGrid.style.display = 'grid';
        muscleGroupTitle.textContent = 'Select Stretch Category';
        document.querySelectorAll('#builderMuscleGrid .builder-tile').forEach(t => t.classList.remove('selected'));
      } else {
        muscleGrid.style.display = 'grid';
        stretchGrid.style.display = 'none';
        muscleGroupTitle.textContent = 'Select Muscle Group';
        document.querySelectorAll('#builderStretchGrid .builder-tile').forEach(t => t.classList.remove('selected'));
      }

      workoutTypeTiles.forEach(t => t.classList.toggle('selected', t.dataset.value === selectedWorkoutType));
    }

    console.log(`UI.JS: Found ${workoutTypeTiles.length} workout type tiles`);
    
    workoutTypeTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        console.log(`UI.JS: Workout type tile clicked: ${tile.dataset.value}`);
        document.querySelectorAll('#builderWorkoutTypeGrid .builder-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedWorkoutType = tile.dataset.value;
        selectedMuscle = null; // Reset muscle selection when switching types
        syncBuilderWorkoutTypeUI();
      });
    });

    // Ensure correct visibility every time the builder screen opens.
    selectedWorkoutType = selectedWorkoutType === 'stretch' ? 'stretch' : 'muscle';
    syncBuilderWorkoutTypeUI();

    // Muscle tiles
    const muscleTiles = document.querySelectorAll('#builderMuscleGrid .builder-tile');
    console.log(`UI.JS: Found ${muscleTiles.length} muscle tiles`);
    
    muscleTiles.forEach((tile, index) => {
      tile.addEventListener('click', () => {
        console.log(`UI.JS: Muscle tile clicked: ${tile.dataset.value}`);
        document.querySelectorAll('#builderMuscleGrid .builder-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedMuscle = tile.dataset.value;
      });
    });

    // Stretch tiles
    const stretchTiles = document.querySelectorAll('#builderStretchGrid .builder-tile');
    console.log(`UI.JS: Found ${stretchTiles.length} stretch tiles`);
    
    stretchTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        console.log(`UI.JS: Stretch tile clicked: ${tile.dataset.value}`);
        document.querySelectorAll('#builderStretchGrid .builder-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedMuscle = tile.dataset.value;
      });
    });

    // Goal tiles
    const goalTiles = document.querySelectorAll('#builderGoalGrid .builder-tile');
    console.log(`UI.JS: Found ${goalTiles.length} goal tiles`);
    
    goalTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        console.log(`UI.JS: Goal tile clicked: ${tile.dataset.value}`);
        document.querySelectorAll('#builderGoalGrid .builder-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedGoal = tile.dataset.value;
      });
    });

    // Sport dropdown (optional)
    const sportSelect = document.getElementById('builderSportSelect');
    if (sportSelect) {
      sportSelect.addEventListener('change', () => {
        selectedSport = sportSelect.value;
        console.log(`UI.JS: Sport selected: ${selectedSport}`);
      });
    }

    // Time tiles
    const timeTiles = document.querySelectorAll('#builderTimeGrid .builder-tile');
    console.log(`UI.JS: Found ${timeTiles.length} time tiles`);
    
    timeTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        console.log(`UI.JS: Time tile clicked: ${tile.dataset.value}`);
        document.querySelectorAll('#builderTimeGrid .builder-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedTime = parseInt(tile.dataset.value);
      });
    });

    // Update generate workout button to use tile selections
    const generateBtn = document.getElementById('generateWorkout');
    if (generateBtn) {
      generateBtn.onclick = () => {
        if (!selectedGoal) {
          alert('Please select a training goal');
          return;
        }
        if (!selectedTime) {
          alert('Please select time available');
          return;
        }

        if (selectedBuildType === 'single') {
          // Single workout generation
          if (!selectedMuscle) {
            alert(selectedWorkoutType === 'stretch' ? 'Please select a stretch category' : 'Please select a muscle group');
            return;
          }
          const plan = generateWorkoutPlan({ 
            muscle: selectedMuscle, 
            goal: selectedGoal, 
            time: selectedTime,
            sport: selectedSport, // Optional
            isStretch: selectedWorkoutType === 'stretch'
          });
          renderWorkoutBuilderResult(plan);
        } else {
          // Weekly plan generation
          const weeklyPlan = generateWeeklyPlan({ 
            goal: selectedGoal, 
            time: selectedTime,
            isStretch: selectedWorkoutType === 'stretch'
          });
          renderWorkoutBuilderResult(weeklyPlan);
        }
      };
    }
  }

  /* MUSCLE TILES */
  document.querySelectorAll('#muscleScreen .muscle').forEach(tile => {
    const muscle = tile.dataset.muscle;
    if (!muscle) return;

    // Add favorite star
    const star = document.createElement('span');
    star.className = 'muscle-star';
    star.textContent = '⭐';
    if (isFavoriteMuscle(muscle)) star.classList.add('active');

    star.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavoriteMuscle(muscle);
      star.classList.toggle('active');
    });

    tile.appendChild(star);
    tile.addEventListener('click', () => loadExercisesForMuscle(muscle));
  });

  /* NUTRITION BUILDER TILE SELECTION */
  function initializeNutritionBuilder() {
    console.log('UI.JS: initializeNutritionBuilder() called');
    
    // Reset selections
    selectedNutritionGoal = null;
    selectedNutritionPlanType = 'single';

    // Plan type tiles (Single Day vs Weekly)
    const nutritionTypeTiles = document.querySelectorAll('#nutritionTypeGrid .builder-tile');
    console.log(`UI.JS: Found ${nutritionTypeTiles.length} nutrition type tiles`);
    
    nutritionTypeTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        console.log(`UI.JS: Nutrition type tile clicked: ${tile.dataset.value}`);
        document.querySelectorAll('#nutritionTypeGrid .builder-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedNutritionPlanType = tile.dataset.value;
      });
    });

    // Goal tiles (for nutrition)
    const nutritionGoalTiles = document.querySelectorAll('#nutritionGoalGrid .builder-tile');
    console.log(`UI.JS: Found ${nutritionGoalTiles.length} nutrition goal tiles`);
    
    nutritionGoalTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        console.log(`UI.JS: Nutrition goal tile clicked: ${tile.dataset.value}`);
        document.querySelectorAll('#nutritionGoalGrid .builder-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        selectedNutritionGoal = tile.dataset.value;
      });
    });

    // Generate nutrition plan button
    const generateNutritionBtn = document.getElementById('generateNutritionPlan');
    if (generateNutritionBtn) {
      generateNutritionBtn.onclick = async () => {
        if (!selectedNutritionGoal) {
          await showAlert('Selection Required', 'Please select a training goal');
          return;
        }
        if (!selectedNutritionPlanType) {
          await showAlert('Selection Required', 'Please select plan type');
          return;
        }

        let nutritionPlan;
        if (selectedNutritionPlanType === 'single') {
          nutritionPlan = generateSingleDayNutritionPlan(selectedNutritionGoal);
        } else {
          nutritionPlan = generateWeeklyNutritionPlan(selectedNutritionGoal);
        }

        renderNutritionPlanResult(nutritionPlan);
      };
    }
  }

  document.getElementById('nutritionBuilderBack')?.addEventListener('click', () => {
    showScreen('mainActionsScreen');
  });

  /* FAVORITES */
  document.getElementById('openFavorites')?.addEventListener('click', () => {
    renderFavoritesScreen();
    showScreen('favoritesScreen');
  });

  document.getElementById('backFromFavorites')?.addEventListener('click', () => {
    showScreen('muscleScreen');
  });

  document.getElementById('shareFavoritesQR')?.addEventListener('click', async () => {
    console.log('?? Share favorites via QR clicked');
    const user = getCurrentUserObject();
    if (!user || !user.favorites || !user.favorites.exercises.length) {
      alert('No favorite exercises to share!');
      return;
    }

    try {
      // Create favorites share object
      const favoritesId = generateUUID();
      const favoritesData = {
        exercises: [],
        username: user.username
      };

      // Normalize function for matching
      const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Get full exercise data for each favorite
      user.favorites.exercises.forEach(savedName => {
        let found = null;
        Object.values(window.LOCAL_EXERCISES || {}).forEach(group => {
          if (found) return;
          found = group.find(ex =>
            normalize(ex.name).includes(normalize(savedName)) ||
            normalize(savedName).includes(normalize(ex.name))
          );
        });
        if (found) {
          favoritesData.exercises.push(found);
        }
      });

      // Save favorites to server
      const response = await fetchApiWithFallback('/api/favorites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoritesId, data: favoritesData })
      });

      if (!response.ok) throw new Error('Failed to create favorites share');

      // Generate and display QR code
      if (typeof displayFavoritesQRCodeModal === 'function') {
        await displayFavoritesQRCodeModal(favoritesId);
      } else {
        console.error('displayFavoritesQRCodeModal function not found');
      }
    } catch (error) {
      console.error('Error sharing favorites:', error);
      alert('Error generating QR code: ' + error.message);
    }
  });

  document.getElementById('backToMuscles')?.addEventListener('click', () => {
    console.log('🔙 Back to previous screen');
    goToPreviousScreen();
  });

  const startOverBtn = document.getElementById('startOverBtn');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', () => {
      console.log('⎋ Log Out clicked');
      // Ensure modals and flags do not block the reset.
      document.getUserTileClickBlocked = false;
      const userPinModal = document.getElementById('userPinModal');
      if (userPinModal) userPinModal.classList.add('hidden');
      const adminPinModal = document.getElementById('adminPinModal');
      if (adminPinModal) adminPinModal.classList.add('hidden');
      resetToStart();
    });
  }

  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      console.log('🏠 Home clicked');
      if (window.currentUser) {
        showMainActionsScreen();
      } else {
        showScreen('userScreen');
      }
    });
  }

  document.getElementById('adminAddUser')?.addEventListener('click', () => {
    console.log('Admin: Add user clicked');
  });

  document.getElementById('saveUserChanges')?.addEventListener('click', () => {
    console.log('Admin: Save user changes');
  });

  document.getElementById('deleteUser')?.addEventListener('click', () => {
    console.log('Admin: Delete user');
  });

  document.getElementById('resetUserPin')?.addEventListener('click', () => {
    console.log('Admin: Reset user PIN');
  });

  /* generateWorkout is now handled in initializeBuilderTiles() */

  document.getElementById('builderBack')?.addEventListener('click', () => {
    showScreen('mainActionsScreen');
  });

  /* ===============================
     IDLE RESET EVENTS
  ================================ */
  ['click', 'touchstart', 'mousemove', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
      hideIdleVideo();
      startIdleTimer();
    });
  });

  // Start idle timer on boot
  startIdleTimer();

  /* ===============================
     USER PIN KEYPAD
  ================================ */
  document
    .querySelectorAll('#userPinModal button[data-key]')
    .forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;

        if (key === 'clear') {
          enteredUserPin = '';
          updateUserPinDisplay();
          return;
        }

        if (key === 'ok') {
          if (!pendingUser) {
            console.log('❌ No pending user');
            return;
          }

          try {
            if (!pendingUser.pin && !pendingUser.pinHash) {
              if (enteredUserPin.length !== 4) {
                showAlert('Invalid PIN', 'PIN must be 4 digits');
                return;
              }
              // FIX: Get fresh user array, find user, update PIN, and save
              const users = getUsers();
              const currentUser = users.find(u => u.username === pendingUser.username);
              if (currentUser) {
                Object.assign(currentUser, await hashUserPin(enteredUserPin));
                delete currentUser.pin;
                saveUsers(users);
                console.log('💾 PIN saved for user:', pendingUser.username);
              }
              Object.assign(pendingUser, await hashUserPin(enteredUserPin));
            }

            if (await verifyUserPin(pendingUser, enteredUserPin)) {
              if (pendingUser.pin && !pendingUser.pinHash) {
                const users = getUsers();
                const currentUser = users.find(u => u.username === pendingUser.username);
                if (currentUser) {
                  Object.assign(currentUser, await hashUserPin(enteredUserPin));
                  delete currentUser.pin;
                  saveUsers(users);
                }
              }
              console.log('✅ PIN correct for user:', pendingUser.username);
              console.log('🔐 Setting window.currentUser to:', pendingUser.username);
              window.currentUser = pendingUser.username;
              console.log('🔐 window.currentUser is now:', window.currentUser);
              
              enteredUserPin = '';
              const oldPendingUser = pendingUser.username;
              pendingUser = null;
              
              // RESET BLOCKING FLAG - critical!
              document.getUserTileClickBlocked = false;
              console.log('🔓 User tile clicks re-enabled (auth successful)');
              
              const modal = document.getElementById('userPinModal');
              console.log('🔐 PIN Modal element found:', !!modal);
              if (modal) {
                // Simply hide with the hidden class - let CSS handle the display property
                modal.classList.add('hidden');
                console.log('🔐 PIN modal hidden with class');
              }
              
              console.log('🔐 About to call hideAllScreens()');
              hideAllScreens();
              console.log('🔐 hideAllScreens() completed');
              
              console.log('🔐 About to call showMainActionsScreen() for:', oldPendingUser);
              showMainActionsScreen();
              console.log('🔐 showMainActionsScreen() completed - main screen should be visible');
              
              // Force visibility check
              const mainScreen = document.getElementById('mainActionsScreen');
              if (mainScreen) {
                console.log('🔐 Main screen element found:', !!mainScreen);
                console.log('🔐 Main screen classes:', mainScreen.className);
                console.log('🔐 Main screen display computed style:', window.getComputedStyle(mainScreen).display);
              }
            } else {
              console.log('❌ PIN incorrect');
              alert('Incorrect PIN');
              enteredUserPin = '';
              updateUserPinDisplay();
            }
          } catch (err) {
            console.error('❌ PIN entry error:', err);
            enteredUserPin = '';
            updateUserPinDisplay();
            showAlert('Error', 'Failed to authenticate: ' + err.message);
          }
          return;
        }

        if (/^\d$/.test(key) && enteredUserPin.length < 4) {
          enteredUserPin += key;
          updateUserPinDisplay();
        }
      });
    });

  // Cancel User PIN button
  document.getElementById('cancelUserPin')?.addEventListener('click', () => {
    console.log('UI.JS: Cancel user PIN pressed');
    enteredUserPin = '';
    pendingUser = null;
    document.getUserTileClickBlocked = false; // Re-enable tile clicks
    console.log('🔓 User tile clicks re-enabled (canceled PIN)');
    const modal = document.getElementById('userPinModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    updateUserPinDisplay();
    showScreen('userScreen');
  });

  /* ===============================
     ADMIN PIN KEYPAD
  ================================ */
  if (window.adminModule?.setupAdminPinHandlers) {
    window.adminModule.setupAdminPinHandlers({
      getEnteredAdminPin: () => enteredAdminPin,
      setEnteredAdminPin: (value) => { enteredAdminPin = value; },
      updateAdminPinDisplay,
      validateAdminCode: window.validateAdminCode,
      showScreen,
      populateAdminUserList,
      populateAdminStatsUserSelect,
      updateAdminAutoLogoutButtonLabel,
      updateAdminFaceDetectionThresholdUI,
      updateAdminAmbientSilentHoursUI,
      auditAdminAction
    });
  }

  /* ===============================
     ADMIN PANEL BUTTONS
  ================================ */
  if (window.adminModule?.setupAdminPanelHandlers) {
    window.adminModule.setupAdminPanelHandlers({
      showConfirmDialog,
      resetToStart,
      auditAdminAction,
      showAlert,
      clearCalendarDataForAllUsers,
      clearChallengeDataForAllUsers,
      updateActivityLeaderboard,
      activityStorageKey: ACTIVITY_STORAGE_KEY,
      resetAllUserStats,
      populateAdminStatsUserSelect,
      disclaimerAcceptanceKey: DISCLAIMER_ACCEPTANCE_KEY,
      isScreensaverAutoLogoutEnabled,
      setScreensaverAutoLogoutEnabled,
      updateAdminAutoLogoutButtonLabel,
      isPublicQrModeEnabled,
      setPublicQrModeEnabled,
      updateAdminQrModeButtonLabel,
      getFaceDetectionStableFrameThreshold,
      setFaceDetectionStableFrameThreshold,
      updateAdminFaceDetectionThresholdUI,
      isAmbientGreetingSilentHoursEnabled,
      setAmbientGreetingSilentHoursEnabled,
      setAmbientGreetingSilentHoursWindow,
      updateAdminAmbientSilentHoursUI,
      getSelectedAdminUser: () => selectedAdminUser,
      setSelectedAdminUser: (value) => { selectedAdminUser = value; },
      getUsers,
      saveUsers,
      populateAdminUserList,
      showScreen,
      handleResetUserStats
    });
  }

  document.getElementById('adminChangePin')?.addEventListener('click', async () => {
    const currentPin = document.getElementById('adminCurrentPin')?.value || '';
    const newPin = document.getElementById('adminNewPin')?.value || '';
    const confirmPin = document.getElementById('adminConfirmPin')?.value || '';
    const status = document.getElementById('adminChangePinStatus');

    if (!/^\d{4,8}$/.test(newPin)) {
      if (status) status.textContent = 'The new PIN must contain 4 to 8 digits.';
      return;
    }
    if (newPin !== confirmPin) {
      if (status) status.textContent = 'The new PIN entries do not match.';
      return;
    }

    const result = await window.electron?.changeAdminPin?.({
      token: window.getAdminSessionToken?.(),
      currentPin,
      newPin
    });
    if (status) status.textContent = result?.success ? 'Administrator PIN updated successfully.' : (result?.error || 'Unable to update PIN.');
    if (result?.success) {
      ['adminCurrentPin', 'adminNewPin', 'adminConfirmPin'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
      await auditAdminAction('admin_pin_changed', 'Administrator PIN changed securely');
    }
  });

  document.getElementById('adminCheckWebsiteSync')?.addEventListener('click', async () => {
    const status = document.getElementById('adminWebsiteSyncStatus');
    if (status) status.textContent = 'Checking website synchronization…';
    try {
      const response = await fetch('http://127.0.0.1:3001/api/sync-status');
      const result = await response.json();
      const sync = result.sync || {};
      const message = sync.status === 'online'
        ? `Online — ${sync.synced || 0} recent update(s) synchronized.`
        : sync.status === 'idle'
          ? 'Online — all local updates are synchronized.'
          : `Offline queue active — ${sync.pending || 0} update(s) waiting. ${sync.error || ''}`.trim();
      if (status) status.textContent = message;
    } catch (error) {
      if (status) status.textContent = `Local synchronization service unavailable: ${error.message}`;
    }
  });

  document.getElementById('adminTestScreensaverBtn')?.addEventListener('click', async () => {
    if (typeof window.triggerScreensaverTest === 'function') {
      window.triggerScreensaverTest();
      return;
    }

    await showAlert('Screensaver Test Unavailable', 'Could not start screensaver test. Please reload the app and try again.');
  });
}

// Populate stats reset user select when admin panel is shown
function populateAdminStatsUserSelect() {
  if (window.adminModule?.populateAdminStatsUserSelect) {
    window.adminModule.populateAdminStatsUserSelect({ getUsers });
    return;
  }
}

// Reset stats for selected user
async function handleResetUserStats() {
  if (window.adminModule?.handleResetUserStats) {
    await window.adminModule.handleResetUserStats({
      showAlert,
      showConfirmDialog,
      resetUserStats
    });
  }
}

function removeLocalStorageKeysByPrefixes(prefixes = []) {
  if (window.adminModule?.removeLocalStorageKeysByPrefixes) {
    return window.adminModule.removeLocalStorageKeysByPrefixes(prefixes);
  }
  return 0;
}

function clearCalendarDataForAllUsers() {
  if (window.adminModule?.clearCalendarDataForAllUsers) {
    return window.adminModule.clearCalendarDataForAllUsers(WORKOUT_CALENDAR_KEY);
  }
  return 0;
}

function clearChallengeDataForAllUsers() {
  if (window.adminModule?.clearChallengeDataForAllUsers) {
    return window.adminModule.clearChallengeDataForAllUsers();
  }
  return 0;
}

function resetAllUserStats() {
  if (window.adminModule?.resetAllUserStats) {
    return window.adminModule.resetAllUserStats({ getUsers, resetUserStats });
  }
  return 0;
}

// Clear all stats for a user
function resetUserStats(username) {
  if (window.adminModule?.resetUserStats) {
    window.adminModule.resetUserStats(username, { getUsers, saveUsers });
  }
}


/* ===============================
   CREATE USER MODAL (FINAL – SAFE)
================================ */
const BLOCKED_USERNAME_TERMS = [
  'fuck',
  'fuckyou',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'motherfucker'
];

function normalizeUsernameForModeration(value) {
  const leetMap = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '@': 'a',
    '$': 's',
    '!': 'i'
  };

  return String(value || '')
    .toLowerCase()
    .split('')
    .map(char => leetMap[char] || char)
    .join('')
    .replace(/[^a-z]/g, '');
}

function hasBlockedUsernameTerms(username) {
  const normalized = normalizeUsernameForModeration(username);
  const tokenized = String(username || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(normalizeUsernameForModeration)
    .filter(Boolean);

  return BLOCKED_USERNAME_TERMS.some(term => {
    if (term.length <= 4) {
      return tokenized.includes(term);
    }
    return normalized.includes(term) || tokenized.some(token => token.includes(term));
  });
}

function normalizeUsernameForUniqueness(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const confirmBtn = document.getElementById('confirmCreateUser');
if (confirmBtn) {
  confirmBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const input = document.getElementById('newUsernameInput');

    if (!input) {
      console.error('❌ newUsernameInput element not found');
      await showAlert('Error', 'Input field not found');
      return;
    }

    // Get the current value directly from the DOM
    const rawValue = input.value;
    const username = (rawValue || '').trim();
    
    console.log('=== CREATE USER BUTTON CLICKED ===');
    console.log('Input element exists:', !!input);
    console.log('Raw value:', JSON.stringify(rawValue));
    console.log('Trimmed value:', JSON.stringify(username));
    console.log('Value length:', username.length);
    console.log('Input type:', input.type);
    console.log('Input disabled:', input.disabled);
    console.log('=====================================');

    if (!username || username.length === 0) {
      console.warn('⚠️ Username is empty');
      alert('Please enter a username');
      input.focus();
      input.select();
      return;
    }

    if (username.length > 40 || !/^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u.test(username)) {
      await showAlert('Invalid Username', 'Use 1–40 letters, numbers, spaces, apostrophes, or hyphens.');
      input.focus();
      input.select();
      return;
    }

    if (hasBlockedUsernameTerms(username)) {
      console.warn('⚠️ Username blocked by content policy:', username);
      await showAlert('Username Not Allowed', 'Please choose a different username.');
      input.focus();
      input.select();
      return;
    }

    const users = getUsers();

    const normalizedUsername = normalizeUsernameForUniqueness(username);

    if (users.some(u => normalizeUsernameForUniqueness(u.username) === normalizedUsername)) {
      console.warn('⚠️ Username already exists:', username);
      alert('That username already exists');
      input.select();
      return;
    }

    const selectedIconOption = document.querySelector('.icon-option.selected');
    const selectedIcon = selectedIconOption?.dataset.value || 'user-icon-01.svg';
    
    const colorSelect = document.getElementById('newUserColor');
    const selectedColor = colorSelect?.value || '#3B82F6';

    // Get PIN input
    const pinInput = document.getElementById('newUserPin');
    const pinValue = pinInput?.value.trim() || '';
    
    // PIN is now mandatory - must be exactly 4 digits
    if (!pinValue || !/^\d{4}$/.test(pinValue)) {
      await showAlert('PIN Required', 'PIN must be exactly 4 digits');
      pinInput.focus();
      pinInput.select();
      return;
    }
    const userPin = await hashUserPin(pinValue);

    users.push({
      username,
      ...userPin,
      favorites: { exercises: [], muscles: [] },
      icon: selectedIcon,
      color: selectedColor
    });

    saveUsers(users);

    // Clear all inputs before closing modal
    input.value = '';
    if (pinInput) pinInput.value = '';
    
    // Clear selected icon highlight
    document.querySelectorAll('.icon-option.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Reset color to default
    if (colorSelect) colorSelect.value = '#3B82F6';
    
    document.activeKeyboardInput = null;
    document.getElementById('createUserModal')?.classList.add('hidden');

    renderUserScreen();

    showDisclaimerIfNeeded(true);

    console.log('✅ User created:', username);
  });
}

const cancelBtn = document.getElementById('cancelCreateUser');
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    const input = document.getElementById('newUsernameInput');
    if (input) input.value = '';
    const pinInput = document.getElementById('newUserPin');
    if (pinInput) pinInput.value = '';
    document.activeKeyboardInput = null;
    document.getElementById('createUserModal')?.classList.add('hidden');
  });
}
window.clearFaceLoginProfile = clearFaceLoginProfile;

// Check if DOM is already ready, otherwise wait for event
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

/* ===============================
   WORKOUT SHARING (QR CODE)
================================ */
function initializeWorkoutSharing() {
  getKioskIP();
  console.log('Kiosk IP:', kioskIP);
}
/* ===============================
   DIFFICULTY FILTER
================================ */

function showDifficultyFilter() {
  const container = document.getElementById('difficultyFilterContainer');
  if (container) {
    container.style.display = 'block';
    if (!currentDifficultyFilter) {
      currentDifficultyFilter = 'all';
    }
    updateDifficultyFilterButtons();
  }
}

function hideDifficultyFilter() {
  const container = document.getElementById('difficultyFilterContainer');
  if (container) {
    container.style.display = 'none';
  }
}

/* ===============================
   FULL-BODY WORKOUT GENERATOR
================================ */
function generateFullBodyWorkout() {
  const exerciseCount = selectedExerciseCount;
  const difficultyLevel = selectedDifficultyLevel;
  const includeStretches = document.getElementById('includeStretches')?.checked || false;

  if (!exerciseCount || !difficultyLevel) {
    alert('Please select exercise count and difficulty level');
    return;
  }

  // Collect all exercises from all muscle groups
  let allExercises = [];
  const muscleGroups = ['chest', 'shoulders', 'back', 'biceps', 'triceps', 'legs', 'abs', 'core', 'traps'];

  muscleGroups.forEach(muscle => {
    const exercises = window.LOCAL_EXERCISES?.[muscle] || [];
    allExercises = allExercises.concat(exercises.map(ex => ({ ...ex, muscle })));
  });

  // Filter by difficulty if not mixed
  if (difficultyLevel !== 'mixed') {
    allExercises = allExercises.filter(ex => normalizeDifficultyValue(ex.difficulty) === difficultyLevel);
  }

  // Shuffle array
  const shuffled = allExercises.sort(() => 0.5 - Math.random());

  // Select diverse exercises (try to get different muscle groups)
  let selected = [];
  let muscleUsed = {};

  for (let i = 0; i < shuffled.length && selected.length < exerciseCount; i++) {
    const ex = shuffled[i];
    const muscle = ex.muscle;

    // Limit exercises per muscle group to 2 max for balance
    if (!muscleUsed[muscle] || muscleUsed[muscle] < 2) {
      selected.push(ex);
      muscleUsed[muscle] = (muscleUsed[muscle] || 0) + 1;
    }
  }

  // If not enough diverse exercises, just grab what we need
  if (selected.length < exerciseCount) {
    for (let i = 0; i < shuffled.length && selected.length < exerciseCount; i++) {
      if (!selected.includes(shuffled[i])) {
        selected.push(shuffled[i]);
      }
    }
  }

  // Build the workout display
  const resultDiv = document.getElementById('generatedWorkoutResult');
  resultDiv.innerHTML = '';

  const workoutDiv = document.createElement('div');
  workoutDiv.style.cssText = 'background: #f9f9f9; border: 2px solid #333; border-radius: 12px; padding: 20px; max-width: 800px; margin: 0 auto;';

  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px;';
  titleDiv.innerHTML = `
    <h3 style="margin: 0 0 5px 0; color: #333;">Your Full-Body Workout</h3>
    <p style="margin: 0; color: #666; font-size: 16px;">
      ${selected.length} Exercises • ${difficultyLevel === 'mixed' ? 'Mixed Difficulty' : difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)}
    </p>
  `;
  workoutDiv.appendChild(titleDiv);

  // List exercises
  const listDiv = document.createElement('div');
  listDiv.style.cssText = 'margin-bottom: 20px;';
  selected.forEach((ex, idx) => {
    const itemDiv = document.createElement('div');
    const difficulty = ex.difficulty || 'beginner';
    const emoji = difficulty === 'beginner' ? '🟢' : difficulty === 'intermediate' ? '🟡' : '🔴';
    itemDiv.style.cssText = 'padding: 12px; margin-bottom: 10px; background: #fff; border-radius: 8px; border-left: 4px solid #333;';
    itemDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${idx + 1}. ${ex.name} ${emoji}</strong>
          <div style="font-size: 14px; color: #666; margin-top: 5px;">
            💪 ${ex.primary?.join(', ') || 'General'}
          </div>
        </div>
      </div>
    `;
    listDiv.appendChild(itemDiv);
  });
  workoutDiv.appendChild(listDiv);
  // Add stretches if requested
  if (includeStretches) {
    const stretchesDiv = document.createElement('div');
    stretchesDiv.style.cssText = 'border-top: 2px solid #ddd; padding-top: 20px; margin-top: 20px;';
    stretchesDiv.innerHTML = '<h4 style="color: #333; margin-top: 0;">Recovery Stretches (3-5 min)</h4>';

    const allStretches = [];
    const bodyParts = ['neck-shoulders', 'chest', 'back', 'arms-wrists', 'legs-glutes', 'hips-pelvis', 'spine-core'];
    bodyParts.forEach(part => {
      const stretches = window.LOCAL_EXERCISES?.stretchesByBodyPart?.[part] || [];
      allStretches.push(...stretches.slice(0, 2));
    });

    const selectedStretches = allStretches.sort(() => 0.5 - Math.random()).slice(0, 5);
    selectedStretches.forEach((s, idx) => {
      const stretchItem = document.createElement('div');
      stretchItem.style.cssText = 'padding: 10px; margin-bottom: 8px; background: #f0f8ff; border-radius: 6px;';
      stretchItem.innerHTML = `<strong>${idx + 1}. ${s.name}</strong> (20-30 sec)`;
      stretchesDiv.appendChild(stretchItem);
    });
    workoutDiv.appendChild(stretchesDiv);
  }

  // Add QR code share button
  const shareButtonDiv = document.createElement('div');
  shareButtonDiv.style.cssText = 'text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;';
  const shareBtn = document.createElement('button');
  shareBtn.textContent = '📱 Send to Phone with QR Code';
  shareBtn.style.cssText = 'padding: 12px 24px; background: #333; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;';
  shareBtn.onclick = () => shareGeneratedWorkout(selected);
  shareButtonDiv.appendChild(shareBtn);
  workoutDiv.appendChild(shareButtonDiv);

  // Suggested supplements panel
  const includesLowerBody = selected.some(ex => ['legs'].includes(ex.muscle));
  const includesCore = selected.some(ex => ['abs', 'core'].includes(ex.muscle));
  const supplementList = getSupplementSuggestions({
    difficultyLevel,
    exerciseCount: selected.length,
    includesLowerBody,
    includesCore
  });

  const suppDiv = document.createElement('div');
  suppDiv.style.cssText = 'margin-top: 20px; padding: 16px; background: #10151f; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px;';
  suppDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 10px; color: #f5f7fa;">💊 Suggested Supplements</div>
    <ul style="margin: 0; padding-left: 20px; color: #c4cfe0;">
      ${supplementList.map(item => `<li style=\"margin-bottom: 6px;\">${item}</li>`).join('')}
    </ul>
    <div style="margin-top: 8px; font-size: 12px; color: #8b95a8;">General guidance only. Consult a professional if needed.</div>
  `;
  workoutDiv.appendChild(suppDiv);

  // Recovery tips panel
  const recoveryTips = getRecoveryTips({
    exerciseCount: selected.length,
    includesLowerBody,
    includesCore
  });
  const recoveryDiv = document.createElement('div');
  recoveryDiv.style.cssText = 'margin-top: 16px; padding: 16px; background: #0f141c; border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px;';
  recoveryDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 10px; color: #f5f7fa;">🛌 Proper Recovery</div>
    <ul style="margin: 0; padding-left: 20px; color: #c4cfe0;">
      ${recoveryTips.map(item => `<li style=\"margin-bottom: 6px;\">${item}</li>`).join('')}
    </ul>
  `;
  workoutDiv.appendChild(recoveryDiv);

  resultDiv.appendChild(workoutDiv);
}

function resetToStart() {
  console.log('🔄 resetToStart() called');
  try {
    screenHistoryStack.length = 0;
    currentScreenId = null;

    // ensure default users present before showing user list
    seedDefaultUser();
    window.currentUser = null;
    lastSessionUser = null;
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    console.log('📋 About to render user screen...');
    renderUserScreen();
    console.log('✅ renderUserScreen() completed successfully');
    console.log('📺 About to show userScreen...');
    showScreen('userScreen', { skipHistory: true });
    showDisclaimerIfNeeded();
    console.log('✅ resetToStart() complete');
  } catch (err) {
    console.error('❌ Error in resetToStart():', err.message);
    console.error('Stack:', err.stack);
  }
}

// ============================================
// WORKOUT CALENDAR FUNCTIONS
// ============================================

// Get workout dates for current user
function getUserWorkoutDates() {
  if (window.calendarModule?.getUserWorkoutDates) {
    return window.calendarModule.getUserWorkoutDates(window.currentUser, WORKOUT_CALENDAR_KEY);
  }
  return [];
}

// Save workout date for current user
function markWorkoutComplete(date = new Date()) {
  if (window.calendarModule?.markWorkoutComplete) {
    window.calendarModule.markWorkoutComplete(window.currentUser, WORKOUT_CALENDAR_KEY, date);
  }
}

// Save workout plan data for a specific date
function saveWorkoutToCalendarDate(date, workoutData) {
  if (window.calendarModule?.saveWorkoutToCalendarDate) {
    window.calendarModule.saveWorkoutToCalendarDate(window.currentUser, WORKOUT_CALENDAR_KEY, date, workoutData);
  }
}

// Get workout data for a specific date
function getWorkoutForDate(dateStr) {
  if (window.calendarModule?.getWorkoutForDate) {
    return window.calendarModule.getWorkoutForDate(window.currentUser, dateStr);
  }
  return null;
}

// Save meal plan data for a specific date
function saveMealPlanToCalendarDate(date, mealPlanData) {
  if (window.calendarModule?.saveMealPlanToCalendarDate) {
    window.calendarModule.saveMealPlanToCalendarDate(window.currentUser, date, mealPlanData);
  }
}

// Get meal plan data for a specific date
function getMealPlanForDate(dateStr) {
  if (window.calendarModule?.getMealPlanForDate) {
    return window.calendarModule.getMealPlanForDate(window.currentUser, dateStr);
  }
  return null;
}

// Share calendar to phone via QR code
async function shareCalendarToPhone() {
  const user = window.currentUser;
  if (!user) {
    alert('Please select a user first.');
    return;
  }

  const workouts = JSON.parse(localStorage.getItem(`calendar_workouts_${user}`) || '{}');
  const meals = JSON.parse(localStorage.getItem(`calendar_meals_${user}`) || '{}');

  if (!Object.keys(workouts).length && !Object.keys(meals).length) {
    alert('No saved workouts or meal plans to share yet.');
    return;
  }

  const calendarId = generateUUID();
  const payload = {
    calendarId,
    userName: user,
    data: { workouts, meals }
  };

  try {
    const response = await fetchApiWithFallback('/api/calendar/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to share calendar');
    }

    await response.json();
    displayCalendarQRCode(calendarId);
  } catch (error) {
    console.error('Calendar share failed:', error);
    alert('Unable to share calendar. Make sure the server is running.');
  }
}

// Show day details modal with workout and meal plan
function showCalendarDayDetails(dateStr) {
  const workout = getWorkoutForDate(dateStr);
  const mealPlan = getMealPlanForDate(dateStr);
  
  if (!workout && !mealPlan) {
    alert('No workout or meal plan scheduled for this day.');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'dayDetailsModal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; overflow-y: auto;';
  
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.cssText = 'background: linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(20, 23, 32, 0.98) 100%); padding: 30px; border-radius: 16px; border: 2px solid rgba(212, 175, 55, 0.2); max-width: 750px; max-height: 90vh; overflow-y: auto; position: relative; color: var(--text-primary); margin: 20px;';
  
  const dateObj = new Date(dateStr);
  const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  let html = `<button style="position: absolute; top: 15px; right: 15px; background: var(--color-gold); border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="document.getElementById('dayDetailsModal').remove()">Close</button>`;
  html += `<h2 style="margin-top: 0; color: var(--color-gold); font-size: 1.8rem;">📅 ${dateDisplay}</h2>`;
  
  // Workout section
  if (workout) {
    html += renderWorkoutDetails(workout, dateStr);
  }
  
  // Meal plan section
  if (mealPlan) {
    html += renderMealPlanDetails(mealPlan);
  }
  
  content.innerHTML = html;
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  modal.onclick = e => {
    if (e.target === modal) modal.remove();
  };
}

// Helper function to render full workout details with exercise tracking
function renderWorkoutDetails(workout, dateStr) {
  let html = `<div style="border-top: 2px solid var(--color-blue); padding-top: 20px; margin-top: 20px;">`;
  html += `<h3 style="color: var(--color-blue); margin-top: 0; font-size: 1.3rem;">💪 Workout</h3>`;
  
  // Get completion status for this workout
  const completionStatus = getWorkoutCompletionStatus(dateStr);
  
  if (!workout.exercises || !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
    html += `<div style="color: var(--text-muted); padding: 20px; margin: 15px 0; background: rgba(0,0,0,0.2); border-radius: 8px;">No exercises listed for this workout.</div>`;
  } else {
    // Show progress bar
    const completedCount = Object.values(completionStatus).filter(v => v).length;
    const totalCount = workout.exercises.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);
    
    html += `<div style="margin: 15px 0;">`;
    html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem;">`;
    html += `<strong>Progress:</strong> <span>${completedCount}/${totalCount} Exercises (${progressPercent}%)</span>`;
    html += `</div>`;
    html += `<div style="width: 100%; height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden;">`;
    html += `<div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, var(--color-blue) 0%, #00ff88 100%); transition: width 0.3s;"></div>`;
    html += `</div>`;
    html += `</div>`;
    
    // Display exercises with checkboxes
    html += `<div id="workoutExercises" style="margin-top: 20px;">`;
    
    workout.exercises.forEach((ex, idx) => {
      const isCompleted = completionStatus[idx] || false;
      const exerciseName = ex.name || ex;
      const primaryMuscles = Array.isArray(ex.primary) ? ex.primary.join(', ') : (ex.primary || 'General');
      const sets = ex.sets || '3';
      const reps = ex.reps || '8-12';
      const checkboxId = `workout_${dateStr}_${idx}`;
      
      html += `<div style="background: rgba(45, 55, 72, 0.5); border: 1px solid rgba(212, 175, 55, 0.15); border-radius: 10px; padding: 15px; margin-bottom: 12px; transition: all 0.2s; opacity: ${isCompleted ? '0.6' : '1'};">`;
      
      // Exercise header with checkbox
      html += `<div style="display: flex; align-items: flex-start; gap: 12px;">`;
      html += `<input type="checkbox" id="${checkboxId}" ${isCompleted ? 'checked' : ''} onchange="updateWorkoutCompletion('${dateStr}', ${idx}, this.checked)" style="width: 20px; height: 20px; margin-top: 3px; cursor: pointer;">`;
      html += `<div style="flex: 1;">`;
      html += `<label for="${checkboxId}" style="cursor: pointer; font-weight: 600; font-size: 1.05rem; color: ${isCompleted ? 'var(--text-muted)' : 'var(--text-primary)'}; text-decoration: ${isCompleted ? 'line-through' : 'none'};">${exerciseName}</label>`;
      html += `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">`;
      html += `<strong>Focus:</strong> ${primaryMuscles} • <strong>Sets:</strong> ${sets} • <strong>Reps:</strong> ${reps}`;
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;
      
      // Exercise details if available
      if (ex.howTo && Array.isArray(ex.howTo) && ex.howTo.length > 0) {
        html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.3);">`;
        html += `<strong style="color: var(--color-blue); font-size: 0.9rem;">How to perform:</strong>`;
        html += `<ol style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary); font-size: 0.9rem;">`;
        ex.howTo.forEach(step => {
          html += `<li style="margin-bottom: 4px;">${step}</li>`;
        });
        html += `</ol>`;
        html += `</div>`;
      }
      
      if (ex.secondary && Array.isArray(ex.secondary) && ex.secondary.length > 0) {
        html += `<div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">`;
        html += `<strong>Secondary:</strong> ${ex.secondary.join(', ')}`;
        html += `</div>`;
      }
      
      if (ex.description) {
        html += `<div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">`;
        html += `<strong>Notes:</strong> ${ex.description}`;
        html += `</div>`;
      }
      
      html += `</div>`;
    });
    
    html += `</div>`;
  }
  
  // Metadata
  if (workout.difficulty || workout.focusMuscle) {
    html += `<div style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border-left: 3px solid var(--color-blue);">`;
    if (workout.focusMuscle) {
      html += `<div style="margin-bottom: 6px;"><strong>Focus Area:</strong> ${workout.focusMuscle}</div>`;
    }
    if (workout.difficulty) {
      html += `<div><strong>Difficulty:</strong> ${workout.difficulty}</div>`;
    }
    html += `</div>`;
  }
  
  // Mark complete button
  html += `<button onclick="markWorkoutDayComplete('${dateStr}')" style="width: 100%; padding: 14px 20px; margin-top: 20px; background: linear-gradient(135deg, var(--color-blue) 0%, #0088cc 100%); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">✓ Mark Workout Complete</button>`;
  
  html += `</div>`;
  return html;
}

// Helper function to render meal plan details
function renderMealPlanDetails(mealPlan) {
  let html = `<div style="border-top: 2px solid var(--color-gold); padding-top: 20px; margin-top: 20px;">`;
  html += `<h3 style="color: var(--color-gold); margin-top: 0; font-size: 1.3rem;">🍽️ Meal Plan</h3>`;
  
  const mealLabels = {
    breakfast: '🌅 Breakfast',
    lunch: '🍽️ Lunch',
    dinner: '🍴 Dinner',
    snacks: '🥜 Snacks',
    preWorkout: '⚡ Pre-Workout',
    postWorkout: '💪 Post-Workout'
  };
  
  if (!mealPlan.meals || Object.keys(mealPlan.meals).length === 0) {
    html += `<div style="color: var(--text-muted); padding: 20px; margin: 15px 0; background: rgba(0,0,0,0.2); border-radius: 8px;">No meals planned for this day.</div>`;
  } else {
    Object.keys(mealPlan.meals).forEach(mealType => {
      const meal = mealPlan.meals[mealType];
      if (meal && meal.name) {
        html += `<div style="background: rgba(212, 175, 55, 0.1); border-left: 4px solid var(--color-gold); border-radius: 8px; padding: 12px; margin: 12px 0;">`;
        html += `<div style="color: var(--color-gold); font-weight: 600; margin-bottom: 6px;">${mealLabels[mealType] || mealType}</div>`;
        html += `<div style="font-weight: 600; font-size: 1.05rem;">${meal.name}</div>`;
        if (meal.focus) {
          html += `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${meal.focus}</div>`;
        }
        if (meal.calories) {
          html += `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;"><strong>Calories:</strong> ${meal.calories}</div>`;
        }
        html += `</div>`;
      }
    });
  }
  
  html += `</div>`;
  return html;
}

// Get completion status for a specific workout date
function getWorkoutCompletionStatus(dateStr) {
  const user = window.currentUser;
  if (!user) return {};
  
  const key = `workout_completion_${user}_${dateStr}`;
  return JSON.parse(localStorage.getItem(key) || '{}');
}

// Update completion status for individual exercises
function updateWorkoutCompletion(dateStr, exerciseIndex, isCompleted) {
  const user = window.currentUser;
  if (!user) return;
  
  const key = `workout_completion_${user}_${dateStr}`;
  const status = getWorkoutCompletionStatus(dateStr);
  status[exerciseIndex] = isCompleted;
  
  localStorage.setItem(key, JSON.stringify(status));
  
  // Refresh the modal to update progress bar
  const modal = document.getElementById('dayDetailsModal');
  if (modal) {
    const workout = getWorkoutForDate(dateStr);
    const mealPlan = getMealPlanForDate(dateStr);
    const content = modal.querySelector('.modal-content');
    let html = `<button style="position: absolute; top: 15px; right: 15px; background: var(--color-gold); border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;" onclick="document.getElementById('dayDetailsModal').remove()">Close</button>`;
    
    const dateObj = new Date(dateStr);
    const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    html += `<h2 style="margin-top: 0; color: var(--color-gold); font-size: 1.8rem;">📅 ${dateDisplay}</h2>`;
    
    if (workout) {
      html += renderWorkoutDetails(workout, dateStr);
    }
    
    if (mealPlan) {
      html += renderMealPlanDetails(mealPlan);
    }
    
    content.innerHTML = html;
  }
}

// Mark the entire workout day as completed
function markWorkoutDayComplete(dateStr) {
  const user = window.currentUser;
  if (!user) {
    alert('Please select a user first.');
    return;
  }
  
  // Get the workout
  const workout = getWorkoutForDate(dateStr);
  if (!workout) {
    alert('No workout found for this date.');
    return;
  }
  
  // Get the completion status
  const completionStatus = getWorkoutCompletionStatus(dateStr);
  const totalExercises = workout.exercises?.length || 0;
  const completedExercises = Object.values(completionStatus).filter(v => v).length;
  
  // Save to calendar completion tracker
  const key = `calendar_completed_${user}`;
  const completedDates = JSON.parse(localStorage.getItem(key) || '[]');
  
  if (!completedDates.includes(dateStr)) {
    completedDates.push(dateStr);
    localStorage.setItem(key, JSON.stringify(completedDates));
  }
  
  // Record in analytics if available
  if (typeof recordWorkout === 'function') {
    const exerciseNames = workout.exercises?.map(e => e.name || e) || [];
    const muscleGroup = workout.focusMuscle?.split(' ')[0] || 'General';
    recordWorkout([muscleGroup], exerciseNames, 45);
  }
  
  // Show success message
  const message = `✅ Workout marked complete! (${completedExercises}/${totalExercises} exercises done)`;
  alert(message);
  
  // Close modal
  const modal = document.getElementById('dayDetailsModal');
  if (modal) modal.remove();
  
  // Refresh calendar view
  renderCalendar();
}

// Render calendar for current month
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calendarTitle');
  
  if (!grid || !title) return;
  
  const month = currentCalendarMonth.getMonth();
  const year = currentCalendarMonth.getFullYear();
  
  // Set title
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  title.textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Get user's workout dates
  const workoutDates = getUserWorkoutDates();
  
  // Clear grid
  grid.innerHTML = '';
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    grid.appendChild(emptyCell);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);
    
    // Check if this day has a workout
    if (workoutDates.includes(dateStr)) {
      cell.classList.add('has-workout');
      
      // Check if workout is completed
      const user = window.currentUser;
      const completedKey = `calendar_completed_${user}`;
      const completedDates = JSON.parse(localStorage.getItem(completedKey) || '[]');
      const isCompleted = completedDates.includes(dateStr);
      
      const marker = document.createElement('div');
      marker.className = 'workout-marker';
      marker.textContent = isCompleted ? '✅' : '✓';
      marker.style.fontSize = '1.2rem';
      marker.title = isCompleted ? 'Workout Completed' : 'Workout Scheduled';
      if (isCompleted) {
        cell.classList.add('completed-workout');
        marker.style.color = '#00ff88';
      }
      cell.appendChild(marker);
    }
    
    // Mark today
    if (dateStr === todayStr) {
      cell.classList.add('today');
    }
    
    // Add click handler to show day details
    cell.style.cursor = 'pointer';
    cell.onclick = () => showCalendarDayDetails(dateStr);
    
    grid.appendChild(cell);
  }
  
  // Update stats
  updateCalendarStats();
}

// Update calendar statistics
function updateCalendarStats() {
  const workoutDates = getUserWorkoutDates();
  const user = window.currentUser;
  const completedKey = `calendar_completed_${user}`;
  const completedDates = JSON.parse(localStorage.getItem(completedKey) || '[]');
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Count workouts this month
  const monthCount = workoutDates.filter(dateStr => {
    const date = new Date(dateStr);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;
  
  // Count completed workouts this month
  const completedMonthCount = completedDates.filter(dateStr => {
    const date = new Date(dateStr);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;
  
  // Count workouts this week
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const weekCount = workoutDates.filter(dateStr => {
    const date = new Date(dateStr);
    return date >= weekStart && date <= weekEnd;
  }).length;
  
  // Count completed workouts this week
  const completedWeekCount = completedDates.filter(dateStr => {
    const date = new Date(dateStr);
    return date >= weekStart && date <= weekEnd;
  }).length;
  
  // Calculate streak (only completed workouts)
  const sortedDates = completedDates.map(d => new Date(d)).sort((a, b) => b - a);
  let streak = 0;
  let checkDate = new Date(today);
  checkDate.setHours(0, 0, 0, 0);
  
  for (const workoutDate of sortedDates) {
    const wDate = new Date(workoutDate);
    wDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((checkDate - wDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0 || diffDays === 1) {
      streak++;
      checkDate = wDate;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  // Update UI
  const monthEl = document.getElementById('monthWorkoutCount');
  const weekEl = document.getElementById('weekWorkoutCount');
  const streakEl = document.getElementById('streakCount');
  
  if (monthEl) monthEl.textContent = `${completedMonthCount}/${monthCount}`;
  if (weekEl) weekEl.textContent = `${completedWeekCount}/${weekCount}`;
  if (streakEl) streakEl.textContent = streak;
}

// Navigate to previous month
function showPreviousMonth() {
  currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
  renderCalendar();
}

// Navigate to next month
function showNextMonth() {
  currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
  renderCalendar();
}

// Show calendar screen
function showWorkoutCalendar() {
  if (!window.currentUser) return;
  
  // Reset to current month
  currentCalendarMonth = new Date();
  
  showScreen('workoutCalendarScreen');
  renderCalendar();
}

// Initialize calendar event listeners
function initializeCalendar() {
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');
  const calendarBtn = document.getElementById('myCalendarBtn');
  const backBtn = document.getElementById('backFromCalendar');
  const shareBtn = document.getElementById('shareCalendarBtn');
  
  if (prevBtn) prevBtn.addEventListener('click', showPreviousMonth);
  if (nextBtn) nextBtn.addEventListener('click', showNextMonth);
  if (calendarBtn) calendarBtn.addEventListener('click', showWorkoutCalendar);
  if (backBtn) backBtn.addEventListener('click', resetToStart);
  if (shareBtn) shareBtn.addEventListener('click', shareCalendarToPhone);
}

// ============================================
// END CALENDAR FUNCTIONS
// ============================================

// ============================================
// DAILY CHALLENGE FUNCTIONS
// ============================================

// Get today's challenge based on day of year
function getTodaysChallenge() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const challenges = window.DAILY_CHALLENGES || [];
  const index = dayOfYear % challenges.length;
  return challenges[index];
}

// Check if user completed today's challenge
function isChallengeCompletedToday() {
  if (window.challengesModule?.isChallengeCompletedToday) {
    return window.challengesModule.isChallengeCompletedToday(window.currentUser);
  }
  return false;
}

// Mark challenge as complete
function markChallengeComplete() {
  if (window.challengesModule?.markChallengeComplete) {
    window.challengesModule.markChallengeComplete({
      currentUser: window.currentUser,
      getTodaysChallenge,
      saveWorkoutToCalendarDate,
      recordWorkout: typeof recordWorkout === 'function' ? recordWorkout : null,
      showDailyChallengeScreen,
      alertFn: alert
    });
  }
}

// Get challenge stats for current user
function getChallengeStats() {
  if (window.challengesModule?.getChallengeStats) {
    return window.challengesModule.getChallengeStats(window.currentUser);
  }
  return { total: 0, streak: 0, points: 0 };
}

// Get community completion percentage
function getCommunityCompletionRate() {
  const today = new Date().toISOString().split('T')[0];
  const users = getUsers();
  
  let completed = 0;
  users.forEach(user => {
    const key = `challenge_completions_${user.username}`;
    const completions = JSON.parse(localStorage.getItem(key) || '[]');
    if (completions.includes(today)) {
      completed++;
    }
  });
  
  const total = users.length;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// Show daily challenge screen
function showDailyChallengeScreen() {
  console.log('📺 SHOW DAILY CHALLENGE: Function called at', new Date().toLocaleTimeString());
  try {
    const challenge = getTodaysChallenge();
    if (!challenge) {
      console.error('❌ CRITICAL: getTodaysChallenge() returned null!');
      alert('Error loading daily challenge - please try again');
      return;
    }
    
    const isCompleted = isChallengeCompletedToday();
    const stats = getChallengeStats();
    const communityRate = getCommunityCompletionRate();
    
    console.log('📺 SHOW DAILY CHALLENGE: Challenge loaded:', challenge ? challenge.name : 'NONE');
    
    // Update title
    const titleEl = document.getElementById('challengeTitle');
    if (!titleEl) {
      console.error('❌ CRITICAL: challengeTitle element not found!');
      throw new Error('challengeTitle element missing in DOM');
    }
    document.getElementById('challengeTitle').textContent = `🔥 ${challenge.name}`;
    
    // Build challenge content
    const content = document.getElementById('challengeContent');
    if (!content) {
      console.error('❌ CRITICAL: challengeContent element not found!');
      throw new Error('challengeContent element missing in DOM');
    }
  content.innerHTML = `
    <div style="text-align: center; margin-bottom: 30px;">
      <span class="challenge-type ${challenge.type}">${challenge.type.toUpperCase()}</span>
      <span class="challenge-difficulty ${challenge.difficulty}">${challenge.difficulty.toUpperCase()}</span>
      <button id="challengeFriendBtn" class="primary-btn" style="margin-left: 16px; padding: 10px 18px; font-size: 14px;">🤝 Challenge a Friend</button>
    </div>
    
    <div style="background: linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(20, 30, 50, 0.8) 100%); padding: 24px; border-radius: 16px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: var(--color-gold); font-size: 22px;">📋 Challenge Description</h3>
      <p style="font-size: 18px; line-height: 1.6; color: var(--text-primary); margin: 0 0 16px 0;">${challenge.description}</p>
      <div style="background: rgba(0, 212, 255, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid var(--color-blue);">
        <strong style="color: var(--color-blue);">🎯 Goal:</strong> <span style="color: var(--text-primary);">${challenge.goal}</span>
      </div>
      <div style="margin-top: 12px; background: rgba(212, 175, 55, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid var(--color-gold);">
        <strong style="color: var(--color-gold);">⭐ Points:</strong> <span style="color: var(--text-primary); font-size: 20px; font-weight: bold;">${challenge.points}</span>
      </div>
    </div>
    
    <h3 style="color: var(--color-blue); margin-bottom: 16px;">💪 Exercises</h3>
    <ul class="challenge-exercise-list">
      ${challenge.exercises.map(ex => `
        <li class="challenge-exercise-item">
          <div class="challenge-exercise-name">${ex.name}</div>
          <div class="challenge-exercise-details">
            <strong>Reps:</strong> ${ex.reps} • <strong>Sets:</strong> ${ex.sets}
          </div>
        </li>
      `).join('')}
    </ul>
    
    <div class="challenge-tips">
      <h4>💡 Pro Tips</h4>
      <ul>
        ${challenge.tips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    </div>
    
    ${isCompleted ? '<div style="text-align: center; padding: 20px; background: rgba(100, 200, 100, 0.2); border-radius: 12px; border: 2px solid #64c864; margin-top: 20px;"><h3 style="color: #64c864; margin: 0;">✅ COMPLETED TODAY!</h3></div>' : ''}
  `;
  
  // Update stats
  document.getElementById('totalChallengesCompleted').textContent = stats.total;
  document.getElementById('currentStreak').textContent = stats.streak;
  document.getElementById('totalPoints').textContent = stats.points;
  document.getElementById('communityPercent').textContent = communityRate + '%';
  
  // Update button
  const completeBtn = document.getElementById('markChallengeComplete');
  if (isCompleted) {
    completeBtn.disabled = true;
    completeBtn.textContent = '✅ Already Completed';
    completeBtn.style.opacity = '0.6';
    completeBtn.style.cursor = 'not-allowed';
  } else {
    completeBtn.disabled = false;
    completeBtn.textContent = '✓ Mark as Complete';
    completeBtn.style.opacity = '1';
    completeBtn.style.cursor = 'pointer';
  }
  
  // Update badge on main screen
  updateChallengeBadge();

  // Challenge a friend button
  const friendBtn = document.getElementById('challengeFriendBtn');
  if (friendBtn) {
    console.log('UI.JS: Setting up Challenge a Friend button listener');
    friendBtn.addEventListener('click', showChallengeFriendScreen);
  } else {
    console.warn('UI.JS: Challenge a Friend button not found in DOM');
  }
  
  console.log('📺 SHOW DAILY CHALLENGE: About to call showScreen(dailyChallengeScreen)');
  showScreen('dailyChallengeScreen');
  console.log('📺 SHOW DAILY CHALLENGE: showScreen() completed');
  } catch (error) {
    console.error('❌ CRITICAL ERROR in showDailyChallengeScreen:', error.message);
    console.error('Stack:', error.stack);
    alert('Error loading daily challenge: ' + error.message);
  }
}

function getAllExerciseNames() {
  const groups = window.LOCAL_EXERCISES || {};
  const names = new Set();

  Object.keys(groups).forEach(key => {
    if (key === 'stretchesByBodyPart') return;
    const list = groups[key];
    if (!Array.isArray(list)) return;
    list.forEach(ex => {
      if (ex && ex.name) names.add(ex.name);
    });
  });

  return Array.from(names).sort();
}

const FRIEND_CHALLENGE_HISTORY_KEY = 'friend_challenges_history';

function getFriendChallengeHistory() {
  if (window.challengesModule?.getFriendChallengeHistory) {
    return window.challengesModule.getFriendChallengeHistory(FRIEND_CHALLENGE_HISTORY_KEY);
  }
  return [];
}

async function loadFriendChallengeHistoryFromServer() {
  if (window.challengesModule?.loadFriendChallengeHistoryFromServer) {
    return window.challengesModule.loadFriendChallengeHistoryFromServer({
      historyKey: FRIEND_CHALLENGE_HISTORY_KEY,
      baseUrl: getServerBaseUrl()
    });
  }
  return getFriendChallengeHistory();
}

function saveFriendChallengeToHistory(entry) {
  if (window.challengesModule?.saveFriendChallengeToHistory) {
    window.challengesModule.saveFriendChallengeToHistory({
      historyKey: FRIEND_CHALLENGE_HISTORY_KEY,
      entry,
      limit: 20
    });
  }
}

async function saveFriendChallengeToServer(entry) {
  if (window.challengesModule?.saveFriendChallengeToServer) {
    return window.challengesModule.saveFriendChallengeToServer({
      entry,
      baseUrl: getServerBaseUrl()
    });
  }
  return entry;
}

function renderFriendChallengeHistory() {
  const container = document.getElementById('friendChallengeHistory');
  if (!container) return;

  const history = getFriendChallengeHistory();
  if (!history.length) {
    container.innerHTML = '<div style="color: var(--text-secondary); text-align: center;">No challenges sent yet.</div>';
    return;
  }

  container.innerHTML = history.map(entry => {
    const date = new Date(entry.created).toLocaleString();
    
    // Handle both old and new challenge formats
    if (entry.dailyChallenge) {
      // New simplified format: just challenger and challenged_user using today's daily challenge
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <div>
            <div style="font-weight: 600; color: var(--text-primary);">🤝 ${entry.challenger} → ${entry.challenged_user}</div>
            <div style="font-size: 14px; color: var(--text-secondary);">Daily Challenge</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${date}</div>
          </div>
        </div>
      `;
    } else {
      // Old format: custom exercises and difficulty (legacy support)
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <div>
            <div style="font-weight: 600; color: var(--text-primary);">${entry.difficulty?.toUpperCase() || 'CUSTOM'} Challenge</div>
            <div style="font-size: 14px; color: var(--text-secondary);">${(entry.exercises || []).join(', ')} • ${(entry.users || []).join(', ')}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${date}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="primary-btn" data-view-id="${entry.id}" style="padding: 8px 12px; font-size: 12px;">👁 View</button>
            <button class="primary-btn" data-share-id="${entry.id}" style="padding: 8px 12px; font-size: 12px;">📱 Share QR</button>
          </div>
        </div>
      `;
    }
  }).join('');
}

function buildFriendChallengeWorkout(entry) {
  return {
    id: entry.id,
    type: 'friend_challenge',
    exercises: entry.exercises.map(name => ({
      name,
      reps: 'Challenge',
      sets: '1'
    })),
    created: entry.created,
    user: entry.createdBy,
    challengeMeta: {
      users: entry.users,
      difficulty: entry.difficulty
    }
  };
}

function showFriendChallengeDetails(entry) {
  const existingModal = document.getElementById('friendChallengeModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'friendChallengeModal';
  modal.className = 'modal';
  modal.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 14, 20, 0.85);
    backdrop-filter: blur(8px);
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(20, 23, 32, 0.98) 100%);
      border: 2px solid rgba(212, 175, 55, 0.3);
      border-radius: 18px;
      padding: 24px;
      max-width: 540px;
      width: 90%;
      position: relative;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
      color: #f5f7fa;
    ">
      <button id="friendChallengeModalClose" style="
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: #c4cfe0;
        font-size: 22px;
        cursor: pointer;
        width: 36px;
        height: 36px;
      ">✕</button>
      <h2 style="margin: 0 0 8px 0; text-align: center;">🤝 Friend Challenge</h2>
      <p style="margin: 0 0 16px 0; text-align: center; color: #c4cfe0;">${entry.difficulty.toUpperCase()} • ${new Date(entry.created).toLocaleString()}</p>

      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 6px;">Friends Challenged</div>
        <div style="color: #c4cfe0;">${entry.users.join(', ')}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 6px;">Exercises</div>
        <ul style="margin: 0; padding-left: 18px; color: #c4cfe0;">
          ${entry.exercises.map(ex => `<li>${ex}</li>`).join('')}
        </ul>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <button id="friendChallengeModalShare" class="primary-btn" style="flex: 1; padding: 12px 16px;">📱 Share QR</button>
        <button id="friendChallengeModalDone" class="primary-btn" style="flex: 1; padding: 12px 16px; background: rgba(45, 55, 72, 0.6);">✓ Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  modal.querySelector('#friendChallengeModalClose')?.addEventListener('click', closeModal);
  modal.querySelector('#friendChallengeModalDone')?.addEventListener('click', closeModal);
  modal.querySelector('#friendChallengeModalShare')?.addEventListener('click', () => {
    shareFriendChallenge(entry);
  });
}

async function shareFriendChallenge(entry) {
  const workoutToShare = buildFriendChallengeWorkout(entry);
  const shareWorkoutId = generateUUID();
  await saveWorkoutToServer(shareWorkoutId, workoutToShare);
  displayQRCodeModal(shareWorkoutId, kioskIP);
}

function populateChallengeFriendScreen() {
  // This is now simplified - just show a list of users to challenge
  const userList = document.getElementById('challengeFriendUserList');
  if (!userList) return;

  const users = getUsers().filter(u => u.username !== window.currentUser);
  
  userList.innerHTML = users.map(user => `
    <button class="challenge-friend-user-btn" data-username="${user.username}" style="
      display: block;
      width: 100%;
      padding: 16px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(26, 31, 46, 0.8) 100%);
      border: 2px solid rgba(212, 175, 55, 0.2);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    " onclick="selectUserToChallenge('${user.username}')"
      onmouseover="this.style.borderColor='rgba(212, 175, 55, 0.6)'; this.style.background='linear-gradient(135deg, rgba(60, 75, 100, 0.7) 0%, rgba(40, 50, 70, 0.85) 100%)'"
      onmouseout="this.style.borderColor='rgba(212, 175, 55, 0.2)'; this.style.background='linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(26, 31, 46, 0.8) 100%)'"
    >
      🤝 Challenge ${user.username}
    </button>
  `).join('');
}

async function showChallengeFriendScreen() {
  console.log('UI.JS: showChallengeFriendScreen() called');
  try {
    populateChallengeFriendScreen();
    console.log('UI.JS: populateChallengeFriendScreen() completed');
    
    await loadFriendChallengeHistoryFromServer();
    console.log('UI.JS: loadFriendChallengeHistoryFromServer() completed');
    
    renderFriendChallengeHistory();
    console.log('UI.JS: renderFriendChallengeHistory() completed');
    
    showScreen('challengeFriendScreen');
    console.log('UI.JS: challengeFriendScreen displayed');
  } catch (error) {
    console.error('UI.JS: Error in showChallengeFriendScreen():', error);
    // Fallback: still show the screen even if there's an error
    showScreen('challengeFriendScreen');
  }
}

async function selectUserToChallenge(username) {
  console.log('UI.JS: selectUserToChallenge() called for user:', username);
  
  // Normalize username to match the actual case from the users list
  const allUsers = getUsers();
  const actualUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  const normalizedUsername = actualUser ? actualUser.username : username;
  
  console.log('UI.JS: Normalized username:', normalizedUsername, '(from:', username, ')');
  
  // Create a friend challenge record: challenger and challenged_user both use today's daily challenge
  const challengeEntry = {
    id: generateUUID(),
    created: new Date().toISOString(),
    challenger: window.currentUser,
    challenged_user: normalizedUsername,
    dailyChallenge: true
  };

  try {
    console.log('UI.JS: Creating friend challenge with entry:', challengeEntry);
    
    const response = await fetchApiWithFallback('/api/friend-challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: challengeEntry })
    });

    if (!response.ok) {
      throw new Error('Failed to create challenge');
    }

    const data = await response.json();
    const savedEntry = data.challenge || challengeEntry;
    
    console.log('UI.JS: Challenge created successfully:', savedEntry);
    
    saveFriendChallengeToHistory(savedEntry);
    
    // Show success notification
    if (typeof showAlert === 'function') {
      showAlert('Challenge Sent! ✅', `${normalizedUsername} has been challenged to today's Daily Challenge!\n\nThey'll see a notification when they log in.`);
    } else {
      alert(`Challenge sent to ${normalizedUsername}!`);
    }

    // Refresh and go back
    setTimeout(() => {
      showDailyChallengeScreen();
    }, 1500);
  } catch (error) {
    console.error('UI.JS: Failed to create friend challenge:', error);
    if (typeof showAlert === 'function') {
      showAlert('Challenge Failed', 'Unable to send challenge. Make sure the server is running.');
    } else {
      alert('Unable to send challenge. Make sure the server is running.');
    }
  }
}

async function createFriendChallenge() {
  // This function is deprecated - use selectUserToChallenge instead
  console.warn('UI.JS: createFriendChallenge() is deprecated, use selectUserToChallenge() instead');
}

// Update challenge badge (show if not completed today)
function updateChallengeBadge() {
  const badge = document.getElementById('challengeBadge');
  if (!badge) return;
  
  const isCompleted = isChallengeCompletedToday();
  badge.style.display = isCompleted ? 'none' : 'block';
}

// Share challenge to phone
async function shareDailyChallenge() {
  const challenge = getTodaysChallenge();
  const workoutId = generateUUID();
  
  const payload = {
    workoutId,
    data: {
      name: challenge.name,
      type: 'Daily Challenge',
      exercises: challenge.exercises.map(ex => ({
        name: ex.name,
        reps: ex.reps,
        sets: ex.sets
      })),
      description: challenge.description,
      goal: challenge.goal,
      tips: challenge.tips,
      difficulty: challenge.difficulty,
      points: challenge.points
    }
  };
  
  try {
    const response = await fetchApiWithFallback('/api/workouts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Failed to share challenge');
    }
    
    await response.json();
    displayQRCodeModal(workoutId);
  } catch (error) {
    console.error('Challenge share failed:', error);
    alert('Unable to share challenge. Make sure the server is running.');
  }
}

// Initialize daily challenge
function initializeDailyChallenge() {
  // Guard: Only initialize once to prevent duplicate listeners
  if (document.documentElement.dataset.dailyChallengeInitialized) {
    console.log('⚠️ Daily challenge already initialized, skipping');
    return;
  }
  document.documentElement.dataset.dailyChallengeInitialized = 'true';
  
  const challengeBtn = document.getElementById('dailyChallengeBtn');
  const backBtn = document.getElementById('backFromChallenge');
  const backFriendBtn = document.getElementById('backFromChallengeFriend');
  const completeBtn = document.getElementById('markChallengeComplete');
  const shareBtn = document.getElementById('shareChallengeBtn');
  const historyContainer = document.getElementById('friendChallengeHistory');
  
  if (challengeBtn && !challengeBtn.dataset.listenerAdded) {
    challengeBtn.addEventListener('click', showDailyChallengeScreen);
    challengeBtn.dataset.listenerAdded = 'true';
    console.log('✅ Daily challenge button listener added');
  }
  
  if (backBtn && !backBtn.dataset.listenerAdded) {
    backBtn.addEventListener('click', () => showScreen('mainActionsScreen'));
    backBtn.dataset.listenerAdded = 'true';
    console.log('✅ Back from challenge button listener added');
  }

  if (backFriendBtn && !backFriendBtn.dataset.listenerAdded) {
    backFriendBtn.addEventListener('click', showDailyChallengeScreen);
    backFriendBtn.dataset.listenerAdded = 'true';
    console.log('✅ Back friend challenge button listener added');
  }
  
  if (completeBtn && !completeBtn.dataset.listenerAdded) {
    completeBtn.addEventListener('click', markChallengeComplete);
    completeBtn.dataset.listenerAdded = 'true';
    console.log('✅ Mark complete button listener added');
  }
  
  if (shareBtn && !shareBtn.dataset.listenerAdded) {
    shareBtn.addEventListener('click', shareDailyChallenge);
    shareBtn.dataset.listenerAdded = 'true';
    console.log('✅ Share challenge button listener added');
  }

  if (historyContainer && !historyContainer.dataset.bound) {
    historyContainer.addEventListener('click', (e) => {
      const shareBtnEl = e.target.closest('[data-share-id]');
      const viewBtnEl = e.target.closest('[data-view-id]');
      const history = getFriendChallengeHistory();

      if (viewBtnEl) {
        const entry = history.find(item => item.id === viewBtnEl.dataset.viewId);
        if (entry) {
          showFriendChallengeDetails(entry);
        }
        return;
      }

      if (shareBtnEl) {
        const entry = history.find(item => item.id === shareBtnEl.dataset.shareId);
        if (entry) {
          shareFriendChallenge(entry);
        }
      }
    });
    historyContainer.dataset.bound = 'true';
    console.log('✅ History container listener added');
  }
  
  // Update badge on load
  updateChallengeBadge();
}

// ============================================
// END DAILY CHALLENGE FUNCTIONS
// ============================================

function initializeFullBodyGenerator() {
  // Exercise count buttons
  document.querySelectorAll('.generator-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.generator-btn').forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#333';
      });
      btn.style.background = '#333';
      btn.style.color = '#fff';
      selectedExerciseCount = parseInt(btn.dataset.exercises);
    });
  });

  // Difficulty buttons
  document.querySelectorAll('.generator-difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.generator-difficulty-btn').forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#333';
      });
      btn.style.background = '#333';
      btn.style.color = '#fff';
      selectedDifficultyLevel = btn.dataset.level;
    });
  });

  // Generate button
  document.getElementById('generateFullBodyWorkout')?.addEventListener('click', generateFullBodyWorkout);

  // Back button
  document.getElementById('backFromGenerator')?.addEventListener('click', () => {
    showScreen('mainActionsScreen');
  });
}

/* ===============================
   INTERACTIVE COACH SCREEN
================================ */

function renderInteractiveCoachScreen(options = {}) {
  const { resetInterview = false } = options;

  if (!window.currentUser || window.currentUser === 'admin') {
    showAlert('Notice', 'Interactive Coach is not available in admin mode.');
    return;
  }

  if (resetInterview) {
    resetCoachInterviewState();
  } else {
    ensureCoachInterviewState();
  }

  const username = window.currentUser;
  const container = document.getElementById('coachInsightsContainer');
  if (!container) {
    showAlert('Unavailable', 'Coach screen is not available right now.');
    return;
  }

  const answeredPrompts = getCoachPromptCount(currentCoachInterview);
  const canGenerate = answeredPrompts === 7;

  container.innerHTML = `
    <div class="coach-intro-card">
      <h3>Coach Intake</h3>
      <p class="coach-summary-copy">Answer these questions and the coach will build a full workout plan and a matching nutrition plan for this member. This keeps the direct workout browser intact, but gives new members a clear place to start.</p>
      <p class="coach-progress-line">Progress: ${answeredPrompts} of 7 coach prompts answered.</p>

      <div class="builder-section">
        <h3 class="builder-section-title">1. What is the main training goal?</h3>
        <div class="builder-goal-grid">
          ${buildCoachQuestionTile('workoutGoal', 'strength', '💪 Strength')}
          ${buildCoachQuestionTile('workoutGoal', 'hypertrophy', '🏋️ Muscle Growth')}
          ${buildCoachQuestionTile('workoutGoal', 'fatloss', '🔥 Fat Loss')}
          ${buildCoachQuestionTile('workoutGoal', 'balance', '⚖️ Balance & Coordination')}
          ${buildCoachQuestionTile('workoutGoal', 'flexibility', '🤸 Flexibility & Mobility')}
          ${buildCoachQuestionTile('workoutGoal', 'functional', '🏃 Functional Training')}
        </div>
      </div>

      <div class="builder-section">
        <h3 class="builder-section-title">2. Do you want one session or a weekly structure?</h3>
        <div class="builder-goal-grid" style="max-width: 600px; margin: 0 auto;">
          ${buildCoachQuestionTile('planHorizon', 'single', '📅 Single Session')}
          ${buildCoachQuestionTile('planHorizon', 'weekly', '📆 Weekly Plan')}
        </div>
      </div>

      <div class="builder-section">
        <h3 class="builder-section-title">3. What body focus sounds right?</h3>
        <div class="builder-goal-grid">
          ${buildCoachQuestionTile('bodyFocus', 'full-body', '🧩 Full Body')}
          ${buildCoachQuestionTile('bodyFocus', 'upper-body', '🏋️ Upper Body')}
          ${buildCoachQuestionTile('bodyFocus', 'lower-body', '🦵 Lower Body')}
          ${buildCoachQuestionTile('bodyFocus', 'push', '📈 Push Focus')}
          ${buildCoachQuestionTile('bodyFocus', 'pull', '🧲 Pull Focus')}
          ${buildCoachQuestionTile('bodyFocus', 'mobility-reset', '🧘 Mobility Reset')}
        </div>
      </div>

      <div class="builder-section">
        <h3 class="builder-section-title">4. How much time is available?</h3>
        <div class="builder-time-grid">
          ${buildCoachQuestionTile('timeAvailable', '30', '⏱️ 30 Min')}
          ${buildCoachQuestionTile('timeAvailable', '45', '⏱️ 45 Min')}
          ${buildCoachQuestionTile('timeAvailable', '60', '⏱️ 60 Min')}
          ${buildCoachQuestionTile('timeAvailable', '90', '⏱️ 90 Min')}
        </div>
      </div>

      <div class="builder-section">
        <h3 class="builder-section-title">5. What experience level fits this member?</h3>
        <div class="builder-time-grid">
          ${buildCoachQuestionTile('experienceLevel', 'beginner', '🟢 Beginner')}
          ${buildCoachQuestionTile('experienceLevel', 'intermediate', '🟡 Intermediate')}
          ${buildCoachQuestionTile('experienceLevel', 'advanced', '🔴 Advanced')}
        </div>
      </div>

      <div class="builder-section">
        <h3 class="builder-section-title">6. How is the body feeling today?</h3>
        <div class="builder-time-grid">
          ${buildCoachQuestionTile('recoveryState', 'fresh', '🚀 Fresh and ready')}
          ${buildCoachQuestionTile('recoveryState', 'normal', '🙂 Normal energy')}
          ${buildCoachQuestionTile('recoveryState', 'sore', '🛠️ Sore / beat up')}
        </div>
      </div>

      <div class="builder-section">
        <h3 class="builder-section-title">7. What should the food plan support most?</h3>
        <div class="builder-goal-grid">
          ${buildCoachQuestionTile('nutritionGoal', 'strength', '💪 Strength Fuel')}
          ${buildCoachQuestionTile('nutritionGoal', 'hypertrophy', '🏋️ Muscle Growth Fuel')}
          ${buildCoachQuestionTile('nutritionGoal', 'fatloss', '🔥 Fat Loss Fuel')}
          ${buildCoachQuestionTile('nutritionGoal', 'balance', '⚖️ Balanced Eating')}
          ${buildCoachQuestionTile('nutritionGoal', 'flexibility', '🤸 Recovery & Mobility Fuel')}
          ${buildCoachQuestionTile('nutritionGoal', 'functional', '🏃 Performance Fuel')}
        </div>
      </div>

      <div class="builder-section" style="margin-bottom: 16px;">
        <h3 class="builder-section-title">Optional: Which sport or activity matters most?</h3>
        <select id="coachSportSelect" class="builder-select" style="width: 100%; max-width: 500px; margin: 0 auto; display: block; padding: 16px; font-size: 18px; border-radius: 12px; border: 2px solid #333; background: #1a1e27; color: #fff;">
          <option value="">None / general fitness</option>
          <option value="hockey" ${currentCoachInterview.sport === 'hockey' ? 'selected' : ''}>🏒 Hockey</option>
          <option value="basketball" ${currentCoachInterview.sport === 'basketball' ? 'selected' : ''}>🏀 Basketball</option>
          <option value="soccer" ${currentCoachInterview.sport === 'soccer' ? 'selected' : ''}>⚽ Soccer</option>
          <option value="football" ${currentCoachInterview.sport === 'football' ? 'selected' : ''}>🏈 Football</option>
          <option value="running" ${currentCoachInterview.sport === 'running' ? 'selected' : ''}>🏃 Running</option>
          <option value="cycling" ${currentCoachInterview.sport === 'cycling' ? 'selected' : ''}>🚴 Cycling</option>
          <option value="swimming" ${currentCoachInterview.sport === 'swimming' ? 'selected' : ''}>🏊 Swimming</option>
          <option value="martial-arts" ${currentCoachInterview.sport === 'martial-arts' ? 'selected' : ''}>🥋 Martial Arts</option>
          <option value="crossfit" ${currentCoachInterview.sport === 'crossfit' ? 'selected' : ''}>🏋️ CrossFit</option>
        </select>
      </div>

      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
        <button id="coachGeneratePlanBtn" class="primary-btn" ${canGenerate ? '' : 'disabled'}>🧠 Build Full Workout + Nutrition Plan</button>
        <button id="coachOpenMusclesBtn" class="control-btn" type="button">💪 Browse Muscle Groups Instead</button>
      </div>
    </div>
    ${currentCoachPlanBundle ? renderCoachPlanHtml(currentCoachPlanBundle) : ''}
    ${renderCoachHistoryHtml(username)}
  `;

  container.querySelectorAll('[data-coach-group]').forEach(button => {
    button.addEventListener('click', () => {
      ensureCoachInterviewState();
      const field = button.dataset.coachGroup;
      const value = button.dataset.coachValue;
      const previousGoal = currentCoachInterview.workoutGoal;

      currentCoachInterview[field] = value;
      if (field === 'workoutGoal' && (!currentCoachInterview.nutritionGoal || currentCoachInterview.nutritionGoal === previousGoal)) {
        currentCoachInterview.nutritionGoal = value;
      }
      currentCoachPlanBundle = null;
      renderInteractiveCoachScreen();
    });
  });

  document.getElementById('coachSportSelect')?.addEventListener('change', (event) => {
    ensureCoachInterviewState();
    currentCoachInterview.sport = event.target.value;
    currentCoachPlanBundle = null;
  });

  document.getElementById('coachGeneratePlanBtn')?.addEventListener('click', async () => {
    ensureCoachInterviewState();
    if (getCoachPromptCount(currentCoachInterview) !== 7) {
      showAlert('More Info Needed', 'Please answer all seven coach prompts before generating the plan.');
      return;
    }

    currentCoachPlanBundle = generateCoachPlanBundle(currentCoachInterview, username);
    renderInteractiveCoachScreen();

    const shouldShareNow = await showConfirmDialog(
      'Plan Ready',
      'Your workout + nutrition plan is ready. Generate a QR code to send it to phone now?'
    );

    if (!shouldShareNow || !currentCoachPlanBundle) {
      return;
    }

    try {
      await shareCoachPlanToPhone(currentCoachPlanBundle, currentCoachInterview);
    } catch (error) {
      console.error('UI.JS: Auto coach plan QR share failed:', error);
      showAlert('QR Share Failed', `Could not generate coach plan QR: ${error.message || error}`);
    }
  });

  document.getElementById('coachSharePlanQrBtn')?.addEventListener('click', async () => {
    if (!currentCoachPlanBundle) {
      showAlert('No Plan Yet', 'Build a plan first, then share it to phone with QR.');
      return;
    }

    try {
      await shareCoachPlanToPhone(currentCoachPlanBundle, currentCoachInterview);
    } catch (error) {
      console.error('UI.JS: Coach plan QR share failed:', error);
      showAlert('QR Share Failed', `Could not generate coach plan QR: ${error.message || error}`);
    }
  });

  document.getElementById('coachShareNutritionQrBtn')?.addEventListener('click', async () => {
    if (!currentCoachPlanBundle) {
      showAlert('No Plan Yet', 'Build a plan first, then share the nutrition plan to phone.');
      return;
    }

    try {
      await shareCoachNutritionToPhone(currentCoachPlanBundle, currentCoachInterview);
    } catch (error) {
      console.error('UI.JS: Coach nutrition QR share failed:', error);
      showAlert('QR Share Failed', `Could not generate nutrition QR: ${error.message || error}`);
    }
  });

  document.getElementById('coachOpenMusclesBtn')?.addEventListener('click', () => {
    showMuscleGroupsDirect();
  });

  const backBtn = document.getElementById('backFromCoach');
  if (backBtn && !backBtn.dataset.listenerBound) {
    backBtn.dataset.listenerBound = 'true';
    backBtn.addEventListener('click', () => {
      showScreen('mainActionsScreen');
    });
  }

  const refreshBtn = document.getElementById('coachRefreshBtn');
  if (refreshBtn && !refreshBtn.dataset.listenerBound) {
    refreshBtn.dataset.listenerBound = 'true';
    refreshBtn.addEventListener('click', () => {
      renderInteractiveCoachScreen({ resetInterview: true });
    });
  }

  showScreen('interactiveCoachScreen');
}

/* ===============================
   ANALYTICS SCREEN
================================ */

function renderAnalyticsScreen() {
  if (!window.currentUser || window.currentUser === 'guest') {
    showAlert('Notice', 'Analytics only available for registered users.');
    return;
  }

  const username = window.currentUser;
  const summary = getAnalyticsSummary(username);

  console.log('Analytics Summary:', summary);

  // Render stats with correct property names
  document.getElementById('totalWorkoutsVal').textContent = summary.totalWorkouts || 0;
  document.getElementById('monthWorkoutsVal').textContent = summary.thisMonth || 0;
  document.getElementById('avgDurationVal').textContent = summary.averageDuration || 0;
  document.getElementById('streakVal').textContent = summary.currentStreak || 0;

  // Render favorite muscles (correct property name)
  renderFavoritesMuscles(summary.favoriteMuscles || []);

  // Render smart recommendations & adaptive difficulty
  renderSmartRecommendations(username);
  renderProgressionSuggestions(username);

  // Render badges
  renderBadges(username);

  // Render progress badges
  renderProgressBadges(username);

  // Render recent workouts
  const history = getWorkoutHistory(username);
  renderRecentWorkouts(history);

  // Setup back button (remove old listener first)
  const backBtn = document.getElementById('backFromAnalytics');
  if (backBtn) {
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    newBackBtn.addEventListener('click', () => {
      showScreen('mainActionsScreen');
    });
  }

  showScreen('analyticsScreen');
}

function renderFavoritesMuscles(favorites) {
  const container = document.getElementById('favoriteMusclesContainer');
  if (!container) return;

  if (favorites.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No workouts yet. Start training to see your favorites!</p>';
    return;
  }

  container.innerHTML = favorites.map(fav => `
    <div class="favorite-muscle-item">
      <span class="muscle-name">${fav.muscle}</span>
      <span class="muscle-count">${fav.count}</span>
    </div>
  `).join('');
}

function renderBadges(username) {
  const container = document.getElementById('badgesContainer');
  if (!container) return;

  const earned = getBadges(username);
  const earnedIds = new Set(earned.map(b => b.id));

  const badgeHtml = Object.values(BADGES).map(badgeConfig => {
    const isEarned = earnedIds.has(badgeConfig.id);
    return `
      <div class="badge ${isEarned ? 'earned' : ''}">
        ${isEarned ? '<div class="badge-earned-check">✓</div>' : ''}
        <span class="badge-icon">${badgeConfig.icon}</span>
        <span class="badge-name">${badgeConfig.name}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = badgeHtml || '<p style="color: var(--text-secondary); text-align: center;">No badges earned yet!</p>';
}

function renderProgressBadges(username) {
  const container = document.getElementById('progressBadgesContainer');
  if (!container) return;

  const badgeProgress = getAllBadgeProgress(username);
  
  if (badgeProgress.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Complete workouts to earn badges!</p>';
    return;
  }

  const progressHtml = badgeProgress
    .filter(bp => bp && bp.percentage < 100)
    .slice(0, 5)
    .map(bp => `
      <div class="badge-progress-item">
        <div class="badge-progress-header">
          <span class="badge-progress-icon">${bp.badge?.icon || '🏆'}</span>
          <span class="badge-progress-name">${bp.badge?.name || 'Unknown Badge'}</span>
          <span class="badge-progress-value">${bp.progress}/${bp.target}</span>
        </div>
        <div class="badge-progress-description">${bp.badge?.description || 'No description available'}</div>
        <div class="badge-progress-bar">
          <div class="badge-progress-fill" style="width: ${bp.percentage}%"></div>
        </div>
      </div>
    `).join('');

  container.innerHTML = progressHtml;
}

function renderRecentWorkouts(history) {
  const container = document.getElementById('recentWorkoutsContainer');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No workouts recorded yet!</p>';
    return;
  }

  const recentHtml = history.slice(0, 10).map(workout => {
    const date = new Date(workout.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const muscles = (workout.muscleGroups || []).join(', ') || 'Unknown';
    const exerciseCount = (workout.exercises || []).length;
    const duration = workout.duration || 30;

    return `
      <div class="workout-history-item">
        <div class="workout-date">
          ${dateStr}<br/>
          ${timeStr}
        </div>
        <div class="workout-details">
          <div class="workout-muscles">${muscles}</div>
          <div class="workout-exercises">${exerciseCount} exercises</div>
        </div>
        <div class="workout-duration">${duration} min</div>
      </div>
    `;
  }).join('');

  container.innerHTML = recentHtml;
}

/* ===============================
   DIFFICULTY FILTER
================================ */

function setupDifficultyFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.onclick = () => {
      currentDifficultyFilter = btn.dataset.difficulty;
      updateDifficultyFilterButtons();

      if (currentDifficultyFilterContext === 'stretch') {
        if (!selectedStretchBodyPart) return;
        loadStretchesForBodyPart(selectedStretchBodyPart);
        return;
      }

      if (!selectedMuscle) return;
      loadExercisesForMuscle(selectedMuscle);
    };
  });

  updateDifficultyFilterButtons();
}

function updateDifficultyFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    const isActive = (btn.dataset.difficulty || 'all') === currentDifficultyFilter;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? '#333' : '#fff';
    btn.style.color = isActive ? '#fff' : '#333';
  });
}

function normalizeDifficultyValue(value, fallback = 'beginner') {
  const normalized = (value || '').toString().toLowerCase().trim();
  if (normalized === 'beginner' || normalized === 'intermediate' || normalized === 'advanced') {
    return normalized;
  }
  return fallback;
}

function getDifficultyEmoji(value) {
  const difficulty = normalizeDifficultyValue(value);
  if (difficulty === 'intermediate') return '🟡';
  if (difficulty === 'advanced') return '🔴';
  return '🟢';
}

function filterExercisesByDifficulty(exercises, difficulty) {
  const normalizedDifficulty = (difficulty || 'all').toLowerCase().trim();

  if (normalizedDifficulty === 'all') {
    return exercises;
  }

  return exercises.filter(exercise => {
    const exerciseDifficulty = normalizeDifficultyValue(exercise.difficulty);
    return exerciseDifficulty === normalizedDifficulty;
  });
}

// Initialize sharing when DOM is ready
document.addEventListener('DOMContentLoaded', initializeWorkoutSharing);

console.log('✅ UI.JS FULLY PARSED');

