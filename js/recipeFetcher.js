/* ===============================
   FEATURED RECIPE FETCHER
   Fetches real recipes from web APIs
================================ */

const RECIPE_CACHE_KEY = 'gymKiosk_featuredRecipes';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Recipe categories with search terms for different APIs
const RECIPE_CATEGORIES = {
  preWorkout: {
    title: '⚡ Pre-Workout Fuel',
    keywords: ['banana smoothie', 'oatmeal energy', 'toast honey', 'rice bowl'],
    focus: 'Quick carbs for energy 30-45 min before training'
  },
  postWorkout: {
    title: '💪 Post-Workout Recovery',
    keywords: ['chicken rice', 'protein shake', 'salmon quinoa', 'turkey sweet potato'],
    focus: 'Protein + carbs within 60 min after training'
  },
  highProtein: {
    title: '🥩 High-Protein Muscle Builder',
    keywords: ['steak', 'grilled chicken', 'beef bowl', 'protein pasta', 'egg breakfast'],
    focus: 'Maximize muscle growth with 40g+ protein'
  },
  fatLoss: {
    title: '🥗 Fat Loss (High Volume, Low Cal)',
    keywords: ['chicken salad', 'vegetable soup', 'fish vegetables', 'egg white'],
    focus: 'Stay full, lose fat with 300-400 calories'
  },
  plantBased: {
    title: '🌱 Plant-Based Power',
    keywords: ['tofu', 'chickpea', 'lentil', 'bean bowl', 'vegan protein'],
    focus: 'Complete plant proteins for training'
  },
  snacks: {
    title: '🥜 Training-Support Snacks',
    keywords: ['protein balls', 'nut butter', 'greek yogurt', 'hummus'],
    focus: 'Quick 150-250 cal boosts between meals'
  }
};

// Get cached recipes or fetch new ones
async function getFeaturedRecipes(forceRefresh = false) {
  const cached = localStorage.getItem(RECIPE_CACHE_KEY);
  
  if (!forceRefresh && cached) {
    const { timestamp, recipes } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    
    if (age < CACHE_DURATION) {
      console.log('RECIPE FETCHER: Using cached recipes');
      return recipes;
    }
  }
  
  console.log('RECIPE FETCHER: Fetching fresh recipes from web...');
  const recipes = await fetchRecipesFromAPIs();
  
  // Cache the results
  localStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify({
    timestamp: Date.now(),
    recipes: recipes
  }));
  
  return recipes;
}

// Fetch recipes from multiple sources
async function fetchRecipesFromAPIs() {
  const recipes = {};
  
  for (const [category, config] of Object.entries(RECIPE_CATEGORIES)) {
    try {
      const recipe = await fetchRandomRecipeForCategory(config.keywords);
      recipes[category] = {
        ...recipe,
        categoryTitle: config.title,
        categoryFocus: config.focus
      };
    } catch (error) {
      console.error(`Failed to fetch recipe for ${category}:`, error);
      recipes[category] = getFallbackRecipe(category);
    }
  }
  
  return recipes;
}

// Fetch a random recipe for a category using TheMealDB API
async function fetchRandomRecipeForCategory(keywords) {
  // TheMealDB free API
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${keyword}`);
  const data = await response.json();
  
  if (data.meals && data.meals.length > 0) {
    const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
    
    // Parse ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure} ${ingredient}`.trim());
      }
    }
    
    return {
      name: meal.strMeal,
      image: meal.strMealThumb,
      category: meal.strCategory,
      cuisine: meal.strArea,
      ingredients: ingredients,
      instructions: meal.strInstructions,
      video: meal.strYoutube || null,
      source: meal.strSource || null,
      tags: meal.strTags ? meal.strTags.split(',') : []
    };
  }
  
  // Fallback to Edamam or other API
  return await fetchFromEdamamAPI(keyword);
}

