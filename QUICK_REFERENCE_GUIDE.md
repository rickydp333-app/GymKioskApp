# 🏋️ GymKiosk App - Getting Started Guide

**Version:** 1.0.0 | **Date:** February 2026  
**RDPs Strength & Conditioning | Dual-Mode Gym Application**

---

## 📋 Quick Summary

GymKiosk is a comprehensive gym app with two interfaces:
- **🖥️ Kiosk (Desktop):** Fullscreen locked interface for gym floor with 135+ exercises
- **📱 Mobile:** QR-code-based access to workouts on your phone

### ✅ Recent Updates (March 2026)
- Difficulty filtering is active for both exercises and stretches (`All`, `Beginner`, `Intermediate`, `Advanced`).
- Entering **Muscle Groups** or **Stretches** now resets the filter to `All` so full lists load by default.
- Stretch categories are fully populated (`neck-shoulders`, `chest`, `back`, `arms-wrists`, `legs-glutes`, `hips-pelvis`, `spine-core`).
- Fixed a crash when opening exercises from mixed tile bindings; muscle tile handling is now scoped correctly.

---

## 🚀 Get Started in 5 Minutes

### Prerequisites
- ✅ Node.js installed (download from nodejs.org)
- ✅ GymKiosk files extracted
- ✅ Same computer for kiosk + server

### Installation
```bash
cd C:\Users\YourName\Desktop\GymKioskApp
npm install
```

### Start the App
```bash
npm start
```

### What You'll See
```
GymKiosk Mobile Server RUNNING
Port: 3001
Network: http://192.168.x.x:3001    ← SAVE THIS FOR QR CODES
```

---

## 🎯 Main Features Overview

| Feature | Description | Access |
|---------|-------------|--------|
| 💪 **Exercises** | 135+ exercises by muscle group | Main Menu → Select Exercises |
| 📋 **Workout Builder** | Generate custom workout plans | Main Menu → Generate Workout |
| 🍽️ **Nutrition** | Meal recommendations | Main Menu → Nutrition |
| 📅 **Calendar** | Track completed workouts | Main Menu → Workout Calendar |
| 🎯 **Daily Challenge** | Daily fitness goal | Main Menu → Daily Challenge |
| ⏱️ **Stopwatch** | Time your sets | Main Menu → Stopwatch |
| 📱 **QR Sharing** | Share workout to phones | Click Share on any workout |

---

## 📱 For Mobile Users

### How to Access Workout on Phone

**Option 1: QR Code (Easiest)**
1. From kiosk, click "📲 Share" on any workout
2. Point your phone camera at the QR code
3. Tap the notification
4. Workout opens automatically

**Option 2: Manual URL**
1. Get the Network IP from server startup (192.168.x.x)
2. On phone, open browser
3. Type: `http://192.168.x.x:3001/workout/[id]`
4. Workout loads

### What to Do on Phone
- ✅ Check off exercises as you complete them
- 📊 See progress bar update in real-time
- 📤 Share with friends
- ⬆️ Sync progress back to kiosk

---

## 📊 Typical Workout Workflow

```
1. Start App (npm start)
         ↓
2. Select User (Rick / New User)
         ↓
3. Choose Action (Exercises, Generate, Calendar, etc.)
         ↓
4. For Exercises: Pick Muscle Group → Browse → Click Exercise
         ↓
5. View Form Instructions & Video
         ↓
6. Share to Phone (Optional) - Click Share → Scan QR
         ↓
7. Start Workout & Track Exercise Completion
         ↓
8. Click "✓ Mark Workout Complete"
         ↓
9. Check Calendar - See Green ✅ Mark on Today's Date
         ↓
10. Track Progress, Streaks, and Personal Records
```

---

## 📅 Workout Calendar

### Viewing Your Calendar
1. Click "📅 Workout Calendar" from main menu
2. See current month with indicators:
   - **✓ Gold/Yellow** = Workout scheduled
   - **✅ Green** = Workout completed
   - **Blue Border** = Today's date

### Calendar Stats
- **This Week:** Shows X/Y (completed/total)
- **This Month:** Shows completion percentage
- **Streak:** Consecutive days with completed workouts

### Clicking a Date
Opens detailed view showing:
- All exercises with checkboxes
- Form instructions for each
- Progress bar (X/Y exercises)
- Meal plan if scheduled
- "Mark Complete" button

---

## 🖥️ Desktop Kiosk Screens

### 1. User Selection
- Default user: **Rick** (PIN: 1234)
- Create custom users with profiles
- Select icon and PIN for security

### 2. Main Actions
Hub for all features:
- Select Exercises
- Generate Workout  
- Build Workout
- View Nutrition
- Workout Calendar
- Stopwatch
- Settings

### 3. Exercise Selection
- 9 muscle groups available
- Up to 15 exercises per group
- Click exercise for:
  - Form instructions (step-by-step)
  - Video demo
  - Primary/secondary muscles
  - Sets & reps recommendation

### 4. Workout Views
- List basic exercises
- Full view with all details
- Calendar view with tracking

---

## 🔧 Troubleshooting

### App Won't Start
```
Error checking:
✓ Node.js installed? → node -v
✓ In correct folder? → npm list (shows version)
✓ Port in use? → netstat -ano | findstr :3001
✓ Try fresh install → npm install && npm start
```

### QR Code Won't Scan
- ✅ Phone must be on same WiFi as kiosk
- ✅ Check console shows Network IP (not localhost)
- ✅ Visit `http://localhost:3001/diagnostics` to test
- ✅ Windows Firewall may need to allow Node.js

### Workouts Not Saving
- ✅ User must be selected (check top-left)
- ✅ Click "💾 Save to Calendar" button
- ✅ Check browser console (F12) for errors
- ✅ Try page refresh (F5)

