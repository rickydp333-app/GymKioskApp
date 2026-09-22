/* ===============================
   DAILY CHALLENGE DATA
   Rotates based on day of year
================================ */

window.DAILY_CHALLENGES = [
  {
    name: "Burpee Blitz",
    type: "endurance",
    difficulty: "intermediate",
    description: "Complete 100 burpees as fast as possible",
    goal: "Finish in under 15 minutes",
    exercises: [
      { name: "Burpees", reps: "100 total", sets: "As needed" }
    ],
    points: 50,
    tips: [
      "Break into sets of 10-20 when fatigue hits",
      "Focus on steady breathing between sets",
      "Keep your core tight throughout"
    ]
  },
  {
    name: "Pull-Up Gauntlet",
    type: "strength",
    difficulty: "advanced",
    description: "Max out your pull-ups across 5 sets",
    goal: "Complete 5 sets with minimal rest",
    exercises: [
      { name: "Pull-Ups", reps: "Max reps", sets: "5" }
    ],
    points: 75,
    tips: [
      "Rest 2-3 minutes between sets",
      "Use full range of motion",
      "Don't rush - quality over speed"
    ]
  },
  {
    name: "Plank Perfect",
    type: "skill",
    difficulty: "beginner",
    description: "Hold a plank for 3 minutes straight",
    goal: "Complete without breaking form",
    exercises: [
      { name: "Plank Hold", reps: "3 minutes", sets: "1" }
    ],
    points: 30,
    tips: [
      "Keep your body in a straight line",
      "Breathe deeply and steadily",
      "Look at the floor to maintain neck alignment"
    ]
  },
  {
    name: "Leg Day Gauntlet",
    type: "circuit",
    difficulty: "intermediate",
    description: "8 leg exercises with no rest between",
    goal: "Complete all exercises back-to-back",
    exercises: [
      { name: "Squats", reps: "20", sets: "1" },
      { name: "Lunges", reps: "15 each leg", sets: "1" },
      { name: "Wall Sit", reps: "60 seconds", sets: "1" },
      { name: "Jump Squats", reps: "15", sets: "1" },
      { name: "Bulgarian Split Squats", reps: "10 each leg", sets: "1" },
      { name: "Leg Raises", reps: "20", sets: "1" },
      { name: "Calf Raises", reps: "30", sets: "1" },
      { name: "Box Jumps", reps: "10", sets: "1" }
    ],
    points: 60,
    tips: [
      "Keep water nearby",
      "Rest 3-5 minutes after completing the circuit",
      "Scale reps down if needed to finish"
    ]
  },
  {
    name: "AMRAP 20",
    type: "circuit",
    difficulty: "intermediate",
    description: "As Many Rounds As Possible in 20 minutes",
    goal: "Complete as many rounds as you can",
    exercises: [
      { name: "Push-Ups", reps: "10", sets: "—" },
      { name: "Squats", reps: "15", sets: "—" },
      { name: "Sit-Ups", reps: "20", sets: "—" },
      { name: "Mountain Climbers", reps: "30", sets: "—" }
    ],
    points: 55,
    tips: [
      "Track your rounds on paper",
      "Pace yourself - don't burn out early",
      "Minimal rest between exercises"
    ]
  },
  {
    name: "Push-Up Pyramid",
    type: "strength",
    difficulty: "intermediate",
    description: "Pyramid sets: 1, 2, 3, 4, 5, 4, 3, 2, 1",
    goal: "Complete 25 total push-ups in pyramid format",
    exercises: [
      { name: "Push-Ups", reps: "Pyramid: 1-2-3-4-5-4-3-2-1", sets: "9 sets" }
    ],
    points: 45,
    tips: [
      "Rest 10-15 seconds between sets",
      "Maintain perfect form throughout",
      "Chest should touch the ground each rep"
    ]
  },
  {
    name: "Ab Crusher",
    type: "circuit",
    difficulty: "beginner",
    description: "5 core exercises for ultimate burn",
    goal: "Complete all 5 exercises in one go",
    exercises: [
      { name: "Crunches", reps: "25", sets: "1" },
      { name: "Bicycle Crunches", reps: "20 each side", sets: "1" },
      { name: "Leg Raises", reps: "15", sets: "1" },
      { name: "Russian Twists", reps: "30 total", sets: "1" },
      { name: "Plank", reps: "60 seconds", sets: "1" }
    ],
    points: 40,
    tips: [
      "Focus on controlled movements",
      "Breathe out on contraction",
      "Don't pull on your neck"
    ]
  },
  {
    name: "Dumbbell Destroyer",
    type: "strength",
    difficulty: "advanced",
    description: "Full body dumbbell complex",
    goal: "Complete 5 rounds without dropping weights",
    exercises: [
      { name: "Dumbbell Squat to Press", reps: "8", sets: "5" },
      { name: "Dumbbell Row (each arm)", reps: "10", sets: "5" },
      { name: "Dumbbell Deadlift", reps: "12", sets: "5" },
      { name: "Dumbbell Chest Press", reps: "10", sets: "5" }
    ],
    points: 80,
    tips: [
      "Choose a moderate weight you can control",
      "Rest 2-3 minutes between rounds",
      "Focus on form over speed"
    ]
  },
  {
    name: "Cardio Chaos",
    type: "endurance",
    difficulty: "beginner",
    description: "25 minutes of mixed cardio",
    goal: "Keep moving for the full duration",
    exercises: [
      { name: "Jumping Jacks", reps: "2 minutes", sets: "1" },
      { name: "High Knees", reps: "2 minutes", sets: "1" },
      { name: "Butt Kicks", reps: "2 minutes", sets: "1" },
      { name: "Mountain Climbers", reps: "2 minutes", sets: "1" },
      { name: "Burpees", reps: "2 minutes", sets: "1" }
    ],
    points: 50,
    tips: [
      "Repeat the circuit 2-3 times",
      "Take 1 minute rest between circuits",
      "Focus on consistent pace"
    ]
  },
  {
    name: "Iron Core",
    type: "skill",
    difficulty: "intermediate",
    description: "Side plank hold marathon",
    goal: "Hold 2 minutes each side",
    exercises: [
      { name: "Side Plank (Right)", reps: "2 minutes", sets: "1" },
      { name: "Side Plank (Left)", reps: "2 minutes", sets: "1" }
    ],
    points: 45,
    tips: [
      "Keep hips elevated",
      "Stack feet or stagger for balance",
      "Rest 1 minute between sides"
    ]
  },
  {
    name: "Chest Pump",
    type: "strength",
    difficulty: "intermediate",
    description: "100 total push-ups in as few sets as possible",
    goal: "Complete in 10 sets or fewer",
    exercises: [
      { name: "Push-Ups", reps: "100 total", sets: "As needed" }
    ],
    points: 50,
    tips: [
      "Shoot for sets of 10-15",
      "Rest as needed but keep it short",
      "Maintain form throughout"
    ]
  },
  {
    name: "Squat Challenge",
    type: "endurance",
    difficulty: "beginner",
    description: "200 bodyweight squats",
    goal: "Complete all reps with good form",
    exercises: [
      { name: "Bodyweight Squats", reps: "200 total", sets: "As needed" }
    ],
    points: 40,
    tips: [
      "Break into sets of 20-30",
      "Keep chest up and knees tracking over toes",
      "Go to parallel or below"
    ]
  },
  {
    name: "Upper Body Blitz",
    type: "circuit",
    difficulty: "advanced",
    description: "6 exercises targeting chest, back, and arms",
    goal: "Complete 4 rounds",
    exercises: [
      { name: "Pull-Ups", reps: "8", sets: "4" },
      { name: "Dips", reps: "12", sets: "4" },
      { name: "Push-Ups", reps: "15", sets: "4" },
      { name: "Rows", reps: "12", sets: "4" },
      { name: "Bicep Curls", reps: "15", sets: "4" },
      { name: "Tricep Extensions", reps: "15", sets: "4" }
    ],
    points: 85,
    tips: [
      "Rest 90 seconds between rounds",
      "Use challenging weight for curls/extensions",
      "Focus on full range of motion"
    ]
  },
  {
    name: "Wall Sit Endurance",
    type: "skill",
    difficulty: "beginner",
    description: "Hold a wall sit for 5 minutes total",
    goal: "Accumulate 5 minutes across multiple sets",
    exercises: [
      { name: "Wall Sit", reps: "5 minutes total", sets: "As needed" }
    ],
    points: 35,
    tips: [
      "Thighs should be parallel to floor",
      "Keep back flat against wall",
      "Rest 1 minute between attempts"
    ]
  },
  {
    name: "Shoulder Shredder",
    type: "strength",
    difficulty: "intermediate",
    description: "5 shoulder exercises back-to-back",
    goal: "Complete 3 rounds with minimal rest",
    exercises: [
      { name: "Dumbbell Shoulder Press", reps: "12", sets: "3" },
      { name: "Lateral Raises", reps: "15", sets: "3" },
      { name: "Front Raises", reps: "12", sets: "3" },
      { name: "Rear Delt Flyes", reps: "15", sets: "3" },
      { name: "Shrugs", reps: "20", sets: "3" }
    ],
    points: 65,
    tips: [
      "Use moderate weight",
      "Rest 2 minutes between rounds",
      "Control the negative portion"
    ]
  },
  {
    name: "Tabata Terror",
    type: "circuit",
    difficulty: "advanced",
    description: "8 rounds of 20 seconds work, 10 seconds rest",
    goal: "Maximum effort for each interval",
    exercises: [
      { name: "Burpees", reps: "20 sec work", sets: "8" }
    ],
    points: 70,
    tips: [
      "Total time: 4 minutes",
      "Push hard during work intervals",
      "Track total reps across all rounds"
    ]
  },
  {
    name: "Core Stability",
    type: "skill",
    difficulty: "intermediate",
    description: "Isometric core holds",
    goal: "Hold each position for target time",
    exercises: [
      { name: "Plank", reps: "2 minutes", sets: "1" },
      { name: "Side Plank Right", reps: "90 seconds", sets: "1" },
      { name: "Side Plank Left", reps: "90 seconds", sets: "1" },
      { name: "Hollow Body Hold", reps: "60 seconds", sets: "1" }
    ],
    points: 55,
    tips: [
      "Rest 1 minute between holds",
      "Focus on breathing",
      "Maintain proper form"
    ]
  },
  {
    name: "Leg Endurance",
    type: "endurance",
    difficulty: "intermediate",
    description: "Walking lunges across distance",
    goal: "Complete 100 total lunges",
    exercises: [
      { name: "Walking Lunges", reps: "100 (50 each leg)", sets: "As needed" }
    ],
    points: 50,
    tips: [
      "Track in sets of 20",
      "Keep torso upright",
      "Back knee should nearly touch ground"
    ]
  },
  {
    name: "Death by Push-Ups",
    type: "strength",
    difficulty: "advanced",
    description: "Minute 1: 1 push-up, Minute 2: 2 push-ups... until failure",
    goal: "See how many minutes you can last",
    exercises: [
      { name: "Push-Ups", reps: "Increasing", sets: "Until failure" }
    ],
    points: 90,
    tips: [
      "Rest for remainder of each minute",
      "Maintain strict form",
      "Most people fail around minute 10-15"
    ]
  },
  {
    name: "Full Body Burnout",
    type: "circuit",
    difficulty: "intermediate",
    description: "10 exercises, 10 reps each, 10 rounds",
    goal: "Complete all 10 rounds",
    exercises: [
      { name: "Push-Ups", reps: "10", sets: "10" },
      { name: "Squats", reps: "10", sets: "10" },
      { name: "Sit-Ups", reps: "10", sets: "10" },
      { name: "Lunges", reps: "10", sets: "10" },
      { name: "Burpees", reps: "10", sets: "10" },
      { name: "Mountain Climbers", reps: "10", sets: "10" },
      { name: "Plank Shoulder Taps", reps: "10", sets: "10" },
      { name: "Jump Squats", reps: "10", sets: "10" },
      { name: "Bicycle Crunches", reps: "10", sets: "10" },
      { name: "High Knees", reps: "10", sets: "10" }
    ],
    points: 100,
    tips: [
      "This will take 30-45 minutes",
      "Rest as needed but keep moving",
      "Scale reps to 8 or 6 if needed"
    ]
  }
];

console.log('CHALLENGES.JS LOADED - ' + window.DAILY_CHALLENGES.length + ' challenges available');
