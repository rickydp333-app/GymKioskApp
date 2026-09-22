/* =========================================
   RESET + SCREENSAVER (FINAL)
========================================= */

console.log('RESET.JS LOADED');

const INACTIVITY_LIMIT = 300000; // 5 min
let inactivityTimer = null;
let inScreensaverMode = false;

const screensaverOverlay = document.getElementById('screensaverOverlay');
const screensaverVideo = document.getElementById('screensaverVideo');

function resetTimer() {
  clearTimeout(inactivityTimer);
  if (!inScreensaverMode) {
    inactivityTimer = setTimeout(startScreensaver, INACTIVITY_LIMIT);
  }
}

function resetKiosk() {
  window.location.reload();
}

['click', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, () => {
    if (inScreensaverMode) stopScreensaver();
    resetTimer();
  }, true);
});

resetTimer();

/* ===== SCREENSAVER ===== */
/* Tutorial-Only Mode: rotate tutorial pages every 10 minutes */

let screensaverRotationTimer = null;
let tutorialOverlay = null;
let tutorialFrame = null;
const TUTORIAL_SCREEN_CANDIDATES = [
  'screensaver-tutorial.html',
  'assets/screensaver-tutorial.html'
];
let currentTutorialScreenIndex = 0;

function startScreensaver(options = {}) {
  const { skipAutoLogout = false } = options;
  console.log('RESET.JS: Starting screensaver rotation');

  const autoLogoutEnabled = typeof window.isScreensaverAutoLogoutEnabled === 'function'
    ? window.isScreensaverAutoLogoutEnabled()
    : true;

  if (!skipAutoLogout && autoLogoutEnabled && window.currentUser && typeof window.resetToStart === 'function') {
    console.log(`RESET.JS: Logging out active user due to inactivity (${window.currentUser})`);
    window.resetToStart();
  }

  launchTutorialScreensaver();
}

function launchTutorialScreensaver() {
  inScreensaverMode = true;

  if (screensaverVideo && screensaverOverlay) {
    screensaverVideo.pause();
    screensaverVideo.currentTime = 0;
    screensaverOverlay.classList.add('hidden');
  }

  if (!tutorialOverlay) {
    tutorialOverlay = document.createElement('div');
    tutorialOverlay.id = 'tutorialScreensaverOverlay';
    tutorialOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 10001;
      background: #000;
      display: none;
    `;

    tutorialFrame = document.createElement('iframe');
    tutorialFrame.id = 'tutorialScreensaverFrame';
    tutorialFrame.setAttribute('title', 'Screensaver Tutorial');
    tutorialFrame.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: #000;
    `;

    tutorialOverlay.appendChild(tutorialFrame);
    document.body.appendChild(tutorialOverlay);
  }

  // Expose close method to tutorial screen
  window.closeScreensaver = function() {
    console.log('RESET.JS: Closing tutorial via closeScreensaver()');
    stopScreensaver();
  };

  if (tutorialFrame) {
    const tutorialPath = TUTORIAL_SCREEN_CANDIDATES[currentTutorialScreenIndex];
    tutorialFrame.src = `${tutorialPath}?ts=${Date.now()}`;

    tutorialFrame.onerror = () => {
      if (currentTutorialScreenIndex < TUTORIAL_SCREEN_CANDIDATES.length - 1) {
        currentTutorialScreenIndex += 1;
        tutorialFrame.src = `${TUTORIAL_SCREEN_CANDIDATES[currentTutorialScreenIndex]}?ts=${Date.now()}`;
        return;
      }

      console.error('RESET.JS: Tutorial screensaver could not load; stopping screensaver mode');
      if (tutorialOverlay) tutorialOverlay.style.display = 'none';
      stopScreensaver();
    };

    currentTutorialScreenIndex = (currentTutorialScreenIndex + 1) % TUTORIAL_SCREEN_CANDIDATES.length;
  }
  tutorialOverlay.style.display = 'block';

  if (screensaverRotationTimer) {
    clearTimeout(screensaverRotationTimer);
  }

  // Auto-rotate to next tutorial after 10 minutes
  screensaverRotationTimer = setTimeout(() => {
    console.log('RESET.JS: 10 minutes elapsed, rotating to next tutorial screensaver');
    if (tutorialOverlay) {
      tutorialOverlay.style.display = 'none';
    }
    launchTutorialScreensaver();
  }, 600000); // 10 minutes = 600000ms
}

function stopScreensaver() {
  console.log('RESET.JS: Screensaver stopped');
  
  // Clear rotation timer
  if (screensaverRotationTimer) {
    clearTimeout(screensaverRotationTimer);
    screensaverRotationTimer = null;
  }
  
  // Hide tutorial overlay if active
  if (tutorialOverlay) {
    tutorialOverlay.style.display = 'none';
  }
  if (tutorialFrame) {
    tutorialFrame.src = 'about:blank';
  }
  
  // Stop video if playing
  if (screensaverVideo && screensaverOverlay) {
    screensaverVideo.pause();
    screensaverVideo.currentTime = 0;
    screensaverOverlay.classList.add('hidden');
  }
  
  inScreensaverMode = false;
  
  // Clean up
  delete window.closeScreensaver;
  
  // Restart idle timer
  resetTimer();

  // Show safety disclaimer immediately after exiting screensaver
  if (typeof window.showDisclaimerIfNeeded === 'function') {
    window.showDisclaimerIfNeeded(true);
  }
}

window.stopScreensaver = stopScreensaver;

window.triggerScreensaverTest = function() {
  console.log('RESET.JS: Manual screensaver test requested');
  if (inScreensaverMode) {
    stopScreensaver();
  }
  startScreensaver({ skipAutoLogout: true });
};

