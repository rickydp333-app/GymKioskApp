# Exercise Video Setup Guide

## Overview
The GymKioskApp now supports video demonstrations for all exercises. Videos are automatically displayed on:
- **Kiosk**: Exercise selection screen (fullscreen desktop)
- **Mobile Companion**: Workout builder and shared workout viewer
- **Server**: Serves videos via `/assets/videos/` route

## Video Directory Structure

```
assets/videos/
├── abs/
│   ├── crunch.mp4
│   ├── leg-raise.mp4
│   └── ... (up to 15 per muscle)
├── back/
│   ├── pull-up.mp4
│   ├── row.mp4
│   └── ...
├── biceps/
├── chest/
├── core/
├── legs/
├── shoulders/
├── traps/
└── triceps/
```

## Video Filename Convention

Video filenames must **exactly** match the exercise name, with:
- **All lowercase** letters
- **Hyphens** (-) replacing spaces
- **.mp4** file extension

### Examples
- Exercise name: "Push-Up" → filename: `push-up.mp4`
- Exercise name: "Dumbbell Curl" → filename: `dumbbell-curl.mp4`
- Exercise name: "Leg Press" → filename: `leg-press.mp4`

## Supported Formats

| Format | Codec | Notes |
|--------|-------|-------|
| MP4 | H.264 video, AAC audio | **Recommended** - Best browser support |
| WebM | VP8/VP9 video, Vorbis audio | Alternative format |

## Recommended Video Specs

- **Resolution**: 720p to 1080p (1280×720 to 1920×1080)
- **Duration**: 15-60 seconds per exercise
- **File size**: 5-20 MB (smaller for mobile optimization)
- **Frame rate**: 24-30 fps
- **Audio**: Optional (background music or voiceover)

## Adding Videos

1. **Locate the exercise in exercise data** (`js/data/exercises.js`)
   - Identify the muscle group and exercise name

2. **Record or find video content** for the exercise
   - Film a demonstration of proper form
   - Or download/purchase licensed content
   - Ensure you have rights to use the video

3. **Convert to MP4 format** (if needed)
   ```bash
   ffmpeg -i input.mov -c:v libx264 -crf 23 -c:a aac -b:a 128k output.mp4
   ```

4. **Name the file correctly** (lowercase, hyphens for spaces)
   - Example: For "Incline Dumbbell Press", use `incline-dumbbell-press.mp4`

5. **Place in correct muscle directory**
   ```
   assets/videos/chest/incline-dumbbell-press.mp4
   ```

6. **Verify it appears** in the app
   - Kiosk: Select muscle group → should see video on exercise screen
   - Mobile: Build Workout → select muscle group → should see video on exercise details

## Video Fallback Behavior

If a video file is missing or cannot load:
- A **placeholder message** displays: "📹 Video not available"
- Exercise instructions still display normally
- No errors are logged to the console
- Users can still perform the exercise using text instructions

## Testing Videos

### On Kiosk
1. Launch the app: `npm start`
2. Select a muscle group
3. Confirm video plays in exercise card

### On Mobile
1. Visit: `http://{kiosk-ip}:3001/builder.html`
2. Build a workout with a muscle group that has videos
3. Confirm video plays in expanded exercise details
4. Share workout via QR and scan on another device
5. Confirm video plays in the shared workout viewer

## Troubleshooting

### Video not playing
- **Check filename**: Must match exercise name exactly (case-sensitive match on name)
- **Verify path**: Should be in `assets/videos/{muscle-group}/`
- **Browser console**: Check for CORS or 404 errors
- **File format**: Confirm file is valid MP4

### Video slow to load
- Compress file size (target: 5-15 MB per video)
- Ensure kiosk and mobile have low-latency network
- Check Express server is running (port 3001)

### "Video not available" message
- File missing from expected directory
- Filename doesn't match exercise name format
- Server `/assets` route not functioning
- Browser doesn't support MP4 format

## Video Data Structure

Exercise data includes optional video support:
```javascript
{
  name: "Bench Press",
  howTo: ["Position on bench", "Lower bar to chest", "Push to start"],
  primary: ["Chest"],
  secondary: ["Triceps"],
  // Video automatically served from:
  // /assets/videos/chest/bench-press.mp4
}
```

No code changes needed - just add videos to the correct directory!

## Performance Notes

- Videos are **streamed** (not pre-loaded) to save memory
- Each video loads on-demand when exercise is selected
- Server caches video file listings (restart if adding new videos)
- Mobile app respects device bandwidth (video controls available)

## File Size Budget

For smooth operation with 9 muscle groups × 15 exercises:
- **Ideal**: 1.35 GB total (100 MB per muscle group)
- **Conservative**: 675 MB total (50 MB per muscle group)
- Videos are only sent when users request them

---

**Questions?** Check `.github/copilot-instructions.md` for full app architecture.
