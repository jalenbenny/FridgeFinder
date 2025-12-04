// TheMealDB API integration
// Fetches recipes by ingredient and normalizes the data format

const RemoteRecipes = {
  baseUrl: 'https://www.themealdb.com/api/json/v1/1',
  
  // Ingredient → Category map (you can expand this)
  ingredientCategories: {
    chicken: "Protein",
    beef: "Protein",
    pork: "Protein",
    lamb: "Protein",
    fish: "Protein",
    salmon: "Protein",
    shrimp: "Protein",
    bacon: "Protein",
    egg: "Protein",

    milk: "Dairy",
    cheese: "Dairy",
    butter: "Dairy",
    cream: "Dairy",
    yogurt: "Dairy",

    rice: "Grains",
    pasta: "Grains",
    bread: "Grains",

    potato: "Vegetables",
    tomato: "Vegetables",
    onion: "Vegetables",
    garlic: "Vegetables",
    carrot: "Vegetables",
    broccoli: "Vegetables",
    spinach: "Vegetables",
    corn: "Vegetables",
    pepper: "Vegetables",
    mushroom: "Vegetables",
    avocado: "Vegetables",

    apple: "Fruits",
    strawberry: "Fruits",
    lemon: "Fruits",

    beans: "Pantry",
    flour: "Pantry",
    sugar: "Pantry",
    salt: "Pantry",
    peppercorn: "Pantry"
  },

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
    const categorizedIngredients = {};

    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient && ingredient.trim()) {
        const cleanIngredient = ingredient.toLowerCase().trim();
        ingredients.push(cleanIngredient);

        const measureText = measure && measure.trim() ? measure.trim() : '';
        const full = measureText ? `${measureText} ${ingredient.trim()}` : ingredient.trim();
        ingredientsWithMeasures.push(full);

        // CATEGORY FILTERING
        const category = this.ingredientCategories[cleanIngredient] || "Other";
        if (!categorizedIngredients[category]) {
          categorizedIngredients[category] = [];
        }
        categorizedIngredients[category].push(full);
      }
    }

    // Format instructions consistently
    let instructions = meal.strInstructions || 'No instructions available.';
    
    instructions = instructions.replace(/(?:^|\n)\s*(?:Prep|Cook|Ready|Total)[:›].+?(?:\n|$)/gi, '\n');
    
    const steps = instructions
      .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])|(?:^|\s)(?:\d+\.|\d+\))\s*/)
      .map(step => step.trim())
      .filter(step => step.length > 10);

    if (steps.length > 1) {
      instructions = steps.map((step, i) => `${i + 1}. ${step}`).join('\n\n');
    }

    return {
      id: meal.idMeal,
      name: meal.strMeal,
      ingredients: ingredients,
      ingredientsWithMeasures: ingredientsWithMeasures,

      // NEW RETURNED FIELD:
      categorizedIngredients: categorizedIngredients,

      instructions: instructions,
      source: 'themealdb'
    };
  },

  // Fetch recipes by category
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

  // Load a diverse set of recipes
  async loadDiverseRecipes() {
    console.log('Fetching recipes from TheMealDB...');
    const allMeals = new Map();
    
    const areas = ['American', 'British', 'Italian', 'French', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai', 'Greek'];
    const categories = ['Chicken', 'Beef', 'Pasta', 'Seafood', 'Vegetarian', 'Dessert', 'Pork', 'Lamb', 'Side'];
    
    for (const area of areas) {
      console.log(`Fetching ${area} recipes...`);
      const meals = await this.fetchByArea(area);
      const mealsToFetch = meals.slice(0, 12);
      
      for (const meal of mealsToFetch) {
        if (!allMeals.has(meal.idMeal)) {
          const details = await this.fetchRecipeDetails(meal.idMeal);
          if (details) {
            allMeals.set(meal.idMeal, this.normalizeRecipe(details));
          }
        }
      }
    }
    
    for (const category of categories) {
      console.log(`Fetching ${category} recipes...`);
      const meals = await this.fetchByCategory(category);
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

    const recipes = Array.from(allMeals.values());
    console.log(`Loaded ${recipes.length} recipes from TheMealDB`);
    return recipes;
  }
};
