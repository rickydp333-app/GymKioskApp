/* =========================================
   ANALYTICS & WORKOUT HISTORY
========================================= */

console.log('ANALYTICS.JS LOADED');

// Track a completed workout
function recordWorkout(muscleGroups, exercises, durationMinutes, completionDate) {
  if (!window.currentUser || window.currentUser === 'guest') {
    console.warn('ANALYTICS: Cannot record workout for guest user');
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.username === window.currentUser);
  if (!user) return;

  // Initialize workout history if not present
  if (!user.workoutHistory) {
    user.workoutHistory = [];
  }

  // Create workout record
  const completedAt = completionDate ? new Date(`${completionDate}T12:00:00`) : new Date();
  const workout = {
    date: Number.isNaN(completedAt.getTime()) ? new Date().toISOString() : completedAt.toISOString(),
    duration: durationMinutes || 30,
    muscleGroups: muscleGroups || [],
    exercises: exercises || [],
    completed: true
  };

  user.workoutHistory.push(workout);
  saveUsers(users);

  // Update streaks and badges
  updateUserStreak(user);
  checkAndAwardBadges(user);

  console.log('✅ Workout recorded:', workout);
}

// Get user's workout history
function getWorkoutHistory(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (!user || !user.workoutHistory) return [];
  return user.workoutHistory;
}

// Get total workouts count
function getTotalWorkouts(username) {
  return getWorkoutHistory(username).length;
}

// Get workouts this month
function getMonthWorkouts(username) {
  const history = getWorkoutHistory(username);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return history.filter(w => new Date(w.date) >= startOfMonth);
}

// Get favorite muscle groups
function getFavoriteMuscleGroups(username) {
  const history = getWorkoutHistory(username);
  const muscleCount = {};

  history.forEach(workout => {
    if (workout.muscleGroups) {
      workout.muscleGroups.forEach(muscle => {
        muscleCount[muscle] = (muscleCount[muscle] || 0) + 1;
      });
    }
  });

  // Sort by frequency
  return Object.entries(muscleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => ({ muscle: entry[0], count: entry[1] }));
}

// Get average workout duration
function getAverageWorkoutDuration(username) {
  const history = getWorkoutHistory(username);
  if (history.length === 0) return 0;

  const total = history.reduce((sum, w) => sum + (w.duration || 30), 0);
  return Math.round(total / history.length);
}

// Get most popular exercises for user
function getMostPopularExercises(username, limit = 5) {
  const history = getWorkoutHistory(username);
  const exerciseCount = {};

  history.forEach(workout => {
    if (workout.exercises) {
      workout.exercises.forEach(exercise => {
        exerciseCount[exercise] = (exerciseCount[exercise] || 0) + 1;
      });
    }
  });

  return Object.entries(exerciseCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(entry => ({ exercise: entry[0], count: entry[1] }));
}

// Get workout streak (consecutive days)
function getUserStreak(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  return user?.currentStreak || 0;
}

// Update streak based on workout history
function updateUserStreak(user) {
  if (!user.workoutHistory || user.workoutHistory.length === 0) {
    user.currentStreak = 0;
    return;
  }

  // Sort workouts by date (most recent first)
  const sortedWorkouts = [...user.workoutHistory].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  let streak = 0;
  let lastDate = null;

  for (const workout of sortedWorkouts) {
    const workoutDate = new Date(workout.date);
    const workoutDateOnly = new Date(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());

    if (lastDate === null) {
      // First workout in the streak
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const daysDiff = Math.floor((todayOnly - workoutDateOnly) / (1000 * 60 * 60 * 24));

      // If workout was today or yesterday, start streak
      if (daysDiff <= 1) {
        streak = 1;
        lastDate = workoutDateOnly;
      } else {
        break;
      }
    } else {
      // Check if this workout was the day before last one
      const daysDiff = Math.floor((lastDate - workoutDateOnly) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        streak++;
        lastDate = workoutDateOnly;
      } else {
        break;
      }
    }
  }

  user.currentStreak = streak;
}

// Calculate analytics summary
function getAnalyticsSummary(username) {
  const history = getWorkoutHistory(username);
  
  return {
    totalWorkouts: getTotalWorkouts(username),
    thisMonth: getMonthWorkouts(username).length,
    averageDuration: getAverageWorkoutDuration(username),
    currentStreak: getUserStreak(username),
    favoriteMuscles: getFavoriteMuscleGroups(username),
    topExercises: getMostPopularExercises(username),
    badges: getBadges(username)
  };
}

// Get workouts from past N days
function getWorkoutsFromPastDays(username, days) {
  const history = getWorkoutHistory(username);
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days);

  return history.filter(w => new Date(w.date) >= pastDate);
}
