# Exercise Animation System

The GymKioskApp includes **interactive canvas-based stick figure animations** demonstrating proper exercise form. These animations serve as **fallbacks when video files are unavailable** and provide immediate visual demonstrations without requiring video files.

## Overview

### Animation Components

| File | Purpose |
|------|---------|
| `js/animations/animator.js` | Core animation engine (ExerciseAnimator class) |
| `js/animations/exercises.js` | Exercise animation definitions (frame sequences) |
| `test-animations.html` | Interactive preview page for all animations |

### How It Works

1. **Video-First Approach**: App attempts to load MP4 videos from `assets/videos/`
2. **Graceful Fallback**: If video fails to load, canvas animation auto-plays
3. **No Manual Switching**: User sees whichever media loads (video preferred)
4. **Smooth Animation**: 60 FPS canvas rendering for fluid motion

## Accessing Animations

### Kiosk (Desktop App)
1. Launch app: `npm start`
2. Select user profile
3. Select muscle group
4. View exercises with automatic video OR animation playback

### Mobile Companion
1. Visit: `http://{kiosk-ip}:3001/builder.html`
2. Build a workout
3. Animations display when videos unavailable

### Animation Preview Page
**Interactive demo**: http://localhost:3001/test-animations.html
- Select any exercise
- Click **Play** to start animation
- Click **Stop** to pause
- Click **Reset** to restart

## Animation Definitions

Currently animated exercises (15 total):

### Chest
- Push-Up (4 frames)
- Bench Press (4 frames)

### Back
- Pull-Up (4 frames)
- Dumbbell Row (4 frames)

### Legs
- Squat (4 frames)
- Deadlift (4 frames)

### Arms
- Dumbbell Curl (4 frames)
- Triceps Dip (4 frames)

### Shoulders
- Shoulder Press (4 frames)

## Technical Details

### ExerciseAnimator Class

```javascript
// Create animator
const animator = new ExerciseAnimator(canvasId, exerciseName);

// Methods
animator.play();        // Start animation loop
animator.stop();        // Pause animation
animator.togglePlay();  // Toggle play/pause
```

### Animation Frame Structure

Each animation is defined with this structure:

```javascript
{
  frames: [
    {
      label: "Exercise Name: Position",
      positions: {
        head: { x: 0, y: -150 },
        neck: { x: 0, y: -120 },
        shoulders: { x: 0, y: -80 },
        elbow_l: { x: -60, y: -40 },
        elbow_r: { x: 60, y: -40 },
        hand_l: { x: -80, y: 40 },
        hand_r: { x: 80, y: 40 },
        hips: { x: 0, y: 60 },
        knee_l: { x: -20, y: 120 },
        knee_r: { x: 20, y: 120 },
        foot_l: { x: -40, y: 160 },
        foot_r: { x: 40, y: 160 }
      }
    }
    // ... more frames ...
  ],
  frameDelay: 15  // milliseconds between frames
}
```

### Coordinate System

- **Origin**: Center of canvas (0, 0)
- **X-axis**: Left (-) to Right (+)
- **Y-axis**: Up (-) to Down (+)
- **Scale**: Pixels (relative to 400×500 canvas)

### Drawing Pipeline

1. **drawBackground()** - Grid and ground reference
2. **drawFigure(positions)** - Stick figure with limbs and joints
3. **drawText(label)** - Frame label at top

## Adding New Animations

### Step 1: Define Exercise Frames

Edit `js/animations/exercises.js`:

```javascript
'exercise-name': {
  frames: [
    {
      label: 'Exercise Name: Starting Position',
      positions: {
        // Define joint positions here
        // Copy from similar exercise as template
      }
    },
    // ... 3-4 more frames ...
  ],
  frameDelay: 15  // 15ms = ~60 FPS
}
```

### Step 2: Position Mapping

Key joint positions to define:
- `head` - Top of figure
- `neck` - Base of head
- `shoulders` - Shoulder line
- `elbow_l`, `elbow_r` - Left/right elbows
- `hand_l`, `hand_r` - Left/right hands
- `hips` - Hip center
- `knee_l`, `knee_r` - Left/right knees
- `foot_l`, `foot_r` - Left/right feet

### Step 3: Test Animation

1. Add exercise to `js/animations/exercises.js`
2. Visit `test-animations.html`
3. Select new exercise from dropdown
4. Click **Play** to test
5. Adjust positions as needed

