/* ===============================
   RECOMMENDATIONS UI DISPLAY
================================ */

console.log('RECOMMENDATIONS-UI.JS LOADED');

/**
 * Render smart recommendations on dashboard/profile screen
 */
function renderSmartRecommendations(username) {
  const container = document.getElementById('smartRecommendationsContainer');
  if (!container) {
    console.warn('smartRecommendationsContainer not found');
    return;
  }

  const recommendations = generateDashboardRecommendations(username);
  if (!recommendations) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Complete more workouts to see personalized recommendations!</p>';
    return;
  }

  const muscleRec = getMuscleGroupRecommendationWithReason(username);
  const newExercises = recommendations.newExercises;
  const timing = getOptimalWorkoutTime(username);
  const warnings = getImbalanceWarnings(username);

  let html = '<div class="recommendations-grid">';

  // Distribution Overview
  html += renderMuscleGroupDistribution(recommendations.distribution);

  // Main Recommendation
  if (muscleRec) {
    html += `
      <div class="recommendation-card recommendation-main">
        <h3>📊 Recommended Today</h3>
        <div class="recommendation-content">
          <div class="muscle-emoji">${getMuscleEmoji(muscleRec.muscle)}</div>
          <h4 style="text-transform: capitalize; margin: 10px 0;">${muscleRec.muscle} Day</h4>
          <p class="recommendation-reason">${muscleRec.reason}</p>
          ${muscleRec.daysSince ? `<p class="recommendation-detail">Last workout: ${muscleRec.daysSince} days ago</p>` : ''}
          <button class="primary-btn recommendation-btn" onclick="selectMuscleFromRecommendation('${muscleRec.muscle}')">
            Try ${capitalizeFirstLetter(muscleRec.muscle)} →
          </button>
        </div>
      </div>
    `;
  }

  // New Exercises to Try
  if (newExercises.length > 0) {
    html += '<div class="recommendation-card">';
    html += '<h3>🆕 Try Something New</h3>';
    html += '<div class="new-exercises-list">';
    
    newExercises.slice(0, 2).forEach(suggestion => {
      html += `
        <div class="new-exercise-item">
          <div class="exercise-header">
            <span class="exercise-icon">${getMuscleEmoji(suggestion.muscle)}</span>
            <span class="exercise-name">${suggestion.name}</span>
          </div>
          <p class="exercise-muscle">New in: ${capitalizeFirstLetter(suggestion.muscle)}</p>
          <button class="secondary-btn" onclick="selectExerciseFromRecommendation('${suggestion.muscle}', '${suggestion.name}')">
            View Exercise →
          </button>
        </div>
      `;
    });
    
    html += '</div></div>';
  }

  // Workout Timing
  if (timing) {
    html += `
      <div class="recommendation-card timing-card">
        <h3>⏰ Your Best Time</h3>
        <div class="timing-content">
          <div class="timing-display">${timing.displayTime}</div>
          <p>${timing.message}</p>
        </div>
      </div>
    `;
  }

  // Imbalance Warnings
  if (warnings.length > 0) {
    html += '<div class="recommendation-card warnings-card">';
    html += '<h3>⚠️ Training Balance</h3>';
    warnings.forEach(warning => {
      const warningClass = warning.level === 'warning' ? 'warning-high' : 'warning-info';
      html += `
        <div class="warning-item ${warningClass}">
          <p>${warning.message}</p>
        </div>
      `;
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Render muscle group distribution chart
 */
function renderMuscleGroupDistribution(distribution) {
  const sortedMuscles = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  let html = '<div class="recommendation-card distribution-card">';
  html += '<h3>📈 Your Workout Distribution</h3>';
  html += '<div class="distribution-chart">';

  sortedMuscles.forEach(([muscle, percentage]) => {
    const status = getMuscleGroupStatus(window.currentUser, muscle);
    const statusEmoji = getStatusEmoji(status);
    const barColor = getBarColor(status);

    html += `
      <div class="distribution-item">
        <div class="distribution-label">
          <span class="status-emoji">${statusEmoji}</span>
          <span class="muscle-name">${capitalizeFirstLetter(muscle)}</span>
        </div>
        <div class="distribution-bar-container">
          <div class="distribution-bar" style="width: ${percentage}%; background: ${barColor};"></div>
          <span class="distribution-percent">${percentage}%</span>
        </div>
      </div>
    `;
  });

  html += '</div></div>';
  return html;
}

/**
 * Render progression ready exercises on a card
 */
function renderProgressionSuggestions(username) {
  const container = document.getElementById('progressionSuggestionsContainer');
  if (!container) return;

  const progressionReady = getProgressionReadyExercises(username);
  
  if (progressionReady.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Keep completing exercises to unlock progression suggestions!</p>';
    return;
  }

  let html = '<div class="progression-list">';

  progressionReady.forEach(prog => {
    html += `
      <div class="progression-item">
        <div class="progression-header">
          <span class="progression-icon">📈</span>
          <span class="progression-name">${prog.exercise}</span>
        </div>
        <div class="progression-stats">
          <p>Completions: <strong>${prog.completions}</strong></p>
          <p>Average Reps: <strong>${prog.avgReps}</strong></p>
        </div>
        <div class="progression-message">
          <p>🚀 Ready to upgrade difficulty!</p>
          <p>Try: ${prog.lastDifficulty === 'light' ? 'Medium difficulty or add weight' : 'Heavy difficulty'}</p>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Helper functions
 */
function getMuscleEmoji(muscle) {
  const emojis = {
    chest: '🫀',
    shoulders: '💪',
    back: '🔙',
    biceps: '💪',
    triceps: '💪',
    legs: '🦵',
    abs: '⚙️',
    core: '🎯',
    traps: '🏋️'
  };
  return emojis[muscle] || '💪';
}

function getStatusEmoji(status) {
  const emojis = {
    'balanced': '🟢',
    'favorite': '⭐',
    'needs-attention': '🟡',
    'never-tried': '🆕'
  };
  return emojis[status] || '•';
}

function getBarColor(status) {
  const colors = {
    'balanced': 'rgba(16, 185, 129, 0.8)',
    'favorite': 'rgba(212, 175, 55, 0.9)',
    'needs-attention': 'rgba(255, 193, 7, 0.7)',
    'never-tried': 'rgba(100, 100, 100, 0.5)'
  };
  return colors[status] || 'rgba(0, 212, 255, 0.7)';
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Click handlers
 */
function selectMuscleFromRecommendation(muscle) {
  window.selectedMuscle = muscle;
  showScreen('exerciseScreen');
  loadExercisesForMuscle(muscle);
  showAlert('Success', `Loading ${capitalizeFirstLetter(muscle)} exercises!`);
}

function selectExerciseFromRecommendation(muscle, exerciseName) {
  window.selectedMuscle = muscle;
  showScreen('exerciseScreen');
  loadExercisesForMuscle(muscle);
  
  setTimeout(() => {
    const exerciseCards = document.querySelectorAll('.exercise-card');
    for (let card of exerciseCards) {
      if (card.textContent.includes(exerciseName)) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.6)';
        setTimeout(() => card.style.boxShadow = '', 3000);
        break;
      }
    }
  }, 300);
}

console.log('✅ Recommendations UI ready');
