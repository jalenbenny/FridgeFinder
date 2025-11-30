// -----------------
// Account & Authentication
// -----------------
let accounts = JSON.parse(localStorage.getItem('accounts')) || {};

const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const signOutDiv = document.getElementById('signOutDiv');
const displayUser = document.getElementById('displayUser');

const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');

const showSignUpLink = document.getElementById('showSignUp');
const showSignInLink = document.getElementById('showSignIn');

function saveAccounts() {
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

// Show Sign Up form
showSignUpLink.addEventListener('click', () => {
  signInForm.style.display = 'none';
  signUpForm.style.display = 'block';
});

// Show Sign In form
showSignInLink.addEventListener('click', () => {
  signUpForm.style.display = 'none';
  signInForm.style.display = 'block';
});

// Sign Up
signUpBtn.addEventListener('click', () => {
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if (!username || !password) return alert("Enter username and password");

  if (accounts[username]) {
    return alert("Username already exists");
  }

  accounts[username] = { password, favorites: [] };
  saveAccounts();
  alert("Account created! You can now sign in.");
  signUpForm.style.display = 'none';
  signInForm.style.display = 'block';
});

// Sign In
signInBtn.addEventListener('click', () => {
  const username = document.getElementById('signinUsername').value.trim();
  const password = document.getElementById('signinPassword').value.trim();

  if (!accounts[username] || accounts[username].password !== password) {
    return alert("Invalid username or password");
  }

  localStorage.setItem('user', username);
  showSignedIn(username);
  renderFavorites();
});

// Sign Out
signOutBtn.addEventListener('click', () => {
  localStorage.removeItem('user');
  showSignedOut();
  renderFavorites();
});

function showSignedIn(username) {
  signInForm.style.display = 'none';
  signUpForm.style.display = 'none';
  signOutDiv.style.display = 'block';
  displayUser.textContent = username;
}

function showSignedOut() {
  signInForm.style.display = 'block';
  signOutDiv.style.display = 'none';
  signUpForm.style.display = 'none';
  document.getElementById('signinUsername').value = '';
  document.getElementById('signinPassword').value = '';
  document.getElementById('signupUsername').value = '';
  document.getElementById('signupPassword').value = '';
}

// On load, check if user is already signed in
const currentUser = localStorage.getItem('user');
if (currentUser) showSignedIn(currentUser);

// -----------------
// Recipe App Logic
// -----------------
let allRecipes = [];
let currentResults = [];

// Load recipes
async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(e);
    alert("Failed to load recipes.json");
    return [];
  }
}

// Ingredients helpers
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
  return Array.from(document.querySelectorAll('.ingredient-box.selected'))
              .map(box => box.textContent.toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll('.allergy-filter:checked'))
              .map(box => box.value.toLowerCase());
}

// Ingredient emojis
function getIngredientEmoji(ingredient) {
  const map = {
    "bread":"🥖","pasta":"🍝","cheese":"🧀","milk":"🥛","nuts":"🌰",
    "eggs":"🥚","butter":"🧈","avocado":"🥑","tomato":"🍅","banana":"🍌",
    "strawberry":"🍓","lettuce":"🥬","rice":"🍚","peanut butter":"🥜",
    "jelly":"🍇","naan":"🍞","soy sauce":"🧂","olive oil":"🫒","salt":"🧂","tomato sauce":"🍅"
  };
  for (const key in map) if (ingredient.includes(key)) return map[key];
  return "";
}

// Recipe filtering
function findRecipes(userIngredients, recipes, selectedAllergens) {
  if (userIngredients.length === 0) return [];
  return recipes.filter(r => {
    const ing = r.ingredients.map(i=>i.toLowerCase());
    // Allergens
    for (const a of selectedAllergens) {
      if (ing.some(i=>{
        if(a==="gluten") return i.includes("bread")||i.includes("pasta")||i.includes("naan");
        if(a==="nuts") return i.includes("nuts")||i.includes("peanut")||i.includes("almond");
        if(a==="dairy") return i.includes("cheese")||i.includes("milk")||i.includes("butter");
        return false;
      })) return false;
    }
    return ing.some(i => userIngredients.includes(i));
  });
}

// Render recipes
function renderRecipes(recipes) {
  const div = document.getElementById('results');
  div.innerHTML = '';
  if (recipes.length===0) {
    div.innerHTML = '<div class="no-results">No matches found.</div>';
    return;
  }
  const username = localStorage.getItem('user');
  recipes.forEach(r=>{
    const card = document.createElement('div');
    card.className='recipe-card';
    const emojis = r.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');
    const favBtn = document.createElement('button');
    favBtn.className='fav-btn';
    favBtn.textContent = username && accounts[username].favorites.some(f=>f.name===r.name) ? '★ Favorited' : '☆ Favorite';
    favBtn.addEventListener('click', ()=>toggleFavorite(r));
    card.innerHTML = `<h3>${emojis} ${r.name}</h3>
      <p><strong>Ingredients:</strong> ${r.ingredients.join(', ')}</p>
      <p>${r.instructions}</p>`;
    card.appendChild(favBtn);
    div.appendChild(card);
  });
}

// Favorites per user
function toggleFavorite(recipe){
  const username = localStorage.getItem('user');
  if(!username) return alert("Sign in to favorite recipes");
  const favs = accounts[username].favorites || [];
  const idx = favs.findIndex(f=>f.name===recipe.name);
  if(idx>-1) favs.splice(idx,1);
  else favs.push(recipe);
  accounts[username].favorites=favs;
  saveAccounts();
  renderFavorites();
  renderRecipes(currentResults);
}

function renderFavorites(){
  const div = document.getElementById('favorites');
  const username = localStorage.getItem('user');
  if(!username) return div.innerHTML='<div class="no-results">Sign in to save favorites!</div>';
  const favs = accounts[username].favorites || [];
  if(favs.length===0) div.innerHTML='<div class="no-results">No favorites yet.</div>';
  else {
    div.innerHTML='';
    favs.forEach(r=>{
      const card = document.createElement('div');
      card.className='recipe-card';
      const emojis = r.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');
      const rmBtn = document.createElement('button');
      rmBtn.className='fav-btn';
      rmBtn.textContent='★ Remove';
      rmBtn.addEventListener('click', ()=>{
        const index = accounts[username].favorites.findIndex(f=>f.name===r.name);
        if(index>-1) accounts[username].favorites.splice(index,1);
        saveAccounts();
        renderFavorites();
        renderRecipes(currentResults);
      });
      card.innerHTML = `<h3>${emojis} ${r.name}</h3>
        <p><strong>Ingredients:</strong> ${r.ingredients.join(', ')}</p>
        <p>${r.instructions}</p>`;
      card.appendChild(rmBtn);
      div.appendChild(card);
    });
  }
}

// Search
async function performSearch(){
  const userIng = getSelectedIngredients();
  const allergens = getSelectedAllergens();
  if(userIng.length===0) return alert("Select ingredients!");
  currentResults = findRecipes(userIng,allRecipes,allergens);
  renderRecipes(currentResults);
}

// Initialize
async function initializeApp(){
  allRecipes = await loadRecipes();
  createIngredientBoxes(getAllIngredients(allRecipes));
  renderFavorites();
}

document.getElementById('search-btn').addEventListener('click',performSearch);
window.addEventListener('load',initializeApp);
