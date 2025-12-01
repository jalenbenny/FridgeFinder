// -----------------
// DOM Elements
// -----------------
const authDiv = document.getElementById('authDiv');
const mainContent = document.getElementById('mainContent');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const signOutBtn = document.getElementById('signOutBtn');
const displayUser = document.getElementById('displayUser');
const authMessage = document.getElementById('authMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

let allRecipes = [];
let currentResults = [];
let currentUser = null;
let selectedRecipeForPlan = null;

// -----------------
// Load Recipes JSON
// -----------------
async function loadRecipes() {
    try {
        const res = await fetch('data/recipes.json');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        allRecipes = await res.json();
        console.log('Recipes loaded:', allRecipes.length);
    } catch (err) {
        console.error('Failed to load recipes.json:', err);
        alert('Error loading recipes.json: ' + err.message);
    }
}

// -----------------
// LocalStorage Helpers
// -----------------
function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUser(username, password) { const users = getUsers(); users[username] = password; localStorage.setItem('users', JSON.stringify(users)); }
function getFavorites(username) { return JSON.parse(localStorage.getItem(`favorites_${username}`) || '[]'); }
function saveFavorites(username, favorites) { localStorage.setItem(`favorites_${username}`, JSON.stringify(favorites)); }
function getRecipeComments(recipeName) { return JSON.parse(localStorage.getItem(`comments_${recipeName}`) || '[]'); }
function saveRecipeComments(recipeName, comments) { localStorage.setItem(`comments_${recipeName}`, JSON.stringify(comments)); }
function getGeneralComments() { return JSON.parse(localStorage.getItem('generalComments') || '[]'); }
function saveGeneralComments(comments) { localStorage.setItem('generalComments', JSON.stringify(comments)); }
function getMealPlan(username) {
    const key = `mealPlan_${username}`;
    const defaultPlan = { Saturday: {}, Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} };
    ['breakfast','lunch','dinner'].forEach(meal => {
        Object.keys(defaultPlan).forEach(day => defaultPlan[day][meal] = null);
    });
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultPlan));
}
function saveMealPlan(username, mealPlan) { localStorage.setItem(`mealPlan_${username}`, JSON.stringify(mealPlan)); }

// -----------------
// Emoji mapping
// -----------------
function getIngredientEmoji(ingredient) {
    const mapping = { "bread":"🥖","pasta":"🍝","cheese":"🧀","milk":"🥛","nuts":"🌰","eggs":"🥚","butter":"🧈","avocado":"🥑","tomato":"🍅","banana":"🍌","strawberry":"🍓","lettuce":"🥬","rice":"🍚","peanut butter":"🥜","jelly":"🍇","naan":"🍞","soy sauce":"🧂","olive oil":"🫒","salt":"🧂","tomato sauce":"🍅"};
    for(const key in mapping){ if(ingredient.toLowerCase().includes(key)) return mapping[key]; }
    return "";
}

// -----------------
// Authentication Logic
// -----------------
function showMainContent(username){
    authDiv.style.display='none';
    mainContent.style.display='block';
    displayUser.textContent=username;
    currentUser=username;
    localStorage.setItem('currentUser',username);
    renderFavorites(); renderGeneralComments(); renderWeeklyPlan();
}
function showAuth(){
    authDiv.style.display='flex';
    mainContent.style.display='none';
    usernameInput.value=''; passwordInput.value=''; currentUser=null;
    localStorage.removeItem('currentUser');
}

signInBtn.addEventListener('click', ()=>{
    const user=usernameInput.value.trim(), pass=passwordInput.value;
    if(!user||!pass){ authMessage.textContent='Enter username and password'; return; }
    const users=getUsers();
    if(users[user]&&users[user]===pass){ showMainContent(user); authMessage.textContent=''; }
    else authMessage.textContent='Invalid username or password';
});
signUpBtn.addEventListener('click', ()=>{
    const user=usernameInput.value.trim(), pass=passwordInput.value;
    if(!user||!pass){ authMessage.textContent='Enter username and password'; return; }
    const users=getUsers();
    if(users[user]){ authMessage.textContent='Username already exists'; return; }
    saveUser(user,pass); showMainContent(user); authMessage.textContent='';
});
signOutBtn.addEventListener('click', ()=>{ showAuth(); renderFavorites(); });

