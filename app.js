// -----------------
// User Authentication
// -----------------
const signupBtn = document.getElementById('signupBtn');
const signinBtn = document.getElementById('signinBtn');
const signOutBtn = document.getElementById('signOutBtn');
const displayUser = document.getElementById('displayUser');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const signOutDiv = document.getElementById('signOutDiv');

// Check logged in user
let currentUser = localStorage.getItem('loggedInUser');
if (currentUser) showSignedIn(currentUser);

// --- Sign Up ---
signupBtn.addEventListener('click', () => {
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if (!username || !password) return alert("Enter username and password!");

  const users = JSON.parse(localStorage.getItem('users') || '{}');
  if (users[username]) return alert("Username already exists!");

  users[username] = { password };
  localStorage.setItem('users', JSON.stringify(users));

  alert("Account created! Please sign in.");
  document.getElementById('signupUsername').value = '';
  document.getElementById('signupPassword').value = '';
});

// --- Sign In ---
signinBtn.addEventListener('click', () => {
  const username = document.getElementById('signinUsername').value.trim();
  const password = document.getElementById('signinPassword').value.trim();
  const users = JSON.parse(localStorage.getItem('users') || '{}');

  if (!username || !password) return alert("Enter username and password!");
  if (!users[username] || users[username].password !== password) return alert("Invalid username/password");

  localStorage.setItem('loggedInUser', username);
  currentUser = username;
  showSignedIn(username);
  renderFavorites();
  renderComments();
});

// --- Sign Out ---
signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('loggedInUser');
  currentUser = null;
  showSignedOut();
  renderFavorites();
  renderComments();
});

function showSignedIn(username) {
  signInForm.style.display = 'none';
  signUpForm.style.display = 'none';
  signOutDiv.style.display = 'block';
  displayUser.textContent = username;
}

function showSignedOut() {
  signInForm.style.display = 'block';
  signUpForm.style.display = 'block';
  signOutDiv.style.display = 'none';
}

// -----------------
// Recipe & Ingredients
// -----------------
let allRecipes = [];
let currentResults = [];

async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Could not load recipes.");
    return [];
  }
}

function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(r => r.ingredients.forEach(i => ingredients.add(i.toLowerCase())));
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  const container = document.getElementById("ingredients-container");
  container.innerHTML = "";
  ingredients.forEach(ing => {
    const box = document.createElement("div");
    box.className = "ingredient-box";
    box.textContent = ing;
    box.addEventListener("click", () => box.classList.toggle("selected"));
    container.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll(".ingredient-box.selected")).map(b => b.textContent.toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll(".allergy-filter:checked")).map(b => b.value.toLowerCase());
}

// -----------------
// Emoji Helper
// -----------------
function getIngredientEmoji(ingredient) {
  const mapping = {
    "bread": "🥖","pasta": "🍝","cheese": "🧀","milk": "🥛",
    "nuts": "🌰","eggs": "🥚","butter": "🧈","avocado": "🥑",
    "tomato": "🍅","banana": "🍌","strawberry": "🍓",
    "lettuce": "🥬","rice": "🍚","peanut butter": "🥜",
    "jelly": "🍇","naan": "🍞","soy sauce": "🧂","olive oil": "🫒",
    "salt": "🧂","tomato sauce": "🍅"
  };
  for (let k in mapping) if (ingredient.includes(k)) return mapping[k];
  return "";
}

// -----------------
// Recipe Filtering
// -----------------
function findRecipes(userIngredients, recipes, allergens) {
  if (!userIngredients.length) return [];
  return recipes.filter(r => {
    const rIngs = r.ingredients.map(i=>i.toLowerCase());
    for (const allergen of allergens) {
      if (rIngs.some(i=>{
        if (allergen=="gluten") return i.includes("bread")||i.includes("pasta")||i.includes("naan");
        if (allergen=="nuts") return i.includes("nuts")||i.includes("peanut")||i.includes("almond");
        if (allergen=="dairy") return i.includes("cheese")||i.includes("milk")||i.includes("butter");
        return false;
      })) return false;
    }
    return rIngs.some(i=>userIngredients.includes(i));
  });
}

// -----------------
// Render Recipes
// -----------------
function getUserKey(recipeName) {
  return currentUser ? `${currentUser}_${recipeName}` : recipeName;
}