### Example: Adding "Lateral Raise"

```javascript
'lateral raise': {
  frames: [
    {
      label: 'Lateral Raise: Starting',
      positions: {
        head: { x: 0, y: -140 },
        neck: { x: 0, y: -110 },
        shoulders: { x: 0, y: -70 },
        elbow_l: { x: -30, y: 0 },
        elbow_r: { x: 30, y: 0 },
        hand_l: { x: -40, y: 30 },
        hand_r: { x: 40, y: 30 },
        hips: { x: 0, y: 80 },
        knee_l: { x: -20, y: 140 },
        knee_r: { x: 20, y: 140 },
        foot_l: { x: -40, y: 180 },
        foot_r: { x: 40, y: 180 }
      }
    },
    {
      label: 'Lateral Raise: Lifting',
      positions: {
        // ... arms raised to sides ...
      }
    },
    // ... more frames ...
  ],
  frameDelay: 15
}
```

## Canvas Styling

The animations use these CSS colors (customizable in `style.css`):

```css
/* Head/joints */
color: #d4af37;  /* Gold */

/* Limbs/body */
color: #00d4ff;  /* Cyan */

/* Background grid */
color: rgba(0, 212, 255, 0.1);  /* Dim cyan grid */

/* Ground line */
color: #d4af37;  /* Gold */
```

## Performance

### Rendering Details
- **Canvas Size**: 400×500 pixels (mobile-responsive)
- **Frame Rate**: ~60 FPS (15ms delay per frame)
- **CPU Usage**: Minimal (~2-5% per animation)
- **Memory**: <1MB per animator instance

### Optimization Tips
1. Keep frame count to 4-6 per exercise
2. Use consistent `frameDelay` across exercises
3. Reuse similar frame positions from other exercises
4. Test on target device (desktop/mobile)

## Integration Points

### Desktop (Kiosk)

File: `js/ui.js` - `loadExercisesForMuscle()` function

```javascript
// Automatically handles video → animation fallback
const hasAnimation = EXERCISE_ANIMATIONS[ex.name.toLowerCase()];
// If video fails, canvas animation auto-plays
```

### Mobile Builder

File: `mobile/builder.html` - `displayWorkout()` function

```javascript
// Shows video if available, otherwise animated placeholder
<video controls>
  <source src="/assets/videos/{muscle}/{exercise-name}.mp4">
  <fallback to animation>
</video>
```

### Mobile Viewer

File: `mobile/viewer.html` - Same pattern as builder

## Troubleshooting

### Animation Not Playing
1. Check browser console for errors
2. Verify canvas exists in DOM: `document.getElementById(canvasId)`
3. Confirm exercise name in `EXERCISE_ANIMATIONS` matches
4. Test in `test-animations.html` preview page

### Stick Figure Looks Wrong
1. Review joint positions in frames
2. Compare with similar exercise
3. Adjust X/Y coordinates incrementally
4. Test with **Reset** button between edits

### Animation Too Fast/Slow
- Adjust `frameDelay` in exercise definition:
  - Lower value = faster (5-10ms)
  - Higher value = slower (20-30ms)

### Canvas Not Displaying
1. Ensure animation script loaded: Check in DevTools
2. Verify canvas dimensions: 400×500
3. Check z-index conflicts with other elements
4. Try `canvas.style.display = 'block'` in console

## Future Enhancements

### Planned Features
- [ ] 3D stick figure models (WebGL)
- [ ] Motion capture integration
- [ ] Multi-person simultaneous animations (partner exercises)
- [ ] Speed control slider
- [ ] Mirror mode (flip animation left-right)
- [ ] Slow-motion playback
- [ ] Frame-by-frame stepping

### Community Animations
Users can submit animation definitions for new exercises via pull requests.

## File References

- **Core Engine**: [js/animations/animator.js](js/animations/animator.js)
- **Exercise Definitions**: [js/animations/exercises.js](js/animations/exercises.js)
- **Preview Page**: [test-animations.html](test-animations.html)
- **Integration**: [js/ui.js](js/ui.js) - `setupAnimationFallback()`
- **Styling**: [css/style.css](css/style.css) - `.exercise-video*` classes

---

**Questions?** Check `.github/copilot-instructions.md` for full app architecture.