// -----------------
// Ingredient Boxes
// -----------------
function getAllIngredients(){ const s=new Set(); allRecipes.forEach(r=>r.ingredients.forEach(i=>s.add(i.toLowerCase()))); return Array.from(s).sort(); }
function createIngredientBoxes(){
    const container=document.getElementById('ingredients-container');
    container.innerHTML='';
    if(allRecipes.length===0){ container.innerHTML='<div class="no-results">Loading recipes...</div>'; return; }
    const ingredients=getAllIngredients();
    if(ingredients.length===0){ container.innerHTML='<div class="no-results">No ingredients found.</div>'; return; }
    ingredients.forEach(ing=>{
        const box=document.createElement('div'); box.className='ingredient-box';
        const emoji=getIngredientEmoji(ing); box.textContent=`${emoji} ${ing}`;
        box.addEventListener('click',()=>box.classList.toggle('selected'));
        container.appendChild(box);
    });
}
function getSelectedIngredients(){ return Array.from(document.querySelectorAll('.ingredient-box.selected')).map(b=>b.textContent.replace(/[^\w\s]/g,'').trim().toLowerCase()); }
function getSelectedAllergens(){ return Array.from(document.querySelectorAll('.allergy-filter:checked')).map(b=>b.value.toLowerCase()); }

// -----------------
// Find Recipes
// -----------------
function findRecipes(selectedIngredients,selectedAllergens){
    return allRecipes.filter(recipe=>{
        const ing = recipe.ingredients.map(i=>i.toLowerCase());
        // check allergens first
        for(const allergen of selectedAllergens){ if(allergensMatch(ing,allergen)) return false; }
        // must include all selected ingredients
        return selectedIngredients.every(sel => ing.includes(sel));
    });
}
function allergensMatch(recipeIngredients,allergen){
    if(allergen==='gluten') return recipeIngredients.some(i=>i.includes('bread')||i.includes('pasta')||i.includes('naan'));
    if(allergen==='nuts') return recipeIngredients.some(i=>i.includes('nuts')||i.includes('peanut')||i.includes('almond'));
    if(allergen==='dairy') return recipeIngredients.some(i=>i.includes('cheese')||i.includes('milk')||i.includes('butter'));
    return false;
}

// -----------------
// Render Recipes
// -----------------
function renderRecipes(recipes){
    const resultsDiv=document.getElementById('results');
    resultsDiv.innerHTML='';
    if(!recipes.length){ resultsDiv.innerHTML='<div class="no-results">No matches found!</div>'; return; }
    recipes.forEach(recipe=>{
        const card=document.createElement('div'); card.className='recipe-card';
        const emojis=recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');
        const favorites=getFavorites(currentUser);
        const isFavorited=favorites.some(f=>f.name===recipe.name);
        card.innerHTML=`
            <h3>${emojis} ${recipe.name}</h3>
            <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
            <p><strong>Instructions:</strong> ${recipe.instructions}</p>
            <p><strong>Prep:</strong> ${recipe.prep_time_min} min, <strong>Cook:</strong> ${recipe.cook_time_min} min at ${recipe.heat}</p>
            <p><strong>Nutrition:</strong> ${recipe.nutrition.calories} kcal, ${recipe.nutrition.protein_g}g protein, ${recipe.nutrition.fat_g}g fat, ${recipe.nutrition.carbs_g}g carbs</p>
        `;
        resultsDiv.appendChild(card);
    });
}

// -----------------
// Search Button
// -----------------
document.getElementById('search-btn').addEventListener('click',()=>{
    const selectedIngredients=getSelectedIngredients();
    const selectedAllergens=getSelectedAllergens();
    if(!selectedIngredients.length){ alert('Select at least one ingredient!'); return; }
    currentResults=findRecipes(selectedIngredients,selectedAllergens);
    renderRecipes(currentResults);
});

// -----------------
// Initialize
// -----------------
window.addEventListener('load',async()=>{
    await loadRecipes(); createIngredientBoxes();
});
