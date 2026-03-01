# QR Code Quick Reference Card

## ✅ QR Codes Working?

**To verify QR codes are working:**

1. **Start the app:**
   ```
   npm start
   ```
   (This runs the server AND kiosk)

2. **Open Diagnostics:**
   ```
   http://localhost:3001/diagnostics
   ```

3. **Click: "Full Diagnostics"**
   - Should show green ✓ for all items
   - Should display Network IP (NOT localhost)

4. **From a phone on the same WiFi:**
   - Visit: `http://[NETWORK_IP]:3001`
   - Should load home page

---

## 🔧 Quick Troubleshooting

### "QR Code won't scan on phone"

**Check #1:** Server is running
```bash
npm start
```
Look for: `GymKiosk Mobile Server RUNNING`

**Check #2:** Network IP is correct
- In console, look for: `Network: http://192.168.x.x:3001`
- NOT `localhost`

**Check #3:** Phone is on same WiFi
- Both kiosk and phone must use same network
- Not different WiFi networks
- Not phone hotspot

**Check #4:** Firewall allows port 3001
- Windows Defender may block it
- Allow Node.js through firewall if asked

---

## 📱 Testing from Phone

### Manual Test (no camera needed):
1. Find the Network IP from console or diagnostics
2. Open browser on phone
3. Type: `http://192.168.x.x:3001`
   (Replace 192.168.x.x with actual IP)
4. Should see home page

### If that works but QR won't scan:
- Make sure your phone's camera has permission to scan QR
- Try a different QR app
- Make sure QR code image is clear

---

## 🐛 Console Logs to Check

**Open DevTools in kiosk (auto-opens)**

When clicking "Share" on an exercise, you should see:

✓ GOOD:
```
UI.JS: Saving workout to server
QR.JS: Server info received: {ipAddress: "192.168.1.50"...}
UI.JS: ✓ Workout saved to server successfully!
QR.JS: Generated workout URL: http://192.168.1.50:3001/workout/...
```

✗ BAD:
```
UI.JS: Error saving workout to server
QR.JS: Falling back to localhost
```
→ Server is not running! Run: `npm run server`

---

## 🌐 Critical URLs for Testing

| Purpose | URL | Note |
|---------|-----|------|
| **Test Server** | `localhost:3001/api/health` | If responds, server OK |
| **Network IP** | `localhost:3001/api/info` | Shows actual IP for QR |
| **Diagnostics** | `localhost:3001/diagnostics` | Full test dashboard |
| **Home Page** | `localhost:3001/` | Basic connectivity test |

---

## 🚀 Full Start Command

```bash
npm start
```

This starts:
- ✓ Express server (port 3001)
- ✓ Electron kiosk
- ✓ DevTools (auto-opens)

Monitor console for error messages.

---

## 📊 Network Architecture

```
SAME WIFI REQUIRED
    ↓
┌─────────────────────────────────┐
│  KIOSK (192.168.1.50)          │
│  └─ Electron App               │
│  └─ Express Server :3001       │
└────────┬────────────────────────┘
         │
      WiFi Network
         │
┌────────┴────────────────────────┐
│  PHONE (192.168.1.100)          │
│  └─ Camera scans QR             │
│  └─ Opens: http://192.168.1.50  │
│  :3001/workout/{id}             │
└─────────────────────────────────┘
```

---

## 💾 Data Stored

After creating a workout:
- **Location:** `data/workouts.json`
- **Phone Access:** `http://[IP]:3001/workout/[ID]`
- **Stores:** Exercise list, sets/reps, form instructions

---

## 🚨 If Nothing Works

1. **Kill everything:**
   - Close Electron window
   - Close all terminals
   - Close DevTools

2. **Start fresh:**
   ```bash
   npm start
   ```

3. **Check for errors:**
   - Look at console output
   - Visit: `localhost:3001/diagnostics`
   - Run all tests on that page

4. **Check firewall:**
   - Windows Defender might block Node.js
   - Allow it if prompted

5. **Alternative: Just use browser**
   ```bash
   npm run server
   ```
   Then visit `http://localhost:3001` from kiosk
   (This doesn't use Electron, just web browser)

---

## 📞 Support Info

**Server Console Shows:**
```
Port: 3001
Local: http://localhost:3001
Network: http://192.168.x.x:3001
```

Use the **Network** URL for QR codes and phone access.

---

**Last Updated:** February 12, 2026
**Version:** 1.0 with Enhanced Diagnostics
