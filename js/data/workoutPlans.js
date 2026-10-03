/* =========================================
   WORKOUT PLANS – LOGIC DATA
   ========================================= */

window.WORKOUT_PLANS = {

  muscle_gain: {
    beginner: {
      short: {
        name: "Full Body – Beginner",
        exercises: ["Push-Up", "Squat", "Dumbbell Press", "Lat Pulldown", "Plank"]
      },
      medium: {
        name: "Upper / Lower Split",
        exercises: ["Bench Press", "Leg Press", "Seated Row", "Shoulder Press", "Calf Raise", "Crunch"]
      },
      long: {
        name: "Push / Pull",
        exercises: ["Bench Press", "Incline Dumbbell Press", "Pull-Up", "Barbell Row", "Plank"]
      }
    },

    intermediate: {
      short: {
        name: "Upper Body Focus",
        exercises: ["Bench Press", "Dumbbell Press", "Lat Pulldown", "Biceps Curl", "Triceps Pushdown"]
      },
      medium: {
        name: "Push / Pull",
        exercises: ["Bench Press", "Shoulder Press", "Pull-Up", "Barbell Row", "Face Pull"]
      },
      long: {
        name: "Push / Pull / Legs",
        exercises: ["Bench Press", "Incline Dumbbell Press", "Squat", "Romanian Deadlift", "Pull-Up"]
      }
    }
  },

  fat_loss: {
    beginner: {
      short: {
        name: "Full Body Circuit",
        exercises: ["Push-Up", "Bodyweight Squat", "Mountain Climbers", "Plank"]
      },
      medium: {
        name: "Conditioning Circuit",
        exercises: ["Kettlebell Squat", "Push-Up", "Row Machine", "Jump Rope", "Crunch"]
      },
      long: {
        name: "Full Body Burn",
        exercises: ["Squat", "Push-Up", "Lat Pulldown", "Lunge", "Plank"]
      }
    }
  },

  general_fitness: {
    beginner: {
      short: {
        name: "Balanced Full Body",
        exercises: ["Push-Up", "Leg Press", "Seated Row", "Plank"]
      },
      medium: {
        name: "Upper / Lower",
        exercises: ["Bench Press", "Leg Press", "Shoulder Press", "Crunch"]
      },
      long: {
        name: "Total Body",
        exercises: ["Squat", "Bench Press", "Lat Pulldown", "Shoulder Press", "Plank"]
      }
    }
  },

  strength: {
    intermediate: {
      medium: {
        name: "Strength Upper",
        exercises: ["Bench Press", "Barbell Row", "Overhead Press"]
      },
      long: {
        name: "Strength Push / Pull",
        exercises: ["Bench Press", "Overhead Press", "Pull-Up", "Deadlift"]
      }
    }
  }

};