// Backup: Fetch from Edamam Recipe API (free tier, no key needed for basic search)
async function fetchFromEdamamAPI(keyword) {
  try {
    // Using public recipe search endpoint (limited, but works)
    const response = await fetch(`https://api.edamam.com/search?q=${keyword}&app_id=d4cb06b6&app_key=961e65f8bd594c0cbca6ecceb967638e&to=1`);
    const data = await response.json();
    
    if (data.hits && data.hits.length > 0) {
      const recipe = data.hits[0].recipe;
      
      return {
        name: recipe.label,
        image: recipe.image,
        category: recipe.dishType ? recipe.dishType[0] : 'Main',
        cuisine: recipe.cuisineType ? recipe.cuisineType[0] : 'International',
        ingredients: recipe.ingredientLines,
        instructions: `View full recipe at: ${recipe.url}`,
        video: null,
        source: recipe.url,
        tags: recipe.healthLabels || [],
        calories: Math.round(recipe.calories),
        protein: Math.round(recipe.totalNutrients.PROCNT?.quantity || 0),
        carbs: Math.round(recipe.totalNutrients.CHOCDF?.quantity || 0),
        fat: Math.round(recipe.totalNutrients.FAT?.quantity || 0)
      };
    }
  } catch (error) {
    console.error('Edamam API failed:', error);
  }
  
  throw new Error('No recipe found');
}

// Fallback recipes if API fails
function getFallbackRecipe(category) {
  const fallbacks = {
    preWorkout: {
      name: 'Banana & Peanut Butter Toast',
      ingredients: ['2 slices whole wheat bread', '2 tbsp peanut butter', '1 banana (sliced)', '1 tsp honey'],
      instructions: 'Toast bread. Spread peanut butter. Top with banana slices and drizzle honey. Eat 30-45 min before training.',
      categoryTitle: RECIPE_CATEGORIES.preWorkout.title,
      categoryFocus: RECIPE_CATEGORIES.preWorkout.focus,
      calories: 380,
      protein: 12,
      carbs: 52,
      fat: 14
    },
    postWorkout: {
      name: 'Chicken & Rice Power Bowl',
      ingredients: ['6oz grilled chicken breast', '1 cup brown rice', '1 cup broccoli', '1 tbsp olive oil'],
      instructions: 'Grill chicken with seasoning. Cook rice. Steam broccoli. Combine in bowl, drizzle oil. Eat within 60 min post-workout.',
      categoryTitle: RECIPE_CATEGORIES.postWorkout.title,
      categoryFocus: RECIPE_CATEGORIES.postWorkout.focus,
      calories: 520,
      protein: 48,
      carbs: 55,
      fat: 12
    },
    highProtein: {
      name: 'Steak & Sweet Potato',
      ingredients: ['8oz sirloin steak', '1 large sweet potato', '2 cups green beans', 'Salt & pepper'],
      instructions: 'Season and grill steak to desired doneness. Bake sweet potato at 400°F for 45 min. Steam green beans. Serve together.',
      categoryTitle: RECIPE_CATEGORIES.highProtein.title,
      categoryFocus: RECIPE_CATEGORIES.highProtein.focus,
      calories: 580,
      protein: 52,
      carbs: 48,
      fat: 18
    },
    fatLoss: {
      name: 'Grilled Chicken Salad Bowl',
      ingredients: ['5oz chicken breast', '3 cups mixed greens', '1 cup cucumber', '1 cup cherry tomatoes', '2 tbsp balsamic vinegar'],
      instructions: 'Grill chicken, slice. Toss greens, cucumber, tomatoes. Top with chicken and vinegar. High volume, low calorie.',
      categoryTitle: RECIPE_CATEGORIES.fatLoss.title,
      categoryFocus: RECIPE_CATEGORIES.fatLoss.focus,
      calories: 280,
      protein: 38,
      carbs: 18,
      fat: 6
    },
    plantBased: {
      name: 'Chickpea Buddha Bowl',
      ingredients: ['1.5 cups chickpeas', '1 cup quinoa', '1 cup roasted vegetables', '2 tbsp tahini', 'Lemon juice'],
      instructions: 'Cook quinoa. Roast chickpeas and veggies at 400°F for 25 min. Combine in bowl with tahini dressing.',
      categoryTitle: RECIPE_CATEGORIES.plantBased.title,
      categoryFocus: RECIPE_CATEGORIES.plantBased.focus,
      calories: 520,
      protein: 24,
      carbs: 72,
      fat: 16
    },
    snacks: {
      name: 'Protein Energy Balls',
      ingredients: ['1 cup oats', '1/2 cup peanut butter', '1/3 cup honey', '1/4 cup protein powder', 'Mini chocolate chips'],
      instructions: 'Mix all ingredients. Roll into 12 balls. Refrigerate 30 min. Each ball: ~150 calories. Perfect pre/post gym snack.',
      categoryTitle: RECIPE_CATEGORIES.snacks.title,
      categoryFocus: RECIPE_CATEGORIES.snacks.focus,
      calories: 150,
      protein: 6,
      carbs: 18,
      fat: 6
    }
  };
  
  return fallbacks[category] || fallbacks.postWorkout;
}