### Videos Not Playing
- ✅ Check video files exist in `assets/videos/`
- ✅ Should be .mp4 format
- ✅ Missing videos show placeholder
- ✅ Text instructions always available

---

## 🎮 Default Credentials

| Item | Value |
|------|-------|
| Default User | Rick |
| Default PIN | 1234 |
| Admin Code | 7391 |

---

## 📖 Command Reference

| Command | Purpose | When to Use |
|---------|---------|------------|
| `npm start` | Start everything | Normal use (BEST) |
| `npm run server` | Just server | Testing mobile |
| `npm run kiosk` | Just desktop | Server running elsewhere |
| `npm install` | Install dependencies | First time or after error |

---

## 💡 Pro Tips

### General Use
- 🎯 Full screen kiosk by double-clicking title bar
- 🔄 App works offline - all data cached locally
- 👥 Multi-user support - each has own history
- ⌨️ On-screen keyboard for text input

### Mobile Access
- 📌 Save workout URL to phone home screen
- 💾 Progress auto-saves (no manual upload)
- 🔗 Share calendars: `http://192.168.x.x:3001/calendar/{id}`

### Performance
- 📊 Keep only essential tabs/apps open
- 🧠 Need 4GB RAM minimum
- 🎨 Update display drivers if slow
- ✅ One app instance at a time

---

## 🔐 Data Storage

All data saved locally in browser storage:
- **Workouts:** Saved per user in localStorage
- **Calendar:** Completed dates stored locally
- **Personal Records:** Weight/reps tracked
- **User Profiles:** Stored on device

⚠️ **Note:** Clearing browser data will erase all stored workouts

---

## 🌐 Network Setup for Mobile

```
┌─────────────────────────────┐
│   Same WiFi Network         │
├──────────────┬──────────────┤
│              │              │
│   KIOSK      │    PHONE     │
│  (Desktop)   │  (iOS/Android)
│              │              │
│ Port 3001    │   Network    │
│ IP: .50      │   IP: .100   │
└──────────────┴──────────────┘

QR Code Points to: http://192.168.x.x:3001/workout/{id}
Manual URL entry works the same way
```

---

## ⚡ Common Issues & Solutions

### Problem: Server starts but QR shows localhost
**Solution:** Check terminal for Network line (not Local)
```
Local: http://localhost:3001          ← DON'T USE
Network: http://192.168.1.50:3001     ← USE THIS
```

### Problem: Phone can't reach kiosk
**Solution:** Check networks are same
- Kiosk WiFi: Look at Windows network icon
- Phone WiFi: Check phone WiFi name matches
- If different: Connect phone to kiosk's WiFi network

### Problem: Slow workouts loading
**Solution:** 
- Close unused browser tabs
- Check RAM (4GB minimum)
- Restart browser completely
- Try `npm start` again

### Problem: Exercises list empty
**Solution:**
- App needs active internet FOR FIRST LOAD
- After that, data cached locally
- Check console (F12) for errors
- Refresh page (F5)

---

## 📚 File Locations

| Item | Location |
|------|----------|
| **Exercises Data** | `js/data/exercises.js` |
| **User Data** | Browser localStorage |
| **Workout History** | `data/workouts.json` |
| **Server Logs** | Terminal output |
| **Debugging** | Browser DevTools (F12) |

---

## 🎓 Learning Path

**New to the app?**
1. Read: This guide (5 min)
2. Do: Start app with `npm start` (1 min)
3. Try: Select Exercises → View one exercise (3 min)
4. Explore: Generate a quick 30-min workout (5 min)
5. Test: Share to phone via QR (2 min)

**Advanced Usage:**
1. Create custom workout plans
2. Track personal records
3. Manage multi-user setup
4. Share calendars between devices

---

## 🆘 Need Help?

1. **Diagnostic Page:** `http://localhost:3001/diagnostics`
   - Tests server connectivity
   - Shows network IP
   - Lists saved workouts

2. **Browser Console:** Press `F12`
   - Shows JavaScript errors
   - DevTools for debugging
   - Network requests visible

3. **Server Terminal:** Read output for errors
   - Shows startup messages
   - Port information
   - Error logs

4. **Common Questions:**
   - Q: Can I customize exercises? A: Edit `js/data/exercises.js` and restart
   - Q: Where's my backup? A: Download `data/workouts.json`
   - Q: Multi-phone support? A: Yes, share QR with anyone
   - Q: Is data synced to cloud? A: No, local storage only

---

## 📞 Quick Reference

**To Start:**
```bash
npm start
```

**To Stop:**
```
Press Ctrl+C in terminal
```

**To Reset Everything:**
```bash
npm install
npm start
```

**To View Diagnostics:**
```
http://localhost:3001/diagnostics
```

**To Access from Mobile:**
```
http://[NETWORK_IP]:3001
or scan QR code
```

---

## ✅ Verification Checklist

Before using with users, verify:
- [ ] App starts without errors (`npm start`)
- [ ] Main menu shows all action buttons
- [ ] Can select exercises and see videos
- [ ] Can generate a workout
- [ ] QR code displays when clicking Share
- [ ] Can scan QR from phone on same WiFi
- [ ] Mobile shows workout correctly
- [ ] Can mark exercises complete on mobile
- [ ] Calendar shows marked workout next day
- [ ] Can create new user and keep history separate

---

**Happy Training! 💪**

*For in-depth guide with screenshots and detailed workflow, see GETTING_STARTED_GUIDE.html*

---

**Version:** 1.0.0  
**Last Updated:** February 16, 2026  
**Created for:** RDPs Strength & Conditioning  
**Maintained by:** GymKiosk Development Team
