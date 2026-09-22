# GymKioskApp AI Coding Agent Instructions

## Project Overview
**GymKioskApp** is a dual-mode gym application:
1. **Kiosk App** (Electron): Fullscreen locked kiosk for RDPs Strength & Conditioning
2. **Mobile Companion** (Express server + web): QR-code-based workout sharing to mobile devices

Users on the kiosk select profiles, choose muscle groups, view exercises, and scan QR codes to access workouts on their phones.

## Architecture & Data Flow

### Core Tech Stack
- **Electron 30.0.0**: Desktop kiosk framework (main.js creates locked window)
- **Express 5.2.1 + Node.js**: Workout sharing server (server.js on port 3001)
- **Vanilla JavaScript**: No frameworks; modular files in `js/` folder
- **Offline-first**: All exercise data hardcoded in `js/data/exercises.js` (~135 exercises across 9 muscle groups)
- **Kiosk mode**: Window locked fullscreen (1920x1080), contextual isolation enabled, DevTools accessible for debugging

### Screen Navigation (UI Module)
Four main screens managed by `ui.js` with `showScreen(screenId)` function:
1. **userScreen** → User profile selection (dynamically loaded from localStorage)
2. **muscleScreen** → Muscle group selection (9 groups: chest, shoulders, back, biceps, triceps, legs, abs, core, traps)
3. **exerciseScreen** → Exercise list for selected muscle (max 15 displayed with video thumbnails)
4. **demoLoopScreen** → Auto-plays demo videos after 5 minutes idle (reset.js)

Global state: `window.currentUser` (string), `window.lastGeneratedPlan` (object), `window.LOCAL_EXERCISES` (object)

### Module Responsibilities

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| **main.js** | Electron entry point | Window setup, IPC handlers (exit-app) |
| **preload.js** | IPC bridge | Exposes `electron.exitApp()` to renderer |
| **renderer.js** | Bootstrap & safety | Prevents drag/drop, disables right-click menu |
| **auth.js** | User authentication | Admin code validation (ADMIN_CODE const), user localStorage helpers |
| **ui.js** | **Authoritative** UI controller | `showScreen()`, user click handlers, muscle selection flow, QR modal display |
| **api.js** | Exercise data (legacy) | LOCAL_EXERCISES object (deprecated - use exercises.js) |
| **workouts.js** | Plan generation (minimal) | Defers to exercises.js for exercise data |
| **data/exercises.js** | **Primary** exercise data | `window.LOCAL_EXERCISES` (definitive source, ~135 exercises) |
| **reset.js** | Kiosk auto-reset | Inactivity timer (300s), demo loop, `resetKiosk()` hard reload |
| **qr.js** | QR code generation | `generateQRCode()`, `displayQRCodeModal()` for workout sharing |
| **server.js** | Express API server | Workout storage, user auth, mobile workout retrieval (port 3001) |

### Critical Design Patterns

**Offline Safety**: Exercise data is hardcoded in JSON structures. All functions check `window.LOCAL_EXERCISES` before attempting fetch. Never assume network availability.

**Global Window Namespace**: Auth state and generated plans are stored on `window` object (anti-pattern, but established pattern here). Reference as:
```javascript
window.currentUser // String: 'rick', 'guest', or null
window.lastGeneratedPlan // Object or null
window.LOCAL_EXERCISES // Object: { chest: [...], shoulders: [...], ... }
```

**Dual Exercise Data**: `api.js` and `data/exercises.js` both define exercises. **`data/exercises.js` is authoritative** (more detailed descriptions). When adding/editing exercises, update exercises.js first.

**IPC for Kiosk Exit**: Admin exit only via `window.electron.exitApp()` → main.js IPC handler → `app.quit()`. Do NOT allow exit through other means.

**QR Code Workflow**: 
1. User selects muscle group → exercises displayed with video thumbnails
2. Click "Share" → `ui.js` generates UUID, saves workout via `POST /api/workouts/create`
3. `qr.js` generates QR code linking to `http://{kioskIP}:3001/workout/{workoutId}`
4. Mobile device scans QR → Express serves `mobile/viewer.html` with workout details
5. Workouts stored in-memory on server (Map structure, no persistence)

## Developer Workflows

