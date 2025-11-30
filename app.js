// -----------------
// Sign In / Sign Out with password
// -----------------
const signInForm = document.getElementById('signInForm');
const signOutDiv = document.getElementById('signOutDiv');
const displayUser = document.getElementById('displayUser');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const mainContent = document.getElementById('mainContent');

function getUserData() {
  const data = localStorage.getItem('users');
  return data ? JSON.parse(data) : {};
}

function saveUserData(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

const currentUser = localStorage.getItem('currentUser');
if (currentUser) {
  showSignedIn(currentUser);
}

signInBtn.addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('Please enter a username and password');
    return;
  }

  const users = getUserData();

  if (!users[username]) {
    // create account
    users[username] = { password };
    saveUserData(users);
    alert('Account created!');
  } else if (users[username].password !== password) {
    alert('Incorrect password!');
    return;
  }

  localStorage.setItem('currentUser', username);
  showSignedIn(username);
  renderFavorites();
});

signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  showSignedOut();
  renderFavorites();
});

function showSignedIn(username) {
  signInForm.style.display = 'none';
  signOutDiv.style.display = 'block';
  mainContent.style.display = 'block';
  displayUser.textContent = username;
}

function showSignedOut() {
  signInForm.style.display = 'block';
  signOutDiv.style.display = 'none';
  mainContent.style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

// -----------------
// Load Recipes
// -----------------
async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Failed to load recipes.json");
    return [];
  }
}

// -----------------
// Ingredients & Allergens
// -----------------
function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(r => r.ingredients.forEach(i => ingredients.add(i.toLowerCase())));
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  const container = document.getElementById('ingredients-container');
  container.innerHTML = '';
  ingredients.forEach(i => {
    const box = document.createElement('div');
    box.className = 'ingredient-box';
    box.textContent = i;
    box.addEventListener('click', () => box.classList.toggle('selected'));
    container.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll('.ingredient-box.selected')).map(b => b.textContent.toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll('.allergy-filter:checked')).map(b => b.value.toLowerCase());
}

// -----------------
// Emoji mapping
// -----------------
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
  if (!userIngredients.length) return [];
  return recipes.filter(r => {
    const recipeIngredients = r.ingredients.map(i => i.toLowerCase());

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
// Render Recipes & Favorites
// -----------------
let currentResults = [];
let allRecipes = [];

function getUserKey(recipeName) {
  const username = localStorage.getItem('currentUser');
  return username ? `${username}_${recipeName}` : recipeName;
}

function renderRecipes(recipes) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  if (!recipes.length) {
    resultsDiv.innerHTML = '<div class="no-results">No matches found!</div>';
    return;
  }

  recipes.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    const emojis = r.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    const favBtn = document.createElement('button');
    favBtn.textContent = localStorage.getItem(getUserKey(r.name)) ? "★ Favorited" : "☆ Favorite";
    favBtn.className = 'fav-btn';
    favBtn.addEventListener('click', () => toggleFavorite(r));

    // include prep/cook/heat/nutrition
    const nutritionText = r.nutrition
      ? `<p><strong>Calories:</strong> ${r.nutrition.calories} kcal | <strong>Protein:</strong> ${r.nutrition.protein_g}g | <strong>Fat:</strong> ${r.nutrition.fat_g}g | <strong>Carbs:</strong> ${r.nutrition.carbs_g}g</p>`
      : "";

    card.innerHTML = `
      <h3>${emojis} ${r.name}</h3>
      <p><strong>Ingredients:</strong> ${r.ingredients.join(", ")}</p>
      <p>${r.instructions}</p>
      <p><strong>Prep:</strong> ${r.prep_time_min || 0} min | <strong>Cook:</strong> ${r.cook_time_min || 0} min | <strong>Heat:</strong> ${r.heat || "N/A"}</p>
      ${nutritionText}
    `;
    card.appendChild(favBtn);
    resultsDiv.appendChild(card);
  });
}

function toggleFavorite(recipe) {
  const key = getUserKey(recipe.name);
  if (localStorage.getItem(key)) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(recipe));
  renderRecipes(currentResults);
  renderFavorites();
}

function renderFavorites() {
  const favoritesDiv = document.getElementById('favorites');
  favoritesDiv.innerHTML = '';

  const username = localStorage.getItem('currentUser');
  if (!username) {
    favoritesDiv.innerHTML = '<div class="no-results">Sign in to see favorites!</div>';
    return;
  }

  const favs = Object.keys(localStorage)
    .filter(k => k.startsWith(username + "_"))
    .map(k => JSON.parse(localStorage.getItem(k)));

  if (!favs.length) {
    favoritesDiv.innerHTML = '<div class="no-results">No favorites yet.</div>';
    return;
  }

  favs.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    const emojis = r.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    const removeBtn = document.createElement('button');
    removeBtn.textContent = "★ Remove";
    removeBtn.className = 'fav-btn';
    removeBtn.addEventListener('click', () => {
      localStorage.removeItem(getUserKey(r.name));
      renderFavorites();
      if (currentResults.length > 0) renderRecipes(currentResults);
    });

    const nutritionText = r.nutrition
      ? `<p><strong>Calories:</strong> ${r.nutrition.calories} kcal | <strong>Protein:</strong> ${r.nutrition.protein_g}g | <strong>Fat:</strong> ${r.nutrition.fat_g}g | <strong>Carbs:</strong> ${r.nutrition.carbs_g}g</p>`
      : "";

    card.innerHTML = `
      <h3>${emojis} ${r.name}</h3>
      <p><strong>Ingredients:</strong> ${r.ingredients.join(", ")}</p>
      <p>${r.instructions}</p>
      <p><strong>Prep:</strong> ${r.prep_time_min || 0} min | <strong>Cook:</strong> ${r.cook_time_min || 0} min | <strong>Heat:</strong> ${r.heat || "N/A"}</p>
      ${nutritionText}
    `;
    card.appendChild(removeBtn);
    favoritesDiv.appendChild(card);
  });
}

// -----------------
// Initialize & Search
// -----------------
async function initializeApp() {
  allRecipes = await loadRecipes();
  createIngredientBoxes(getAllIngredients(allRecipes));
  renderFavorites();
}

async function performSearch() {
  const ingredients = getSelectedIngredients();
  const allergens = getSelectedAllergens();
  if (!ingredients.length) return alert("Select at least one ingredient!");
  currentResults = findRecipes(ingredients, allRecipes, allergens);
  renderRecipes(currentResults);
}

// -----------------
// Event Listeners
// -----------------
document.getElementById('search-btn').addEventListener('click', performSearch);
window.addEventListener('load', initializeApp);
