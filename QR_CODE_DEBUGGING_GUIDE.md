# QR Code Scanning Troubleshooting Guide

## Quick Diagnosis

When you scan a QR code on your phone and it doesn't work, follow these steps:

### Step 1: Check the Browser Console on Kiosk
1. Open DevTools in the Electron window (it should open automatically)
2. Look for these log messages when you click "Share" on an exercise:
   - ✓ `QR.JS: Attempting to get network IP from server...`
   - ✓ `UI.JS: Saving workout to server - ID: [workout-id]`
   - ✓ `QR.JS: Generated workout URL: http://[KIOSK_IP]:3001/workout/[workout-id]`

### Step 2: Verify Express Server is Running
The Express server MUST be running for QR codes to work. Check:

```bash
# These terminals should show "GymKiosk Mobile Server RUNNING"
npm run server          # Just the server
# or
npm start              # Both server + kiosk (recommended for local testing)
```

**Expected console output:**
```
GymKiosk Mobile Server RUNNING
========================================
Port: 3001
Local: http://localhost:3001
Network: http://192.168.x.x:3001   <-- This is what phones need
```

### Step 3: Check the Network IP Address
The critical piece is getting the correct network IP. The QR code encodes a URL like:
```
http://[NETWORK_IP]:3001/workout/[workoutId]
```

If you see:
- ✓ `http://192.168.x.x:3001/workout/...` → GOOD (phone can reach this)
- ✗ `http://localhost:3001/workout/...` → BAD (phone cannot reach localhost)

**To manually check the network IP:**
```powershell
ipconfig
# Look for "IPv4 Address" like 192.168.x.x or 10.0.x.x
```

### Step 4: Test Network Connectivity
From your phone:
1. Open browser and go to: `http://[KIOSK_IP]:3001`
   - You should see the GymKiosk home page
   - If this fails, the phone and kiosk are not on the same network

2. Try the workout directly: `http://[KIOSK_IP]:3001/workout/[workoutId]`
   - Should load and display exercises

### Step 5: Check Saved Workouts
The JSON files store workout data:
- **Windows**: `data/workouts.json`
- Should contain entries like:
  ```json
  ["workout-id-here", {
    "userId": null,
    "data": { "exercises": [...] },
    "created": "2026-02-12T...",
    "completed": false
  }]
  ```

---

## Common Issues & Fixes

### Issue: QR Code shows but phone gets "Workout not found"
**Possible causes:**
1. Express server crashed or stopped running
2. Workout was not saved (check console for "Failed to save workout to server")
3. Firewall blocking port 3001

**Fix:**
- Restart: `npm run server`
- Check Windows Firewall: Allow Node.js through firewall
- Verify port 3001 is not in use: `netstat -ano | findstr :3001`

### Issue: QR Code links to localhost instead of network IP
**Root cause:** Express server not responding to `/api/info` request

**Fix:**
1. Check if server is running on port 3001
2. Restart server: `npm run server`
3. Look for this console message on kiosk:
   - Good: `QR.JS: Server info received: {ipAddress: "192.168.x.x"...}`
   - Bad: `QR.JS: Could not get server IP`

### Issue: Firewall blocking connection
**Windows Firewall test:**
```powershell
# From phone WiFi on same network, ping the kiosk
ping [KIOSK_IP]

# From kiosk, test port
netstat -ano | findstr LISTENING | findstr :3001
```

### Issue: Phone on different network than kiosk
**Solution:** Both phone and kiosk must be on the same WiFi network
- Check: KioskIP: `ipconfig` → IPv4 Address
- Check: Phone WiFi settings → Connected network

---

## Developer Console Logs to Watch

### When clicking "Share" on an exercise:

**Good sequence:**
```
UI.JS: Saving workout to server - ID: abc123
UI.JS: Workout data exercises count: 3
QR.JS: Attempting to get network IP from server...
QR.JS: Server info received: {ipAddress: "192.168.1.50"...}
QR.JS: Using IP address: 192.168.1.50
UI.JS: ✓ Workout saved to server successfully!
QR.JS: Generated workout URL: http://192.168.1.50:3001/workout/abc123
```

**Bad sequence (server not running):**
```
UI.JS: Saving workout to server - ID: abc123
UI.JS: Error saving workout to server: TypeError: Failed to fetch
UI.JS: ⚠️  Make sure Express server is running on port 3001
UI.JS: Run: npm run server
QR.JS: Could not get server IP: TypeError: Failed to fetch
QR.JS: Falling back to localhost - phone will not be able to scan this QR code!
```

---

## Network Architecture

```
┌─────────────────────────────────────────────────┐
│         SAME WiFi NETWORK REQUIRED              │
├─────────────────────┬───────────────────────────┤
│                     │                           │
│   KIOSK             │      PHONE                │
│   (Windows PC)      │      (iOS/Android)        │
│                     │                           │
│  ┌───────────┐      │   ┌────────────────┐      │
│  │ Electron  │      │   │ Mobile Browser │      │
│  │ Kiosk App │      │   │ (Chrome/Safari)│      │
│  └───────────┘      │   └────────────────┘      │
│        ↓            │            ↑              │
│  ┌───────────────────────────────────────┐      │
│  │  Express Server (port 3001)           │      │
│  │  - Serves /workout/{id}               │      │
│  │  - API at /api/workouts/{id}          │      │
│  │  - Stores workouts in data/           │      │
│  └───────────────────────────────────────┘      │
│                     │                           │
└─────────────────────┴───────────────────────────┘
```

---

## Quick Test

### To test QR code end-to-end:

1. **Start everything:**
   ```bash
   npm start
   ```

2. **From console output, find:**
   ```
   Network: http://192.168.x.x:3001   <-- Copy this IP
   ```

3. **From the kiosk, generate a QR code** by going to Exercises → Select muscle group → Click Share

4. **Check console for:**
   ```
   QR.JS: Generated workout URL: http://192.168.x.x:3001/workout/...
   ```

5. **From phone on same WiFi:**
   - Scan with phone camera or QR reader
   - OR manually visit the URL from console

6. **If it works:**
   - Mobile browser shows the workout
   - You can mark exercises as complete
   - Progress bar updates

### To manually test the server:

```bash
# From kiosk desktop browser, visit:
http://localhost:3001

# From phone on same WiFi, visit:
http://[KIOSK_IP]:3001

# Check server API info:
http://localhost:3001/api/info
```

---

## Still Having Issues?

1. **Enable DevTools and check console** for exact error messages
2. **Verify port 3001 is not in use** with `netstat -ano | findstr :3001`
3. **Restart everything:** Kill all Node processes, then `npm start`
4. **Check Windows Defender Firewall** - may need to allow Node.js
5. **Ensure phone and kiosk are on same WiFi** - Different networks won't work