### Start the app
```bash
npm start  # Runs: node server.js & electron .
npm run kiosk  # Runs: electron . (kiosk only, no server)
npm run server  # Runs: node server.js (server only, for mobile testing)
```
DevTools auto-opens in detached mode (see main.js line ~30, can be disabled for production).

### Server API Endpoints
- `POST /api/workouts/create` - Create workout from kiosk (no auth required)
- `GET /api/workouts/:workoutId` - Retrieve workout by ID
- `POST /api/auth/register` - Register mobile user
- `POST /api/auth/login` - Login mobile user
- `GET /api/info` - Get server IP address for QR generation
- Static files served from `mobile/` directory

### Modify Exercise Data
1. Edit `js/data/exercises.js` (primary source)
2. Each muscle group is an array of exercise objects with this structure:
   ```javascript
   {
     name: "Push-Up",                    // Exercise name (required)
     howTo: [                            // Step-by-step instructions array
       "Position body in plank",
       "Lower body to ground",
       "Push back to start"
     ],
     primary: ["Chest", "Triceps"],      // Primary muscles worked
     secondary: ["Shoulders"]            // Secondary/stabilizer muscles
   }
   ```
3. Limit display to 15 per muscle in `ui.js loadExercisesForMuscle()`
4. Update both `exercises.js` and sync to `api.js` if needed (though api.js is legacy)

### Add New Muscle Group
1. Add key to `data/exercises.js`: `abs: [...]`
2. Add to HTML muscle grid in `index.html`
3. Add to `workouts.js EXERCISE_LIBRARY` for plan generation
4. Update CSS grid if needed (`style.css .muscle-grid`)

### User Profile Management
Users are stored in localStorage with structure:
```javascript
{
  username: "Rick",
  pin: "1234",
  favorites: { exercises: [], muscles: [] },
  icon: "user-icon-01.svg"
}
```
- `getUsers()` / `saveUsers()` in ui.js handle persistence
- Default user "Rick" auto-created on first launch (pin: 1234)
- Admin access requires ADMIN_CODE from auth.js (default: 7391)
- User grid dynamically rendered from localStorage on userScreen

### Video Asset Structure
Exercise videos organized by muscle group:
```
assets/videos/{muscle}/{exercise-name}.mp4
- chest/     (15 videos)
- shoulders/ (15 videos)
- back/      (15 videos)
- biceps/    (15 videos)
- triceps/   (15 videos)
- legs/      (15 videos)
- abs/       (15 videos)
- core/      (15 videos)
- traps/     (15 videos)
```
Demo videos for idle mode: `assets/demos/demo1.mp4`, `demo2.mp4`

### Kiosk Reset Behavior
- **Inactivity timer** (300s/5min) in `reset.js` triggers demo loop
- **Demo videos** pulled from `assets/demos/` (not included; expected to exist)
- **Click/touch anywhere** stops demo and restarts timer
- **Admin exit** requires prompt code (ADMIN_CODE in auth.js)

### Debugging Tips
- DevTools available in detached window (main.js)
- Console logs prefixed by module name (e.g., "UI.JS LOADED")
- Kiosk lock prevents Alt+F4; use Admin panel to exit cleanly
- localStorage accessible for persistent user data

## Key Files by Purpose

**UI/Navigation**: [index.html](index.html), [js/ui.js](js/ui.js), [css/style.css](css/style.css)  
**Data**: [js/data/exercises.js](js/data/exercises.js), [js/workouts.js](js/workouts.js)  
**Kiosk Logic**: [main.js](main.js), [preload.js](preload.js), [js/reset.js](js/reset.js), [js/auth.js](js/auth.js)  
**Mobile Companion**: [server.js](server.js), [mobile/viewer.html](mobile/viewer.html), [js/qr.js](js/qr.js)  

## Important Constraints & Conventions

- **No external API calls**: All data is bundled. Network requests will fail silently in kiosk environments.
- **No navigation away**: window.location changes are kiosk-hostile. Use screen switching only.
- **Immutable Admin Code**: ADMIN_CODE in auth.js; hardcoded prompt check (no crypto, no backend validation).
- **CSS grid-based layouts**: Screens use CSS Grid for 1920x1080 responsiveness; avoid flexbox for full-screen sections.
- **Touch-friendly**: Buttons use `touch-action: manipulation` and large tap targets (~200px).
