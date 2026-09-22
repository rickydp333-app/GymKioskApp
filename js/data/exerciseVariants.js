/* ===============================
   EXERCISE VARIANTS
   Power, Hypertrophy, and Rehab
================================ */

window.EXERCISE_VARIANTS = {
  power: {
    label: '⚡ Power',
    icon: '⚡',
    reps: '3-6 reps',
    sets: '4-6 sets',
    tempo: 'Explosive up, controlled down',
    rest: '2-3 minutes',
    weight: '85-95% max',
    focus: 'Explosive strength & athleticism',
    benefits: [
      'Develop maximum power output',
      'Improve athletic performance',
      'Train fast-twitch muscle fibers',
      'Build explosive strength'
    ],
    form: [
      'Move explosively during concentric phase',
      'Control the weight on the way down',
      'Use heavy weight (85%+)',
      'Full recovery between sets',
      'Focus on speed, not range of motion'
    ],
    when: 'Use 1-2x per week, early in workout when fresh'
  },
  hypertrophy: {
    label: '💪 Hypertrophy',
    icon: '💪',
    reps: '8-12 reps',
    sets: '3-4 sets',
    tempo: 'Controlled throughout',
    rest: '60-90 seconds',
    weight: '70-80% max',
    focus: 'Muscle growth & size',
    benefits: [
      'Maximum muscle growth',
      'Pump & metabolic stress',
      'Improved muscle definition',
      'Sustained muscle tension'
    ],
    form: [
      'Slow, controlled movement',
      'Feel the muscle working',
      'Full range of motion',
      'Moderate weight, high reps',
      'Keep tension on muscle'
    ],
    when: 'Main focus for most gym sessions (3-4x per week)'
  },
  rehab: {
    label: '🛌 Rehab',
    icon: '🛌',
    reps: '12-15 reps',
    sets: '2-3 sets',
    tempo: 'Very controlled & slow',
    rest: '45-60 seconds',
    weight: '50-60% max',
    focus: 'Recovery & injury prevention',
    benefits: [
      'Reduce injury risk',
      'Improve movement quality',
      'Build work capacity',
      'Joint-friendly training',
      'Recovery & mobility'
    ],
    form: [
      'Extremely controlled movement',
      'Light weight, focus on form',
      'Full range of motion',
      'Pain-free movement only',
      'Smooth, steady tempo'
    ],
    when: 'Use for recovery days or post-injury rehab'
  }
};

function getExerciseVariantInfo(exerciseName) {
  return {
    exerciseName: exerciseName,
    variants: window.EXERCISE_VARIANTS
  };
}

console.log('EXERCISE VARIANTS LOADED');
