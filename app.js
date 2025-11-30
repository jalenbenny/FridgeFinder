// -----------------
// Sign In / Sign Out
// -----------------
const signInForm = document.getElementById('signInForm');
const signOutDiv = document.getElementById('signOutDiv');
const displayUser = document.getElementById('displayUser');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');

// Check if user is already signed in
const currentUser = localStorage.getItem('user');
if (currentUser) {
  showSignedIn(currentUser);
}

// Sign in logic
signInBtn.addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  if (username) {
    localStorage.setItem('user', username);
    showSignedIn(username);
    renderFavorites(); // update favorites for this user
  } else {
    alert('Please enter a username');
  }
});

// Sign out logic
signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('user');
  showSignedOut();
  renderFavorites(); // clear favorites view
});

// Helper functions for sign in/out
function showSignedIn(username) {
  signInForm.style.display = 'none';
  signOutDiv.style.display = 'block';
  displayUser.textContent = username;
}

function showSignedOut() {
  signInForm.style.display = 'block';
  signOutDiv.style.display = 'none';
  document.getElementById('username').value = '';
}

// -----------------
// Helper Functions
// -----------------
async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error loading recipes:", error);
    alert("Failed to load recipes. Please check that data/recipes.json exists.");
    return [];
  }
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
  
  if (ingredients.length === 0) {
    container.innerHTML = '<p style="color: #B8732E;">No ingredients available. Please check your recipes.json file.</p>';
    return;
  }
  
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
    "jelly": "🍇", "naan": "🍞", "soy sauce": "🧂", "olive oil": "🫒",
    "salt": "🧂", "tomato sauce": "🍅"
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
    resultsDiv.innerHTML = '<div class="no-results">No matches found. Try selecting different ingredients!</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    const favButton = document.createElement("button");
    favButton.textContent = localStorage.getItem(getUserKey(recipe.name)) ? "★ Favorited" : "☆ Favorite";
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
// Per-User Favorites
// -----------------
function getUserKey(recipeName) {
  const username = localStorage.getItem('user');
  return username ? `${username}_${recipeName}` : recipeName;
}

function toggleFavorite(recipe) {
  const key = getUserKey(recipe.name);
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

  const username = localStorage.getItem('user');
  if (!username) {
    favoritesDiv.innerHTML = '<div class="no-results">Sign in to save favorites!</div>';
    return;
  }

  const favoriteRecipes = Object.keys(localStorage)
    .filter(key => key.startsWith(username + "_"))
    .map(key => JSON.parse(localStorage.getItem(key)));

  if (favoriteRecipes.length === 0) {
    favoritesDiv.innerHTML = '<div class="no-results">No favorite recipes yet. Click the ☆ button to add favorites!</div>';
    return;
  }

  favoriteRecipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");
    
    const unfavButton = document.createElement("button");
    unfavButton.textContent = "★ Remove";
    unfavButton.className = "fav-btn";
    unfavButton.addEventListener("click", () => {
      localStorage.removeItem(getUserKey(recipe.name));
      renderFavorites();
      if (currentResults.length > 0) renderRecipes(currentResults);
    });
    
    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p>${recipe.instructions}</p>
    `;
    card.appendChild(unfavButton);
    favoritesDiv.appendChild(card);
  });
}

// -----------------
// Initialize & Search
// -----------------
async function initializeApp() {
  console.log("Initializing app...");
  allRecipes = await loadRecipes();
  console.log("Loaded recipes:", allRecipes);
  
  const allIngredients = getAllIngredients(allRecipes);
  console.log("All ingredients:", allIngredients);
  
  createIngredientBoxes(allIngredients);
  renderFavorites();
  
  console.log("App initialized successfully!");
}

async function performSearch() {
  const userIngredients = getSelectedIngredients();
  const selectedAllergens = getSelectedAllergens();

  if (userIngredients.length === 0) {
    alert("Please select at least one ingredient!");
    return;
  }

  currentResults = findRecipes(userIngredients, allRecipes, selectedAllergens);
  console.log("Search results:", currentResults);
  renderRecipes(currentResults);
}

// -----------------
// Event Listeners
// -----------------
document.getElementById("search-btn").addEventListener("click", performSearch);
window.addEventListener("load", initializeApp);
