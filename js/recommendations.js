/* ===============================
   SMART RECOMMENDATIONS & ADAPTIVE DIFFICULTY
   Phase 1: Learning Preferences + Balanced Suggestions
   Phase 2: Adaptive Difficulty Progression
   Phase 3: Optimal Workout Timing
================================ */

console.log('RECOMMENDATIONS.JS LOADED');

/**
 * Get user's muscle group distribution
 * Returns: { chest: 45%, back: 20%, ... }
 */
function getMuscleGroupDistribution(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user || !user.workoutHistory || user.workoutHistory.length === 0) {
    return null;
  }

  const muscleCount = {};
  const MUSCLE_GROUPS = ['chest', 'shoulders', 'back', 'biceps', 'triceps', 'legs', 'abs', 'core', 'traps'];
  
  // Initialize counts
  MUSCLE_GROUPS.forEach(m => muscleCount[m] = 0);

  // Count workouts per muscle group
  user.workoutHistory.forEach(workout => {
    if (workout.muscleGroups && Array.isArray(workout.muscleGroups)) {
      workout.muscleGroups.forEach(muscle => {
        const lowerMuscle = muscle.toLowerCase();
        if (muscleCount.hasOwnProperty(lowerMuscle)) {
          muscleCount[lowerMuscle]++;
        }
      });
    }
  });

  const total = Object.values(muscleCount).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  // Calculate percentages
  const distribution = {};
  MUSCLE_GROUPS.forEach(m => {
    distribution[m] = Math.round((muscleCount[m] / total) * 100);
  });

  return distribution;
}

/**
 * Get exercises user hasn't tried yet
 */
function getUntriedExercises(username, muscle) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  const triedExercises = new Set();
  
  if (user && user.workoutHistory) {
    user.workoutHistory.forEach(workout => {
      if (workout.exercises) {
        workout.exercises.forEach(ex => {
          triedExercises.add(ex.name || ex);
        });
      }
    });
  }

  const muscleExercises = window.LOCAL_EXERCISES?.[muscle] || [];
  return muscleExercises.filter(ex => !triedExercises.has(ex.name));
}

/**
 * Get recommended muscle group for balanced training
 */
function getRecommendedMuscleGroup(username) {
  const distribution = getMuscleGroupDistribution(username);
  if (!distribution) return null;

  // Find muscle group with lowest percentage
  let lowestMuscle = null;
  let lowestPercentage = 101;

  Object.entries(distribution).forEach(([muscle, percentage]) => {
    if (percentage < lowestPercentage && percentage < 15) { // Less than 15% is "needs attention"
      lowestPercentage = percentage;
      lowestMuscle = muscle;
    }
  });

  return lowestMuscle;
}

/**
 * Get exercises to try for variety
 */
function getNewExerciseSuggestions(username) {
  const MUSCLE_GROUPS = ['chest', 'shoulders', 'back', 'biceps', 'triceps', 'legs', 'abs', 'core', 'traps'];
  const suggestions = [];

  MUSCLE_GROUPS.forEach(muscle => {
    const untried = getUntriedExercises(username, muscle);
    if (untried.length > 0) {
      const randomExercise = untried[Math.floor(Math.random() * untried.length)];
      suggestions.push({
        muscle: muscle,
        exercise: randomExercise,
        name: randomExercise.name
      });
    }
  });

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

/**
 * Get muscle group health status
 * Returns: 'balanced', 'favorite', 'needs-attention', 'never-tried'
 */
function getMuscleGroupStatus(username, muscle) {
  const distribution = getMuscleGroupDistribution(username);
  if (!distribution) return 'never-tried';

  const percentage = distribution[muscle] || 0;

  if (percentage === 0) return 'never-tried';
  if (percentage > 40) return 'favorite';
  if (percentage < 15) return 'needs-attention';
  return 'balanced';
}

/**
 * Track exercise difficulty progression
 * Call this when user completes an exercise
 */
function trackExerciseProgression(username, muscle, exerciseName, repsCompleted, difficulty = 'light') {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) return;

  if (!user.exerciseProgression) {
    user.exerciseProgression = {};
  }

  const key = `${muscle}_${exerciseName}`;
  
  if (!user.exerciseProgression[key]) {
    user.exerciseProgression[key] = {
      muscle: muscle,
      exercise: exerciseName,
      completions: 0,
      totalReps: 0,
      avgReps: 0,
      lastDifficulty: difficulty,
      progressionReady: false
    };
  }

  const progression = user.exerciseProgression[key];
  progression.completions++;
  progression.totalReps += repsCompleted || 0;
  progression.avgReps = Math.round(progression.totalReps / progression.completions);
  progression.lastDifficulty = difficulty;

  // Check if ready for progression (5+ completions at same difficulty)
  if (progression.completions >= 5 && progression.lastDifficulty === 'light') {
    progression.progressionReady = true;
  }

  saveUsers(users);
  console.log(`Tracked progression for ${exerciseName}:`, progression);
}

