# Workout Data Persistence Implementation

**Date:** January 31, 2026  
**Status:** ✅ Complete and Tested

---

## What Was Changed

### 1. **Added File-Based Storage**
- Created `data/` directory structure
- Implemented `workouts.json` for storing all workouts
- Implemented `users.json` for storing registered user accounts
- Both files auto-created on first data save

### 2. **Modified [server.js](server.js)**

#### New Imports
- Added `const fs = require('fs');` for file I/O

#### New Functions
```javascript
loadWorkouts()     // Load workouts from file on startup
loadUsers()        // Load users from file on startup
saveWorkouts()     // Persist workouts to JSON
saveUsers()        // Persist users to JSON
```

#### Updated Endpoints
All endpoints that modify data now call `save*()` functions:

| Endpoint | Changes |
|----------|---------|
| `POST /api/auth/register` | Now calls `saveUsers()` after registration |
| `POST /api/workouts/create` | Now calls `saveWorkouts()` after creating |
| `POST /api/workouts` | Now calls `saveWorkouts()` & `saveUsers()` |
| `PUT /api/workouts/:workoutId` | Now calls `saveWorkouts()` after update |

### 3. **Startup Behavior**
When server starts:
1. Creates `data/` directory if missing
2. Loads existing workouts from `data/workouts.json`
3. Loads existing users from `data/users.json`
4. Displays data storage info in console output:
```
Data Storage: C:\Users\ricky\OneDrive\Desktop\GymKioskApp\data
  - Workouts: C:\Users\ricky\OneDrive\Desktop\GymKioskApp\data\workouts.json
  - Users: C:\Users\ricky\OneDrive\Desktop\GymKioskApp\data\users.json
```

---

## File Formats

### workouts.json
```json
[
  ["workout-id-1", {
    "userId": null,
    "data": { ... workout data ... },
    "created": "2026-01-31T21:13:00.000Z",
    "completed": false
  }],
  ["workout-id-2", { ... }]
]
```

### users.json
```json
[
  ["user-id-1", {
    "email": "user@example.com",
    "password": "plaintext_password",
    "workouts": ["workout-id-1", "workout-id-2"]
  }]
]
```

---

## Benefits

✅ **Persistent Workouts** - Workouts survive server restarts  
✅ **Historical Data** - All shared workouts available forever  
✅ **User Accounts** - Mobile user registrations saved  
✅ **Easy Backup** - JSON files can be backed up/exported  
✅ **Human Readable** - Can inspect data with text editor  

---

## Data Locations

- **Workouts File:** `C:\Users\ricky\OneDrive\Desktop\GymKioskApp\data\workouts.json`
- **Users File:** `C:\Users\ricky\OneDrive\Desktop\GymKioskApp\data\users.json`

Files are automatically created when data is first saved.

---

## How to Test

1. **Start the app:** `npm start`
2. **Share a workout** from the kiosk (generates QR code)
3. **Stop the server** (Ctrl+C in terminal)
4. **Check files exist:** Open `data/workouts.json` - should see your workout
5. **Restart the server:** `npm start` again
6. **Access workout:** The shared workout should still be available
   - Visit: `http://localhost:3001/workout/{workoutId}`

---

## Future Enhancements

- [ ] Add database (SQLite/MongoDB) for better querying
- [ ] Implement automatic backups
- [ ] Add export-to-CSV functionality
- [ ] Create admin dashboard to view all workouts/users
- [ ] Add data retention policies (auto-delete old workouts)
- [ ] Encrypt passwords with bcrypt before storing

---

## Security Notes

⚠️ **Current State (Development):**
- Passwords stored in plain text
- No encryption on data files
- No access control on JSON files

🔒 **For Production:**
1. Hash passwords with bcrypt
2. Encrypt sensitive data
3. Use proper database (PostgreSQL/MongoDB)
4. Implement API authentication
5. Add file access permissions
6. Regular security audits

---

## Implementation Summary

| Component | Status | Details |
|-----------|--------|---------|
| File loading | ✅ Done | Loads on startup, handles missing files |
| File saving | ✅ Done | Saves on every data modification |
| Error handling | ✅ Done | Gracefully handles file I/O errors |
| Directory creation | ✅ Done | Auto-creates `data/` folder |
| Startup logging | ✅ Done | Shows storage paths on server start |
| Data format | ✅ Done | JSON format (Map serialization) |

All changes tested and working. Server successfully persists workout and user data to disk.

