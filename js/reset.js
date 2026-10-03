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
let tutorialFallback = null;
const TUTORIAL_SCREEN_CANDIDATES = [
  'screensaver-tutorial.html'
];
let currentTutorialScreenIndex = 0;

window.addEventListener('message', (event) => {
  if (event.source !== tutorialFrame?.contentWindow || event.data?.type !== 'gymkiosk-screensaver-ready') return;
  tutorialFrame.style.visibility = 'visible';
  tutorialFrame.contentWindow.postMessage({ type: 'gymkiosk-login-leaderboard', entries: typeof getLoginLeaderboard === 'function' ? getLoginLeaderboard() : [] }, '*');
  if (tutorialFallback) tutorialFallback.style.display = 'none';
});

function showScreensaverFallback() {
  if (tutorialFallback?.isConnected) {
    tutorialFallback.remove();
  }

  tutorialFallback = document.createElement('div');
  tutorialFallback.setAttribute('role', 'status');
  tutorialFallback.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1;
    display: grid;
    grid-template-rows: 35% 25% 40%;
    color: #f5f7fa;
    font-family: 'Segoe UI', sans-serif;
    text-align: center;
    background: #102238;
  `;

  const headlinePanel = document.createElement('section');
  headlinePanel.style.cssText = 'display:grid;place-content:center;padding:20px;background:linear-gradient(115deg,#102238,#15515b,#263c60);border-bottom:4px solid #f0c94a;';
  const eyebrow = document.createElement('p');
  eyebrow.textContent = 'TRAIN SMARTER. GET STRONGER.';
  eyebrow.style.cssText = 'margin:0 0 12px;color:#84e5d4;font-size:20px;font-weight:800;';
  const headline = document.createElement('h1');
  headline.innerHTML = 'YOUR OWN<br><span>PERSONAL TRAINER</span>';
  headline.style.cssText = 'margin:0;color:#fff9e8;font-size:clamp(36px,6vw,88px);line-height:1;text-shadow:0 5px 22px #0008;';
  const highlight = headline.querySelector('span');
  highlight.style.cssText = 'color:#ffe078;animation:trainerColorCycle 5s ease-in-out infinite;';
  headlinePanel.append(eyebrow, headline);

  const messagePanel = document.createElement('section');
  messagePanel.style.cssText = 'display:grid;place-content:center;gap:14px;padding:20px;background:linear-gradient(135deg,#24374f,#354565);';
  const message = document.createElement('p');
  message.textContent = 'Your workout guides are loading.';
  message.style.cssText = 'margin:0;font-size:clamp(20px,2.4vw,34px);';
  const returnButton = document.createElement('button');
  returnButton.type = 'button';
  returnButton.textContent = 'START HERE';
  returnButton.style.cssText = 'justify-self:center;padding:12px 28px;border:2px solid white;border-radius:30px;background:#ffe078;color:#182334;font-size:18px;font-weight:800;';
  returnButton.addEventListener('click', () => window.closeScreensaver?.());
  messagePanel.append(message, returnButton);

  const loginPanel = document.createElement('section');
  loginPanel.style.cssText = 'display:grid;align-content:center;gap:6px;overflow:auto;padding:12px;background:#173b32;border-bottom:3px solid #f0c94a;';
  const loginHeading = document.createElement('h2');
  loginHeading.textContent = 'Top 5 Most Logged-In Users';
  loginHeading.style.cssText = 'margin:0 0 6px;font-size:22px;color:#ffe078;';
  loginPanel.appendChild(loginHeading);
  const leaders = typeof getLoginLeaderboard === 'function' ? getLoginLeaderboard() : [];
  leaders.forEach((user, index) => {
    const row = document.createElement('p');
    row.style.cssText = 'margin:0;font-size:18px;overflow-wrap:anywhere;';
    row.textContent = `${index + 1}. ${user.username} - ${user.count} login ${user.count === 1 ? 'day' : 'days'}`;
    loginPanel.appendChild(row);
  });
  if (!leaders.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No login days recorded yet.';
    loginPanel.appendChild(empty);
  }
  tutorialFallback.append(headlinePanel, loginPanel, messagePanel);
  tutorialOverlay.appendChild(tutorialFallback);
}

function startScreensaver(options = {}) {
  window.kioskTutorial?.close();
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
      background: #102238;
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
      position: absolute;
      inset: 0;
      z-index: 2;
      visibility: hidden;
      background: transparent;
    `;

    tutorialOverlay.appendChild(tutorialFrame);
    document.body.appendChild(tutorialOverlay);
  }

  showScreensaverFallback();
  if (tutorialFrame) tutorialFrame.style.visibility = 'hidden';

  // Expose close method to tutorial screen
  window.closeScreensaver = function() {
    console.log('RESET.JS: Closing tutorial via closeScreensaver()');
    stopScreensaver();
  };

  if (tutorialFrame) {
    const tutorialPath = TUTORIAL_SCREEN_CANDIDATES[currentTutorialScreenIndex];
    const tutorialUrl = new URL(tutorialPath, window.location.href);
    tutorialUrl.searchParams.set('ts', String(Date.now()));
    tutorialFrame.src = tutorialUrl.href;

    tutorialFrame.onerror = () => {
      if (currentTutorialScreenIndex < TUTORIAL_SCREEN_CANDIDATES.length - 1) {
        currentTutorialScreenIndex += 1;
        const fallbackUrl = new URL(TUTORIAL_SCREEN_CANDIDATES[currentTutorialScreenIndex], window.location.href);
        fallbackUrl.searchParams.set('ts', String(Date.now()));
        tutorialFrame.src = fallbackUrl.href;
        return;
      }

      console.error('RESET.JS: Tutorial screensaver could not load; showing the built-in fallback');
      showScreensaverFallback();
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