/**
 * Get exercise progression status
 */
function getExerciseProgression(username, muscle, exerciseName) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user?.exerciseProgression) return null;

  const key = `${muscle}_${exerciseName}`;
  return user.exerciseProgression[key] || null;
}

/**
 * Get exercises ready for difficulty upgrade
 */
function getProgressionReadyExercises(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user?.exerciseProgression) return [];

  return Object.values(user.exerciseProgression)
    .filter(prog => prog.progressionReady && prog.completions >= 5)
    .slice(0, 5);
}

/**
 * Get last workout date
 */
function getLastWorkoutDate(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user?.workoutHistory || user.workoutHistory.length === 0) {
    return null;
  }

  const lastWorkout = user.workoutHistory[user.workoutHistory.length - 1];
  return new Date(lastWorkout.date);
}

/**
 * Get days since last workout for specific muscle group
 */
function getDaysSinceLastMuscleGroupWorkout(username, muscle) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user?.workoutHistory) return null;

  for (let i = user.workoutHistory.length - 1; i >= 0; i--) {
    const workout = user.workoutHistory[i];
    if (workout.muscleGroups && workout.muscleGroups.map(m => m.toLowerCase()).includes(muscle.toLowerCase())) {
      const lastDate = new Date(workout.date);
      const today = new Date();
      return Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    }
  }

  return null;
}

/**
 * Generate dashboard recommendations
 */
function generateDashboardRecommendations(username) {
  const distribution = getMuscleGroupDistribution(username);
  if (!distribution) return null;

  const recommendedMuscle = getRecommendedMuscleGroup(username);
  const newExercises = getNewExerciseSuggestions(username);
  const progressionReady = getProgressionReadyExercises(username);

  return {
    distribution: distribution,
    recommendedMuscle: recommendedMuscle,
    newExercises: newExercises,
    progressionReady: progressionReady,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get muscle group recommendation with reasoning
 */
function getMuscleGroupRecommendationWithReason(username) {
  const distribution = getMuscleGroupDistribution(username);
  if (!distribution) return null;

  const recommended = getRecommendedMuscleGroup(username);
  if (!recommended) return null;

  const daysSince = getDaysSinceLastMuscleGroupWorkout(username, recommended);
  const percentage = distribution[recommended];

  let reason = '';
  if (percentage === 0) {
    reason = `You haven't trained ${recommended} yet. Diversify your routine!`;
  } else if (daysSince && daysSince > 10) {
    reason = `It's been ${daysSince} days since your last ${recommended} workout. Time for balance!`;
  } else {
    reason = `You focus on ${Object.entries(distribution).find(e => e[1] === Math.max(...Object.values(distribution)))[0]} ${Math.max(...Object.values(distribution))}% of the time. Build balance with ${recommended}.`;
  }

  return {
    muscle: recommended,
    percentage: percentage,
    reason: reason,
    daysSince: daysSince
  };
}

/**
 * Get imbalance warnings
 */
function getImbalanceWarnings(username) {
  const distribution = getMuscleGroupDistribution(username);
  if (!distribution) return [];

  const warnings = [];
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  if (entries[0][1] > 50) {
    warnings.push({
      level: 'warning',
      message: `You focus on ${entries[0][0]} ${entries[0][1]}% of the time. Risk of imbalance and injury.`,
      muscle: entries[0][0],
      percentage: entries[0][1]
    });
  }

  if (entries[entries.length - 1][1] === 0) {
    warnings.push({
      level: 'info',
      message: `You haven't tried ${entries[entries.length - 1][0]} yet. Add it to your routine!`,
      muscle: entries[entries.length - 1][0],
      percentage: 0
    });
  }

  return warnings;
}

/**
 * Calculate workout timing pattern
 * Phase 3: Optimal workout timing
 */
function getOptimalWorkoutTime(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user?.workoutHistory || user.workoutHistory.length < 5) {
    return null; // Need at least 5 workouts to identify pattern
  }

  const hourCounts = {};
  
  user.workoutHistory.forEach(workout => {
    const hour = new Date(workout.date).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const mostCommonHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (!mostCommonHour) return null;

  const hour = mostCommonHour[0];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return {
    hour: parseInt(hour),
    displayTime: `${displayHour}:00 ${ampm}`,
    frequency: mostCommonHour[1],
    message: `You typically work out around ${displayHour}:00 ${ampm}. Consistency tip: Your best performance is in the ${ampm}!`
  };
}

console.log('✅ Recommendations module ready');
