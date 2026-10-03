/* =========================================
   GAMIFICATION - STREAKS & BADGES
========================================= */

console.log('GAMIFICATION.JS LOADED');

// Badge definitions
const BADGES = {
  firstWorkout: {
    id: 'firstWorkout',
    name: 'First Step',
    description: 'Complete your first workout',
    icon: '🎯',
    condition: (stats) => stats.totalWorkouts >= 1
  },
  tenWorkouts: {
    id: 'tenWorkouts',
    name: 'Getting Started',
    description: 'Complete 10 workouts',
    icon: '💪',
    condition: (stats) => stats.totalWorkouts >= 10
  },
  fiftyWorkouts: {
    id: 'fiftyWorkouts',
    name: 'Fitness Enthusiast',
    description: 'Complete 50 workouts',
    icon: '🔥',
    condition: (stats) => stats.totalWorkouts >= 50
  },
  hundredWorkouts: {
    id: 'hundredWorkouts',
    name: 'Legendary',
    description: 'Complete 100 workouts',
    icon: '👑',
    condition: (stats) => stats.totalWorkouts >= 100
  },
  weekStreak: {
    id: 'weekStreak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🏆',
    condition: (stats) => stats.currentStreak >= 7
  },
  monthStreak: {
    id: 'monthStreak',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '⭐',
    condition: (stats) => stats.currentStreak >= 30
  },
  completedBack: {
    id: 'completedBack',
    name: 'Back in Action',
    description: 'Complete a back workout',
    icon: '🔙',
    condition: (stats) => stats.favoriteMuscles?.some(m => m.muscle === 'back')
  },
  completedLegs: {
    id: 'completedLegs',
    name: 'Leg Day Champion',
    description: 'Complete a leg workout',
    icon: '🦵',
    condition: (stats) => stats.favoriteMuscles?.some(m => m.muscle === 'legs')
  },
  quickWorkout: {
    id: 'quickWorkout',
    name: 'Speed Demon',
    description: 'Complete a workout in under 20 minutes',
    icon: '⚡',
    condition: (stats) => stats.averageDuration < 20 && stats.totalWorkouts >= 1
  },
  marathonWorkout: {
    id: 'marathonWorkout',
    name: 'Endurance King',
    description: 'Complete a 60+ minute workout',
    icon: '⏱️',
    condition: (stats) => stats.totalWorkouts > 0 && stats.averageDuration >= 60
  },
  fullBody: {
    id: 'fullBody',
    name: 'Full Body Master',
    description: 'Complete workouts in all 9 muscle groups',
    icon: '🌟',
    condition: (stats) => stats.favoriteMuscles && stats.favoriteMuscles.length >= 3
  }
};

// Get user's badges
function getBadges(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  return user?.badges || [];
}

// Check and award new badges
function checkAndAwardBadges(user) {
  if (!user.badges) {
    user.badges = [];
  }

  // Get current stats
  const stats = {
    totalWorkouts: user.workoutHistory?.length || 0,
    currentStreak: user.currentStreak || 0,
    averageDuration: getAverageWorkoutDuration(user.username),
    favoriteMuscles: getFavoriteMuscleGroups(user.username)
  };

  // Check each badge
  Object.values(BADGES).forEach(badge => {
    // Check if user already has this badge
    const hasBadge = user.badges.some(b => b.id === badge.id);
    
    // Award badge if condition is met and user doesn't have it
    if (!hasBadge && badge.condition(stats)) {
      user.badges.push({
        id: badge.id,
        name: badge.name,
        icon: badge.icon,
        earnedDate: new Date().toISOString()
      });

      console.log('🏆 Badge earned:', badge.name);
    }
  });
}

// Get badge display data
function getBadgeDisplayData(badgeId) {
  return BADGES[badgeId];
}

// Get all available badges
function getAllBadges() {
  return Object.values(BADGES);
}

// Get earned badges for user
function getEarnedBadges(username) {
  return getBadges(username).map(badge => ({
    ...BADGES[badge.id],
    earnedDate: badge.earnedDate
  }));
}

// Get progress toward specific badge
function getBadgeProgress(username, badgeId) {
  const badge = BADGES[badgeId];
  if (!badge) return null;

  const stats = {
    totalWorkouts: getTotalWorkouts(username),
    currentStreak: getUserStreak(username),
    averageDuration: getAverageWorkoutDuration(username),
    favoriteMuscles: getFavoriteMuscleGroups(username)
  };

  const hasEarned = getBadges(username).some(b => b.id === badgeId);

  // Return progress based on badge type
  let progress = 0;
  let target = 0;

  if (badgeId === 'tenWorkouts') {
    progress = stats.totalWorkouts;
    target = 10;
  } else if (badgeId === 'fiftyWorkouts') {
    progress = stats.totalWorkouts;
    target = 50;
  } else if (badgeId === 'hundredWorkouts') {
    progress = stats.totalWorkouts;
    target = 100;
  } else if (badgeId === 'weekStreak') {
    progress = stats.currentStreak;
    target = 7;
  } else if (badgeId === 'monthStreak') {
    progress = stats.currentStreak;
    target = 30;
  }

  return {
    badge: badge,
    progress: Math.min(progress, target),
    target: target,
    earned: hasEarned,
    percentage: Math.round((Math.min(progress, target) / target) * 100)
  };
}

// Get all badge progress
function getAllBadgeProgress(username) {
  return Object.keys(BADGES).map(badgeId => getBadgeProgress(username, badgeId));
}

// Format streak display
function getStreakDisplay(streak) {
  if (streak === 0) return 'No active streak';
  if (streak === 1) return '1 day streak 🔥';
  if (streak >= 30) return `${streak} days - Month Master! ⭐`;
  if (streak >= 7) return `${streak} days - Week Warrior! 🏆`;
  return `${streak} days 💪`;
}

// Get motivational message based on stats
function getMotivationalMessage(username) {
  const stats = getAnalyticsSummary(username);
  
  if (stats.currentStreak === 0) {
    return "Time to start a new streak! Get moving! 🚀";
  } else if (stats.currentStreak === 1) {
    return "Great start! Keep it going! 🔥";
  } else if (stats.currentStreak >= 7 && stats.currentStreak < 30) {
    return `Amazing ${stats.currentStreak} day streak! Don't break it! 💪`;
  } else if (stats.currentStreak >= 30) {
    return `LEGENDARY! ${stats.currentStreak} day streak! 👑`;
  } else if (stats.totalWorkouts === 0) {
    return "Let's get started! Complete your first workout! 🎯";
  } else {
    return `You've completed ${stats.totalWorkouts} workouts! Keep crushing it! 💯`;
  }
}