function mapFeaturedRecipesToMealPlan(recipes) {
  const mealCategoryByRecipeType = {
    preWorkout: 'preWorkout',
    postWorkout: 'postWorkout',
    highProtein: 'lunch',
    fatLoss: 'dinner',
    plantBased: 'lunch',
    snacks: 'snacks'
  };

  const meals = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    preWorkout: [],
    postWorkout: []
  };

  Object.entries(recipes || {}).forEach(([recipeType, recipe]) => {
    if (!recipe || !recipe.name) return;

    const targetCategory = mealCategoryByRecipeType[recipeType] || 'snacks';
    const calories = typeof recipe.calories === 'number' ? recipe.calories : undefined;
    const protein = typeof recipe.protein === 'number' ? recipe.protein : undefined;
    const shortIngredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.slice(0, 5).join(', ')
      : '';

    meals[targetCategory].push({
      name: recipe.name,
      calories,
      protein,
      description: [
        recipe.categoryTitle || recipe.category || 'Featured Fuel',
        recipe.categoryFocus || '',
        shortIngredients ? `Ingredients: ${shortIngredients}` : ''
      ].filter(Boolean).join(' • ')
    });
  });

  return meals;
}

async function shareFeaturedFuelToPhone(recipes) {
  const featuredRecipes = recipes || window.currentFeaturedRecipes;
  if (!featuredRecipes || Object.keys(featuredRecipes).length === 0) {
    alert('No featured fuel recipes are available to share yet.');
    return;
  }

  const planId = (typeof generateUUID === 'function')
    ? generateUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const payload = {
    meals: mapFeaturedRecipesToMealPlan(featuredRecipes),
    type: 'featuredFuel',
    goal: 'featured-fuel-of-the-day',
    created: new Date().toISOString(),
    user: window.currentUser || 'guest'
  };

  try {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId: planId, data: payload })
    };

    const response = (typeof fetchApiWithFallback === 'function')
      ? await fetchApiWithFallback('/api/workouts/create', requestOptions)
      : await fetch('http://localhost:3001/api/workouts/create', requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FEATURED RECIPE FETCHER: Failed to save featured fuel share payload:', errorText);
      alert('Unable to create QR export right now. Make sure the server is running.');
      return;
    }

    if (typeof displayMealPlanQRCodeModal === 'function') {
      await displayMealPlanQRCodeModal(planId);
      return;
    }

    if (typeof displayQRCodeModal === 'function') {
      await displayQRCodeModal(planId);
      return;
    }

    alert('QR modal is not available in this build.');
  } catch (error) {
    console.error('FEATURED RECIPE FETCHER: Error exporting featured fuel QR:', error);
    alert('Unable to create QR export right now. Make sure the server is running.');
  }
}

// Render featured recipes to the UI
function renderFeaturedRecipes(recipes, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  window.currentFeaturedRecipes = recipes;
  
  container.innerHTML = '';
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = 'text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 193, 7, 0.1)); border-radius: 16px;';
  header.innerHTML = `
    <h2 style="font-size: 2.5rem; color: var(--color-gold); margin: 0 0 10px 0;">🌟 Featured Fuel of the Day</h2>
    <p style="font-size: 1.2rem; color: var(--text-secondary); margin: 0;">Fresh recipes • Updates daily</p>
  `;
  container.appendChild(header);

  const shareBtn = document.createElement('button');
  shareBtn.textContent = '📲 Send Featured Fuel to Phone with QR Code';
  shareBtn.className = 'primary-btn';
  shareBtn.style.cssText = 'margin: 0 auto 24px auto; display: block; padding: 12px 24px;';
  shareBtn.onclick = async () => {
    const originalText = shareBtn.textContent;
    shareBtn.textContent = '⏳ Creating QR...';
    shareBtn.disabled = true;
    try {
      await shareFeaturedFuelToPhone(recipes);
    } finally {
      shareBtn.textContent = originalText;
      shareBtn.disabled = false;
    }
  };
  container.appendChild(shareBtn);
  
  // Create recipe grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; margin-bottom: 40px;';
  
  for (const [category, recipe] of Object.entries(recipes)) {
    const card = createRecipeCard(recipe);
    grid.appendChild(card);
  }
  
  container.appendChild(grid);
  
  // Add refresh button
  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = '🔄 Fetch New Recipes';
  refreshBtn.className = 'primary-btn';
  refreshBtn.style.cssText = 'margin: 20px auto; display: block; padding: 15px 30px;';
  refreshBtn.onclick = async () => {
    refreshBtn.textContent = '⏳ Fetching...';
    refreshBtn.disabled = true;
    const newRecipes = await getFeaturedRecipes(true);
    renderFeaturedRecipes(newRecipes, containerId);
  };
  container.appendChild(refreshBtn);
}

