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

// Tab elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Search elements
const searchBtn = document.getElementById('search-btn');
const resultsDiv = document.getElementById('results');

// General Comments elements
const generalCommentsContainer = document.getElementById('general-comments-container');
const generalCommentTextarea = document.getElementById('general-comment-textarea');
const generalCommentBtn = document.getElementById('general-comment-btn');

// Weekly Plan elements
const weeklyPlanContainer = document.getElementById('weekly-plan-container');
const planModal = document.getElementById('plan-modal');
const planModalClose = document.getElementById('plan-modal-close');
const planRecipeName = document.getElementById('plan-recipe-name');
const planDaySelect = document.getElementById('plan-day-select');
const planMealSelect = document.getElementById('plan-meal-select');
const planConfirmBtn = document.getElementById('plan-confirm-btn');

// Recipe Comments Modal elements
const recipeCommentModal = document.getElementById('recipe-comment-modal');
const recipeCommentModalClose = document.getElementById('recipe-comment-modal-close');
const commentRecipeName = document.getElementById('comment-recipe-name');
const recipeCommentsList = document.getElementById('recipe-comments-list');
const recipeCommentTextarea = document.getElementById('recipe-comment-textarea');
const recipeCommentBtn = document.getElementById('recipe-comment-btn');


// State Variables
let allRecipes = [];
let currentResults = [];
let currentUser = null;
let selectedRecipeForPlan = null;
let selectedRecipeForComment = null; 

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
        document.getElementById('ingredients-container').innerHTML = `<div class="no-results">Error loading recipes: ${err.message}</div>`;
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
    const defaultPlan = { Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {}, Saturday: {} };
    ['breakfast','lunch','dinner'].forEach(meal => {
        Object.keys(defaultPlan).forEach(day => defaultPlan[day][meal] = null);
    });
    const storedPlan = JSON.parse(localStorage.getItem(key) || '{}');
    const plan = { ...defaultPlan };
    for (const day in storedPlan) {
        if (plan[day]) {
            plan[day] = { ...plan[day], ...storedPlan[day] };
        }
    }
    return plan;
}
function saveMealPlan(username, mealPlan) { localStorage.setItem(`mealPlan_${username}`, JSON.stringify(mealPlan)); }

// -----------------
// Emoji mapping 
// -----------------
function getIngredientEmoji(ingredient) {
    const mapping = { "bread":"🥖","pasta":"🍝","cheese":"🧀","milk":"🥛","nuts":"🌰","eggs":"🥚","butter":"🧈","avocado":"🥑","tomato":"🍅","banana":"🍌","strawberry":"🍓","lettuce":"🥬","rice":"🍚","peanut butter":"🥜","jelly":"🍇","naan":"🍞","soy sauce":"🧂","olive oil":"🫒","salt":"🧂","tomato sauce":"🍅","chicken":"🍗","beef":"🥩","pork":"🥓","fish":"🐟","tuna":"🐟"};
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
    
    renderFavorites(); 
    renderGeneralComments(); 
    renderWeeklyPlan();
    
    // Default to the first tab (Search)
    switchTab('search');
}

function showAuth(){
    authDiv.style.display='flex';
    mainContent.style.display='none';
    usernameInput.value=''; passwordInput.value=''; currentUser=null;
    localStorage.removeItem('currentUser');
    
    // Clear dynamic content on sign out
    resultsDiv.innerHTML = '';
    document.getElementById('favorites-list').innerHTML = '';
}

// Attach event listeners for auth buttons
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
signOutBtn.addEventListener('click', ()=>{ showAuth(); });

// -----------------
// Tabs Logic 
// -----------------
function switchTab(tabId) {
    tabContents.forEach(content => content.style.display = 'none');
    tabButtons.forEach(button => button.classList.remove('active'));

    const activeContent = document.getElementById(tabId);
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    
    if (activeContent) activeContent.style.display = 'block';
    if (activeButton) activeButton.classList.add('active');

    // Re-render content specific to the tab being activated
    if (tabId === 'favorites') renderFavorites();
    if (tabId === 'plan') renderWeeklyPlan();
    if (tabId === 'general-comments') renderGeneralComments();
}

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        switchTab(button.getAttribute('data-tab'));
    });
});

// -----------------
// Ingredient Boxes (Filters)
// -----------------
function getAllIngredients(){ 
    const s=new Set(); 
    allRecipes.forEach(r=>r.ingredients.forEach(i=>s.add(i.toLowerCase()))); 
    return Array.from(s).sort(); 
}

