/* =========================================
   LOCAL EXERCISES – OFFLINE DATA
   ========================================= */

console.log('LOCAL EXERCISES LOADED');

// Auto-slugging function for consistent file naming
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Apply slugs to all exercises after definition
function applySlugToExercises(exercises) {
  Object.keys(exercises).forEach(muscleGroup => {
    if (Array.isArray(exercises[muscleGroup])) {
      exercises[muscleGroup].forEach(exercise => {
        if (!exercise.slug) {
          exercise.slug = generateSlug(exercise.name);
        }
      });
    } else if (typeof exercises[muscleGroup] === 'object') {
      // Handle nested structures like stretchesByBodyPart
      Object.keys(exercises[muscleGroup]).forEach(subGroup => {
        if (Array.isArray(exercises[muscleGroup][subGroup])) {
          exercises[muscleGroup][subGroup].forEach(exercise => {
            if (!exercise.slug) {
              exercise.slug = generateSlug(exercise.name);
            }
          });
        }
      });
    }
  });
}

function toSentence(step) {
  if (typeof step !== 'string') return '';
  const normalized = step.trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function containsSideSwitchInstruction(steps) {
  return steps.some(step => /switch|alternate|other side|each side/i.test(step));
}

function inferIsStretch(contextPath, exercise) {
  const joinedPath = contextPath.join('/').toLowerCase();
  const name = (exercise?.name || '').toLowerCase();
  return joinedPath.includes('stretchesbybodypart') || joinedPath.includes('stretching') || /stretch|pose|mobility|opener/.test(name);
}

function getRepGuidance(difficulty) {
  const level = (difficulty || '').toLowerCase();
  if (level === 'advanced') return 'Do 3-5 sets of 5-10 reps. Rest 60-120 seconds between sets.';
  if (level === 'intermediate') return 'Do 3-4 sets of 8-12 reps. Rest 45-90 seconds between sets.';
  return 'Do 2-4 sets of 10-15 reps. Rest 30-60 seconds between sets.';
}

function getHoldGuidance(difficulty) {
  const level = (difficulty || '').toLowerCase();
  if (level === 'advanced') return 'Hold each stretch for 30-60 seconds, and repeat 2-3 rounds.';
  if (level === 'intermediate') return 'Hold each stretch for 25-45 seconds, and repeat 2 rounds per side.';
  return 'Hold each stretch for 20-30 seconds, and repeat 1-2 rounds per side.';
}

function buildDetailedHowTo(exercise, isStretch) {
  const baseSteps = (Array.isArray(exercise.howTo) ? exercise.howTo : [])
    .map(toSentence)
    .filter(Boolean);

  if (!baseSteps.length) return [];

  const hasSideCue = containsSideSwitchInstruction(baseSteps);
  const detailed = [];

  if (isStretch) {
    detailed.push('Setup: Get into a stable starting position, relax your shoulders, and keep your back in a natural position.');
  } else {
    detailed.push('Setup: Set your feet and grip first, tighten your core, and keep your back in a natural position.');
  }

  baseSteps.forEach((step, index) => {
    if (index === 0) {
      detailed.push(`Step ${index + 1}: ${step} Move into position slowly and stay balanced.`);
      return;
    }

    if (index === baseSteps.length - 1) {
      detailed.push(`Step ${index + 1}: ${step} Finish slowly and stay in control at the end of the movement.`);
      return;
    }

    detailed.push(`Step ${index + 1}: ${step} Keep your core tight and move smoothly with no jerking.`);
  });

  if (!hasSideCue && /right|left|one arm|one leg|single arm|single leg/i.test(baseSteps.join(' '))) {
    detailed.push('Switch sides: Finish one side first, then repeat the same steps on the other side.');
  }

  if (isStretch) {
    detailed.push('Breathing: Breathe in through your nose, and breathe out slowly as you move deeper into the stretch. Do not force it.');
    detailed.push(`How long: ${getHoldGuidance(exercise.difficulty)}`);
    detailed.push('Safety: You should feel a stretch, not pain. Stop right away if you feel sharp pain, pinching, numbness, or tingling.');
  } else {
    detailed.push('Breathing: Breathe out during the hard part, and breathe in during the return. Keep a steady breathing rhythm.');
    detailed.push(`Recommended sets and reps: ${getRepGuidance(exercise.difficulty)}`);
    detailed.push('Safety: Stop the set if your form breaks down. Use less weight or less range if you feel joint pain.');
  }

  return detailed;
}

function enrichExerciseEntry(exercise, contextPath) {
  if (!exercise || !Array.isArray(exercise.howTo) || exercise.howTo.length === 0) return;
  if (exercise.howTo.some(step => typeof step === 'string' && /^(Preparation|Breathing|Dosage|Safety):/.test(step))) return;

  const isStretch = inferIsStretch(contextPath, exercise);
  const original = exercise.howTo.slice();

  if (!Array.isArray(exercise.baseHowTo) || exercise.baseHowTo.length === 0) {
    exercise.baseHowTo = original;
  }

  exercise.howTo = buildDetailedHowTo(exercise, isStretch);
}

function enrichExercisesWithDetails(exercises) {
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;

    Object.keys(node).forEach(key => {
      const value = node[key];
      const nextPath = [...path, key];

      if (Array.isArray(value)) {
        value.forEach(entry => {
          if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            enrichExerciseEntry(entry, nextPath);
          }
        });
        return;
      }

      if (value && typeof value === 'object') {
        walk(value, nextPath);
      }
    });
  };

  walk(exercises, []);
}

