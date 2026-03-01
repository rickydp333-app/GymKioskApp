// SCREENSAVER TUTORIAL INTEGRATION GUIDE
// Add this to reset.js or as a standalone module

// Option 1: Add to reset.js - Replace video screensaver with interactive tutorial
// Uncomment the code below in reset.js:

/*
function startScreensaver() {
  inScreensaverMode = true;
  
  // Open interactive tutorial in fullscreen
  const tutorialWindow = window.open('screensaver-tutorial.html', 'screensaver', 
    'fullscreen=yes,menubar=no,toolbar=no,scrollbars=no,resizable=no');
  
  if (tutorialWindow) {
    tutorialWindow.focus();
    // Expose close method to tutorial
    window.closeScreensaver = function() {
      tutorialWindow.close();
      stopScreensaver();
    };
  }
}

function stopScreensaver() {
  inScreensaverMode = false;
  screensaverOverlay.classList.add('hidden');
  if (screensaverVideo) {
    screensaverVideo.pause();
    screensaverVideo.src = '';
  }
  resetTimer();
}
*/

// ============================================
// Option 2: Launch from UI Button
// ============================================
// Add this button to index.html in a hidden admin section:
/*
<button id="launch-screensaver-tutorial" style="display: none;">
  Launch Screensaver Tutorial
</button>
*/

// Then add this to ui.js:
/*
document.getElementById('launch-screensaver-tutorial')?.addEventListener('click', () => {
  const tutorialWindow = window.open('screensaver-tutorial.html', 'screensaver', 
    'fullscreen=yes,menubar=no,toolbar=no,scrollbars=no,resizable=no');
  
  if (tutorialWindow) {
    tutorialWindow.focus();
    // Expose close method
    window.closeScreensaver = function() {
      tutorialWindow.close();
      if (window.electronAPI && window.electronAPI.closeScreensaver) {
        window.electronAPI.closeScreensaver();
      }
    };
  }
});
*/

// ============================================
// Option 3: Hybrid Approach - Video + Tutorial
// ============================================
// Alternate between video screensaver and interactive tutorial:

const TUTORIAL_INTERVAL = 5; // Show tutorial every 5th idle trigger
let screensaverCount = 0;

function startScreensaver() {
  screensaverCount++;
  
  if (screensaverCount % TUTORIAL_INTERVAL === 0) {
    // Show interactive tutorial
    launchTutorialScreensaver();
  } else {
    // Show video screensaver (original behavior)
    launchVideoScreensaver();
  }
}

function launchTutorialScreensaver() {
  inScreensaverMode = true;
  const tutorialWindow = window.open('screensaver-tutorial.html', 'screensaver', 
    'fullscreen=yes,menubar=no,toolbar=no,scrollbars=no,resizable=no');
  
  if (tutorialWindow) {
    tutorialWindow.focus();
    window.closeScreensaver = function() {
      tutorialWindow.close();
      stopScreensaver();
    };
  }
}

function launchVideoScreensaver() {
  // Original video screensaver code from reset.js
  if (!screensaverOverlay || !screensaverVideo) {
    console.warn('Screensaver elements not found');
    return;
  }
  inScreensaverMode = true;
  screensaverOverlay.classList.remove('hidden');
  // ... rest of video screensaver logic
}

function stopScreensaver() {
  inScreensaverMode = false;
  if (screensaverOverlay) {
    screensaverOverlay.classList.add('hidden');
  }
  if (screensaverVideo) {
    screensaverVideo.pause();
    screensaverVideo.src = '';
  }
  resetTimer();
}