function renderRecipes(recipes) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!recipes.length) {
    resultsDiv.innerHTML = '<div class="no-results">No matches found!</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    // Favorite Button
    const favBtn = document.createElement("button");
    favBtn.className = "fav-btn";
    favBtn.textContent = localStorage.getItem(getUserKey(recipe.name)) ? "★ Favorited" : "☆ Favorite";
    favBtn.addEventListener("click", ()=>{
      const key = getUserKey(recipe.name);
      if (localStorage.getItem(key)) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(recipe));
      renderRecipes(currentResults);
      renderFavorites();
    });

    // Comment Section
    const commentDiv = document.createElement("div");
    commentDiv.className = "comment-section";

    // Comment Input
    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.placeholder = "Add a comment...";
    commentInput.className = "comment-input";

    const commentBtn = document.createElement("button");
    commentBtn.textContent = "Post";
    commentBtn.className = "comment-btn";

    commentBtn.addEventListener("click", ()=>{
      if (!currentUser) return alert("Sign in to comment!");
      const text = commentInput.value.trim();
      if (!text) return;
      const key = `comments_${recipe.name}`;
      const comments = JSON.parse(localStorage.getItem(key) || "[]");
      comments.push({username: currentUser, text, timestamp: Date.now()});
      localStorage.setItem(key, JSON.stringify(comments));
      commentInput.value = "";
      renderComments();
    });

    commentDiv.appendChild(commentInput);
    commentDiv.appendChild(commentBtn);

    card.innerHTML += `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</p>
      <p>${recipe.instructions}</p>
    `;
    card.appendChild(favBtn);
    card.appendChild(commentDiv);

    resultsDiv.appendChild(card);
  });

  renderComments();
}

// -----------------
// Render Favorites
// -----------------
function renderFavorites() {
  const favDiv = document.getElementById("favorites");
  favDiv.innerHTML = "";
  if (!currentUser) {
    favDiv.innerHTML = '<div class="no-results">Sign in to see favorites!</div>';
    return;
  }

  const favRecipes = Object.keys(localStorage)
    .filter(k=>k.startsWith(`${currentUser}_`))
    .map(k=>JSON.parse(localStorage.getItem(k)));

  if (!favRecipes.length) {
    favDiv.innerHTML = '<div class="no-results">No favorites yet!</div>';
    return;
  }

  favRecipes.forEach(r=>{
    const card = document.createElement("div");
    card.className = "recipe-card";
    const emojis = r.ingredients.map(getIngredientEmoji).filter(Boolean).join(" ");

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "★ Remove";
    removeBtn.className = "fav-btn";
    removeBtn.addEventListener("click", ()=>{
      localStorage.removeItem(getUserKey(r.name));
      renderFavorites();
      if (currentResults.length) renderRecipes(currentResults);
    });

    card.innerHTML = `<h3>${emojis} ${r.name}</h3>
      <p><strong>Ingredients:</strong> ${r.ingredients.join(", ")}</p>
      <p>${r.instructions}</p>`;

    card.appendChild(removeBtn);
    favDiv.appendChild(card);
  });
}

// -----------------
// Render Comments
// -----------------
function renderComments() {
  document.querySelectorAll(".recipe-card").forEach(card => {
    const recipeName = card.querySelector("h3").textContent.replace(/^[^ ]+ /,"");
    const key = `comments_${recipeName}`;
    const comments = JSON.parse(localStorage.getItem(key) || "[]");

    // Remove previous comment list
    const prevList = card.querySelector(".comment-list");
    if (prevList) prevList.remove();

    // Create new list
    const listDiv = document.createElement("div");
    listDiv.className = "comment-list";
    comments.forEach(c=>{
      const cDiv = document.createElement("div");
      cDiv.className = "comment";
      const time = new Date(c.timestamp).toLocaleString();
      cDiv.textContent = `${c.username}: ${c.text} (${time})`;
      listDiv.appendChild(cDiv);
    });

    card.querySelector(".comment-section").appendChild(listDiv);
  });
}

// -----------------
// Initialize App
// -----------------
async function initializeApp() {
  allRecipes = await loadRecipes();
  const ingredients = getAllIngredients(allRecipes);
  createIngredientBoxes(ingredients);
  renderFavorites();
}

document.getElementById("search-btn").addEventListener("click", () => {
  const selected = getSelectedIngredients();
  const allergens = getSelectedAllergens();
  if (!selected.length) return alert("Select at least one ingredient!");
  currentResults = findRecipes(selected, allRecipes, allergens);
  renderRecipes(currentResults);
});

window.addEventListener("load", initializeApp);
