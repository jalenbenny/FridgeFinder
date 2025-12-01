// TheMealDB API integration
// Fetches recipes by ingredient and normalizes the data format

const RemoteRecipes = {
  baseUrl: 'https://www.themealdb.com/api/json/v1/1',
  
  // Common ingredients to fetch a diverse set of recipes
  commonIngredients: [
    'chicken', 'beef', 'pork', 'fish', 'salmon',
    'rice', 'pasta', 'potato', 'tomato', 'onion',
    'garlic', 'cheese', 'egg', 'milk', 'butter',
    'bread', 'carrot', 'mushroom', 'pepper', 'lemon',
    'lamb', 'shrimp', 'bacon', 'broccoli', 'spinach',
    'avocado', 'corn', 'beans', 'apple', 'strawberry'
  ],

  // Fetch recipes by ingredient
  async fetchByIngredient(ingredient) {
    try {
      const response = await fetch(`${this.baseUrl}/filter.php?i=${encodeURIComponent(ingredient)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error(`Error fetching recipes for ${ingredient}:`, error);
      return [];
    }
  },

  // Fetch full recipe details by ID
  async fetchRecipeDetails(mealId) {
    try {
      const response = await fetch(`${this.baseUrl}/lookup.php?i=${mealId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error(`Error fetching recipe details for ${mealId}:`, error);
      return null;
    }
  },

  // Fetch recipes by cuisine area
  async fetchByArea(area) {
    try {
      const response = await fetch(`${this.baseUrl}/filter.php?a=${encodeURIComponent(area)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error(`Error fetching recipes for area ${area}:`, error);
      return [];
    }
  },

  // Normalize TheMealDB recipe to our format
  normalizeRecipe(meal) {
    const ingredients = [];
    const ingredientsWithMeasures = [];
    
    // TheMealDB has ingredients in strIngredient1-20 format
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        ingredients.push(ingredient.toLowerCase().trim());
        
        // Combine measure and ingredient for display
        const measureText = measure && measure.trim() ? measure.trim() : '';
        ingredientsWithMeasures.push(
          measureText ? `${measureText} ${ingredient.trim()}` : ingredient.trim()
        );
      }
    }

    // Format instructions consistently
    let instructions = meal.strInstructions || 'No instructions available.';
    
    // Remove timing information lines
    instructions = instructions.replace(/(?:^|\n)\s*(?:Prep|Cook|Ready|Total)[:›].+?(?:\n|$)/gi, '\n');
    
    // Split by common delimiters (newlines, periods followed by capital letters, or numbered steps)
    const steps = instructions
      .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])|(?:^|\s)(?:\d+\.|\d+\))\s*/)
      .map(step => step.trim())
      .filter(step => step.length > 10); // Filter out very short fragments
    
    // If we got multiple steps, format as numbered list, otherwise keep as paragraph
    if (steps.length > 1) {
      instructions = steps.map((step, i) => `${i + 1}. ${step}`).join('\n\n');
    }

    return {
      id: meal.idMeal,
      name: meal.strMeal,
      ingredients: ingredients,
      ingredientsWithMeasures: ingredientsWithMeasures,
      instructions: instructions,
      source: 'themealdb'
    };
  },

  // Fetch recipes by category (much faster than ingredient search)
  async fetchByCategory(category) {
    try {
      const response = await fetch(`${this.baseUrl}/filter.php?c=${encodeURIComponent(category)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error(`Error fetching recipes for category ${category}:`, error);
      return [];
    }
  },

  // Load a diverse set of recipes using familiar cuisines (much faster)
  async loadDiverseRecipes() {
    console.log('Fetching recipes from TheMealDB...');
    const allMeals = new Map(); // Use Map to deduplicate by ID
    
    // Use familiar cuisines - American, British, Italian, French tend to have more recognizable recipes
    const areas = ['American', 'British', 'Italian', 'French', 'Mexican'];
    const categories = ['Chicken', 'Beef', 'Pasta'];
    
    // Fetch from familiar cuisines
    for (const area of areas) {
      console.log(`Fetching ${area} recipes...`);
      const meals = await this.fetchByArea(area);
      
      // Get details for first 8 recipes from each area
      const mealsToFetch = meals.slice(0, 8);
      
      for (const meal of mealsToFetch) {
        if (!allMeals.has(meal.idMeal)) {
          const details = await this.fetchRecipeDetails(meal.idMeal);
          if (details) {
            allMeals.set(meal.idMeal, this.normalizeRecipe(details));
          }
        }
      }
    }
    
    // Add some popular categories too
    for (const category of categories) {
      console.log(`Fetching ${category} recipes...`);
      const meals = await this.fetchByCategory(category);
      
      const mealsToFetch = meals.slice(0, 5);
      
      for (const meal of mealsToFetch) {
        if (!allMeals.has(meal.idMeal)) {
          const details = await this.fetchRecipeDetails(meal.idMeal);
          if (details) {
            allMeals.set(meal.idMeal, this.normalizeRecipe(details));
          }
        }
      }
    }

    const recipes = Array.from(allMeals.values());
    console.log(`Loaded ${recipes.length} recipes from TheMealDB`);
    return recipes;
  }
};
