// QR Code generation for sharing workouts
console.log('QR.JS LOADED');
const DEFAULT_SERVER_BASE_URL = 'https://gymkioskapp.onrender.com';
const DEFAULT_LOCAL_SERVER_BASE_URL = 'http://localhost:3001';
const SHARE_BASE_CACHE_MS = 30000;
let cachedResolvedShareBaseUrl = null;
let cachedResolvedShareBaseAt = 0;

function getShareBaseUrl() {
  const configured =
    window.GYMKIOSK_SERVER_BASE_URL ||
    localStorage.getItem('gymkiosk_server_base_url') ||
    DEFAULT_SERVER_BASE_URL;

  return String(configured).replace(/\/+$/, '');
}

function getLocalShareBaseUrl() {
  const configuredLocal =
    localStorage.getItem('gymkiosk_local_server_base_url') ||
    DEFAULT_LOCAL_SERVER_BASE_URL;

  return String(configuredLocal).replace(/\/+$/, '');
}

function isApiInfoJsonResponse(response) {
  const contentType = (response?.headers?.get('content-type') || '').toLowerCase();
  return response?.ok && contentType.includes('application/json');
}

function setResolvedShareBase(baseUrl) {
  cachedResolvedShareBaseUrl = baseUrl;
  cachedResolvedShareBaseAt = Date.now();
  return baseUrl;
}

window.resetShareBaseCache = function resetShareBaseCache() {
  cachedResolvedShareBaseUrl = null;
  cachedResolvedShareBaseAt = 0;
};

async function resolveShareBaseUrl(forceRefresh = false) {
  const isCacheValid =
    !forceRefresh &&
    cachedResolvedShareBaseUrl &&
    Date.now() - cachedResolvedShareBaseAt < SHARE_BASE_CACHE_MS;

  if (isCacheValid) {
    return cachedResolvedShareBaseUrl;
  }

  const configuredBase = getShareBaseUrl();
  const localBase = getLocalShareBaseUrl();

  try {
    const configuredInfoResponse = await fetch(`${configuredBase}/api/info`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (isApiInfoJsonResponse(configuredInfoResponse)) {
      return setResolvedShareBase(configuredBase);
    }

    console.warn('QR.JS: Configured share base is not serving API JSON. Status:', configuredInfoResponse.status);
  } catch (configuredErr) {
    console.warn('QR.JS: Configured share base check failed:', configuredErr.message);
  }

  try {
    const localInfoResponse = await fetch(`${localBase}/api/info`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (isApiInfoJsonResponse(localInfoResponse)) {
      const localInfo = await localInfoResponse.json();
      const ipAddress = localInfo?.ipAddress;

      if (ipAddress && ipAddress !== 'localhost' && ipAddress !== '127.0.0.1') {
        return setResolvedShareBase(`http://${ipAddress}:3001`);
      }

      return setResolvedShareBase(localBase);
    }
  } catch (localErr) {
    console.warn('QR.JS: Local share base check failed:', localErr.message);
  }

  return setResolvedShareBase(configuredBase);
}

async function buildResolvedShareUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = await resolveShareBaseUrl();
  return `${baseUrl}${normalizedPath}`;
}

function buildShareUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getShareBaseUrl()}${normalizedPath}`;
}

function addRequestNonce(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}share=${Date.now()}`;
}

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function getKioskNetworkIP() {
  try {
    console.log('QR.JS: Attempting to get server info from resolved base URL...');
    const resolvedBase = await resolveShareBaseUrl(true);
    const response = await fetch(`${resolvedBase}/api/info`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response && response.ok) {
      const data = await response.json();
      console.log('QR.JS: Server info received:', data);
      const ip = data.ipAddress || 'localhost';
      console.log('QR.JS: Using IP address:', ip);
      return ip;
    } else {
      console.warn('QR.JS: Server responded with status:', response?.status);
    }
  } catch (err) {
    console.warn('QR.JS: Could not get server IP:', err);
    console.warn('QR.JS: Make sure Express server is running on port 3001');
  }
  
  console.warn('QR.JS: Falling back to configured site base URL.');
  return null;
}

