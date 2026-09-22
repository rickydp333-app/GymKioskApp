/**
 * Exercise Animation Definitions
 * Defines animation frames for each exercise movement
 */

const EXERCISE_ANIMATIONS = {
  // CHEST EXERCISES
  'push-up': {
    frames: [
      {
        label: 'Push-Up: Starting Position',
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
      },
      {
        label: 'Push-Up: Lowering',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: 0 },
          elbow_r: { x: 40, y: 0 },
          hand_l: { x: -80, y: 40 },
          hand_r: { x: 80, y: 40 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -40, y: 160 },
          foot_r: { x: 40, y: 160 }
        }
      },
      {
        label: 'Push-Up: Bottom Position',
        positions: {
          head: { x: 0, y: -130 },
          neck: { x: 0, y: -100 },
          shoulders: { x: 0, y: -60 },
          elbow_l: { x: -30, y: 20 },
          elbow_r: { x: 30, y: 20 },
          hand_l: { x: -80, y: 40 },
          hand_r: { x: 80, y: 40 },
          hips: { x: 0, y: 100 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -40, y: 160 },
          foot_r: { x: 40, y: 160 }
        }
      },
      {
        label: 'Push-Up: Pushing Up',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: 0 },
          elbow_r: { x: 40, y: 0 },
          hand_l: { x: -80, y: 40 },
          hand_r: { x: 80, y: 40 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -40, y: 160 },
          foot_r: { x: 40, y: 160 }
        }
      }
    ],
    frameDelay: 15
  },

  'bench press': {
    frames: [
      {
        label: 'Bench Press: Starting',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -20 },
          elbow_r: { x: 40, y: -20 },
          hand_l: { x: -60, y: -60 },
          hand_r: { x: 60, y: -60 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Bench Press: Lowering',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -50, y: 20 },
          elbow_r: { x: 50, y: 20 },
          hand_l: { x: -60, y: 0 },
          hand_r: { x: 60, y: 0 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Bench Press: Bottom',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -60, y: 40 },
          elbow_r: { x: 60, y: 40 },
          hand_l: { x: -60, y: 20 },
          hand_r: { x: 60, y: 20 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Bench Press: Pressing',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -10 },
          elbow_r: { x: 40, y: -10 },
          hand_l: { x: -60, y: -50 },
          hand_r: { x: 60, y: -50 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      }
    ],
    frameDelay: 15
  },

  // BACK EXERCISES
  'pull-up': {
    frames: [
      {
        label: 'Pull-Up: Starting',
        positions: {
          head: { x: 0, y: -160 },
          neck: { x: 0, y: -130 },
          shoulders: { x: 0, y: -90 },
          elbow_l: { x: -30, y: -60 },
          elbow_r: { x: 30, y: -60 },
          hand_l: { x: -60, y: -150 },
          hand_r: { x: 60, y: -150 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      },
      {
        label: 'Pull-Up: Pulling Up',
        positions: {
          head: { x: 0, y: -180 },
          neck: { x: 0, y: -150 },
          shoulders: { x: 0, y: -110 },
          elbow_l: { x: -60, y: -80 },
          elbow_r: { x: 60, y: -80 },
          hand_l: { x: -60, y: -150 },
          hand_r: { x: 60, y: -150 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      },
      {
        label: 'Pull-Up: Top Position',
        positions: {
          head: { x: 0, y: -190 },
          neck: { x: 0, y: -160 },
          shoulders: { x: 0, y: -120 },
          elbow_l: { x: -80, y: -100 },
          elbow_r: { x: 80, y: -100 },
          hand_l: { x: -60, y: -150 },
          hand_r: { x: 60, y: -150 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      },
      {
        label: 'Pull-Up: Lowering',
        positions: {
          head: { x: 0, y: -170 },
          neck: { x: 0, y: -140 },
          shoulders: { x: 0, y: -100 },
          elbow_l: { x: -50, y: -70 },
          elbow_r: { x: 50, y: -70 },
          hand_l: { x: -60, y: -150 },
          hand_r: { x: 60, y: -150 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      }
    ],
    frameDelay: 15
  },

  'dumbbell row': {
    frames: [
      {
        label: 'Dumbbell Row: Starting',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -20 },
          elbow_r: { x: 60, y: 20 },
          hand_l: { x: -50, y: 20 },
          hand_r: { x: 80, y: 50 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Dumbbell Row: Pulling',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -20, y: 0 },
          elbow_r: { x: 60, y: 20 },
          hand_l: { x: -30, y: 30 },
          hand_r: { x: 80, y: 50 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Dumbbell Row: Top',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: 10, y: 10 },
          elbow_r: { x: 60, y: 20 },
          hand_l: { x: 20, y: 40 },
          hand_r: { x: 80, y: 50 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Dumbbell Row: Lower',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -20 },
          elbow_r: { x: 60, y: 20 },
          hand_l: { x: -50, y: 20 },
          hand_r: { x: 80, y: 50 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      }
    ],
    frameDelay: 15
  },

  // LEGS EXERCISES
  'squat': {
    frames: [
      {
        label: 'Squat: Starting',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -30 },
          elbow_r: { x: 40, y: -30 },
          hand_l: { x: -60, y: -50 },
          hand_r: { x: 60, y: -50 },
          hips: { x: 0, y: 40 },
          knee_l: { x: -20, y: 100 },
          knee_r: { x: 20, y: 100 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      },
      {
        label: 'Squat: Descending',
        positions: {
          head: { x: 0, y: -120 },
          neck: { x: 0, y: -95 },
          shoulders: { x: 0, y: -60 },
          elbow_l: { x: -40, y: -20 },
          elbow_r: { x: 40, y: -20 },
          hand_l: { x: -60, y: -40 },
          hand_r: { x: 60, y: -40 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -30, y: 80 },
          knee_r: { x: 30, y: 80 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      },
      {
        label: 'Squat: Bottom Position',
        positions: {
          head: { x: 0, y: -100 },
          neck: { x: 0, y: -80 },
          shoulders: { x: 0, y: -50 },
          elbow_l: { x: -40, y: -10 },
          elbow_r: { x: 40, y: -10 },
          hand_l: { x: -60, y: -30 },
          hand_r: { x: 60, y: -30 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -40, y: 60 },
          knee_r: { x: 40, y: 60 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      },
      {
        label: 'Squat: Ascending',
        positions: {
          head: { x: 0, y: -120 },
          neck: { x: 0, y: -95 },
          shoulders: { x: 0, y: -60 },
          elbow_l: { x: -40, y: -20 },
          elbow_r: { x: 40, y: -20 },
          hand_l: { x: -60, y: -40 },
          hand_r: { x: 60, y: -40 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -30, y: 80 },
          knee_r: { x: 30, y: 80 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      }
    ],
    frameDelay: 15
  },

  'deadlift': {
    frames: [
      {
        label: 'Deadlift: Starting',
        positions: {
          head: { x: 0, y: -120 },
          neck: { x: 0, y: -95 },
          shoulders: { x: 0, y: -60 },
          elbow_l: { x: -30, y: 0 },
          elbow_r: { x: 30, y: 0 },
          hand_l: { x: -50, y: 40 },
          hand_r: { x: 50, y: 40 },
          hips: { x: 0, y: 70 },
          knee_l: { x: -30, y: 100 },
          knee_r: { x: 30, y: 100 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      },
      {
        label: 'Deadlift: Lifting',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -30, y: 0 },
          elbow_r: { x: 30, y: 0 },
          hand_l: { x: -50, y: 40 },
          hand_r: { x: 50, y: 40 },
          hips: { x: 0, y: 50 },
          knee_l: { x: -20, y: 100 },
          knee_r: { x: 20, y: 100 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      },
      {
        label: 'Deadlift: Top Position',
        positions: {
          head: { x: 0, y: -150 },
          neck: { x: 0, y: -120 },
          shoulders: { x: 0, y: -80 },
          elbow_l: { x: -40, y: -10 },
          elbow_r: { x: 40, y: -10 },
          hand_l: { x: -50, y: 40 },
          hand_r: { x: 50, y: 40 },
          hips: { x: 0, y: 40 },
          knee_l: { x: -10, y: 100 },
          knee_r: { x: 10, y: 100 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      },
      {
        label: 'Deadlift: Lowering',
        positions: {
          head: { x: 0, y: -130 },
          neck: { x: 0, y: -105 },
          shoulders: { x: 0, y: -65 },
          elbow_l: { x: -30, y: 0 },
          elbow_r: { x: 30, y: 0 },
          hand_l: { x: -50, y: 40 },
          hand_r: { x: 50, y: 40 },
          hips: { x: 0, y: 65 },
          knee_l: { x: -25, y: 100 },
          knee_r: { x: 25, y: 100 },
          foot_l: { x: -40, y: 150 },
          foot_r: { x: 40, y: 150 }
        }
      }
    ],
    frameDelay: 15
  },

  // ARM EXERCISES
  'dumbbell curl': {
    frames: [
      {
        label: 'Dumbbell Curl: Starting',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -30, y: 0 },
          elbow_r: { x: 30, y: 0 },
          hand_l: { x: -40, y: 40 },
          hand_r: { x: 40, y: 40 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Dumbbell Curl: Curling',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -30, y: 0 },
          elbow_r: { x: 30, y: 0 },
          hand_l: { x: -30, y: -20 },
          hand_r: { x: 30, y: -20 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Dumbbell Curl: Top Position',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -30, y: 0 },
          elbow_r: { x: 30, y: 0 },
          hand_l: { x: -20, y: -40 },
          hand_r: { x: 20, y: -40 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Dumbbell Curl: Lowering',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -30, y: 0 },
          elbow_r: { x: 30, y: 0 },
          hand_l: { x: -40, y: 40 },
          hand_r: { x: 40, y: 40 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      }
    ],
    frameDelay: 15
  },

  'triceps dip': {
    frames: [
      {
        label: 'Triceps Dip: Starting',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -60, y: 0 },
          elbow_r: { x: 60, y: 0 },
          hand_l: { x: -80, y: 40 },
          hand_r: { x: 80, y: 40 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      },
      {
        label: 'Triceps Dip: Dipping',
        positions: {
          head: { x: 0, y: -120 },
          neck: { x: 0, y: -95 },
          shoulders: { x: 0, y: -60 },
          elbow_l: { x: -80, y: 20 },
          elbow_r: { x: 80, y: 20 },
          hand_l: { x: -80, y: 40 },
          hand_r: { x: 80, y: 40 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      },
      {
        label: 'Triceps Dip: Bottom',
        positions: {
          head: { x: 0, y: -100 },
          neck: { x: 0, y: -80 },
          shoulders: { x: 0, y: -50 },
          elbow_l: { x: -90, y: 40 },
          elbow_r: { x: 90, y: 40 },
          hand_l: { x: -80, y: 40 },
          hand_r: { x: 80, y: 40 },
          hips: { x: 0, y: 100 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      },
      {
        label: 'Triceps Dip: Pressing Up',
        positions: {
          head: { x: 0, y: -130 },
          neck: { x: 0, y: -100 },
          shoulders: { x: 0, y: -60 },
          elbow_l: { x: -70, y: 10 },
          elbow_r: { x: 70, y: 10 },
          hand_l: { x: -80, y: 40 },
          hand_r: { x: 80, y: 40 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -20, y: 160 },
          foot_r: { x: 20, y: 160 }
        }
      }
    ],
    frameDelay: 15
  },

  // SHOULDERS
  'shoulder press': {
    frames: [
      {
        label: 'Shoulder Press: Starting',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -30 },
          elbow_r: { x: 40, y: -30 },
          hand_l: { x: -50, y: -60 },
          hand_r: { x: 50, y: -60 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Shoulder Press: Pressing',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -50 },
          elbow_r: { x: 40, y: -50 },
          hand_l: { x: -50, y: -100 },
          hand_r: { x: 50, y: -100 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Shoulder Press: Top',
        positions: {
          head: { x: 0, y: -150 },
          neck: { x: 0, y: -120 },
          shoulders: { x: 0, y: -80 },
          elbow_l: { x: -30, y: -60 },
          elbow_r: { x: 30, y: -60 },
          hand_l: { x: -50, y: -120 },
          hand_r: { x: 50, y: -120 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Shoulder Press: Lowering',
        positions: {
          head: { x: 0, y: -140 },
          neck: { x: 0, y: -110 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: -30 },
          elbow_r: { x: 40, y: -30 },
          hand_l: { x: -50, y: -60 },
          hand_r: { x: 50, y: -60 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      }
    ],
    frameDelay: 15
  },

  // STRETCHING EXERCISES
  'neck-stretch---forward': {
    frames: [
      {
        label: 'Neck Stretch: Starting',
        positions: {
          head: { x: 0, y: -150 },
          neck: { x: 0, y: -120 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: 20 },
          elbow_r: { x: 40, y: 20 },
          hand_l: { x: -60, y: 60 },
          hand_r: { x: 60, y: 60 },
          hips: { x: 0, y: 100 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      },
      {
        label: 'Neck Stretch: Forward',
        positions: {
          head: { x: 0, y: -130 },
          neck: { x: 0, y: -105 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: 20 },
          elbow_r: { x: 40, y: 20 },
          hand_l: { x: -60, y: 60 },
          hand_r: { x: 60, y: 60 },
          hips: { x: 0, y: 100 },
          knee_l: { x: -20, y: 140 },
          knee_r: { x: 20, y: 140 },
          foot_l: { x: -40, y: 180 },
          foot_r: { x: 40, y: 180 }
        }
      }
    ],
    frameDelay: 20
  },

  'hamstring-stretch---standing': {
    frames: [
      {
        label: 'Hamstring Stretch: Standing',
        positions: {
          head: { x: 0, y: -150 },
          neck: { x: 0, y: -120 },
          shoulders: { x: 0, y: -80 },
          elbow_l: { x: -40, y: -20 },
          elbow_r: { x: 40, y: -20 },
          hand_l: { x: -60, y: -60 },
          hand_r: { x: 60, y: -60 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 40 },
          foot_l: { x: -40, y: 160 },
          foot_r: { x: 0, y: -80 }
        }
      },
      {
        label: 'Hamstring Stretch: Extended',
        positions: {
          head: { x: 0, y: -130 },
          neck: { x: 0, y: -105 },
          shoulders: { x: 0, y: -70 },
          elbow_l: { x: -40, y: 0 },
          elbow_r: { x: 40, y: 0 },
          hand_l: { x: -60, y: 30 },
          hand_r: { x: 60, y: 30 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 0, y: -40 },
          foot_l: { x: -40, y: 160 },
          foot_r: { x: 0, y: -100 }
        }
      }
    ],
    frameDelay: 20
  },

  'quad-stretch': {
    frames: [
      {
        label: 'Quad Stretch: Standing',
        positions: {
          head: { x: 0, y: -150 },
          neck: { x: 0, y: -120 },
          shoulders: { x: 0, y: -80 },
          elbow_l: { x: -50, y: -40 },
          elbow_r: { x: 30, y: 40 },
          hand_l: { x: -70, y: -80 },
          hand_r: { x: 40, y: 100 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -40, y: 60 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -60, y: 20 },
          foot_r: { x: 40, y: 160 }
        }
      },
      {
        label: 'Quad Stretch: Extended',
        positions: {
          head: { x: 0, y: -150 },
          neck: { x: 0, y: -120 },
          shoulders: { x: 0, y: -80 },
          elbow_l: { x: -50, y: -40 },
          elbow_r: { x: 30, y: 20 },
          hand_l: { x: -70, y: -80 },
          hand_r: { x: 30, y: 60 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -50, y: 30 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -70, y: -20 },
          foot_r: { x: 40, y: 160 }
        }
      }
    ],
    frameDelay: 20
  },

  'child\'s-pose': {
    frames: [
      {
        label: 'Child\'s Pose: Starting',
        positions: {
          head: { x: 0, y: -150 },
          neck: { x: 0, y: -120 },
          shoulders: { x: 0, y: -80 },
          elbow_l: { x: -40, y: -40 },
          elbow_r: { x: 40, y: -40 },
          hand_l: { x: -60, y: -80 },
          hand_r: { x: 60, y: -80 },
          hips: { x: 0, y: 60 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -40, y: 160 },
          foot_r: { x: 40, y: 160 }
        }
      },
      {
        label: 'Child\'s Pose: Full Stretch',
        positions: {
          head: { x: 0, y: 0 },
          neck: { x: 0, y: -20 },
          shoulders: { x: 0, y: -40 },
          elbow_l: { x: -40, y: -60 },
          elbow_r: { x: 40, y: -60 },
          hand_l: { x: -60, y: -100 },
          hand_r: { x: 60, y: -100 },
          hips: { x: 0, y: 80 },
          knee_l: { x: -20, y: 120 },
          knee_r: { x: 20, y: 120 },
          foot_l: { x: -40, y: 160 },
          foot_r: { x: 40, y: 160 }
        }
      }
    ],
    frameDelay: 20
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXERCISE_ANIMATIONS;
}