window.LOCAL_EXERCISES = {

  chest: [
    { name: "Push-Up", difficulty: "beginner", howTo: ["Position body in plank", "Lower body to ground", "Push back to start"], primary: ["Chest", "Triceps"], secondary: ["Shoulders"], image: "assets/muscles/chest/push-up.png" },
    { name: "Bench Press", difficulty: "intermediate", howTo: ["Lie flat on bench", "Grip bar slightly wider than shoulders", "Press bar up to full extension"], primary: ["Chest"], secondary: ["Triceps", "Shoulders"], image: "assets/muscles/chest/bench-press.png" },
    { name: "Incline Bench Press", difficulty: "intermediate", howTo: ["Set bench to incline angle", "Lie back and grip bar", "Press upward and slightly forward"], primary: ["Upper Chest"], secondary: ["Shoulders"], image: "assets/muscles/chest/incline-bench-press.png" },
    { name: "Decline Bench Press", difficulty: "intermediate", howTo: ["Set bench to decline position", "Lie back with head lower than feet", "Press bar upward"], primary: ["Lower Chest"], secondary: ["Triceps"], image: "assets/muscles/chest/decline-bench-press.png" },
    { name: "Chest Fly", difficulty: "intermediate", howTo: ["Lie on bench with arms extended", "Lower weights in arc motion", "Return to start with control"], primary: ["Chest"], secondary: ["Shoulders"], image: "assets/muscles/chest/chest-fly.png" },
    { name: "Cable Fly", difficulty: "beginner", howTo: ["Stand between cable stations", "Pull handles together in arc", "Control return to start"], primary: ["Chest"], secondary: ["Front Delts"], image: "assets/muscles/chest/cable-fly.png" },
    { name: "Dumbbell Press", difficulty: "intermediate", howTo: ["Lie on bench holding dumbbells", "Press dumbbells up and together", "Lower with control"], primary: ["Chest"], secondary: ["Triceps", "Shoulders"], image: "assets/muscles/chest/dumbbell-press.png" },
    { name: "Incline Dumbbell Press", difficulty: "intermediate", howTo: ["Set bench to 45 degrees", "Press dumbbells upward", "Lower to chest level"], primary: ["Upper Chest"], secondary: ["Front Delts"], image: "assets/muscles/chest/incline-dumbbell-press.png" },
    { name: "Dips", difficulty: "intermediate", howTo: ["Grip parallel bars", "Lower body by bending elbows", "Press back to start"], primary: ["Lower Chest", "Triceps"], secondary: ["Shoulders"], image: "assets/muscles/chest/dips.png" },
    { name: "Machine Chest Press", difficulty: "beginner", howTo: ["Sit with feet flat", "Grip handles at shoulder height", "Press forward until arms extend"], primary: ["Chest"], secondary: ["Triceps"], image: "assets/muscles/chest/machine-chest-press.png" },
    { name: "Smith Machine Press", difficulty: "beginner", howTo: ["Lie under bar at chest level", "Unrack the bar", "Press upward in controlled motion"], primary: ["Chest"], secondary: ["Triceps", "Shoulders"], image: "assets/muscles/chest/smith-machine-press.png" },
    { name: "Wide Push-Up", difficulty: "intermediate", howTo: ["Position hands wider than shoulders", "Lower body in controlled manner", "Push back to start"], primary: ["Chest"], secondary: ["Shoulders"], image: "assets/muscles/chest/wide-push-up.png" },
    { name: "Explosive Push-Up", difficulty: "advanced", howTo: ["Get into push-up position", "Lower to ground", "Explosively push up, hands leave ground"], primary: ["Chest", "Power"], secondary: ["Triceps"], image: "assets/muscles/chest/explosive-push-up.png" },
    { name: "Pec Deck", difficulty: "beginner", howTo: ["Sit in machine facing away", "Grip handles at shoulder height", "Pull handles together in arc"], primary: ["Chest"], secondary: ["Front Delts"], image: "assets/muscles/chest/pec-deck.png" },
    { name: "Floor Press", difficulty: "intermediate", howTo: ["Lie on floor holding dumbbells", "Press dumbbells up", "Lower until elbows touch floor"], primary: ["Chest", "Triceps"], secondary: ["Shoulders"], image: "assets/muscles/chest/floor-press.png" },
    // Balance & Coordination / Functional Training
    { name: "Single Arm Push-Up", difficulty: "advanced", howTo: ["Position one hand on ground, other behind back", "Lower body with control", "Push back to start"], primary: ["Chest", "Core"], secondary: ["Balance", "Shoulders"], image: "assets/muscles/chest/single-arm-push-up.png" },
    { name: "Stability Ball Push-Up", difficulty: "advanced", howTo: ["Place hands on stability ball", "Lower body maintaining balance", "Push back to start"], primary: ["Chest", "Stability"], secondary: ["Core", "Triceps"], image: "assets/muscles/chest/stability-ball-push-up.png" },
    { name: "Archer Push-Up", difficulty: "advanced", howTo: ["Start in wide push-up position", "Lower to one side keeping other arm straight", "Alternate sides"], primary: ["Chest", "Balance"], secondary: ["Triceps", "Core"], image: "assets/muscles/chest/archer-push-up.png" },
    { name: "Medicine Ball Push-Up", difficulty: "advanced", howTo: ["Place hands on medicine ball", "Lower chest to ball", "Push back while maintaining balance"], primary: ["Chest", "Coordination"], secondary: ["Core", "Stability"], image: "assets/muscles/chest/medicine-ball-push-up.png" }
  ],

  shoulders: [
    { name: "Overhead Press", difficulty: "intermediate", howTo: ["Stand holding barbell at shoulders", "Press bar overhead", "Lower with control to shoulders"], primary: ["Shoulders"], secondary: ["Triceps", "Chest"], image: "assets/muscles/shoulders/overhead-press.png" },
    { name: "Dumbbell Shoulder Press", difficulty: "intermediate", howTo: ["Hold dumbbells at shoulder height", "Press upward", "Lower to start position"], primary: ["Shoulders"], secondary: ["Triceps"], image: "assets/muscles/shoulders/dumbbell-shoulder-press.png" },
    { name: "Arnold Press", difficulty: "intermediate", howTo: ["Hold dumbbells at shoulders, palms facing you", "Press and rotate palms outward", "Lower with rotation"], primary: ["Shoulders"], secondary: ["Triceps"], image: "assets/muscles/shoulders/arnold-press.png" },
    { name: "Lateral Raise", difficulty: "beginner", howTo: ["Stand with light dumbbells at sides", "Raise arms out to sides to shoulder height", "Lower with control"], primary: ["Side Delts"], secondary: ["Traps"], image: "assets/muscles/shoulders/lateral-raise.png" },
    { name: "Front Raise", difficulty: "beginner", howTo: ["Hold dumbbells in front of thighs", "Raise arms forward to shoulder height", "Lower with control"], primary: ["Front Delts"], secondary: ["Chest"], image: "assets/muscles/shoulders/front-raise.png" },
    { name: "Rear Delt Fly", difficulty: "beginner", howTo: ["Bend forward at hips", "Raise dumbbells out to sides", "Lower with control"], primary: ["Rear Delts"], secondary: ["Back"], image: "assets/muscles/shoulders/rear-delt-fly.png" },
    { name: "Upright Row", difficulty: "intermediate", howTo: ["Hold barbell at hip level", "Pull elbows high and wide", "Lower to start"], primary: ["Shoulders", "Traps"], secondary: ["Biceps"], image: "assets/muscles/shoulders/upright-row.png" },
    { name: "Machine Shoulder Press", difficulty: "beginner", howTo: ["Sit in machine with feet flat", "Grip handles at shoulder level", "Press forward and upward"], primary: ["Shoulders"], secondary: ["Triceps"], image: "assets/muscles/shoulders/machine-shoulder-press.png" },
    { name: "Cable Lateral Raise", difficulty: "beginner", howTo: ["Stand with cable at side", "Raise arm out to shoulder height", "Lower with control"], primary: ["Side Delts"], secondary: ["Shoulders"], image: "assets/muscles/shoulders/cable-lateral-raise.png" },
    { name: "Seated Dumbbell Press", difficulty: "intermediate", howTo: ["Sit on bench holding dumbbells", "Press dumbbells overhead", "Lower to shoulders"], primary: ["Shoulders"], secondary: ["Triceps"], image: "assets/muscles/shoulders/seated-dumbbell-press.png" },
    { name: "Push Press", difficulty: "intermediate", howTo: ["Stand holding barbell at shoulders", "Dip legs slightly", "Explosively press upward using legs"], primary: ["Shoulders"], secondary: ["Triceps", "Legs"], image: "assets/muscles/shoulders/push-press.png" },
    { name: "Face Pull", difficulty: "beginner", howTo: ["Set cable at face height", "Pull rope to face, flare elbows", "Control return"], primary: ["Rear Delts", "Traps"], secondary: ["Back"], image: "assets/muscles/shoulders/face-pull.png" },
    { name: "Plate Raise", difficulty: "intermediate", howTo: ["Hold plate in front of chest", "Raise plate overhead", "Lower to start"], primary: ["Front Delts"], secondary: ["Shoulders"], image: "assets/muscles/shoulders/plate-raise.png" },
    { name: "Single Arm Press", difficulty: "intermediate", howTo: ["Hold dumbbell at shoulder", "Press overhead", "Lower with control"], primary: ["Shoulders"], secondary: ["Triceps", "Core"], image: "assets/muscles/shoulders/single-arm-press.png" },
    { name: "Handstand Hold", difficulty: "advanced", howTo: ["Kick up to handstand position", "Balance against wall", "Hold for time"], primary: ["Shoulders"], secondary: ["Chest", "Triceps"], image: "assets/muscles/shoulders/handstand-hold.png" },
    // Balance & Coordination / Functional Training
    { name: "Single Leg Overhead Press", difficulty: "advanced", howTo: ["Stand on one leg holding dumbbell", "Press overhead while maintaining balance", "Lower with control"], primary: ["Shoulders", "Balance"], secondary: ["Core", "Legs"], image: "assets/muscles/shoulders/overhead-press.png" },
    { name: "Turkish Get-Up", difficulty: "advanced", howTo: ["Lie on back holding weight overhead", "Stand up keeping weight stable", "Reverse movement to ground"], primary: ["Shoulders", "Full Body"], secondary: ["Core", "Coordination"], image: "assets/muscles/core/Turkish Get-Up.png" },
    { name: "Bottoms-Up Kettlebell Press", difficulty: "advanced", howTo: ["Hold kettlebell upside down", "Press overhead maintaining grip", "Lower with control"], primary: ["Shoulders", "Stability"], secondary: ["Core", "Forearms"], image: "assets/muscles/shoulders/dumbbell-shoulder-press.png" },
    { name: "Stability Ball Pike", difficulty: "advanced", howTo: ["Start in plank with feet on ball", "Pike hips up rolling ball toward hands", "Return to plank position"], primary: ["Shoulders", "Core"], secondary: ["Balance", "Stability"], image: "assets/muscles/abs/Stability Ball Pike.png" }
  ],

  back: [
    { name: "Pull-Up", difficulty: "intermediate", howTo: ["Grip bar with hands shoulder-width apart", "Pull body up until chin over bar", "Lower with control"], primary: ["Lats", "Back"], secondary: ["Biceps", "Shoulders"], image: "assets/muscles/back/pull-up.png" },
    { name: "Lat Pulldown", difficulty: "beginner", howTo: ["Sit and grip bar wide", "Pull bar to chest", "Control return to start"], primary: ["Lats"], secondary: ["Back", "Biceps"], image: "assets/muscles/back/lat-pulldown.png" },
    { name: "Barbell Row", difficulty: "intermediate", howTo: ["Bend at hips with straight back", "Pull bar to lower chest", "Lower bar with control"], primary: ["Back", "Lats"], secondary: ["Biceps", "Traps"], image: "assets/muscles/back/barbell-row.png" },
    { name: "Dumbbell Row", difficulty: "beginner", howTo: ["Bend over and brace with one hand", "Pull dumbbell to hip", "Lower with control"], primary: ["Back", "Lats"], secondary: ["Biceps"], image: "assets/muscles/back/dumbbell-row.png" },
    { name: "Seated Cable Row", difficulty: "beginner", howTo: ["Sit with feet braced", "Pull handle to torso", "Return with control"], primary: ["Back", "Lats"], secondary: ["Biceps"], image: "assets/muscles/back/seated-cable-row.png" },
    { name: "T-Bar Row", difficulty: "intermediate", howTo: ["Stand over T-bar", "Grip handles and bend knees slightly", "Row upward to chest"], primary: ["Mid Back", "Lats"], secondary: ["Biceps"], image: "assets/muscles/back/t-bar-row.png" },
    { name: "Deadlift", difficulty: "intermediate", howTo: ["Feet shoulder-width, bar over mid-foot", "Grip bar and keep back straight", "Drive through heels to stand"], primary: ["Back", "Posterior Chain"], secondary: ["Glutes", "Legs"], image: "assets/muscles/back/deadlift.png" },
    { name: "Rack Pull", difficulty: "intermediate", howTo: ["Start with bar at knee height", "Grip and lift with straight back", "Lower to start"], primary: ["Upper Back", "Lats"], secondary: ["Traps"], image: "assets/muscles/back/rack-pull.png" },
    { name: "Straight Arm Pulldown", difficulty: "beginner", howTo: ["Stand facing cable machine", "Keep arms straight", "Pull handle down to hips"], primary: ["Lats"], secondary: ["Chest"], image: "assets/muscles/back/straight-arm-pulldown.png" },
    { name: "Inverted Row", difficulty: "intermediate", howTo: ["Grip bar with body straight", "Pull chest to bar", "Lower with control"], primary: ["Back", "Lats"], secondary: ["Biceps"], image: "assets/muscles/back/inverted-row.png" },
    { name: "Machine Row", difficulty: "beginner", howTo: ["Sit with feet flat", "Grip handles at chest level", "Pull toward torso"], primary: ["Back", "Lats"], secondary: ["Biceps"], image: "assets/muscles/back/machine-row.png" },
    { name: "Wide Grip Pulldown", difficulty: "beginner", howTo: ["Sit and grip bar wider than shoulders", "Pull to upper chest", "Control return"], primary: ["Lats"], secondary: ["Back"], image: "assets/muscles/back/wide-grip-pulldown.png" },
    { name: "Close Grip Pulldown", difficulty: "beginner", howTo: ["Sit and grip bar close", "Pull to lower chest", "Return with control"], primary: ["Lower Lats"], secondary: ["Back"], image: "assets/muscles/back/close-grip-pulldown.png" },
    { name: "Land Mines", difficulty: "intermediate", howTo: ["Stand in landmine position", "Row barbell to hip", "Lower with control"], primary: ["Back", "Lats"], secondary: ["Biceps"], image: "assets/muscles/back/land-mines.png" },
    { name: "Back Extension", difficulty: "intermediate", howTo: ["Lie face down on hyperextension bench", "Lower body forward", "Extend back to start"], primary: ["Lower Back"], secondary: ["Glutes"], image: "assets/muscles/back/back-extension.png" },
    // Balance & Coordination / Functional Training
    { name: "Single Arm Row", difficulty: "advanced", howTo: ["Stand on one leg holding dumbbell", "Row weight to hip while balancing", "Control descent"], primary: ["Back", "Balance"], secondary: ["Core", "Biceps"], image: "assets/muscles/back/dumbbell-row.png" },
    { name: "Renegade Row", difficulty: "advanced", howTo: ["Start in plank on dumbbells", "Row one dumbbell while stabilizing", "Alternate sides"], primary: ["Back", "Core"], secondary: ["Shoulders", "Stability"], image: "assets/muscles/back/inverted-row.png" },
    { name: "Suspension Trainer Row", difficulty: "advanced", howTo: ["Hold straps and lean back", "Pull body up maintaining straight line", "Lower with control"], primary: ["Back", "Stability"], secondary: ["Core", "Biceps"], image: "assets/muscles/back/inverted-row.png" },
    { name: "Medicine Ball Slam to Row", difficulty: "advanced", howTo: ["Slam ball to ground", "Bend and row ball back up", "Repeat in fluid motion"], primary: ["Back", "Power"], secondary: ["Core", "Coordination"], image: "assets/muscles/core/Medicine Ball Slam.png" }
  ],

  biceps: [
    { name: "Barbell Curl", difficulty: "beginner", howTo: ["Hold barbell at hip level", "Curl upward to shoulder height", "Lower with control"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/barbell-curl.png" },
    { name: "Dumbbell Curl", difficulty: "beginner", howTo: ["Hold dumbbells at sides", "Curl upward simultaneously", "Lower with control"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/dumbbell-curl.png" },
    { name: "Hammer Curl", difficulty: "beginner", howTo: ["Hold dumbbells with neutral grip", "Curl upward", "Lower with control"], primary: ["Biceps", "Brachialis"], secondary: ["Forearms"], image: "assets/muscles/biceps/hammer-curl.png" },
    { name: "Preacher Curl", difficulty: "beginner", howTo: ["Rest arms on preacher bench", "Curl barbell upward", "Lower to start"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/preacher-curl.png" },
    { name: "Cable Curl", difficulty: "beginner", howTo: ["Stand facing cable machine", "Curl handle upward", "Lower with control"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/cable-curl.png" },
    { name: "Incline Dumbbell Curl", difficulty: "intermediate", howTo: ["Lie back on incline bench", "Curl dumbbells upward", "Lower under control"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/incline-dumbbell-curl.png" },
    { name: "Concentration Curl", difficulty: "beginner", howTo: ["Sit and brace elbow on knee", "Curl dumbbell upward", "Lower slowly"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/concentration-curl.png" },
    { name: "EZ Bar Curl", difficulty: "beginner", howTo: ["Grip EZ bar at hip height", "Curl to shoulder level", "Lower with control"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/ez-bar-curl.png" },
    { name: "Spider Curl", difficulty: "intermediate", howTo: ["Lie face down on incline", "Curl bar upward", "Lower with control"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/spider-curl.png" },
    { name: "21s Curl", difficulty: "intermediate", howTo: ["Perform 7 reps from bottom half", "7 reps from top half", "7 full range reps"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/_21s Curl .png" },
    { name: "Reverse Curl", difficulty: "intermediate", howTo: ["Hold bar with reverse grip", "Curl upward", "Lower with control"], primary: ["Biceps", "Forearms"], secondary: ["Brachioradialis"], image: "assets/muscles/biceps/reverse-curl.png" },
    { name: "Machine Curl", difficulty: "beginner", howTo: ["Sit in machine", "Grip handles", "Curl upward to full contraction"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/machine-curl.png" },
    { name: "Resistance Band Curl", difficulty: "beginner", howTo: ["Stand on band holding handles", "Curl upward against resistance", "Lower with control"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/Resistance Band Curl .png" },
    { name: "Zottman Curl", difficulty: "intermediate", howTo: ["Curl dumbbells with regular grip", "At top rotate to reverse grip", "Lower with reverse grip"], primary: ["Biceps", "Forearms"], secondary: ["Brachialis"], image: "assets/muscles/biceps/Zottman Curl .png" },
    { name: "Isometric Hold Curl", difficulty: "intermediate", howTo: ["Curl to 90 degree position", "Hold statically", "Maintain position for time"], primary: ["Biceps"], secondary: ["Forearms"], image: "assets/muscles/biceps/Isometric Hold Cur.png" },
    // Balance & Coordination / Functional Training
    { name: "Single Leg Dumbbell Curl", difficulty: "advanced", howTo: ["Stand on one leg holding dumbbells", "Curl while maintaining balance", "Lower with control"], primary: ["Biceps", "Balance"], secondary: ["Core", "Legs"], image: "assets/muscles/biceps/dumbbell-curl.png" },
    { name: "Stability Ball Preacher Curl", difficulty: "advanced", howTo: ["Kneel behind stability ball", "Rest arms on ball", "Curl maintaining ball stability"], primary: ["Biceps", "Stability"], secondary: ["Core", "Forearms"], image: "assets/muscles/biceps/preacher-curl.png" },
    { name: "Split Stance Cable Curl", difficulty: "advanced", howTo: ["Stand in staggered stance at cable", "Curl against resistance", "Maintain stable core"], primary: ["Biceps", "Core"], secondary: ["Balance", "Forearms"], image: "assets/muscles/biceps/cable-curl.png" }
  ],

  triceps: [
    { name: "Tricep Pushdown", difficulty: "beginner", howTo: ["Stand facing cable machine", "Keep elbows at sides", "Push handle down to full extension"], primary: ["Triceps"], secondary: ["Forearms"], image: "assets/muscles/triceps/Resistance Band Pushdown.png" },
    { name: "Close Grip Bench Press", difficulty: "intermediate", howTo: ["Lie on bench with close grip", "Lower bar to chest", "Press upward to extension"], primary: ["Triceps", "Chest"], secondary: ["Shoulders"], image: "assets/muscles/triceps/Close-Grip Bench Press.png" },
    { name: "Skull Crushers", difficulty: "intermediate", howTo: ["Lie on bench holding barbell", "Lower bar behind head", "Extend back to start"], primary: ["Triceps"], secondary: ["Forearms"], image: "assets/muscles/triceps/Skull Crushers.png" },
    { name: "Overhead Tricep Extension", difficulty: "beginner", howTo: ["Hold dumbbell overhead with both hands", "Lower behind head", "Extend back to start"], primary: ["Triceps"], secondary: ["Shoulders"], image: "assets/muscles/triceps/Overhead Triceps Extension.png" },
    { name: "Dips", difficulty: "intermediate", howTo: ["Grip bars and dip down", "Lean forward for chest emphasis", "Press back to start"], primary: ["Triceps"], secondary: ["Chest", "Shoulders"], image: "assets/muscles/triceps/Machine Dip.png" },
    { name: "Cable Overhead Extension", difficulty: "beginner", howTo: ["Stand facing cable machine", "Hold rope overhead", "Extend downward"], primary: ["Triceps"], secondary: ["Shoulders"], image: "assets/muscles/triceps/Cable Overhead Extension.png" },
    { name: "Kickbacks", difficulty: "beginner", howTo: ["Bend forward holding dumbbells", "Extend arms backward", "Return to start"], primary: ["Triceps"], secondary: ["Shoulders"], image: "assets/muscles/triceps/Kickbacks.png" },
    { name: "Diamond Push-Ups", difficulty: "intermediate", howTo: ["Position hands in diamond shape", "Lower to ground", "Push back to start"], primary: ["Triceps"], secondary: ["Chest"], image: "assets/muscles/triceps/Diamond Push-Ups.png" },
    { name: "Machine Dip", difficulty: "beginner", howTo: ["Sit in machine", "Grip handles", "Push down to extension"], primary: ["Triceps"], secondary: ["Chest", "Shoulders"], image: "assets/muscles/triceps/Machine Dip.png" },
    { name: "EZ Bar Skull Crushers", difficulty: "intermediate", howTo: ["Lie on bench with EZ bar", "Lower bar behind head", "Extend to start"], primary: ["Triceps"], secondary: ["Forearms"], image: "assets/muscles/triceps/EZ-Bar Skull Crushers.png" },
    { name: "Single Arm Pushdown", difficulty: "beginner", howTo: ["Stand at cable machine", "Push handle down with one arm", "Return with control"], primary: ["Triceps"], secondary: ["Forearms"], image: "assets/muscles/triceps/Single-Arm Pushdown.png" },
    { name: "JM Press", difficulty: "intermediate", howTo: ["Hold barbell at neck level", "Press and extend upward", "Lower to start"], primary: ["Triceps"], secondary: ["Shoulders", "Chest"], image: "assets/muscles/triceps/JM Press.png" },
    { name: "Resistance Band Pushdown", difficulty: "beginner", howTo: ["Stand on band holding end", "Push downward", "Control return"], primary: ["Triceps"], secondary: ["Forearms"], image: "assets/muscles/triceps/Resistance Band Pushdown.png" },
    { name: "Floor Press", difficulty: "intermediate", howTo: ["Lie on floor with dumbbells", "Press upward", "Lower until elbows touch floor"], primary: ["Triceps", "Chest"], secondary: ["Shoulders"], image: "assets/muscles/triceps/Floor Press.png" },
    { name: "Isometric Extension Hold", difficulty: "intermediate", howTo: ["Extend arms overhead", "Hold position statically", "Maintain for time"], primary: ["Triceps"], secondary: ["Shoulders"], image: "assets/muscles/triceps/Isometric Triceps Extension Hold.png" },
    // Balance & Coordination / Functional Training
    { name: "Single Arm Overhead Extension", difficulty: "advanced", howTo: ["Stand on one leg", "Hold dumbbell overhead with one arm", "Extend maintaining balance"], primary: ["Triceps", "Balance"], secondary: ["Core", "Shoulders"], image: "assets/muscles/triceps/Single-Arm Overhead Extension.png" },
    { name: "Stability Ball Tricep Extension", difficulty: "advanced", howTo: ["Lie back on stability ball", "Hold weight overhead", "Extend maintaining stability"], primary: ["Triceps", "Core"], secondary: ["Stability", "Shoulders"], image: "assets/muscles/triceps/Stability Ball Triceps Extension.png" },
    { name: "Bear Crawl", difficulty: "advanced", howTo: ["Start on all fours", "Crawl forward keeping knees off ground", "Maintain core stability"], primary: ["Triceps", "Full Body"], secondary: ["Core", "Coordination"], image: "assets/muscles/triceps/Bear Crawl.png" }
  ],

  legs: [
    { name: "Squat", difficulty: "intermediate", howTo: ["Stand with feet shoulder-width apart", "Lower hips back and down", "Drive through heels to stand"], primary: ["Quads", "Glutes"], secondary: ["Hamstrings"], image: "assets/muscles/legs/Squat .png" },
    { name: "Leg Press", difficulty: "beginner", howTo: ["Sit in machine", "Place feet on platform", "Push platform away to extension"], primary: ["Quads", "Glutes"], secondary: ["Hamstrings"], image: "assets/muscles/legs/Leg Press.png" },
    { name: "Lunge", difficulty: "intermediate", howTo: ["Step forward and lower body", "Bend both knees to 90 degrees", "Push back to start"], primary: ["Quads", "Glutes"], secondary: ["Hamstrings"], image: "assets/muscles/legs/Forward Lunge.png" },
    { name: "Walking Lunges", difficulty: "intermediate", howTo: ["Take a step forward", "Lower body in lunge position", "Step forward into next lunge"], primary: ["Quads", "Glutes"], secondary: ["Balance"], image: "assets/muscles/legs/Walking Lunges.png" },
    { name: "Romanian Deadlift", difficulty: "intermediate", howTo: ["Stand with barbell at hip level", "Hinge at hips keeping back straight", "Return to start"], primary: ["Hamstrings", "Glutes"], secondary: ["Lower Back"], image: "assets/muscles/legs/Romanian Deadlift.png" },
    { name: "Leg Curl", difficulty: "beginner", howTo: ["Lie face down on machine", "Bend knees to curl legs up", "Lower with control"], primary: ["Hamstrings"], secondary: ["Calves"], image: "assets/muscles/legs/Leg Curl .png" },
    { name: "Leg Extension", difficulty: "beginner", howTo: ["Sit in machine", "Extend legs forward", "Lower with control"], primary: ["Quads"], secondary: ["Knee Stability"], image: "assets/muscles/legs/Leg Extension.png" },
    { name: "Calf Raise", difficulty: "beginner", howTo: ["Stand with feet hip-width apart", "Rise up onto toes", "Lower heels to ground"], primary: ["Calves"], secondary: ["Ankles"], image: "assets/muscles/legs/Standing Calf Raise.png" },
    { name: "Seated Calf Raise", difficulty: "beginner", howTo: ["Sit in machine", "Place weight on thighs", "Push toes downward"], primary: ["Calves"], secondary: ["Soleus"], image: "assets/muscles/legs/Seated Calf Raise.png" },
    { name: "Hack Squat", difficulty: "beginner", howTo: ["Position in hack squat machine", "Lower body downward", "Drive upward to start"], primary: ["Quads"], secondary: ["Glutes"], image: "assets/muscles/legs/Hack Squat.png" },
    { name: "Step-Ups", difficulty: "intermediate", howTo: ["Step onto bench with one foot", "Drive through heel to stand", "Step down and repeat"], primary: ["Quads", "Glutes"], secondary: ["Hamstrings"], image: "assets/muscles/legs/Step-Ups .png" },
    { name: "Bulgarian Split Squat", difficulty: "intermediate", howTo: ["Rear foot elevated on bench", "Lower body into lunge", "Drive through front heel to start"], primary: ["Quads", "Glutes"], secondary: ["Hamstrings"], image: "assets/muscles/legs/Bulgarian Split Squat.png" },
    { name: "Sled Push", difficulty: "intermediate", howTo: ["Position hands on sled", "Push sled forward", "Control return"], primary: ["Quads", "Glutes"], secondary: ["Cardio"], image: "assets/muscles/legs/Sled Push .png" },
    { name: "Wall Sit", difficulty: "intermediate", howTo: ["Slide down wall to 90 degrees", "Keep back flat against wall", "Hold position for time"], primary: ["Quads"], secondary: ["Glutes"], image: "assets/muscles/legs/Wall-sit.png" },
    { name: "Box Jump", difficulty: "advanced", howTo: ["Stand in front of box", "Swing arms and jump up", "Land softly on box and step down"], primary: ["Quads", "Power"], secondary: ["Glutes", "Cardio"], image: "assets/muscles/legs/Box Jump.png" },
    // Balance & Coordination / Functional Training
      { name: "Single Leg Squat (Pistol Squat)", difficulty: "advanced", howTo: ["Stand on one leg, other extended forward", "Lower down to squat", "Drive back to standing"], primary: ["Quads", "Balance"], secondary: ["Glutes", "Core"], image: "assets/muscles/legs/Single-Leg Squat - Pistol Squat.png" },
    { name: "Single Leg Romanian Deadlift", difficulty: "advanced", howTo: ["Stand on one leg holding weight", "Hinge at hip extending free leg back", "Return to standing"], primary: ["Hamstrings", "Balance"], secondary: ["Glutes", "Core"], image: "assets/muscles/legs/Single-Leg Romanian Deadlift.png" },
    { name: "Curtsy Lunge", difficulty: "advanced", howTo: ["Step back and across body", "Lower into lunge position", "Return to start"], primary: ["Glutes", "Quads"], secondary: ["Balance", "Coordination"], image: "assets/muscles/legs/Curtsy Lunge.png" },
    { name: "BOSU Ball Squat", difficulty: "advanced", howTo: ["Stand on BOSU ball", "Squat while maintaining balance", "Return to standing"], primary: ["Quads", "Balance"], secondary: ["Core", "Stability"], image: "assets/muscles/legs/BOSU Ball Squat.png" },
    { name: "Lateral Lunge", difficulty: "intermediate", howTo: ["Step to side into wide stance", "Bend one knee lowering body", "Push back to center"], primary: ["Quads", "Glutes"], secondary: ["Adductors", "Balance"], image: "assets/muscles/legs/Lateral Lunge.png" },
    { name: "Skater Jumps", difficulty: "advanced", howTo: ["Jump laterally from one leg to other", "Land and balance briefly", "Immediately jump to opposite side"], primary: ["Legs", "Coordination"], secondary: ["Balance", "Cardio"], image: "assets/muscles/legs/Skater Jumps .png" },
    { name: "Single Leg Deadlift to Row", difficulty: "advanced", howTo: ["Stand on one leg holding dumbbell", "Hinge forward and row weight", "Return to standing"], primary: ["Hamstrings", "Back"], secondary: ["Balance", "Core"], image: "assets/muscles/legs/Single-Leg Deadlift to Row.png" },
    { name: "Cossack Squat", difficulty: "intermediate", howTo: ["Stand in wide stance", "Shift weight to one side squatting deep", "Alternate sides"], primary: ["Quads", "Mobility"], secondary: ["Adductors", "Balance"], image: "assets/muscles/legs/Cossack Squat.png" }
  ],

  abs: [
    { name: "Crunch", difficulty: "beginner", howTo: ["Lie on back with knees bent", "Contract abs to lift shoulders off ground", "Lower with control"], primary: ["Upper Abs"], secondary: ["Core"], image: "assets/muscles/abs/Crunch.png" },
    { name: "Sit-Up", difficulty: "beginner", howTo: ["Lie on back with knees bent", "Sit up to vertical position", "Lower with control"], primary: ["Abs"], secondary: ["Hip Flexors"], image: "assets/muscles/abs/Sit-Up.png" },
    { name: "Leg Raise", difficulty: "intermediate", howTo: ["Lie on back with arms at sides", "Raise legs to 90 degrees", "Lower without touching ground"], primary: ["Lower Abs"], secondary: ["Hip Flexors"], image: "assets/muscles/abs/Leg Raise.png" },
    { name: "Hanging Leg Raise", difficulty: "advanced", howTo: ["Hang from bar", "Raise knees to chest", "Lower with control"], primary: ["Lower Abs", "Hip Flexors"], secondary: ["Grip Strength"], image: "assets/muscles/abs/Hanging Leg Raise.png" },
    { name: "Plank", difficulty: "intermediate", howTo: ["Position in plank on forearms", "Keep body straight", "Hold position for time"], primary: ["Core", "Abs"], secondary: ["Shoulders"], image: "assets/muscles/abs/Plank .png" },
    { name: "Russian Twist", difficulty: "intermediate", howTo: ["Sit with knees bent", "Hold weight and twist side to side", "Control each rotation"], primary: ["Obliques"], secondary: ["Abs"], image: "assets/muscles/abs/Russian Twist.png" },
    { name: "Bicycle Crunch", difficulty: "intermediate", howTo: ["Lie on back with hands behind head", "Bring elbow to opposite knee", "Alternate sides"], primary: ["Abs", "Obliques"], secondary: ["Core"], image: "assets/muscles/abs/Bicycle Crunch.png" },
    { name: "V-Up", difficulty: "intermediate", howTo: ["Lie flat on back", "Raise arms and legs simultaneously", "Meet at top position"], primary: ["Abs"], secondary: ["Hip Flexors"], image: "assets/muscles/abs/V-Up.png" },
    { name: "Toe Touch", difficulty: "beginner", howTo: ["Lie on back", "Reach toward toes with arms", "Feel upper ab contraction"], primary: ["Upper Abs"], secondary: ["Core"], image: "assets/muscles/abs/Toe Touch.png" },
    { name: "Flutter Kicks", difficulty: "intermediate", howTo: ["Lie on back", "Raise legs slightly off ground", "Kick in alternating motion"], primary: ["Lower Abs"], secondary: ["Hip Flexors"], image: "assets/muscles/abs/Flutter Kicks.png" },
    { name: "Cable Crunch", difficulty: "beginner", howTo: ["Kneel at cable machine", "Pull weight down contracting abs", "Return to start"], primary: ["Abs"], secondary: ["Core"], image: "assets/muscles/abs/Cable Crunch.png" },
    { name: "Ab Wheel Rollout", difficulty: "advanced", howTo: ["Kneel holding wheel", "Roll forward fully extending body", "Roll back to start"], primary: ["Abs"], secondary: ["Core", "Shoulders"], image: "assets/muscles/abs/Ab Wheel Rollout .png" },
    { name: "Mountain Climbers", difficulty: "intermediate", howTo: ["Start in plank position", "Drive knees to chest alternately", "Maintain steady pace"], primary: ["Core", "Abs"], secondary: ["Cardio"], image: "assets/muscles/abs/Mountain Climbers.png" },
    { name: "Dead Bug", difficulty: "beginner", howTo: ["Lie on back with arms and legs up", "Lower opposite arm and leg", "Return and alternate"], primary: ["Core", "Abs"], secondary: ["Stability"], image: "assets/muscles/abs/Dead Bug (Male).png" },
    { name: "Hollow Hold", difficulty: "intermediate", howTo: ["Lie flat creating hollow body shape", "Tense entire body", "Hold position"], primary: ["Core", "Abs"], secondary: ["Overall Core"], image: "assets/muscles/abs/Hollow Body Hold .png" },
    // Balance & Coordination / Functional Training
    { name: "Single Leg V-Up", difficulty: "advanced", howTo: ["Lie on back", "Raise one leg and reach toward toes", "Alternate legs"], primary: ["Abs", "Balance"], secondary: ["Core", "Hip Flexors"], image: "assets/muscles/abs/Single-Leg V-Up.png" },
    { name: "Stability Ball Pike", difficulty: "advanced", howTo: ["Start in plank with feet on ball", "Pike hips up", "Roll ball toward hands"], primary: ["Abs", "Stability"], secondary: ["Core", "Shoulders"], image: "assets/muscles/abs/Stability Ball Pike.png" },
    { name: "Single Arm Plank", difficulty: "advanced", howTo: ["Hold plank on one forearm", "Extend other arm forward", "Maintain level body"], primary: ["Abs", "Stability"], secondary: ["Core", "Balance"], image: "assets/muscles/abs/Single-Arm Plank.png" },
    { name: "BOSU Ball Plank", difficulty: "advanced", howTo: ["Place forearms on BOSU ball", "Hold plank maintaining balance", "Keep core engaged"], primary: ["Abs", "Balance"], secondary: ["Core", "Stability"], image: "assets/muscles/abs/BOSU Ball Plank .png" }
  ],

  core: [
    { name: "Plank", difficulty: "intermediate", howTo: ["Position on forearms in straight line", "Engage entire core", "Hold for time"], primary: ["Core", "Abs"], secondary: ["Shoulders"], image: "assets/muscles/core/_Plank.png" },
    { name: "Side Plank", difficulty: "intermediate", howTo: ["Lie on side supporting on forearm", "Lift hips to create straight line", "Hold for time"], primary: ["Obliques", "Core"], secondary: ["Shoulders"], image: "assets/muscles/core/Side Plank.png" },
    { name: "Bird Dog", difficulty: "beginner", howTo: ["Start on all fours", "Extend opposite arm and leg", "Return and alternate"], primary: ["Core", "Stability"], secondary: ["Balance"], image: "assets/muscles/core/Bird Dog.png" },
    { name: "Dead Bug", difficulty: "beginner", howTo: ["Lie on back with limbs extended", "Lower opposite arm and leg", "Alternate sides"], primary: ["Core", "Stability"], secondary: ["Abs"], image: "assets/muscles/core/Dead Bug .png" },
    { name: "Cable Rotation", difficulty: "intermediate", howTo: ["Stand perpendicular to cable", "Rotate against resistance", "Control return"], primary: ["Obliques", "Core"], secondary: ["Back"], image: "assets/muscles/core/Cable Rotation.png" },
    { name: "Medicine Ball Slam", difficulty: "advanced", howTo: ["Hold medicine ball overhead", "Slam ball to ground with force", "Reset and repeat"], primary: ["Core", "Power"], secondary: ["Shoulders"], image: "assets/muscles/core/Medicine Ball Slam.png" },
    { name: "Farmer Carry", difficulty: "beginner", howTo: ["Hold heavy weights at sides", "Walk maintaining posture", "Keep core tight"], primary: ["Core"], secondary: ["Grip", "Traps"], image: "assets/muscles/core/Farmer Carry .png" },
    { name: "Suitcase Carry", difficulty: "intermediate", howTo: ["Hold weight in one hand", "Walk maintaining level hips", "Maintain core tension"], primary: ["Obliques", "Core"], secondary: ["Balance"], image: "assets/muscles/core/Suitcase Carry.png" },
    { name: "Pallof Press", difficulty: "intermediate", howTo: ["Stand perpendicular to cable", "Press handle away from body", "Control against rotation"], primary: ["Anti-rotation Core"], secondary: ["Obliques"], image: "assets/muscles/core/Pallof Press.png" },
    { name: "Ab Wheel Rollout", difficulty: "advanced", howTo: ["Kneel with wheel", "Roll forward extending body", "Roll back to start"], primary: ["Core"], secondary: ["Abs", "Shoulders"], image: "assets/muscles/core/Ab Wheel Rollout.png" },
    { name: "Standing Cable Crunch", difficulty: "beginner", howTo: ["Stand holding rope overhead", "Crunch downward", "Control return"], primary: ["Abs", "Core"], secondary: ["Stability"], image: "assets/muscles/core/Standing Cable Crunch.png" },
    { name: "L-Sit Hold", difficulty: "advanced", howTo: ["Sit with hands beside hips", "Lift body with arms", "Hold with legs straight"], primary: ["Core"], secondary: ["Shoulders", "Arms"], image: "assets/muscles/core/L-Sit Hold.png" },
    { name: "Windshield Wipers", difficulty: "advanced", howTo: ["Hang from bar", "Raise legs and swing side to side", "Control movement"], primary: ["Obliques", "Core"], secondary: ["Grip"], image: "assets/muscles/core/Windshield Wipers.png" },
    { name: "Stability Ball Rollout", difficulty: "advanced", howTo: ["Kneel with hands on stability ball", "Roll forward extending body", "Roll back to start"], primary: ["Core", "Abs"], secondary: ["Shoulders"], image: "assets/muscles/core/Stability Ball Rollout.png" },
    { name: "Turkish Get-Up", difficulty: "advanced", howTo: ["Lie on back with weight overhead", "Stand keeping weight stable", "Reverse movement"], primary: ["Core"], secondary: ["Full Body"], image: "assets/muscles/core/Turkish Get-Up.png" },
    // Balance & Coordination / Functional Training
    { name: "Single Leg Deadlift", difficulty: "advanced", howTo: ["Stand on one leg", "Hinge at hip lowering torso", "Return to standing position"], primary: ["Core", "Balance"], secondary: ["Hamstrings", "Glutes"], image: "assets/muscles/core/Single-Leg Deadlift .png" },
    { name: "Plank to Push-Up", difficulty: "advanced", howTo: ["Start in forearm plank", "Push up to high plank one arm at a time", "Return to forearm plank"], primary: ["Core", "Coordination"], secondary: ["Shoulders", "Triceps"], image: "assets/muscles/core/Plank to Push-Up.png" },
    { name: "Bear Crawl", difficulty: "advanced", howTo: ["Start on hands and knees", "Crawl forward keeping knees off ground", "Maintain level back"], primary: ["Core", "Coordination"], secondary: ["Full Body", "Stability"], image: "assets/muscles/core/Bear Crawl.png" },
    { name: "Single Leg Plank", difficulty: "advanced", howTo: ["Hold plank position", "Lift one leg off ground", "Maintain level hips"], primary: ["Core", "Balance"], secondary: ["Glutes", "Stability"], image: "assets/muscles/core/Single-Leg Plank.png" }
  ],

  traps: [
    { name: "Barbell Shrug", howTo: ["Position feet shoulder-width apart", "Hold barbell at thigh level with slight bend in elbows", "Shrug shoulders upward in a controlled motion", "Pause briefly at top", "Lower with control back to start position"], primary: ["Upper Traps"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/muscles/traps/Barbell Shrug.png" },
    { name: "Dumbbell Shrug", howTo: ["Stand with feet shoulder-width apart holding dumbbells at sides", "Engage core and maintain neutral spine", "Shrug shoulders up toward ears", "Hold at top for 1-2 seconds", "Lower dumbbells back to starting position"], primary: ["Upper Traps"], secondary: ["Shoulders", "Forearms"], difficulty: "beginner", image: "assets/muscles/traps/Dumbbell Shrug.png" },
    { name: "Farmer Carry", howTo: ["Pick up heavy dumbbells or kettlebells at sides", "Maintain upright posture with engaged core", "Walk forward with purposeful strides", "Keep shoulders packed and stable", "Walk prescribed distance or time then set down"], primary: ["Traps", "Forearms"], secondary: ["Core", "Legs"], difficulty: "intermediate", image: "assets/muscles/traps/Farmer Carry.png" },
    { name: "Upright Row", howTo: ["Stand with feet shoulder-width apart holding barbell at thigh", "Initiate pull by raising elbows high and wide", "Pull barbell up to chest level with elbows leading", "Keep barbell close to body throughout movement", "Lower back to starting position in controlled manner"], primary: ["Traps", "Shoulders"], secondary: ["Biceps"], difficulty: "intermediate", image: "assets/muscles/traps/Upright Row.png" },
    { name: "Rack Pull", howTo: ["Set safety bars in squat rack at mid-shin to knee height", "Position feet under bar shoulder-width apart", "Bend at knees slightly and hinge forward", "Grip bar firmly with mixed or overhand grip", "Drive through legs and extend hips powerfully to pull bar up"], primary: ["Upper Traps"], secondary: ["Back", "Legs"], difficulty: "intermediate", image: "assets/muscles/traps/Rack Pull.png" },
    { name: "Face Pull", howTo: ["Attach rope to cable machine at upper pulley position", "Position yourself facing the machine with feet shoulder-width apart", "Pull rope toward face with elbows high and wide", "Separate rope ends and pull toward temples", "Control the resistance and return to start"], primary: ["Traps", "Rear Delts"], secondary: ["Upper Back"], difficulty: "beginner", image: "assets/muscles/traps/Face Pull .png" },
    { name: "Cable Shrug", howTo: ["Stand facing cable machine with feet shoulder-width apart", "Grip handles with arms extended slightly at sides", "Keep arms relatively straight with slight elbow bend", "Shrug shoulders directly upward with controlled speed", "Hold briefly then lower under control back to start"], primary: ["Upper Traps"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/muscles/traps/Cable Shrug .png" },
    { name: "Smith Machine Shrug", howTo: ["Unrack barbell from Smith machine at knee height", "Stand with feet shoulder-width apart under bar", "Take grip slightly wider than shoulders", "Shrug upward by contracting trap muscles", "Lower back to start position in a controlled manner"], primary: ["Upper Traps"], secondary: ["Forearms"], difficulty: "beginner", image: "assets/muscles/traps/Smith Machine Shrug.png" },
    { name: "Overhead Carry", howTo: ["Pick up heavy dumbbells and press overhead to lockout", "Position feet shoulder-width apart with core engaged", "Maintain tall posture with shoulders packed", "Walk forward with controlled steps", "Set weights down safely after completing distance"], primary: ["Traps", "Shoulders"], secondary: ["Core", "Arms"], difficulty: "advanced", image: "assets/muscles/traps/Overhead Carry.png" },
    { name: "High Pull", howTo: ["Stand with feet hip to shoulder-width apart over barbell", "Bend knees and hinge forward with flat back", "Explosively extend hips and knees", "Pull barbell upward with high elbows", "Control descent back to hip level"], primary: ["Traps", "Upper Back"], secondary: ["Shoulders", "Legs"], difficulty: "advanced", image: "assets/muscles/traps/High Pull.png" },
    { name: "Kettlebell Shrug", howTo: ["Stand holding kettlebell by handle at your side", "Maintain neutral posture with engaged core", "Shrug shoulder upward toward ear", "Keep arm relatively straight during movement", "Lower under control and repeat for opposite shoulder"], primary: ["Upper Traps"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/muscles/traps/Kettlebell Shrug.png" },
    { name: "Resistance Band Shrug", howTo: ["Stand on resistance band with feet shoulder-width apart", "Hold band handles at sides with arms extended", "Drive shoulders upward against band resistance", "Pause at top of the shrug movement", "Return to starting position in controlled fashion"], primary: ["Upper Traps"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/muscles/traps/Resistance Band Shrug.png" },
    { name: "Isometric Shrug Hold", howTo: ["Load barbell or dumbbells to a heavy weight", "Position weight at shoulder height or top of shrug", "Hold shoulders elevated against the resistance", "Maintain rigid posture for 20-45 seconds", "Lower weight and rest before repeating"], primary: ["Upper Traps"], secondary: ["Isometric Strength"], difficulty: "intermediate", image: "assets/muscles/traps/Isometric Shrug Hold.png" },
    { name: "Deadlift", howTo: ["Position feet hip-width apart with bar over midfoot", "Bend knees and grip bar just outside legs", "Keep chest up and core braced", "Drive through heels and extend hips and knees", "Pull barbell from floor to hip height in one movement"], primary: ["Lower Back", "Legs"], secondary: ["Traps", "Glutes"], difficulty: "advanced", image: "assets/muscles/traps/Deadlift.png" },
    { name: "Snatch Grip Shrug", howTo: ["Stand with feet shoulder-width apart holding barbell", "Use a wider snatch grip position on the bar", "Engage core and maintain neutral spine", "Explosively shrug shoulders upward with power", "Lower barbell under control back to starting position"], primary: ["Upper Traps"], secondary: ["Shoulders", "Forearms"], difficulty: "advanced", image: "assets/muscles/traps/Snatch-Grip Shrug.png" },
    // Balance & Coordination / Functional Training
    { name: "Single Arm Farmer Carry", howTo: ["Hold heavy weight in one hand", "Walk maintaining level hips", "Keep core braced against side bending"], primary: ["Traps", "Core"], secondary: ["Obliques", "Balance"], difficulty: "intermediate", image: "assets/muscles/traps/Single-Arm Farmer Carry.png" },
    { name: "Overhead Carry", howTo: ["Hold weight overhead with locked arms", "Walk forward maintaining stability", "Keep core engaged throughout"], primary: ["Traps", "Shoulders"], secondary: ["Core", "Stability"], difficulty: "advanced", image: "assets/muscles/traps/Overhead Carry.png" },
    { name: "Waiter's Walk", howTo: ["Hold dumbbell overhead on open palm", "Walk forward balancing weight", "Maintain neutral spine"], primary: ["Traps", "Balance"], secondary: ["Shoulders", "Core"], difficulty: "advanced", image: "assets/muscles/traps/Overhead Carry.png" }
  ],

  // Body part-based stretches (for dedicated stretch screen)
  stretchesByBodyPart: {
    'neck-shoulders': [
      { name: "Neck Stretch - Forward", howTo: ["Sit upright with good posture", "Slowly bring chin toward chest", "Feel gentle stretch in back of neck", "Hold for 20-30 seconds", "Return to center and repeat"], primary: ["Neck"], secondary: ["Upper Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Stretch – Forward.png" },
      { name: "Neck Stretch - Side", howTo: ["Sit upright with shoulders relaxed", "Tilt right ear toward right shoulder", "Feel stretch on left side of neck", "Hold for 20-30 seconds", "Switch sides and repeat"], primary: ["Neck"], secondary: ["Trapezius"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Stretch – Side.png" },
      { name: "Neck Stretch - Rotation", howTo: ["Sit with good posture", "Slowly turn head to look over right shoulder", "Feel gentle twist in neck", "Hold for 20-30 seconds", "Repeat on opposite side"], primary: ["Neck"], secondary: ["Upper Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Stretch – Rotation.png" },
      { name: "Upper Trap Stretch", howTo: ["Sit or stand upright", "Gently pull head toward right shoulder with right hand", "Keep left shoulder relaxed", "Feel stretch in left upper trap", "Hold for 20-30 seconds and switch"], primary: ["Trapezius"], secondary: ["Neck"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Upper Trap Stretch.png" },
      { name: "Cross-Body Shoulder Stretch", howTo: ["Stand or sit upright", "Bring right arm across body", "Use left hand to pull right elbow toward chest", "Feel stretch in right shoulder", "Hold for 20-30 seconds and switch"], primary: ["Shoulders"], secondary: ["Chest"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Cross-Body Shoulder Stretch .png" },
      { name: "Shoulder Rolls - Backward", howTo: ["Stand with arms at sides", "Roll shoulders backward in circular motion", "Complete 10 slow backward rolls", "Pause at bottom of each roll", "Breathe deeply throughout"], primary: ["Shoulders"], secondary: ["Neck", "Upper Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Shoulder Rolls – Backward .png" },
      { name: "Shoulder Rolls - Forward", howTo: ["Stand with arms at sides", "Roll shoulders forward in circular motion", "Complete 10 slow forward rolls", "Pause at front of each roll", "Alternate with backward rolls"], primary: ["Shoulders"], secondary: ["Neck"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Shoulder Rolls – Forward.png" },
      { name: "Reverse Prayer Stretch", howTo: ["Stand with arms behind back", "Place palms together at shoulder height", "Slowly straighten arms and lift hands up", "Feel stretch in shoulders and chest", "Hold for 20-30 seconds"], primary: ["Shoulders"], secondary: ["Chest"], difficulty: "intermediate", image: "assets/stretches/Neck&Shoulder/Reverse Prayer Stretch.png" },
      { name: "Neck Lateral Flexion", howTo: ["Sit upright with shoulders down", "Drop right ear toward right shoulder", "Let arm weight help deepen stretch", "Feel full neck stretch", "Hold for 20-30 seconds each side"], primary: ["Neck"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Lateral Flexion.png" },
      { name: "Neck Extension Stretch", howTo: ["Sit upright with good posture", "Gently tilt head back slightly", "Feel stretch in front of neck", "Do not overextend", "Hold for 15-20 seconds"], primary: ["Neck"], secondary: ["Upper Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Extension Stretch.png" },
      { name: "Shoulder Shrug Hold", howTo: ["Stand or sit upright", "Shrug both shoulders up toward ears", "Hold for 3-5 seconds at top", "Relax completely downward", "Repeat 10-12 times"], primary: ["Shoulders"], secondary: ["Trapezius"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Shoulder Shrug Hold.png" },
      { name: "Cross-Chest Shoulder Stretch", howTo: ["Bring right arm across chest at shoulder height", "Use left hand to gently pull right arm closer", "Feel stretch in right rear shoulder", "Hold for 20-30 seconds and switch"], primary: ["Shoulders"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Cross-Chest Shoulder Stretch.png" },
      { name: "Doorway Shoulder Stretch", howTo: ["Stand in doorway with hands on frame at shoulder height", "Step forward gently", "Feel stretch across front shoulders", "Hold for 20-30 seconds", "Adjust hand height and repeat"], primary: ["Shoulders"], secondary: ["Chest"], difficulty: "intermediate", image: "assets/stretches/Neck&Shoulder/Doorway Shoulder Stretch.png" },
      { name: "Neck Isometric Stretch", howTo: ["Sit upright with good posture", "Place right hand on right side of head", "Gently push head against hand without moving", "Hold for 5-10 seconds", "Repeat 3 times on each side"], primary: ["Neck"], secondary: ["Shoulders"], difficulty: "intermediate", image: "assets/stretches/Neck&Shoulder/Neck Isometric Stretch.png" },
      { name: "Shoulder Blade Squeeze", howTo: ["Stand or sit upright", "Pull shoulder blades back and down", "Squeeze muscles between shoulder blades", "Hold for 5 seconds", "Release and repeat 10-15 times"], primary: ["Upper Back"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Shoulder Blade Squeeze.png" }
    ],

    'chest': [
      { name: "Doorway Chest Stretch", howTo: ["Stand in doorway with feet hip-width apart", "Place forearm on door frame at shoulder height", "Step forward until chest feels stretched", "Hold for 20-30 seconds", "Repeat on opposite side"], primary: ["Chest"], secondary: ["Shoulders", "Front Delts"], difficulty: "beginner", image: "assets/stretches/Chest/Doorway Chest Stretch.png" },
      { name: "Lying Chest Stretch", howTo: ["Lie on back near edge of bed or bench", "Let arms hang off edge of surface", "Relax chest and shoulders", "Feel gentle stretch across chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Front Delts", "Shoulders"], difficulty: "beginner", image: "assets/stretches/Chest/Lying Chest Stretch.png" },
      { name: "Prayer Stretch", howTo: ["Stand facing wall with hands in prayer position at chest", "Slowly step feet backward", "Let chest sink forward", "Feel stretch across front of chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Chest/Prayer Stretch.png" },
      { name: "Quadruped Chest Stretch", howTo: ["Start on hands and knees", "Slowly sink hips back toward heels", "Keep arms extended forward", "Feel stretch across chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Chest/Quadruped Chest Stretch.png" },
      { name: "Corner Chest Stretch", howTo: ["Stand in corner with forearms on walls at shoulder height", "Step forward into corner", "Feel deep stretch across entire chest", "Hold for 20-30 seconds", "This is more intense - go slowly"], primary: ["Chest"], secondary: ["Shoulders", "Front Delts"], difficulty: "advanced", image: "assets/stretches/Chest/Corner Chest Stretch.png" },
      { name: "Supine Chest Stretch", howTo: ["Lie on back with arms at sides", "Roll shoulders back and under", "Press chest upward gently", "Feel stretch across entire chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Shoulders"], difficulty: "intermediate", image: "assets/stretches/Chest/Supine Chest Stretch.png" },
      { name: "Cross-Arm Chest Stretch", howTo: ["Cross right arm over chest at shoulder height", "Hold with left arm and gently pull", "Keep shoulders relaxed", "Feel stretch in right chest", "Hold for 20-30 seconds and switch"], primary: ["Chest"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Chest/Cross-Arm Chest Stretch.png" },
      { name: "Standing Doorway Pec Stretch", howTo: ["Stand in doorway with arm raised at 90 degrees", "Place forearm on frame", "Step body forward slowly", "Feel stretch in pec muscle", "Hold for 20-30 seconds and switch"], primary: ["Chest"], secondary: ["Front Delts"], difficulty: "beginner", image: "assets/stretches/Chest/Standing Doorway Pec Stretch.png" },
      { name: "Supported Chest Opener", howTo: ["Use foam roller or cushion under upper back", "Lie back with support under mid-back", "Let arms fall to sides", "Allow gravity to open chest", "Hold for 30-60 seconds"], primary: ["Chest"], secondary: ["Front Delts"], difficulty: "beginner", image: "assets/stretches/Chest/Supported Chest Opener.png" },
      { name: "Floor Chest Stretch", howTo: ["Lie face down on floor", "Place right elbow on ground under shoulder", "Push torso up gently with right arm", "Feel stretch across chest", "Hold for 20-30 seconds and switch"], primary: ["Chest"], secondary: ["Shoulders"], difficulty: "intermediate", image: "assets/stretches/Chest/Floor Chest Stretch.png" },
      { name: "Incline Chest Stretch", howTo: ["Stand facing an incline or high surface", "Place hands on surface at shoulder width", "Lean chest forward and down", "Feel stretch across chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Shoulders", "Front Delts"], difficulty: "beginner", image: "assets/stretches/Chest/Incline Chest Stretch.png" },
      { name: "Reverse Pec Deck Stretch", howTo: ["Sit on bench or chair", "Pull both arms across body", "Gently increase stretch with hand pressure", "Feel stretch in both sides of chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Chest/Reverse Pec Deck Stretch.png" },
      { name: "Pec Stretch - Standing Arms Back", howTo: ["Stand with feet hip-width apart", "Pull both arms back behind body", "Interlace fingers if possible", "Gently pull arms back and up", "Feel stretch across entire chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Shoulders"], difficulty: "intermediate", image: "assets/stretches/Chest/Pec Stretch \u2013 Standing Arms Back.png" },
      { name: "Single Arm Chest Opener", howTo: ["Stand with right arm extended out to side at shoulder height", "Rotate torso to look back over right shoulder", "Feel stretch in right chest", "Hold for 20-30 seconds and switch"], primary: ["Chest"], secondary: ["Shoulders", "Back"], difficulty: "beginner", image: "assets/stretches/Chest/Single Arm Chest Opener.png" },
      { name: "Wall Chest Stretch - Low", howTo: ["Stand facing wall at arm's length", "Place hands on wall below shoulder height", "Lean chest toward wall", "Feel stretch in lower chest", "Hold for 20-30 seconds"], primary: ["Chest"], secondary: ["Front Delts"], difficulty: "beginner", image: "assets/stretches/Chest/Wall Chest Stretch \u2013 Low.png" }
    ],

    'back': [
      { name: "Cat-Cow Stretch", howTo: ["Start on hands and knees", "Arch back and look up (cow)", "Hold for 2 seconds", "Round spine and tuck chin (cat)", "Hold for 2 seconds", "Repeat 10-15 times"], primary: ["Back"], secondary: ["Spine"], difficulty: "beginner", image: "assets/stretches/back/Cat\u2013Cow Stretch.png" },
      { name: "Child's Pose", howTo: ["Start on hands and knees", "Sink hips back toward heels", "Extend arms forward and lower forehead", "Feel stretch down entire back", "Hold for 30-60 seconds"], primary: ["Back"], secondary: ["Shoulders", "Lats"], difficulty: "beginner", image: "assets/stretches/back/Child’s Pose.png" },
      { name: "Seated Spinal Twist", howTo: ["Sit upright with legs extended", "Bend right knee and place foot outside left knee", "Wrap left arm around right knee", "Twist to look over right shoulder", "Hold for 20-30 seconds and switch"], primary: ["Back", "Spine"], secondary: ["Obliques"], difficulty: "beginner", image: "assets/stretches/back/Seated Spinal Twist.png" },
      { name: "Lat Stretch - Standing", howTo: ["Stand with feet hip-width apart", "Reach right arm overhead and across body", "Lean to the left", "Feel stretch down right side of back", "Hold for 20-30 seconds and switch"], primary: ["Lats"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/back/Lat Stretch \u2013 Standing.png" },
      { name: "Lat Stretch - Lying", howTo: ["Lie on your right side with knees slightly bent and spine neutral", "Extend your left arm overhead with palm facing up", "Reach long through left fingertips while keeping left shoulder down", "Use your right hand to gently guide left wrist slightly behind your head", "Keep ribs down and avoid arching lower back", "Feel the stretch from left side ribs into left lat", "Hold for 20-30 seconds, then switch sides and repeat"], primary: ["Lats"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/back/Lat Stretch – Lying.png" },
      { name: "Thoracic Rotation Stretch", howTo: ["Lie on side with knees bent", "Extend top arm toward opposite side", "Follow hand with eyes and head", "Feel rotation in mid-back", "Hold for 20-30 seconds and switch"], primary: ["Back"], secondary: ["Spine"], difficulty: "intermediate", image: "assets/stretches/back/Thoracic Rotation Stretch.png" },
      { name: "Upper Back Stretch", howTo: ["Sit upright in chair", "Cross right arm over left shoulder", "Gently pull right arm closer with left hand", "Feel stretch in upper right back", "Hold for 20-30 seconds and switch"], primary: ["Upper Back"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/back/Upper Back Stretch.png" },
      { name: "Quadruped Back Extension", howTo: ["Start on hands and knees", "Lower chest down between hands", "Feel stretch in mid-back", "Keep hips high", "Hold for 15-20 seconds"], primary: ["Back"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Spin&Core/Quadruped Back Extension.png" },
      { name: "Spine Flexion Stretch", howTo: ["Stand or sit upright", "Slowly hunch forward rounding spine", "Let head drop forward", "Feel stretch down entire spine", "Hold for 20-30 seconds"], primary: ["Back", "Spine"], secondary: ["Neck"], difficulty: "beginner", image: "assets/stretches/back/Spine Flexion Stretch.png" },
      { name: "Supported Back Stretch", howTo: ["Use foam roller or cushion across upper back", "Lie back with support under mid-back", "Let arms drop to sides", "Relax into the stretch", "Hold for 30-60 seconds"], primary: ["Back"], secondary: ["Chest"], difficulty: "intermediate", image: "assets/stretches/back/Supported Back Stretch.png" },
      { name: "Reverse Back Bend", howTo: ["Stand with feet hip-width apart", "Place hands behind you on a support", "Gently press hips forward", "Feel stretch across entire front body and back", "Hold for 20-30 seconds"], primary: ["Back"], secondary: ["Chest"], difficulty: "intermediate", image: "assets/stretches/back/Reverse Back Bend .png" },
      { name: "Prone Back Extension", howTo: ["Lie face down on floor", "Place hands under shoulders", "Push upper body up with arms", "Keep hips on ground", "Feel stretch in back and front", "Hold for 15-20 seconds"], primary: ["Back"], secondary: ["Chest"], difficulty: "intermediate", image: "assets/stretches/back/Prone Back Extension .png" },
      { name: "Seated Back Reach", howTo: ["Sit upright in chair", "Reach both arms up and back", "Gently arch back", "Feel stretch across entire back", "Hold for 15-20 seconds"], primary: ["Back"], secondary: ["Chest"], difficulty: "beginner", image: "assets/stretches/back/_Seated Back Reach.png" },
      { name: "Back Flexion with Band", howTo: ["Hold stretch band or towel in front", "Keep arms extended", "Lean forward slightly", "Feel controlled stretch in back", "Hold for 20-30 seconds"], primary: ["Back"], secondary: ["Hamstrings"], difficulty: "beginner", image: "assets/stretches/back/Back Flexion with Band.png" },
      { name: "Diagonal Back Stretch", howTo: ["Stand with feet shoulder-width apart", "Reach right arm up and across body", "Lean to left diagonal", "Feel stretch through right back side", "Hold for 20-30 seconds and switch"], primary: ["Back"], secondary: ["Lats"], difficulty: "beginner", image: "assets/stretches/back/Diagonal Back Stretch.png" }
    ],

    'arms-wrists': [
      { name: "Triceps Stretch", howTo: ["Raise right arm overhead", "Bend elbow and lower right hand toward back", "Use left hand to gently pull right elbow", "Feel stretch in back of arm", "Hold for 20-30 seconds and switch"], primary: ["Triceps"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Triceps Stretch \u2013 Overhead (Beginner).png" },
      { name: "Biceps Stretch", howTo: ["Stand with arms extended at sides", "Rotate palms to face forward", "Gently pull arms backward", "Feel stretch in front of arms", "Hold for 20-30 seconds"], primary: ["Biceps"], secondary: ["Chest"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Biceps Stretch \u2013 Standing Arms Back (Beginner).png" },
      { name: "Forearm Stretch - Pronated", howTo: ["Extend right arm forward with palm up", "Use left hand to gently press right palm down", "Feel stretch along forearm", "Hold for 20-30 seconds and switch"], primary: ["Forearms"], secondary: ["Biceps"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Wrist Flexor Stretch .png" },
      { name: "Forearm Stretch - Supinated", howTo: ["Extend right arm forward with palm down", "Use left hand to gently press back of right hand down", "Feel stretch along forearm", "Hold for 20-30 seconds and switch"], primary: ["Forearms"], secondary: ["Triceps"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Wrist Extensor Stretch .png" },
      { name: "Wrist Stretch - Flexion", howTo: ["Extend right arm forward with palm up", "Use left hand to gently pull right fingers back", "Feel stretch in front of forearm", "Hold for 20-30 seconds and switch"], primary: ["Wrists"], secondary: ["Forearms"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Wrist Flexor Stretch .png" },
      { name: "Wrist Stretch - Extension", howTo: ["Extend right arm forward with palm down", "Use left hand to gently push back of hand down", "Feel stretch on top of forearm", "Hold for 20-30 seconds and switch"], primary: ["Wrists"], secondary: ["Forearms"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Wrist Extensor Stretch .png" },
      { name: "Wrist Radial Deviation", howTo: ["Extend right arm with palm down", "Gently bend wrist toward thumb side", "Use left hand to assist if needed", "Feel stretch on outer forearm", "Hold for 15-20 seconds and switch"], primary: ["Wrists"], secondary: ["Forearms"], difficulty: "intermediate", image: "assets/stretches/Arm&Wrists/Wrist Circles (Beginner \u2013 Static Depiction).png" },
      { name: "Wrist Ulnar Deviation", howTo: ["Extend right arm with palm up", "Gently bend wrist toward pinky side", "Use left hand to assist if needed", "Feel stretch on inner forearm", "Hold for 15-20 seconds and switch"], primary: ["Wrists"], secondary: ["Forearms"], difficulty: "intermediate", image: "assets/stretches/Arm&Wrists/Wrist Isometric Positioning (Beginner).png" },
      { name: "Finger Extensors Stretch", howTo: ["Extend right arm with palm up", "Use left hand to gently press fingers down", "Feel stretch along top of forearm", "Hold for 15-20 seconds and switch"], primary: ["Forearms"], secondary: ["Wrists"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Finger Extension Stretch (Beginner).png" },
      { name: "Finger Flexors Stretch", howTo: ["Extend right arm with palm down", "Use left hand to gently press back of fingers", "Feel stretch on underside of forearm", "Hold for 15-20 seconds and switch"], primary: ["Forearms"], secondary: ["Wrists"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Posterior Forearm Positioning (Intermediate) .png" },
      { name: "Prayer Wrist Stretch", howTo: ["Place palms together in front of chest", "Slowly lower hands toward waist", "Keep palms pressed together", "Feel stretch in wrists and forearms", "Hold for 20-30 seconds"], primary: ["Wrists"], secondary: ["Forearms"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Forearm Positioning \u2013 Palms Together.png" },
      { name: "Reverse Prayer Wrist Stretch", howTo: ["Place backs of hands together behind back", "Slowly raise hands up toward neck", "Keep hands pressed together", "Feel stretch in wrists", "Hold for 20-30 seconds"], primary: ["Wrists"], secondary: ["Forearms", "Chest"], difficulty: "intermediate", image: "assets/stretches/Arm&Wrists/Supported Wrist Mobility Stretch (Beginner).png" },
      { name: "Overhead Triceps Stretch", howTo: ["Raise right arm overhead", "Bend right elbow 90 degrees", "Use left hand to pull right elbow gently", "Feel full stretch in triceps", "Hold for 20-30 seconds and switch"], primary: ["Triceps"], secondary: ["Shoulders"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Triceps Stretch \u2013 Across Head (Beginner) .png" },
      { name: "Doorway Biceps Stretch", howTo: ["Stand in doorway", "Place forearm on frame at chest height", "Turn body away from doorway", "Feel stretch in biceps", "Hold for 20-30 seconds and switch"], primary: ["Biceps"], secondary: ["Chest"], difficulty: "intermediate", image: "assets/stretches/Arm&Wrists/Biceps Positioning \u2013 Wall Supported (Beginner).png" },
      { name: "Underhand Grip Stretch", howTo: ["Extend both arms to sides, palms up", "Keep arms straight", "Gently pull them back slightly", "Feel stretch in biceps and chest", "Hold for 20-30 seconds"], primary: ["Biceps"], secondary: ["Chest"], difficulty: "beginner", image: "assets/stretches/Arm&Wrists/Grip Relaxation Stretch (Beginner).png" }
    ],

    'legs-glutes': [
      { name: "Hamstring Stretch - Standing", howTo: ["Stand with feet hip-width apart", "Place right foot on bench or step", "Hinge forward at hips with straight back", "Feel stretch in back of right thigh", "Hold for 20-30 seconds and switch"], primary: ["Hamstrings"], secondary: ["Lower Back"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Supine Hamstring Positioning.png" },
      { name: "Hamstring Stretch - Lying", howTo: ["Lie on back with legs extended", "Bend right knee and pull toward chest", "Feel stretch in back of right thigh", "Hold for 20-30 seconds", "Switch legs and repeat"], primary: ["Hamstrings"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Supine Hamstring Positioning2.png" },
      { name: "Quadriceps Stretch", howTo: ["Stand on left leg for balance", "Bend right knee and pull right foot toward glute", "Keep knees together", "Feel stretch in front of right thigh", "Hold for 20-30 seconds and switch"], primary: ["Quadriceps"], secondary: ["Hips"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Quadriceps Stretch .png" },
      { name: "Calf Stretch - Wall", howTo: ["Stand facing wall at arm's length", "Place right foot behind you with heel on ground", "Lean forward into wall", "Feel stretch in right calf", "Hold for 20-30 seconds and switch"], primary: ["Calves"], secondary: ["Ankles"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/_Calf Stretch \u2013 Wall.png" },
      { name: "Glute Stretch - Lying", howTo: ["Lie on back with knees bent", "Cross right ankle over left knee", "Pull left knee toward chest", "Feel stretch in right glute", "Hold for 20-30 seconds and switch"], primary: ["Glutes"], secondary: ["Hips"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Glute Stretch \u2013 Lying.png" },
      { name: "Glute Stretch - Pigeon Pose", howTo: ["Start on hands and knees", "Bring right knee forward between hands", "Sink hips down gently", "Feel stretch in right glute", "Hold for 20-30 seconds and switch"], primary: ["Glutes"], secondary: ["Hips", "Lower Back"], difficulty: "intermediate", image: "assets/stretches/Legs&Glutes/Glute Stretch \u2013 Pigeon Pose.png" },
      { name: "Child's Pose", howTo: ["Start on hands and knees", "Sink hips back toward heels", "Extend arms forward", "Lower forehead toward floor", "Feel stretch through hips and lower back", "Hold for 30-60 seconds"], primary: ["Hips", "Lower Back"], secondary: ["Glutes", "Spine"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Child’s Pose.png" },
      { name: "Hip Flexor Stretch", howTo: ["Kneel on right knee", "Place left foot in front bent at 90 degrees", "Push hips forward", "Feel stretch in front of right hip", "Hold for 20-30 seconds and switch"], primary: ["Hip Flexors"], secondary: ["Quadriceps"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Hip Flexor Stretch.png" },
      { name: "Calf Stretch - Stairs", howTo: ["Stand on step with toes on edge", "Lower heels below step level", "Hold railing for balance", "Feel deep stretch in calves", "Hold for 20-30 seconds"], primary: ["Calves"], secondary: ["Ankles"], difficulty: "intermediate", image: "assets/stretches/Legs&Glutes/Calf Stretch \u2013 Stairs.png" },
      { name: "Inner Thigh Stretch - Butterfly", howTo: ["Sit upright with soles of feet together", "Gently press knees toward floor", "Keep chest upright", "Feel stretch in inner thighs", "Hold for 30-45 seconds"], primary: ["Inner Thighs"], secondary: ["Hips"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Supine Posterior Chain Relaxation.png" },
      { name: "Outer Thigh Stretch", howTo: ["Sit upright with right leg extended", "Cross left leg over right", "Hug left knee to chest", "Feel stretch in outer left thigh", "Hold for 20-30 seconds and switch"], primary: ["Outer Thighs"], secondary: ["Hips"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Outer Thigh Stretch.png" },
      { name: "Hip Stretch - 90/90 Position", howTo: ["Sit upright with right leg bent across body", "Keep left leg bent to side", "Hinge forward slightly", "Feel stretch in right hip", "Hold for 30-45 seconds and switch"], primary: ["Hips"], secondary: ["Glutes"], difficulty: "intermediate", image: "assets/stretches/Hips&Pelvis/90-90.png" },
      { name: "Glute Stretch - Supine Figure 4", howTo: ["Lie on back with knees bent", "Cross right ankle over left thigh", "Pull left leg toward chest", "Feel deep stretch in right glute", "Hold for 30-45 seconds and switch"], primary: ["Glutes"], secondary: ["Hips"], difficulty: "intermediate", image: "assets/stretches/Legs&Glutes/Supine Glute Positioning.png" },
      { name: "Quad Stretch - Prone", howTo: ["Lie face down", "Bend right knee and bring heel toward glute", "Gently press hips down", "Feel stretch in right quad", "Hold for 20-30 seconds and switch"], primary: ["Quadriceps"], secondary: ["Hip Flexors"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Quad Stretch \u2013 Prone.png" },
      { name: "Hamstring - Supine", howTo: ["Lie on back with one leg straight", "Pull opposite knee to chest", "Feel hamstring stretch down back of thigh", "Use strap if needed for assist", "Hold for 30-45 seconds each leg"], primary: ["Hamstrings"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Standing Lateral Hip Positioning.png" },
      { name: "Standing Hip Flexor Stretch", howTo: ["Stand tall with feet hip-width apart", "Step right foot back into lunge position", "Push hips forward", "Feel stretch in right hip flexors", "Hold for 20-30 seconds and switch"], primary: ["Hip Flexors"], secondary: ["Quadriceps"], difficulty: "beginner", image: "assets/stretches/Legs&Glutes/Standing Hip Flexor Stretch .png" }
    ],

    'hips-pelvis': [
      { name: "Hip Flexor Stretch - Kneeling", howTo: ["Kneel on right knee", "Place left foot in front at 90 degrees", "Push hips forward gently", "Feel stretch in right hip flexor", "Hold for 30-45 seconds and switch"], primary: ["Hip Flexors"], secondary: ["Quadriceps"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Hip Flexor Stretch \u2013 Kneeling .png" },
      { name: "Hip Stretch - Figure 4 Sitting", howTo: ["Sit upright with right ankle crossed over left knee", "Lean forward gently", "Feel stretch in right hip", "Hold for 30-45 seconds and switch"], primary: ["Hips"], secondary: ["Glutes"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Hip Stretch \u2013 Figure 4 Sitting.png" },
      { name: "Glute Stretch - Pigeon Pose", howTo: ["Start on hands and knees", "Bring right knee forward between hands", "Sink hips down gently", "Feel deep stretch in right glute and hip", "Hold for 30-60 seconds and switch"], primary: ["Glutes", "Hips"], secondary: ["Lower Back"], difficulty: "intermediate", image: "assets/stretches/Hips&Pelvis/Glute Stretch \u2013 Pigeon Pose.png" },
      { name: "Butterfly Hip Stretch", howTo: ["Sit upright with soles of feet together", "Gently press knees toward floor", "Keep back straight", "Feel stretch in inner hips", "Hold for 30-60 seconds"], primary: ["Hips"], secondary: ["Inner Thighs"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Butterfly Hip Stretch.png" },
      { name: "Lizard Pose", howTo: ["From lunge position with left foot forward", "Lower down on forearms", "Feel deep hip flexor and groin stretch", "Keep hips low and forward", "Hold for 30-45 seconds and switch"], primary: ["Hip Flexors"], secondary: ["Hips", "Groin"], difficulty: "advanced", image: "assets/stretches/Hips&Pelvis/Lizard Pose .png" },
      { name: "90/90 Hip Stretch", howTo: ["Sit upright with right leg bent across body", "Left leg bent behind you", "Hinge forward gently", "Feel deep hip stretch", "Hold for 30-45 seconds and switch"], primary: ["Hips"], secondary: ["Glutes"], difficulty: "intermediate", image: "assets/stretches/Hips&Pelvis/90-90.png" },
      { name: "Supine Hip Opener", howTo: ["Lie on back with knees bent", "Place right ankle on left knee", "Pull left leg toward chest", "Feel deep glute and hip stretch", "Hold for 30-45 seconds and switch"], primary: ["Hips"], secondary: ["Glutes"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Supine Hip Opener.png" },
      { name: "Sitting Hip Twist", howTo: ["Sit upright on floor", "Bend right knee and place foot outside left knee", "Twist torso to right", "Place left elbow on right knee", "Hold for 20-30 seconds and switch"], primary: ["Hips"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Sitting Hip Twist .png" },
      { name: "Happy Baby Pose", howTo: ["Lie on back with knees bent toward chest", "Grab insides of feet with hands", "Gently press knees toward armpits", "Feel stretch in hips and pelvis", "Hold for 30-45 seconds"], primary: ["Hips"], secondary: ["Lower Back", "Glutes"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Happy Baby Pose.png" },
      { name: "Butterfly Hip Stretch - Wide", howTo: ["Sit upright with soles of feet together", "Gently press knees toward floor", "Keep back straight and lean slightly forward", "Feel deep stretch in inner hips", "Hold for 30-60 seconds"], primary: ["Hips"], secondary: ["Groin", "Inner Thighs"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Butterfly Hip Stretch.png" },
      { name: "Standing Hip Opener", howTo: ["Stand upright with good posture", "Step right leg out to side", "Lean hips toward right", "Feel stretch along left hip", "Hold for 20-30 seconds and switch"], primary: ["Hips"], secondary: ["Outer Thighs"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Standing Hip Opener.png" },
      { name: "Lateral Hip Stretch", howTo: ["Lie on back with knees bent", "Drop both knees to right side", "Keep shoulders on ground", "Feel stretch in left hip", "Hold for 30-45 seconds and switch"], primary: ["Hips"], secondary: ["Obliques"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Lateral Hip Stretch .png" },
      { name: "Frog Pose", howTo: ["Start on hands and knees", "Spread knees wide", "Lower hips toward ground", "Feel deep stretch in inner hips", "Hold for 30-60 seconds"], primary: ["Hips"], secondary: ["Groin", "Inner Thighs"], difficulty: "intermediate", image: "assets/stretches/Hips&Pelvis/Frog Pose.png" },
      { name: "Hip Opener - Supine Twist", howTo: ["Lie on back with knees bent", "Drop right knee toward left side of body", "Look toward right shoulder", "Feel stretch in right hip", "Hold for 30-45 seconds and switch"], primary: ["Hips"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/Hips&Pelvis/Hip Opener \u2013 Supine Twist.png" }
    ],

    'spine-core': [
      { name: "Seated Spinal Twist", howTo: ["Sit upright with legs extended", "Bend right knee and place foot outside left knee", "Wrap left arm around right knee", "Twist to look over right shoulder", "Hold for 20-30 seconds and switch"], primary: ["Spine"], secondary: ["Obliques"], difficulty: "beginner", image: "assets/stretches/Spin&Core/_Seated Spinal Twist .png" },
      { name: "Supine Spinal Twist", howTo: ["Lie on back with knees bent", "Pull right knee across body toward left shoulder", "Keep shoulders on ground", "Feel twist through spine", "Hold for 20-30 seconds and switch"], primary: ["Spine"], secondary: ["Obliques"], difficulty: "beginner", image: "assets/stretches/Spin&Core/Supine Spinal Twist .png" },

      { name: "Thoracic Rotation", howTo: ["Lie on side with knees bent", "Extend top arm across body", "Follow hand with eyes and twist", "Feel rotation in mid-back", "Hold for 20-30 seconds and switch"], primary: ["Spine"], secondary: ["Obliques"], difficulty: "beginner", image: "assets/stretches/Spin&Core/_Thoracic Rotation .png" },
      { name: "Spine Extension Stretch", howTo: ["Lie face down", "Place hands under shoulders", "Push upper body up with arms", "Keep hips on ground", "Feel extension through spine", "Hold for 15-20 seconds"], primary: ["Spine"], secondary: ["Core", "Chest"], difficulty: "intermediate", image: "assets/stretches/Spin&Core/Spine Extension Stretch .png" },
      { name: "Spine Flexion Stretch", howTo: ["Stand upright", "Slowly fold forward at hips", "Let arms hang toward ground", "Let gravity stretch spine", "Hold for 20-30 seconds"], primary: ["Spine"], secondary: ["Back", "Hamstrings"], difficulty: "beginner", image: "assets/stretches/Spin&Core/Spine Flexion Stretch .png" },
      { name: "Thoracic Extension Foam Roll", howTo: ["Place foam roller across mid-back", "Lie back with support", "Let gravity extend thoracic spine", "Move roller up/down spine slowly", "Hold 30 seconds at each position"], primary: ["Spine"], secondary: ["Core"], difficulty: "intermediate", image: "assets/stretches/Spin&Core/Thoracic Extension Foam Roll .png" },
      { name: "Standing Spine Extension", howTo: ["Stand with feet hip-width apart", "Place hands behind head", "Gently arch backward", "Feel extension through spine", "Hold for 15-20 seconds"], primary: ["Spine"], secondary: ["Core", "Chest"], difficulty: "beginner", image: "assets/stretches/Spin&Core/Standing Spine Extension.png" },
      { name: "Kneeling Spine Twist", howTo: ["Kneel upright with knees hip-width apart", "Place right hand behind head", "Twist torso to right gently", "Feel rotation through entire spine", "Hold for 20-30 seconds and switch"], primary: ["Spine"], secondary: ["Obliques"], difficulty: "intermediate", image: "assets/stretches/Spin&Core/_Kneeling Spine Twist.png" },
      { name: "Lumbar Rotation", howTo: ["Lie on back with knees bent", "Keep knees together", "Drop legs to right side", "Feel rotation in lower spine", "Hold for 20-30 seconds and switch"], primary: ["Spine"], secondary: ["Core", "Obliques"], difficulty: "beginner", image: "assets/stretches/Spin&Core/Lumbar Rotation.png" },
      { name: "Thoracic Mobility Twist", howTo: ["On hands and knees with neutral spine", "Thread right arm under body toward left", "Rotate upper back", "Feel thoracic rotation", "Hold for 15-20 seconds and switch"], primary: ["Spine"], secondary: ["Core"], difficulty: "intermediate", image: "assets/stretches/Spin&Core/_Thoracic Rotation .png" },
      { name: "Four-Quadrant Spine Stretch", howTo: ["Stand with feet hip-width apart", "Slowly fold forward (flexion)", "Return to center, then twist right (rotation)", "Then lean right (lateral flexion)", "Then arch backward (extension)", "Repeat 2-3 times"], primary: ["Spine"], secondary: ["Core"], difficulty: "intermediate", image: "assets/stretches/Spin&Core/Four-Quadrant Spine Stretch.png" },
      { name: "Prone Sphinx Pose", howTo: ["Lie face down", "Place forearms on ground under shoulders", "Push chest up gently", "Keep hips on ground", "Feel extension in lumbar spine", "Hold for 20-30 seconds"], primary: ["Spine"], secondary: ["Core"], difficulty: "beginner", image: "assets/stretches/Spin&Core/Prone Sphinx Pose .png" },
      { name: "Quadruped Back Extension", howTo: ["Start on hands and knees", "Lower chest between hands slowly", "Feel gentle back extension", "Keep hips high", "Hold for 15-20 seconds"], primary: ["Spine"], secondary: ["Back"], difficulty: "beginner", image: "assets/stretches/Spin&Core/Quadruped Back Extension.png" }
    ]
  },

  stretching: [
    // NECK & SHOULDERS
    { name: "Neck Stretch - Forward", howTo: ["Sit upright with good posture", "Slowly bring chin toward chest", "Feel gentle stretch in back of neck", "Hold for 20-30 seconds", "Return to center and repeat"], primary: ["Neck"], secondary: ["Upper Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Stretch – Forward.png" },
    { name: "Neck Stretch - Side", howTo: ["Sit upright with shoulders relaxed", "Tilt right ear toward right shoulder", "Feel stretch on left side of neck", "Hold for 20-30 seconds", "Switch sides and repeat"], primary: ["Neck"], secondary: ["Trapezius"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Stretch – Side.png" },
    { name: "Neck Stretch - Rotation", howTo: ["Sit with good posture", "Slowly turn head to look over right shoulder", "Feel gentle twist in neck", "Hold for 20-30 seconds", "Repeat on opposite side"], primary: ["Neck"], secondary: ["Upper Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Neck Stretch – Rotation.png" },
    { name: "Shoulder Shrug Hold", howTo: ["Stand or sit upright", "Shrug both shoulders up toward ears", "Hold for 3-5 seconds at top", "Relax shoulders completely downward", "Repeat 10-12 times"], primary: ["Shoulders"], secondary: ["Trapezius", "Neck"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Shoulder Shrug Hold.png" },
    { name: "Cross-Body Shoulder Stretch", howTo: ["Stand or sit upright", "Bring right arm across body", "Use left hand to pull right elbow toward chest", "Feel stretch in right shoulder", "Hold for 20-30 seconds and switch"], primary: ["Shoulders"], secondary: ["Chest"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Cross-Body Shoulder Stretch .png" },
    { name: "Shoulder Rolls", howTo: ["Stand with arms at sides", "Roll shoulders backward in circular motion", "Complete 10 backward rolls", "Reverse direction and complete 10 forward rolls", "Breathe steadily throughout"], primary: ["Shoulders"], secondary: ["Neck", "Upper Back"], difficulty: "beginner", image: "assets/stretches/Neck&Shoulder/Shoulder Rolls – Forward.png" }
  ]

};

// Auto-generate slugs for all exercises
applySlugToExercises(window.LOCAL_EXERCISES);
// Expand concise instructions into detailed, beginner-friendly coaching cues
enrichExercisesWithDetails(window.LOCAL_EXERCISES);

console.log('Slugs applied to all exercises');
