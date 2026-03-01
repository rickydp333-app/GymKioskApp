# 🏋️ PR Tracking Feature - Quick Start Guide

## What's New?

The GymKioskApp now includes **Personal Records (PR) Tracking** - the most requested feature from users of competing fitness apps like Fitbod, Strong, and JEFIT.

## How to Use

### Step 1: Start Your Workout
1. Select your user profile (e.g., "RICK")
2. Choose a muscle group (e.g., "Chest")
3. Select an exercise (e.g., "Bench Press")

### Step 2: Complete Exercise with Weight Logging
1. Click the **"Complete"** button on any exercise card
2. The **"Log Weight & Reps"** modal appears
3. For each set, enter:
   - **Weight (lbs)** - The amount lifted
   - **Reps** - Number of repetitions
4. Optional: Click **"+ Add Set"** to add more sets (default is 3)
5. Click **"Complete Exercise"** to record your workout

### Step 3: Automatic PR Detection
- If you lifted **heavier weight** or **more reps** than before:
  - 🎉 **Celebration animation appears** with "NEW PERSONAL RECORD!"
  - Your achievement is saved automatically
  - No need to manually set PRs!

### Step 4: View Your Personal Records
1. From the main menu, click **"🏆 My Personal Records"**
2. See all your PRs displayed with:
   - **Exercise name**
   - **Best weight × reps**
   - **Estimated 1-Rep Max (1RM)**
   - **Date achieved**

## Key Features

✨ **Smart PR Detection**
- Automatically detects new personal records
- Uses Epley formula: 1RM = Weight × (1 + Reps/30)
- Compares your current lift to previous best

🎯 **Previous Attempt Display**
- When repeating an exercise, see your last attempt automatically filled in
- Great for consistency and tracking progression

🎬 **Celebration Feedback**
- Beautiful animated modal celebrates your achievements
- Motivates you to keep pushing harder

📊 **Dashboard View**
- Dedicated screen to see all your PRs
- Track progress across multiple exercises
- See estimated 1RM for each movement

💾 **Offline Storage**
- All PR data saved locally on the kiosk
- Works without internet connection
- Data persists across app restarts

## Example Workout

```
CHEST DAY

Exercise: Bench Press
Set 1: 225 lbs × 5 reps
Set 2: 225 lbs × 5 reps
Set 3: 225 lbs × 3 reps
✓ Complete

Previous Bench Press PR: 220 lbs × 5
→ 225 lbs × 5 is NEW PR! 🎉
→ Estimated 1RM: 256 lbs

Exercise: Incline Dumbbell Press
Set 1: 85 lbs × 8 reps
Set 2: 85 lbs × 7 reps
✓ Complete

(No new PR, but progress recorded)
```

## Tips for Best Results

✅ **Log weights every time** - Better tracking gives better insights
✅ **Use consistent increments** - Easier to spot progression
✅ **Include warm-up sets** - Optional, but helps track full workout
✅ **Review PRs weekly** - Check "My Personal Records" to see progress
✅ **Set targets** - Aim for specific PR goals

## FAQ

**Q: Can I skip weight logging?**
A: Yes! Click "Skip Logging" if you don't want to track weights for a specific exercise.

**Q: What if I do more reps at the same weight?**
A: That's still a new PR! The system detects both heavier weight AND more reps.

**Q: Can I edit my PRs?**
A: Currently, PRs are auto-detected and saved. To change, you'd need to achieve a new record.

**Q: What's "Estimated 1RM"?**
A: 1-Rep Max - the heaviest single rep you could theoretically lift. Uses the Epley formula.

**Q: Where is my data stored?**
A: Locally on the kiosk in your browser's storage. No cloud sync needed.

**Q: Do guest users get PR tracking?**
A: No - you need to create a profile to track progress. This keeps data personal and organized.

## Data Format

Personal Record for Bench Press:
```
{
  "exercise": "Bench Press",
  "weight": 250,           // lbs
  "reps": 1,              // number of reps
  "estimatedMax": 265,    // 1RM calculated
  "date": "2025-02-10"    // when achieved
}
```

Exercise History:
```
{
  "exercise": "Bench Press",
  "sets": [
    { "weight": 225, "reps": 5 },
    { "weight": 225, "reps": 5 },
    { "weight": 225, "reps": 3 }
  ],
  "date": "2025-02-10",
  "notes": "" // optional
}
```

## Troubleshooting

**Problem: Modal doesn't appear when clicking Complete**
- Solution: Make sure you're logged in with a real user (not guest)
- Check console for errors (F12 → Console tab)

**Problem: PR not detected even though I lifted more**
- Solution: PR detection compares estimated 1RM, not just weight
- Example: 225×5 (1RM≈256) is better than 220×5 (1RM≈249)

**Problem: Weight inputs not saving**
- Solution: Click "Complete Exercise" button (not "Skip Logging")
- Make sure to enter both weight AND reps

**Problem: Can't find "My Personal Records" button**
- Solution: It's on the main menu screen next to other buttons
- Look for the 🏆 trophy emoji icon

## Coming Soon

- 📈 Progress charts and graphs
- 🎯 Goal setting with reminders
- 📊 Volume tracking (total weight × reps)
- 🏆 Achievement badges
- 📱 Mobile companion integration

## Support

For issues or feature requests, check:
1. The implementation notes in `PR_TRACKING_IMPLEMENTATION.md`
2. Test page: `test-pr-tracking.html`
3. Your browser's Developer Console (F12)
