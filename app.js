async function loadRecipes() {
  const res = await fetch("data/recipes.json");
  return res.json();
}

function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => ingredients.add(ingredient.toLowerCase()));
  });
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  const container = document.getElementById("ingredients-container");
  container.innerHTML = "";
  ingredients.forEach(ingredient => {
    const box = document.createElement("div");
    box.className = "ingredient-box";
    box.textContent = ingredient;
    box.addEventListener("click", () => box.classList.toggle("selected"));
    container.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll(".ingredient-box.selected"))
              .map(box => box.textContent.toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll(".allergy-filter:checked"))
              .map(box => box.value.toLowerCase());
}

// Emoji mapping for ingredients
function getIngredientEmoji(ingredient) {
  const mapping = {
    "bread": "🥖", "pasta": "🍝", "cheese": "🧀", "milk": "🥛",
    "nuts": "🌰", "eggs": "🥚", "butter": "🧈", "avocado": "🥑",
    "tomato": "🍅", "banana": "🍌", "strawberry": "🍓",
    "lettuce": "🥬", "rice": "🍚", "peanut butter": "🥜",
    "jelly": "🍇", "naan": "🍞", "soy sauce": "🧂"
  };
  for (const key in mapping) if (ingredient.includes(key)) return mapping[key];
  return "";
}

// -----------------
// Recipe Filtering
// -----------------
function findRecipes(userIngredients, recipes, selectedAllergens) {
  if (userIngredients.length === 0) return [];

  return recipes.filter(recipe => {
    const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase());

    // exclude allergens
    for (const allergen of selectedAllergens) {
      if (recipeIngredients.some(i => {
        if (allergen === "gluten") return i.includes("bread") || i.includes("pasta") || i.includes("naan");
        if (allergen === "nuts") return i.includes("nuts") || i.includes("peanut") || i.includes("almond");
        if (allergen === "dairy") return i.includes("cheese") || i.includes("milk") || i.includes("butter");
        return false;
      })) return false;
    }

    return recipeIngredients.some(i => userIngredients.includes(i));
  });
}

// -----------------
// Render Recipes
// -----------------
let currentResults = [];
let allRecipes = [];

function renderRecipes(recipes) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (recipes.length === 0) {
    resultsDiv.textContent = "No matches found.";
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    const favButton = document.createElement("button");
    favButton.textContent = localStorage.getItem(recipe.name) ? "★ Favorited" : "☆ Favorite";
    favButton.className = "fav-btn";
    favButton.addEventListener("click", () => toggleFavorite(recipe));

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p>${recipe.instructions}</p>
    `;
    card.appendChild(favButton);
    resultsDiv.appendChild(card);
  });
}

// -----------------
// Favorites
// -----------------
function toggleFavorite(recipe) {
  const key = recipe.name;
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(recipe));
  }
  renderRecipes(currentResults);
  renderFavorites();
}

function renderFavorites() {
  const favoritesDiv = document.getElementById("favorites");
  favoritesDiv.innerHTML = "";

  const favoriteRecipes = Object.keys(localStorage).map(key => JSON.parse(localStorage.getItem(key)));
  if (favoriteRecipes.length === 0) {
    favoritesDiv.textContent = "No favorite recipes yet.";
    return;
  }

  favoriteRecipes.forEach(recipe => {
    const card =