function createIngredientBoxes(){
    const container=document.getElementById('ingredients-container');
    container.innerHTML='';
    if(allRecipes.length===0){ container.innerHTML='<div class="no-results">Loading recipes...</div>'; return; }
    
    const ingredients=getAllIngredients();
    if(ingredients.length===0){ container.innerHTML='<div class="no-results">No ingredients found.</div>'; return; }
    
    ingredients.forEach(ing=>{
        const box=document.createElement('div'); 
        box.className='ingredient-box';
        const emoji=getIngredientEmoji(ing); 
        box.textContent=`${emoji} ${ing}`;
        box.title = `Filter by ${ing}`;
        
        box.addEventListener('click',()=>box.classList.toggle('selected'));
        container.appendChild(box);
    });
}

function getSelectedIngredients(){ 
    return Array.from(document.querySelectorAll('#ingredients-container .ingredient-box.selected'))
        .map(b => b.textContent.replace(/[^a-z\s]/gi, '').trim().toLowerCase()); 
}
function getSelectedAllergens(){ return Array.from(document.querySelectorAll('.allergy-filter:checked')).map(b=>b.value.toLowerCase()); }

// -----------------
// Recipe Filtering
// -----------------
function findRecipes(selectedIngredients,selectedAllergens){
    if (selectedIngredients.length === 0 && selectedAllergens.length === 0) return allRecipes; // Return all if no filters applied

    return allRecipes.filter(recipe=>{
        const recipeIngredients = recipe.ingredients.map(i=>i.toLowerCase());
        
        // 1. Check allergens first
        for(const allergen of selectedAllergens){ 
            if(allergensMatch(recipeIngredients,allergen)) return false; 
        }
        
        // 2. Inventory Matching Logic (Recipe ingredients must be subset of selected ingredients)
        if (selectedIngredients.length > 0) {
            return recipeIngredients.every(i => selectedIngredients.includes(i));
        }

        // If no ingredients are selected, but an allergen filter was applied, the recipe passed the allergen filter
        return true; 
    });
}

function allergensMatch(recipeIngredients,allergen){
    if(allergen==='gluten') return recipeIngredients.some(i=>i.includes('bread')||i.includes('pasta')||i.includes('naan')||i.includes('flour') || i.includes('oats'));
    if(allergen==='nuts') return recipeIngredients.some(i=>i.includes('nuts')||i.includes('peanut')||i.includes('almond')||i.includes('pecan'));
    if(allergen==='dairy') return recipeIngredients.some(i=>i.includes('cheese')||i.includes('milk')||i.includes('butter')||i.includes('cream')||i.includes('mayonnaise'));
    return false;
}

// -----------------
// Recipe Actions (Favorite, Comment, Plan)
// -----------------
function toggleFavorite(recipeName) {
    if (!currentUser) return alert('Please sign in to save favorites.');
    
    let favorites = getFavorites(currentUser);
    const index = favorites.findIndex(f => f.name === recipeName);

    if (index === -1) {
        const recipe = allRecipes.find(r => r.name === recipeName);
        if (recipe) favorites.push(recipe);
    } else {
        favorites.splice(index, 1);
    }

    saveFavorites(currentUser, favorites);
    
    // Re-render relevant sections
    renderRecipes(currentResults, 'results');
    if (document.querySelector('.tab-button[data-tab="favorites"]').classList.contains('active')) {
        renderFavorites();
    }
}

function openPlanModal(recipeName) {
    if (!currentUser) return alert('Please sign in to create a meal plan.');
    
    selectedRecipeForPlan = allRecipes.find(r => r.name === recipeName);
    if (!selectedRecipeForPlan) return;

    planRecipeName.textContent = selectedRecipeForPlan.name;
    planModal.style.display = 'flex';
}

function openCommentModal(recipeName) {
    if (!currentUser) return alert('Please sign in to view and leave comments.');
    
    selectedRecipeForComment = allRecipes.find(r => r.name === recipeName);
    if (!selectedRecipeForComment) return;

    commentRecipeName.textContent = `Comments for ${selectedRecipeForComment.name}`;
    renderRecipeComments(selectedRecipeForComment.name);
    recipeCommentTextarea.value = '';
    recipeCommentModal.style.display = 'flex';
}


