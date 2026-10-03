console.log('API.JS LOADED');

/* =========================================
   LOCAL EXERCISE DATA (OFFLINE SAFE)
========================================= */

const LOCAL_EXERCISES = {

  chest: [
    { name: 'Push-Up', description: 'Bodyweight chest press.' },
    { name: 'Bench Press', description: 'Barbell chest press.' },
    { name: 'Incline Bench Press', description: 'Upper chest focus.' },
    { name: 'Decline Bench Press', description: 'Lower chest focus.' },
    { name: 'Dumbbell Fly', description: 'Chest isolation.' },
    { name: 'Cable Crossover', description: 'Cable chest fly.' },
    { name: 'Chest Dip', description: 'Bodyweight chest dip.' },
    { name: 'Machine Chest Press', description: 'Guided chest press.' },
    { name: 'Pec Deck', description: 'Chest fly machine.' },
    { name: 'Wide Push-Up', description: 'Outer chest.' },
    { name: 'Close-Grip Push-Up', description: 'Inner chest + triceps.' },
    { name: 'Floor Press', description: 'Limited range chest press.' },
    { name: 'Smith Machine Bench', description: 'Stabilized bench press.' },
    { name: 'Resistance Band Press', description: 'Band chest press.' },
    { name: 'Explosive Push-Up', description: 'Power chest movement.' }
  ],

  shoulders: [
    { name: 'Overhead Press', description: 'Primary shoulder press.' },
    { name: 'Arnold Press', description: 'Rotational shoulder press.' },
    { name: 'Lateral Raise', description: 'Side delts.' },
    { name: 'Front Raise', description: 'Front delts.' },
    { name: 'Rear Delt Fly', description: 'Rear delts.' },
    { name: 'Upright Row', description: 'Delts and traps.' },
    { name: 'Push Press', description: 'Explosive shoulder press.' },
    { name: 'Cable Lateral Raise', description: 'Constant tension.' },
    { name: 'Dumbbell Press', description: 'Seated press.' },
    { name: 'Machine Shoulder Press', description: 'Guided press.' },
    { name: 'Face Pull', description: 'Rear delts + traps.' },
    { name: 'Plate Raise', description: 'Front delts.' },
    { name: 'Handstand Hold', description: 'Isometric strength.' },
    { name: 'Pike Push-Up', description: 'Bodyweight press.' },
    { name: 'Single-Arm Press', description: 'Unilateral control.' }
  ],

  back: [
    { name: 'Pull-Up', description: 'Bodyweight back exercise.' },
    { name: 'Lat Pulldown', description: 'Vertical pull.' },
    { name: 'Barbell Row', description: 'Horizontal row.' },
    { name: 'Dumbbell Row', description: 'Single-arm row.' },
    { name: 'Seated Cable Row', description: 'Cable row.' },
    { name: 'Deadlift', description: 'Posterior chain.' },
    { name: 'T-Bar Row', description: 'Mid-back focus.' },
    { name: 'Inverted Row', description: 'Bodyweight row.' },
    { name: 'Machine Row', description: 'Guided row.' },
    { name: 'Wide-Grip Pulldown', description: 'Upper lats.' },
    { name: 'Close-Grip Pulldown', description: 'Lower lats.' },
    { name: 'Straight-Arm Pulldown', description: 'Lat isolation.' },
    { name: 'Rack Pull', description: 'Partial deadlift.' },
    { name: 'Resistance Band Row', description: 'Band row.' },
    { name: 'Back Extension', description: 'Lower back.' }
  ],

  biceps: [
    { name: 'Barbell Curl', description: 'Classic biceps curl.' },
    { name: 'Dumbbell Curl', description: 'Alternating curls.' },
    { name: 'Hammer Curl', description: 'Brachialis focus.' },
    { name: 'Preacher Curl', description: 'Strict curl.' },
    { name: 'Incline Dumbbell Curl', description: 'Stretch emphasis.' },
    { name: 'Cable Curl', description: 'Constant tension.' },
    { name: 'Concentration Curl', description: 'Isolation curl.' },
    { name: 'EZ-Bar Curl', description: 'Wrist-friendly curl.' },
    { name: 'Spider Curl', description: 'Top contraction.' },
    { name: 'Resistance Band Curl', description: 'Band curl.' },
    { name: 'Chin-Up', description: 'Bodyweight biceps.' },
    { name: 'Zottman Curl', description: 'Forearms + biceps.' },
    { name: 'Reverse Curl', description: 'Brachialis.' },
    { name: 'Machine Curl', description: 'Guided curl.' },
    { name: 'Isometric Hold', description: 'Static contraction.' }
  ],

  triceps: [
    { name: 'Triceps Pushdown', description: 'Cable pushdown.' },
    { name: 'Skullcrusher', description: 'Lying extension.' },
    { name: 'Close-Grip Bench Press', description: 'Compound triceps.' },
    { name: 'Overhead Triceps Extension', description: 'Long head focus.' },
    { name: 'Bench Dip', description: 'Bodyweight dip.' },
    { name: 'Diamond Push-Up', description: 'Bodyweight triceps.' },
    { name: 'Cable Kickback', description: 'Isolation.' },
    { name: 'Dumbbell Kickback', description: 'Triceps extension.' },
    { name: 'Machine Dip', description: 'Guided dip.' },
    { name: 'EZ-Bar Extension', description: 'Wrist-friendly.' },
    { name: 'Resistance Band Pushdown', description: 'Band extension.' },
    { name: 'JM Press', description: 'Hybrid press.' },
    { name: 'Single-Arm Pushdown', description: 'Unilateral.' },
    { name: 'Floor Press', description: 'Lockout focus.' },
    { name: 'Isometric Hold', description: 'Static contraction.' }
  ],

  legs: [
    { name: 'Squat', description: 'Lower body compound.' },
    { name: 'Leg Press', description: 'Machine squat.' },
    { name: 'Lunge', description: 'Single-leg strength.' },
    { name: 'Step-Up', description: 'Unilateral legs.' },
    { name: 'Romanian Deadlift', description: 'Hamstrings.' },
    { name: 'Leg Curl', description: 'Hamstring isolation.' },
    { name: 'Leg Extension', description: 'Quad isolation.' },
    { name: 'Calf Raise', description: 'Calves.' },
    { name: 'Bulgarian Split Squat', description: 'Rear leg elevated.' },
    { name: 'Hack Squat', description: 'Machine squat.' },
    { name: 'Goblet Squat', description: 'Dumbbell squat.' },
    { name: 'Sled Push', description: 'Power + legs.' },
    { name: 'Wall Sit', description: 'Isometric.' },
    { name: 'Box Jump', description: 'Explosive power.' },
    { name: 'Farmer Walk', description: 'Lower body endurance.' }
  ],

  abs: [
    { name: 'Crunch', description: 'Ab flexion.' },
    { name: 'Sit-Up', description: 'Full abdominal.' },
    { name: 'Leg Raise', description: 'Lower abs.' },
    { name: 'Hanging Knee Raise', description: 'Hip flexors + abs.' },
    { name: 'Cable Crunch', description: 'Weighted crunch.' },
    { name: 'Ab Wheel Rollout', description: 'Anti-extension.' },
    { name: 'Plank', description: 'Core stability.' },
    { name: 'Side Plank', description: 'Obliques.' },
    { name: 'Mountain Climber', description: 'Dynamic core.' },
    { name: 'Russian Twist', description: 'Rotational abs.' },
    { name: 'V-Up', description: 'Explosive abs.' },
    { name: 'Toe Touch', description: 'Upper abs.' },
    { name: 'Flutter Kick', description: 'Lower abs.' },
    { name: 'Dead Bug', description: 'Core control.' },
    { name: 'Bicycle Crunch', description: 'Obliques.' }
  ],

  core: [
    { name: 'Plank', description: 'Core stability.' },
    { name: 'Side Plank', description: 'Lateral core.' },
    { name: 'Dead Bug', description: 'Core control.' },
    { name: 'Bird Dog', description: 'Stability.' },
    { name: 'Pallof Press', description: 'Anti-rotation.' },
    { name: 'Cable Chop', description: 'Rotational power.' },
    { name: 'Farmer Carry', description: 'Core bracing.' },
    { name: 'Suitcase Carry', description: 'Unilateral core.' },
    { name: 'Hollow Hold', description: 'Anterior core.' },
    { name: 'V-Sit Hold', description: 'Isometric.' },
    { name: 'Stir the Pot', description: 'Dynamic core.' },
    { name: 'Landmine Rotation', description: 'Rotational core.' },
    { name: 'Stability Ball Rollout', description: 'Anti-extension.' },
    { name: 'Kneeling Cable Crunch', description: 'Weighted core.' },
    { name: 'Marching Bridge', description: 'Glutes + core.' }
  ],

  traps: [
    { name: 'Barbell Shrug', description: 'Upper traps.' },
    { name: 'Dumbbell Shrug', description: 'Trap isolation.' },
    { name: 'Farmer Carry', description: 'Traps + grip.' },
    { name: 'Rack Pull', description: 'Heavy traps.' },
    { name: 'Upright Row', description: 'Traps and delts.' },
    { name: 'Face Pull', description: 'Upper back.' },
    { name: 'Behind-the-Back Shrug', description: 'Trap emphasis.' },
    { name: 'Overhead Carry', description: 'Stability.' },
    { name: 'Resistance Band Shrug', description: 'Band tension.' },
    { name: 'Smith Machine Shrug', description: 'Guided shrug.' },
    { name: 'Paused Shrug', description: 'Time under tension.' },
    { name: 'Isometric Hold', description: 'Static contraction.' },
    { name: 'Snatch Grip Deadlift', description: 'Upper back.' },
    { name: 'High Pull', description: 'Explosive trap.' },
    { name: 'Cable Shrug', description: 'Constant tension.' }
  ]
};

/* =========================================
   FETCH FUNCTION (USED BY UI)
========================================= */

window.fetchExercises = async function (muscle) {
  console.log('Fetching exercises for:', muscle);

  // Always return local data (kiosk safe)
  if (LOCAL_EXERCISES[muscle]) {
    return LOCAL_EXERCISES[muscle];
  }

  return [];
};