// Create individual recipe card
function createRecipeCard(recipe) {
  const card = document.createElement('div');
  card.style.cssText = `
    background: rgba(var(--color-blue-rgb), 0.05);
    border: 2px solid var(--color-blue);
    border-radius: 16px;
    padding: 20px;
    transition: all 0.3s ease;
  `;
  
  card.innerHTML = `
    <div style="margin-bottom: 15px;">
      <h3 style="color: var(--color-gold); font-size: 1.3rem; margin: 0 0 5px 0;">${recipe.categoryTitle}</h3>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">${recipe.categoryFocus}</p>
    </div>
    
    ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 15px;">` : ''}
    
    <h4 style="color: var(--text-primary); font-size: 1.5rem; margin: 0 0 10px 0;">${recipe.name}</h4>
    
    ${recipe.cuisine ? `<p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0 0 10px 0;"><strong>Cuisine:</strong> ${recipe.cuisine}</p>` : ''}
    
    ${recipe.calories ? `
    <div style="display: flex; gap: 15px; margin-bottom: 15px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 8px;">
      <span style="color: var(--text-primary); font-size: 0.9rem;"><strong>Calories:</strong> ${recipe.calories}</span>
      ${recipe.protein ? `<span style="color: var(--text-primary); font-size: 0.9rem;"><strong>Protein:</strong> ${recipe.protein}g</span>` : ''}
      ${recipe.carbs ? `<span style="color: var(--text-primary); font-size: 0.9rem;"><strong>Carbs:</strong> ${recipe.carbs}g</span>` : ''}
      ${recipe.fat ? `<span style="color: var(--text-primary); font-size: 0.9rem;"><strong>Fat:</strong> ${recipe.fat}g</span>` : ''}
    </div>
    ` : ''}
    
    <div style="margin-bottom: 15px;">
      <strong style="color: var(--color-blue); font-size: 1.1rem;">Ingredients:</strong>
      <ul style="margin: 10px 0; padding-left: 20px; color: var(--text-primary);">
        ${recipe.ingredients.slice(0, 8).map(ing => `<li style="margin: 5px 0;">${ing}</li>`).join('')}
        ${recipe.ingredients.length > 8 ? `<li style="margin: 5px 0; color: var(--text-secondary);">+ ${recipe.ingredients.length - 8} more...</li>` : ''}
      </ul>
    </div>
    
    <div style="margin-bottom: 15px;">
      <strong style="color: var(--color-blue); font-size: 1.1rem;">Instructions:</strong>
      <p style="color: var(--text-primary); margin: 10px 0; line-height: 1.6;">${recipe.instructions.substring(0, 250)}${recipe.instructions.length > 250 ? '...' : ''}</p>
    </div>
    
    ${recipe.source ? `<a href="${recipe.source}" target="_blank" style="color: var(--color-gold); text-decoration: underline; font-size: 0.9rem;">View Full Recipe →</a>` : ''}
    ${recipe.video ? `<br><a href="${recipe.video}" target="_blank" style="color: var(--color-gold); text-decoration: underline; font-size: 0.9rem; margin-top: 5px; display: inline-block;">Watch Video Tutorial →</a>` : ''}
  `;
  
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-5px)';
    card.style.borderColor = 'var(--color-gold)';
    card.style.boxShadow = '0 10px 30px rgba(255, 193, 7, 0.3)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.borderColor = 'var(--color-blue)';
    card.style.boxShadow = 'none';
  });
  
  return card;
}

// Initialize featured recipes when nutrition screen loads
async function initializeFeaturedRecipes(containerId = 'featuredRecipesContainer') {
  try {
    const recipes = await getFeaturedRecipes();
    renderFeaturedRecipes(recipes, containerId);
  } catch (error) {
    console.error('Failed to load featured recipes:', error);
    // Show error message
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p>Unable to load featured recipes. Check your internet connection.</p>
          <button onclick="initializeFeaturedRecipes('${containerId}')" class="primary-btn" style="margin-top: 20px;">Retry</button>
        </div>
      `;
    }
  }
}

console.log('RECIPE FETCHER: Loaded');