async function generateQRCode(workoutId, kioskIP) {
  if (!kioskIP || kioskIP === 'localhost') {
    await getKioskNetworkIP();
  }

  const workoutUrl = addRequestNonce(await buildResolvedShareUrl(`/workout/${workoutId}`));
  
  console.log('QR.JS: Generated workout URL:', workoutUrl);
  console.log('QR.JS: Encoding to QR code for workoutId:', workoutId);
  const qrNonce = Date.now();
  
  // Use QR server API for simple QR generation
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(workoutUrl)}&color=f5f7fa&bgcolor=1a1f2e&t=${qrNonce}`;
  
  console.log('QR.JS: QR code generated. If phone cant scan it, ensure Express server is running!');
  return { qrCode: qrUrl, workoutUrl };
}

async function generateCalendarQRCode(calendarId, kioskIP) {
  if (!kioskIP || kioskIP === 'localhost') {
    await getKioskNetworkIP();
  }

  const calendarUrl = addRequestNonce(await buildResolvedShareUrl(`/calendar/${calendarId}`));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(calendarUrl)}&color=f5f7fa&bgcolor=1a1f2e`;

  return { qrCode: qrUrl, calendarUrl };
}

async function generateFavoritesQRCode(favoritesId, kioskIP) {
  if (!kioskIP || kioskIP === 'localhost') {
    await getKioskNetworkIP();
  }

  const favoritesUrl = addRequestNonce(await buildResolvedShareUrl(`/favorites/${favoritesId}`));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(favoritesUrl)}&color=f5f7fa&bgcolor=1a1f2e`;

  return { qrCode: qrUrl, favoritesUrl };
}

async function displayQRCodeModal(workoutId, kioskIP) {
  try {
    const { qrCode, workoutUrl } = await generateQRCode(workoutId, kioskIP);
    
    // Remove existing modal if present
    const existingModal = document.getElementById('qrModal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'qrModal';
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
      backdrop-filter: blur(10px);
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div class="qr-modal" style="
        background: linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(20, 23, 32, 0.98) 100%);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 20px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        position: relative;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
      ">
        <button class="modal-close" onclick="closeQRModal()" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #c4cfe0;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
        ">✕</button>
        
        <h2 style="margin: 0 0 16px 0; font-size: 24px; text-align: center; color: #f5f7fa;">📱 Share Your Workout</h2>
        
        <p style="text-align: center; color: #c4cfe0; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
          Scan this QR code with your phone to access your workout and track progress:
        </p>

        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 0 0 16px 0; word-break: break-all;">
          Workout ID: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #d4af37; font-size: 11px; font-family: 'Courier New', monospace;">${workoutId}</code>
        </p>
        
        <div style="
          background: linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(20, 30, 50, 0.8) 100%);
          border: 2px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
        ">
          <img src="${qrCode}" alt="Workout QR Code" style="
            width: 280px;
            height: 280px;
            border-radius: 12px;
            image-rendering: crisp-edges;
          ">
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 16px 0; word-break: break-all;">
          Or visit: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #00d4ff; font-size: 11px; font-family: 'Courier New', monospace;">${workoutUrl}</code>
        </p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px;">
          <button class="primary-btn" onclick="copyWorkoutLink('${workoutUrl}')" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">📋 Copy Link</button>
          <button class="primary-btn" onclick="closeQRModal()" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: rgba(45, 55, 72, 0.6);
            color: #f5f7fa;
            border: 1px solid rgba(212, 175, 55, 0.15);
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">✓ Done</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQRModal();
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    if (typeof showAlert === 'function') {
      showAlert('Error', 'Error generating QR code: ' + error.message);
    } else {
      alert('Error generating QR code: ' + error.message);
    }
  }
}

async function displayFavoritesQRCodeModal(favoritesId, kioskIP) {
  try {
    const { qrCode, favoritesUrl } = await generateFavoritesQRCode(favoritesId, kioskIP);
    
    // Remove existing modal if present
    const existingModal = document.getElementById('qrModal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'qrModal';
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
      backdrop-filter: blur(10px);
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div class="qr-modal" style="
        background: linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(20, 23, 32, 0.98) 100%);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 20px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        position: relative;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
      ">
        <button class="modal-close" onclick="closeQRModal()" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #c4cfe0;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
        ">✕</button>
        
        <h2 style="margin: 0 0 16px 0; font-size: 24px; text-align: center; color: #f5f7fa;">📱 Share Your Favorites</h2>
        
        <p style="text-align: center; color: #c4cfe0; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
          Scan this QR code with your phone to access your favorite exercises:
        </p>

        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 0 0 16px 0; word-break: break-all;">
          Favorites ID: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #d4af37; font-size: 11px; font-family: 'Courier New', monospace;">${favoritesId}</code>
        </p>
        
        <div style="
          background: linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(20, 30, 50, 0.8) 100%);
          border: 2px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
        ">
          <img src="${qrCode}" alt="Favorites QR Code" style="
            width: 280px;
            height: 280px;
            border-radius: 12px;
            image-rendering: crisp-edges;
          ">
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 16px 0; word-break: break-all;">
          Or visit: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #00d4ff; font-size: 11px; font-family: 'Courier New', monospace;">${favoritesUrl}</code>
        </p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px;">
          <button class="primary-btn" onclick="copyWorkoutLink('${favoritesUrl}')" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">📋 Copy Link</button>
          <button class="primary-btn" onclick="closeQRModal()" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: rgba(45, 55, 72, 0.6);
            color: #f5f7fa;
            border: 1px solid rgba(212, 175, 55, 0.15);
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">✓ Done</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQRModal();
    });
  } catch (error) {
    console.error('Error generating favorites QR code:', error);
    if (typeof showAlert === 'function') {
      showAlert('Error', 'Error generating QR code: ' + error.message);
    } else {
      alert('Error generating QR code: ' + error.message);
    }
  }
}

function closeQRModal() {
  const modal = document.getElementById('qrModal');
  if (modal) modal.remove();
}

function copyWorkoutLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    if (typeof showAlert === 'function') {
      showAlert('Success', '✓ Link copied to clipboard!');
    } else {
      alert('✓ Link copied to clipboard!');
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
    prompt('Copy this link:', url);
  });
}

async function displayCalendarQRCode(calendarId, kioskIP) {
  try {
    const { qrCode, calendarUrl } = await generateCalendarQRCode(calendarId, kioskIP);

    const existingModal = document.getElementById('qrModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'qrModal';
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
      backdrop-filter: blur(10px);
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div class="qr-modal" style="
        background: linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(20, 23, 32, 0.98) 100%);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 20px;
        padding: 32px;
        max-width: 520px;
        width: 90%;
        position: relative;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
      ">
        <button class="modal-close" onclick="closeQRModal()" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #c4cfe0;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
        ">✕</button>

        <h2 style="margin: 0 0 16px 0; font-size: 24px; text-align: center; color: #f5f7fa;">📅 Share Your Calendar</h2>

        <p style="text-align: center; color: #c4cfe0; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
          Scan this QR code to view your scheduled workouts and meal plans:
        </p>

        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 0 0 16px 0; word-break: break-all;">
          Calendar ID: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #d4af37; font-size: 11px; font-family: 'Courier New', monospace;">${calendarId}</code>
        </p>

        <div style="
          background: linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(20, 30, 50, 0.8) 100%);
          border: 2px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
        ">
          <img src="${qrCode}" alt="Calendar QR Code" style="
            width: 280px;
            height: 280px;
            border-radius: 12px;
            image-rendering: crisp-edges;
          ">
        </div>

        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 16px 0; word-break: break-all;">
          Or visit: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #00d4ff; font-size: 11px; font-family: 'Courier New', monospace;">${calendarUrl}</code>
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px;">
          <button class="primary-btn" onclick="copyWorkoutLink('${calendarUrl}')" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">📋 Copy Link</button>
          <button class="primary-btn" onclick="closeQRModal()" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: rgba(45, 55, 72, 0.6);
            color: #f5f7fa;
            border: 1px solid rgba(212, 175, 55, 0.15);
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">✓ Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQRModal();
    });
  } catch (error) {
    console.error('Error generating calendar QR code:', error);
    if (typeof showAlert === 'function') {
      showAlert('Error', 'Error generating calendar QR code: ' + error.message);
    } else {
      alert('Error generating calendar QR code: ' + error.message);
    }
  }
}

async function generateMealPlanQRCode(mealPlanId, kioskIP) {
  if (!kioskIP || kioskIP === 'localhost') {
    await getKioskNetworkIP();
  }

  const mealPlanUrl = addRequestNonce(await buildResolvedShareUrl(`/meal/${mealPlanId}`));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mealPlanUrl)}&color=f5f7fa&bgcolor=1a1f2e`;

  return { qrCode: qrUrl, mealPlanUrl };
}