// -----------------
// Render Recipes
// -----------------
function createRecipeCard(recipe, isFavoriteView=false){
    const card = document.createElement('div'); 
    card.className = 'recipe-card';
    card.setAttribute('data-recipe-name', recipe.name);

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');
    const isFavorited = currentUser ? getFavorites(currentUser).some(f=>f.name===recipe.name) : false;
    const favBtnClass = isFavorited ? 'fav-btn favorited' : 'fav-btn';
    const favBtnText = isFavorited ? '❤️ Favorited' : '🤍 Favorite';
    
    // Defensive Coding Fix (Retained)
    const calories = recipe.nutrition?.calories ?? 'N/A';
    const protein = recipe.nutrition?.protein_g ?? 'N/A';
    const fat = recipe.nutrition?.fat_g ?? 'N/A';
    const carbs = recipe.nutrition?.carbs_g ?? 'N/A';

    card.innerHTML = `
        <h3>${emojis} ${recipe.name}</h3>
        <div class="recipe-details">
            <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
            <p><strong>Instructions:</strong> ${recipe.instructions.substring(0, 100)}...</p>
            <p><strong>Time:</strong> ${recipe.prep_time_min} min prep, ${recipe.cook_time_min} min cook</p>
            <p><strong>Nutrition:</strong> ${calories} kcal (P: ${protein}g, F: ${fat}g, C: ${carbs}g)</p>
        </div>
        <div class="recipe-actions">
            ${currentUser ? `<button class="${favBtnClass}" data-action="favorite">${favBtnText}</button>` : ''}
            <button class="add-to-plan-btn btn-secondary" data-action="plan">📅 Add to Plan</button>
            <button class="comment-btn btn-secondary" data-action="comment">💬 Comments</button>
            ${isFavoriteView ? `<button class="remove-btn btn-secondary" data-action="remove-favorite">❌ Remove</button>` : ''}
        </div>
    `;

    // Attach event listeners
    card.querySelector('[data-action="plan"]').addEventListener('click', () => openPlanModal(recipe.name));
    card.querySelector('[data-action="comment"]').addEventListener('click', () => openCommentModal(recipe.name));
    if (currentUser) {
        card.querySelector('[data-action="favorite"]').addEventListener('click', () => toggleFavorite(recipe.name));
    }
    if (isFavoriteView) {
        card.querySelector('[data-action="remove-favorite"]').addEventListener('click', () => toggleFavorite(recipe.name));
    }

    return card;
}

/**
 * FIX: This function now correctly iterates over the found recipes and 
 * calls createRecipeCard to render them to the DOM.
 */
function renderRecipes(recipes, containerId='results', isFavoriteView = false){
    const container = document.getElementById(containerId);
    container.innerHTML=''; // Clear existing content (e.g., "No matches found")

    if(!recipes.length){ 
        container.innerHTML='<div class="no-results">No recipes found. Try adjusting your selections!</div>'; 
        return; 
    }

    recipes.forEach(recipe=>{
        const card = createRecipeCard(recipe, isFavoriteView);
        container.appendChild(card);
    });
}

function renderFavorites() {
    if (!currentUser) {
        document.getElementById('favorites-list').innerHTML = '<div class="no-results">Sign in to view your favorites.</div>';
        return;
    }
    const favorites = getFavorites(currentUser);
    renderRecipes(favorites, 'favorites-list', true);
}


// -----------------
// Comments Logic (Retained)
// -----------------
function renderGeneralComments() {
    const comments = getGeneralComments();
    generalCommentsContainer.innerHTML = '';

    if (comments.length === 0) {
        generalCommentsContainer.innerHTML = '<div class="no-results">Be the first to leave a comment!</div>';
        return;
    }

    comments.slice().reverse().forEach(comment => { 
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        commentDiv.innerHTML = `<span class="comment-author">${comment.user}:</span> ${comment.text}`;
        generalCommentsContainer.appendChild(commentDiv);
    });
}

generalCommentBtn.addEventListener('click', () => {
    if (!currentUser) return alert('Please sign in to leave a comment.');
    const text = generalCommentTextarea.value.trim();
    if (!text) return;

    const comments = getGeneralComments();
    comments.push({ user: currentUser, text: text, timestamp: new Date().toISOString() });
    saveGeneralComments(comments);

    generalCommentTextarea.value = '';
    renderGeneralComments();
});

