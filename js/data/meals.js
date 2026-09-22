/* ===============================
   TRAINING NUTRITION AND FUEL GUIDE DATA
   Goal-based meal suggestions (6 sections per day)
================================ */

window.LOCAL_MEALS = {
  strength: {
    breakfast: [
      { name: 'Eggs + Oats + Berries', focus: '3 whole eggs, 1 cup oats, fresh berries. High protein & carbs for muscle building.' },
      { name: 'Greek Yogurt Bowl', focus: '2 cups Greek yogurt, granola, honey, almonds. Packed with protein & sustained energy.' },
      { name: 'Protein Pancakes', focus: 'Oat flour pancakes with 2 scoops protein powder, topped with peanut butter. Carbs + protein.' }
    ],
    lunch: [
      { name: 'Grilled Chicken & Sweet Potato', focus: '8oz chicken breast, 1 large sweet potato, broccoli. Classic strength-building meal.' },
      { name: 'Lean Beef & Rice', focus: '6-8oz lean ground beef, 1.5 cups brown rice, mixed vegetables. Iron + carbs.' },
      { name: 'Salmon & Quinoa', focus: '6oz salmon fillet, 1 cup quinoa, green beans. Omega-3s + complete protein.' }
    ],
    dinner: [
      { name: 'Turkey Meatballs & Pasta', focus: '8oz ground turkey meatballs, 1.5 cups whole wheat pasta, marinara sauce.' },
      { name: 'Pork Tenderloin & Potatoes', focus: '7oz pork loin, 1 large baked potato, asparagus. Lean protein + carbs.' },
      { name: 'Fish & Vegetables', focus: '7oz white fish, roasted root vegetables, olive oil. Clean, nutrient-dense.' }
    ],
    snacks: [
      { name: 'Protein Shake', focus: '2 scoops whey protein, banana, oats, milk. Quick protein boost.' },
      { name: 'Turkey & Cheese', focus: '2oz turkey breast, 1oz cheddar, whole grain crackers. Portable protein.' },
      { name: 'Cottage Cheese & Granola', focus: '1 cup cottage cheese, 1/4 cup granola. Casein protein for sustained release.' }
    ],
    preWorkout: [
      { name: 'Banana + Almond Butter', focus: '1 banana + 2 tbsp almond butter. 30-45 min before: quick carbs + fat for sustained energy.' },
      { name: 'Rice Cakes + Honey', focus: '2 rice cakes + 1 tbsp honey. 30 min before: fast carbs for immediate fuel.' },
      { name: 'Oatmeal + Berries', focus: '1/2 cup oats + 1 cup berries. 45 min before: steady energy release.' }
    ],
    postWorkout: [
      { name: 'Whey Shake + Dextrose', focus: '25g whey protein + 40g dextrose in water. Within 30 min: rapid muscle recovery.' },
      { name: 'Chicken + White Rice', focus: '6oz chicken breast + 1 cup white rice. Within 60 min: complete recovery meal.' },
      { name: 'Greek Yogurt + Honey + Granola', focus: '1.5 cups Greek yogurt + 1 tbsp honey + 1/4 cup granola. Within 45 min: protein + carbs.' }
    ]
  },

  hypertrophy: {
    breakfast: [
      { name: 'Whole Eggs + Toast + Fruit', focus: '4 whole eggs, 2 slices whole wheat toast, orange juice. Maximum protein for muscle growth.' },
      { name: 'Oat & Protein Smoothie', focus: '1 cup oats, 2 scoops protein, banana, milk, peanut butter. Caloric surplus for gains.' },
      { name: 'Breakfast Burrito', focus: '3 scrambled eggs, 1/4 cup cheese, whole wheat tortilla, avocado. Protein + healthy fats.' }
    ],
    lunch: [
      { name: 'Dual Protein Plate', focus: '6oz chicken + 4oz ground beef, 2 cups brown rice, vegetables. Calorie-dense muscle fuel.' },
      { name: 'Pasta Carbonara (Lean)', focus: '8oz pasta, 6oz lean ground turkey, light cream, parmesan. Carbs + protein.' },
      { name: 'Tuna & Egg Sandwich', focus: '1 can tuna (in water), 2 hard-boiled eggs, whole grain bread, mayo. Budget-friendly gains.' }
    ],
    dinner: [
      { name: 'Prime Rib Eye + Potatoes', focus: '8oz ribeye steak, 2 medium potatoes, broccoli. High-calorie protein source.' },
      { name: 'Chicken Parmesan', focus: '8oz chicken breast breaded & fried, pasta, tomato sauce. Tasty calorie surplus.' },
      { name: 'Salmon Fillets + Noodles', focus: '2x 6oz salmon fillets, 2 cups noodles, sesame oil drizzle. Omega-3s + calorie surplus.' }
    ],
    snacks: [
      { name: 'Peanut Butter Shake', focus: '2 scoops protein, 3 tbsp peanut butter, banana, whole milk. 500+ calorie muscle-building snack.' },
      { name: 'Trail Mix & Granola', focus: '1 cup mixed nuts, 1/2 cup granola, dried fruit. Calorie-dense convenience food.' },
      { name: 'Pizza or Pasta', focus: '2 slices pizza or 1 cup pasta. Flexible calorie surplus from carbs & protein.' }
    ],
    preWorkout: [
      { name: 'Bagel + Peanut Butter', focus: '1 plain bagel + 2 tbsp peanut butter. 45 min before: substantial carb + fat for strength.' },
      { name: 'Oatmeal + Banana + Honey', focus: '1 cup oatmeal + 1 banana + 1 tbsp honey. 45 min before: sustained energy for long workouts.' },
      { name: 'Toast + Jam + Eggs', focus: '2 slices toast + 1 tbsp jam + 2 scrambled eggs. 30 min before: carbs + protein combo.' }
    ],
    postWorkout: [
      { name: 'Massive Shake', focus: '2 scoops protein, 2 bananas, 2 tbsp peanut butter, whole milk. Calorie & protein-dense recovery.' },
      { name: 'Burger & Fries', focus: '8oz burger, french fries, soda. High-calorie carb + protein recovery meal.' },
      { name: 'Pasta + Meat Sauce', focus: '2 cups pasta + 8oz ground meat sauce + parmesan. Maximum carb + protein for hypertrophy.' }
    ]
  },

  fatloss: {
    breakfast: [
      { name: 'Egg White Omelet', focus: '6-8 egg whites + spinach + mushrooms, 1 slice whole wheat toast. High protein, low calorie.' },
      { name: 'Oatmeal (Plain)', focus: '1/2 cup oats with water, cinnamon, 1 tbsp honey. 200 cal, sustained hunger control.' },
      { name: 'Greek Yogurt (Non-Fat)', focus: '1.5 cups non-fat Greek yogurt, berries, small drizzle honey. Protein-packed, minimal calories.' }
    ],
    lunch: [
      { name: 'Grilled Chicken Salad', focus: '5oz chicken breast, large mixed greens, olive oil vinaigrette, vegetables. 300-350 cal.' },
      { name: 'Turkey Sandwich', focus: '4oz turkey breast, 2 slices whole wheat, mustard, lettuce/tomato. 280 cal, portable.' },
      { name: 'Tuna (Water) & Veggies', focus: '1 can tuna in water, large vegetable side (cucumber, bell pepper, carrots). Ultra-lean, filling.' }
    ],
    dinner: [
      { name: 'White Fish & Broccoli', focus: '5-6oz white fish (tilapia/cod), large broccoli, lemon. 250-300 cal, very lean.' },
      { name: 'Chicken Breast & Brown Rice', focus: '4oz chicken breast, 1/2 cup brown rice, green beans. Controlled calories, sustaining.' },
      { name: 'Lean Beef & Vegetables', focus: '4oz 90% lean ground beef, roasted vegetables, salad. 350 cal, satisfying.' }
    ],
    snacks: [
      { name: 'Protein Shake (Light)', focus: '1 scoop whey, water, ice. 110 cal, pure protein for satiety.' },
      { name: 'Apple + Almond Butter', focus: '1 medium apple + 1 tbsp natural almond butter. 200 cal, filling fiber + fat.' },
      { name: 'Rice Cakes + Mustard', focus: '2 rice cakes + mustard + lean deli meat. 150 cal, low-calorie crunch.' }
    ],
    preWorkout: [
      { name: 'Black Coffee + Banana', focus: 'Black coffee (0 cal) + 1 small banana (90 cal). 30 min before: caffeine boost + minimal carbs.' },
      { name: 'Apple + Green Tea', focus: '1 medium apple + green tea. 95 cal, natural caffeine + antioxidants.' },
      { name: 'Light Yogurt Drink', focus: '1/2 cup non-fat yogurt + water. 50 cal, light fuel without bloating.' }
    ],
    postWorkout: [
      { name: 'Protein Shake (Water-Based)', focus: '1 scoop whey + water + ice. 120 cal, immediate protein synthesis, no excess calories.' },
      { name: 'Chicken Breast + Rice Cakes', focus: '3oz chicken breast + 1 rice cake. 200 cal, lean protein + simple carbs.' },
      { name: 'Egg Whites + Toast', focus: '4-5 egg whites + 1 slice whole wheat toast. 200 cal, clean recovery.' }
    ]
  },

  balance: {
    breakfast: [
      { name: 'Balanced Bowl', focus: '2 scrambled eggs, 1/2 cup oats, 1/2 banana, berries. Equal protein, carbs, micronutrients.' },
      { name: 'Smoothie (Balanced)', focus: '1 scoop protein, 1 cup yogurt, 1 cup berries, 1 tbsp nut butter. All macro groups.' },
      { name: 'Whole Grain Toast + Avocado Egg', focus: '2 slices whole grain, 2 poached eggs, 1/4 avocado. Balanced fats + protein.' }
    ],
    lunch: [
      { name: 'Mixed Grains & Lean Protein', focus: '5oz grilled chicken, 1 cup quinoa mix, roasted vegetables, tahini dressing.' },
      { name: 'Turkey & Veggie Wrap', focus: '3oz turkey, whole wheat wrap, hummus, vegetables, sprouts.' },
      { name: 'Baked Fish & Sweet Potato', focus: '5oz salmon/white fish, 1 medium sweet potato, steamed broccoli, lemon.' }
    ],
    dinner: [
      { name: 'Lean Meat & Whole Grain', focus: '5oz lean beef/chicken, 3/4 cup brown rice, stir-fried vegetables.' },
      { name: 'Plant-Based Meal', focus: '1 cup lentils/chickpeas, quinoa, roasted root vegetables, olive oil drizzle.' },
      { name: 'Poultry & Whole Grain Pasta', focus: '5oz turkey breast, 1 cup whole wheat pasta, vegetable sauce.' }
    ],
    snacks: [
      { name: 'Nuts & Fruit', focus: '1 oz mixed nuts + 1 medium fruit (apple/orange). Balanced fats, protein, carbs.' },
      { name: 'Cheese & Whole Grain Crackers', focus: '1 oz cheese + 5-6 whole grain crackers. Calcium + sustained energy.' },
      { name: 'Hummus & Veggies', focus: '1/4 cup hummus + large veggie tray (carrots, celery, bell pepper). Balanced & filling.' }
    ],
    preWorkout: [
      { name: 'Banana + String Cheese', focus: '1 banana + 1 string cheese. 45 min before: balanced carbs + protein for stability.' },
      { name: 'Oatmeal + Berries', focus: '1/3 cup oats + 1 cup berries + water. Sustained, balanced energy release.' },
      { name: 'Whole Wheat Pita + Hummus', focus: '1 whole wheat pita + 2 tbsp hummus. Steady fuel without heaviness.' }
    ],
    postWorkout: [
      { name: 'Balanced Recovery Shake', focus: '1 scoop protein + 1 banana + 1 tbsp peanut butter + milk. Immediate + sustained recovery.' },
      { name: 'Grilled Chicken + Vegetables', focus: '4oz chicken + roasted vegetables + whole grain roll. Complete, balanced recovery.' },
      { name: 'Greek Yogurt Parfait', focus: '1 cup Greek yogurt + 1/2 cup granola + berries + honey. Protein + carbs + probiotics.' }
    ]
  },

  flexibility: {
    breakfast: [
      { name: 'Anti-Inflammatory Bowl', focus: '2 eggs, 1/2 cup oats, berries, 1 tbsp flax seeds. Omega-3s for joint health.' },
      { name: 'Green Smoothie', focus: 'Spinach, banana, berries, Greek yogurt, almond milk. Nutrient-dense, anti-inflammatory.' },
      { name: 'Whole Grain Toast + Almond Butter', focus: '2 slices whole grain, 2 tbsp almond butter, berries. Sustained energy for mobility.' }
    ],
    lunch: [
      { name: 'Salmon Salad', focus: '4oz salmon, large mixed greens, olive oil vinaigrette, walnuts. High omega-3s for recovery.' },
      { name: 'Mediterranean Bowl', focus: '3oz chicken, 1 cup farro/bulgur, roasted vegetables, olive oil, feta.' },
      { name: 'Tofu & Vegetable Stir-Fry', focus: '5oz firm tofu, mixed vegetables, ginger, garlic, low-sodium sauce. Light, flexible-friendly.' }
    ],
    dinner: [
      { name: 'Baked White Fish', focus: '5oz white fish, sweet potato, steamed bok choy, ginger marinade.' },
      { name: 'Lentil Vegetable Soup', focus: 'Lentil-based soup (hearty), whole grain bread, side salad. Warming, nutrient-dense.' },
      { name: 'Poached Chicken & Quinoa', focus: '4oz poached chicken, 3/4 cup quinoa, roasted root vegetables, tahini dressing.' }
    ],
    snacks: [
      { name: 'Mixed Berries + Nuts', focus: '1 cup mixed berries + 1 oz almonds/walnuts. Antioxidants + healthy fats.' },
      { name: 'Green Tea + Rice Cakes', focus: 'Green tea + 2 rice cakes with almond butter. Anti-inflammatory + gentle fuel.' },
      { name: 'Apple + Walnuts', focus: '1 medium apple + 10 walnuts. Fiber + omega-3s for joint mobility.' }
    ],
    preWorkout: [
      { name: 'Banana + Almonds', focus: '1 banana + 10 almonds. 30-45 min before: quick carbs + magnesium for flexibility.' },
      { name: 'Herbal Tea + Dates', focus: 'Warm herbal tea (chamomile/ginger) + 3 dates. Calming pre-stretch fuel.' },
      { name: 'Whole Grain Toast + Honey', focus: '1 slice whole grain toast + 1 tsp honey + cinnamon. Gentle energy for gentle movement.' }
    ],
    postWorkout: [
      { name: 'Protein-Fruit Smoothie', focus: '1 scoop protein, 1 banana, 1 cup berries, almond milk. Recovery + anti-inflammatory.' },
      { name: 'Light Chicken Broth + Vegetables', focus: 'Warm chicken broth + vegetables (carrots, celery, zucchini). Hydrating, restorative.' },
      { name: 'Greek Yogurt + Berries + Walnuts', focus: '1 cup Greek yogurt + 1 cup berries + 6 walnuts + drizzle honey. Complete recovery with anti-inflammatories.' }
    ]
  },

  functional: {
    breakfast: [
      { name: 'Power Breakfast', focus: '3 eggs, 1 cup oats, banana. Energy for functional movements (compound lifts, carries).' },
      { name: 'Protein Pancakes + Fruit', focus: 'Oat flour pancakes (2 scoops protein), berries, maple syrup. Fuel for dynamic work.' },
      { name: 'Greek Yogurt with Granola', focus: '1.5 cups Greek yogurt, 1/4 cup granola, 1 tbsp honey. Quick-absorbing protein.' }
    ],
    lunch: [
      { name: 'Grilled Chicken & Sweet Potato', focus: '6oz chicken breast, 1 large sweet potato, mixed vegetables. Classic functional fuel.' },
      { name: 'Lean Burger (Homemade)', focus: '6oz ground turkey/beef burger, whole wheat bun, sweet potato fries. Portable power.' },
      { name: 'Pasta with Meat Sauce', focus: '1.5 cups whole wheat pasta, 6oz ground meat, marinara. Carbs for power output.' }
    ],
    dinner: [
      { name: 'Steak & Root Vegetables', focus: '6oz lean steak, roasted potatoes/carrots/parsnips. Iron + energy for strength & mobility.' },
      { name: 'Salmon & Wild Rice', focus: '5oz salmon, 1 cup wild rice, asparagus. Complete protein + omega-3s.' },
      { name: 'Turkey Meatballs & Whole Grain Pasta', focus: '8oz turkey meatballs, 1.5 cups whole grain pasta, tomato sauce.' }
    ],
    snacks: [
      { name: 'Protein Bar + Banana', focus: 'High-protein bar + 1 banana. Functional snack for on-the-go athletes.' },
      { name: 'Almonds & Dried Fruit', focus: '1 oz almonds + 1/4 cup dried fruit. Portable energy + minerals.' },
      { name: 'Jerky & Trail Mix', focus: '1 oz beef jerky + 1/4 cup trail mix. Protein + fat for sustained energy.' }
    ],
    preWorkout: [
      { name: 'Oatmeal + Banana + Peanut Butter', focus: '1/2 cup oats + 1 banana + 1 tbsp PB. 45 min before: sustained energy for functional circuits.' },
      { name: 'Rice Cakes + Honey + Almond Butter', focus: '2 rice cakes + 1 tbsp honey + 1 tbsp almond butter. 30 min before: quick + sustained carbs.' },
      { name: 'Sweet Potato + Berries', focus: '1 medium sweet potato + 1 cup berries. 60 min before: complete pre-workout fuel.' }
    ],
    postWorkout: [
      { name: 'Whey Shake + Dextrose + Banana', focus: '1.5 scoops whey + 40g dextrose + 1 banana in water. Rapid functional recovery.' },
      { name: 'Chicken + White Rice + Vegetables', focus: '5oz chicken breast, 1 cup white rice, roasted vegetables. Complete functional recovery.' },
      { name: 'Burger + Fries (Post-Workout)', focus: '6oz burger on whole wheat bun + sweet potato fries. Enjoyable high-calorie recovery.' }
    ]
  }
};

console.log('✅ MEALS.JS LOADED - Nutrition guidance ready');