async function displayMealPlanQRCodeModal(mealPlanId, kioskIP) {
  try {
    const { qrCode, mealPlanUrl } = await generateMealPlanQRCode(mealPlanId, kioskIP);
    
    // Remove existing modal if present
    const existingModal = document.getElementById('qrModal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'qrModal';
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
      backdrop-filter: blur(10px);
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div class="qr-modal" style="
        background: linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(20, 23, 32, 0.98) 100%);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 20px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        position: relative;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
      ">
        <button class="modal-close" onclick="closeQRModal()" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #c4cfe0;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
        ">✕</button>
        
        <h2 style="margin: 0 0 16px 0; font-size: 24px; text-align: center; color: #f5f7fa;">🍽️ Share Your Meal Plan</h2>
        
        <p style="text-align: center; color: #c4cfe0; font-size: 14px; margin: 0 0 24px 0; line-height: 1.6;">
          Scan this QR code with your phone to view your personalized meal plan:
        </p>

        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 0 0 16px 0; word-break: break-all;">
          Meal Plan ID: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #d4af37; font-size: 11px; font-family: 'Courier New', monospace;">${mealPlanId}</code>
        </p>
        
        <div style="
          background: linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(20, 30, 50, 0.8) 100%);
          border: 2px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
        ">
          <img src="${qrCode}" alt="Meal Plan QR Code" style="
            width: 280px;
            height: 280px;
            border-radius: 12px;
            image-rendering: crisp-edges;
          ">
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #8b95a8; margin: 16px 0; word-break: break-all;">
          Or visit: <code style="background: rgba(45, 55, 72, 0.4); padding: 4px 8px; border-radius: 4px; color: #00d4ff; font-size: 11px; font-family: 'Courier New', monospace;">${mealPlanUrl}</code>
        </p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px;">
          <button class="primary-btn" onclick="copyWorkoutLink('${mealPlanUrl}')" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">📋 Copy Link</button>
          <button class="primary-btn" onclick="closeQRModal()" style="
            padding: 12px 16px;
            font-size: 14px;
            width: 100%;
            background: rgba(45, 55, 72, 0.6);
            color: #f5f7fa;
            border: 1px solid rgba(212, 175, 55, 0.15);
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          ">✓ Done</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQRModal();
    });
  } catch (error) {
    console.error('Error generating meal plan QR code:', error);
    if (typeof showAlert === 'function') {
      showAlert('Error', 'Error generating meal plan QR code: ' + error.message);
    } else {
      alert('Error generating meal plan QR code: ' + error.message);
    }
  }
}