function renderRecipeComments(recipeName) {
    const comments = getRecipeComments(recipeName);
    recipeCommentsList.innerHTML = '';

    if (comments.length === 0) {
        recipeCommentsList.innerHTML = '<div class="no-results">No comments yet. Share your thoughts!</div>';
        return;
    }
    
    comments.slice().reverse().forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'recipe-comment';
        commentDiv.innerHTML = `<span class="comment-author">${comment.user}:</span> ${comment.text}`;
        recipeCommentsList.appendChild(commentDiv);
    });
}

recipeCommentBtn.addEventListener('click', () => {
    if (!currentUser || !selectedRecipeForComment) return;
    const text = recipeCommentTextarea.value.trim();
    if (!text) return;

    const recipeName = selectedRecipeForComment.name;
    const comments = getRecipeComments(recipeName);
    comments.push({ user: currentUser, text: text, timestamp: new Date().toISOString() });
    saveRecipeComments(recipeName, comments);

    recipeCommentTextarea.value = '';
    renderRecipeComments(recipeName);
});

recipeCommentModalClose.addEventListener('click', () => {
    recipeCommentModal.style.display = 'none';
    selectedRecipeForComment = null;
});


// -----------------
// Weekly Plan Logic (Retained)
// -----------------
function renderWeeklyPlan() {
    const plan = currentUser ? getMealPlan(currentUser) : null;
    weeklyPlanContainer.innerHTML = '';
    
    if (!plan) {
        weeklyPlanContainer.innerHTML = '<div class="no-results">Sign in to start your weekly meal plan.</div>';
        return;
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const meals = ['breakfast', 'lunch', 'dinner'];

    days.forEach(day => {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.innerHTML = `<h4>${day}</h4>`;

        meals.forEach(meal => {
            const recipe = plan[day][meal];
            const content = recipe ? 
                `<span class="meal-content">${recipe.name} <button class="remove-btn" data-day="${day}" data-meal="${meal}">X</button></span>` :
                `Empty Slot`;

            const mealSlot = document.createElement('div');
            mealSlot.className = 'meal-slot';
            mealSlot.innerHTML = `<strong>${meal.charAt(0).toUpperCase() + meal.slice(1)}:</strong> ${content}`;

            dayCard.appendChild(mealSlot);
        });

        weeklyPlanContainer.appendChild(dayCard);
    });
}

// Remove meal from plan via delegation
weeklyPlanContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
        const day = e.target.getAttribute('data-day');
        const meal = e.target.getAttribute('data-meal');
        
        if (currentUser && day && meal) {
            const plan = getMealPlan(currentUser);
            plan[day][meal] = null;
            saveMealPlan(currentUser, plan);
            renderWeeklyPlan();
        }
    }
});

planModalClose.addEventListener('click', () => {
    planModal.style.display = 'none';
    selectedRecipeForPlan = null;
});

planConfirmBtn.addEventListener('click', () => {
    const day = planDaySelect.value;
    const meal = planMealSelect.value;

    if (!day || !meal || !selectedRecipeForPlan) return alert('Please select a day and meal.');

    const plan = getMealPlan(currentUser);
    // Save minimal data to meal plan
    const recipeStub = { 
        name: selectedRecipeForPlan.name
    };
    
    plan[day][meal] = recipeStub;
    saveMealPlan(currentUser, plan);
    alert(`${selectedRecipeForPlan.name} added to your ${day} ${meal}!`);

    planModal.style.display = 'none';
    selectedRecipeForPlan = null;
    renderWeeklyPlan(); // Update the plan tab
});


// -----------------
// Search Button Action
// -----------------
searchBtn.addEventListener('click',()=>{
    const selectedIngredients=getSelectedIngredients();
    const selectedAllergens=getSelectedAllergens();
    
    console.log("Search button clicked!");
    console.log("Selected Ingredients:", selectedIngredients);
    
    if(selectedIngredients.length === 0 && selectedAllergens.length === 0){ 
        alert('Select at least one ingredient or allergen filter!'); 
        return; 
    }

    currentResults=findRecipes(selectedIngredients,selectedAllergens);
    console.log("Found Recipes:", currentResults.length);
    renderRecipes(currentResults, 'results');
});

// -----------------
// Initialize
// -----------------
window.addEventListener('load',async()=>{
    await loadRecipes(); 
    createIngredientBoxes();
    
    // Check for a remembered user
    const rememberedUser = localStorage.getItem('currentUser');
    if (rememberedUser) {
        showMainContent(rememberedUser);
    } else {
        showAuth();
    }
});
