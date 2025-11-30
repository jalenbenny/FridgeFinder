// -----------------
// Sign In / Create Account / Sign Out
// -----------------
const signInDiv = document.getElementById('signInDiv');
const signOutDiv = document.getElementById('signOutDiv');
const displayUser = document.getElementById('displayUser');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');

let currentUser = null;

// -----------------
// Initialize App
// -----------------
let allRecipes = [];
let currentResults = [];

window.addEventListener('load', async () => {
  await loadRecipes();
  checkSignedIn();
});

// -----------------
// Load Recipes
// -----------------
async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error("Failed to load recipes.json");
    allRecipes = await res.json();
    createIngredientBoxes(getAllIngredients(allRecipes));
  } catch (error) {
    console.error(error);
    alert("Error loading recipes. Make sure data/recipes.json exists.");
  }
}

// -----------------
// User Authentication
// -----------------
function checkSignedIn() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = savedUser;
    showSignedIn();
  } else {
    showSignIn();
  }
}

signInBtn.addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username || !password) return alert("Enter username and password!");

  const users = JSON.parse(localStorage.getItem('users') || '{}');
  if (!users[username]) return alert("User not found. Please sign up.");
  if (users[username].password !== password) return alert("Incorrect password!");

  currentUser = username;
  localStorage.setItem('currentUser', username);
  showSignedIn();
  renderFavorites();
});

signUpBtn.addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username || !password) return alert("Enter username and password!");

  const users = JSON.parse(localStorage.getItem('users') || '{}');
  if (users[username]) return alert("Username already exists!");

  users[username] = { password };
  localStorage.setItem('users', JSON.stringify(users));

  currentUser = username;
  localStorage.setItem('currentUser', username);
  showSignedIn();
  renderFavorites();
});

signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  currentUser = null;
  showSignIn();
  renderFavorites();
});

function showSignIn() {
  signInDiv.style.display = 'flex';
  signOutDiv.style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

function showSignedIn() {
  signInDiv.style.display = 'none';
  signOutDiv.style.display = 'flex';
  displayUser.textContent = currentUser;
}

// -----------------
// Ingredients
// -----------------
function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(r => r.ingredients.forEach(i => ingredients.add(i.toLowerCase())));
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  const container = document.getElementById("ingredients-container");
  container.innerHTML = "";
  ingredients.forEach(ingredient => {
    const box = document.createElement("div");
    box.className = "ingredient-box";
    box.textContent = ingredient;
    box.addEventListener('click', () => box.classList.toggle('selected'));
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

// -----------------
// Ingredient Emojis
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
function findRecipes(userIngredients, selectedAllergens) {
  return allRecipes.filter(recipe => {
    const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase());
    // check allergens
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
function renderRecipes(recipes) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";
  if (!recipes.length) {
    resultsDiv.innerHTML = '<div class="no-results">No matches found!</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");
    const nutritionText = recipe.nutrition ? 
      `<p><strong>Calories:</strong> ${recipe.nutrition.calories} kcal | <strong>Protein:</strong> ${recipe.nutrition.protein_g} g | <strong>Fat:</strong> ${recipe.nutrition.fat_g} g | <strong>Carbs:</strong> ${recipe.nutrition.carbs_g} g</p>` : "";

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p>${recipe.instructions}</p>
      <p><strong>Prep Time:</strong> ${recipe.prep_time_min} min | <strong>Cook Time:</strong> ${recipe.cook_time_min} min | <strong>Heat:</strong> ${recipe.heat}</p>
      ${nutritionText}
      <div class="comment-section" id="comments-${recipe.name.replace(/\s+/g,'')}">
        <h4>Comments</h4>
        <div class="comments-list"></div>
        ${currentUser ? `<input type="text" placeholder="Add a comment..." class="comment-input">
        <button class="comment-btn">Post</button>` : '<p>Sign in to comment</p>'}
      </div>
    `;
    resultsDiv.appendChild(card);

    // Comments
    if (currentUser) setupCommentSection(recipe);
  });
}

// -----------------
// Favorites
// -----------------
function getUserKey(recipeName) {
  return currentUser ? `${currentUser}_${recipeName}` : recipeName;
}

function toggleFavorite(recipe) {
  const key = getUserKey(recipe.name);
  if (localStorage.getItem(key)) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(recipe));
  renderRecipes(currentResults);
  renderFavorites();
}

function renderFavorites() {
  const favoritesDiv = document.getElementById("favorites");
  favoritesDiv.innerHTML = "";
  if (!currentUser) {
    favoritesDiv.innerHTML = '<div class="no-results">Sign in to see favorites!</div>';
    return;
  }

  const favs = Object.keys(localStorage)
    .filter(k => k.startsWith(currentUser + "_"))
    .map(k => JSON.parse(localStorage.getItem(k)));

  if (!favs.length) {
    favoritesDiv.innerHTML = '<div class="no-results">No favorite recipes yet!</div>';
    return;
  }

  favs.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");
    const nutritionText = recipe.nutrition ? 
      `<p><strong>Calories:</strong> ${recipe.nutrition.calories} kcal | <strong>Protein:</strong> ${recipe.nutrition.protein_g} g | <strong>Fat:</strong> ${recipe.nutrition.fat_g} g | <strong>Carbs:</strong> ${recipe.nutrition.carbs_g} g</p>` : "";

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p>${recipe.instructions}</p>
      <p><strong>Prep Time:</strong> ${recipe.prep_time_min} min | <strong>Cook Time:</strong> ${recipe.cook_time_min} min | <strong>Heat:</strong> ${recipe.heat}</p>
      ${nutritionText}
      <button class="fav-btn">★ Remove</button>
    `;
    favoritesDiv.appendChild(card);
    card.querySelector('.fav-btn').addEventListener('click', () => {
      localStorage.removeItem(getUserKey(recipe.name));
      renderFavorites();
      if (currentResults.length > 0) renderRecipes(currentResults);
    });
  });
}

// -----------------
// Comments / Community
// -----------------
function setupCommentSection(recipe) {
  const section = document.getElementById(`comments-${recipe.name.replace(/\s+/g,'')}`);
  const input = section.querySelector('.comment-input');
  const button = section.querySelector('.comment-btn');
  const commentsList = section.querySelector('.comments-list');

  const key = `${currentUser}_${recipe.name}_comments`;
  let comments = JSON.parse(localStorage.getItem(key) || '[]');
  renderComments();

  button.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    comments.push({ user: currentUser, text });
    localStorage.setItem(key, JSON.stringify(comments));
    input.value = '';
    renderComments();
  });

  function renderComments() {
    commentsList.innerHTML = comments.map(c => `<p><strong>${c.user}:</strong> ${c.text}</p>`).join('');
  }
}

// -----------------
// Search Button
// -----------------
document.getElementById('search-btn').addEventListener('click', () => {
  const selectedIngredients = getSelectedIngredients();
  const selectedAllergens = getSelectedAllergens();
  if (!selectedIngredients.length) return alert("Select at least one ingredient!");
  currentResults = findRecipes(selectedIngredients, selectedAllergens);
  renderRecipes(currentResults);
  renderFavorites();
});
