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

// Recipe/Search elements
const searchBtn = document.getElementById('search-btn');
const resultsDiv = document.getElementById('results');

// Comments elements
const generalCommentsContainer = document.getElementById('general-comments-container');
const generalCommentTextarea = document.getElementById('general-comment-textarea');
const generalCommentBtn = document.getElementById('general-comment-btn');

// Weekly Plan elements
const weeklyPlanContainer = document.getElementById('weekly-plan-container');
const planModal = document.getElementById('plan-modal');
const planModalContent = document.getElementById('plan-modal-content');
const planModalClose = document.getElementById('plan-modal-close');
const planRecipeName = document.getElementById('plan-recipe-name');
const planDaySelect = document.getElementById('plan-day-select');
const planMealSelect = document.getElementById('plan-meal-select');
const planConfirmBtn = document.getElementById('plan-confirm-btn');


// State Variables
let allRecipes = [];
let currentResults = [];
let currentUser = null;
let selectedRecipeForPlan = null;

// -----------------
// Load Recipes JSON
// -----------------
async function loadRecipes() {
    try {
        // Assume 'data/recipes.json' is accessible
        const res = await fetch('data/recipes.json'); 
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        allRecipes = await res.json();
        console.log('Recipes loaded:', allRecipes.length);
    } catch (err) {
        console.error('Failed to load recipes.json:', err);
        // Show user-friendly message
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
    // Initialize a full week plan with meal slots
    const defaultPlan = { Saturday: {}, Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} };
    ['breakfast','lunch','dinner'].forEach(meal => {
        Object.keys(defaultPlan).forEach(day => defaultPlan[day][meal] = null);
    });
    // Deep merge to ensure new meal slots/days are added to old plans
    const storedPlan = JSON.parse(localStorage.getItem(key) || '{}');
    // Simple deep merge for this structure
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
// Emoji mapping (for warm icons)
// -----------------
function getIngredientEmoji(ingredient) {
    const mapping = { "bread":"🥖","pasta":"🍝","cheese":"🧀","milk":"🥛","nuts":"🌰","eggs":"🥚","butter":"🧈","avocado":"🥑","tomato":"🍅","banana":"🍌","strawberry":"🍓","lettuce":"🥬","rice":"🍚","peanut butter":"🥜","jelly":"🍇","naan":"🍞","soy sauce":"🧂","olive oil":"🫒","salt":"🧂","tomato sauce":"🍅","chicken":"🍗","beef":"🥩","pork":"🥓","fish":"🐟"};
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
    // Initial content rendering for the logged-in user
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
    // Hide all content and remove active class from all buttons
    tabContents.forEach(content => content.style.display = 'none');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show selected content and set active class on button
    const activeContent = document.getElementById(tabId);
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    
    if (activeContent) activeContent.style.display = 'block';
    if (activeButton) activeButton.classList.add('active');

    // Re-render content specific to the tab being activated
    if (tabId === 'favorites') {
        renderFavorites();
    } else if (tabId === 'plan') {
        renderWeeklyPlan();
    } else if (tabId === 'general-comments') {
        renderGeneralComments();
    }
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

function getSelectedIngredients(){ return Array.from(document.querySelectorAll('#ingredients-container .ingredient-box.selected')).map(b=>b.textContent.replace(/[^\w\s]/g,'').trim().toLowerCase()); }
function getSelectedAllergens(){ return Array.from(document.querySelectorAll('.allergy-filter:checked')).map(b=>b.value.toLowerCase()); }

// -----------------
// Find Recipes Logic
// -----------------
function findRecipes(selectedIngredients,selectedAllergens){
    return allRecipes.filter(recipe=>{
        const ing = recipe.ingredients.map(i=>i.toLowerCase());
        
        // 1. Check allergens first (Filter OUT recipes containing allergens)
        for(const allergen of selectedAllergens){ 
            if(allergensMatch(ing,allergen)) return false; 
        }
        
        // 2. Must include all selected ingredients (Filter IN recipes)
        return selectedIngredients.every(sel => ing.includes(sel));
    });
}

function allergensMatch(recipeIngredients,allergen){
    if(allergen==='gluten') return recipeIngredients.some(i=>i.includes('bread')||i.includes('pasta')||i.includes('naan')||i.includes('flour'));
    if(allergen==='nuts') return recipeIngredients.some(i=>i.includes('nuts')||i.includes('peanut')||i.includes('almond')||i.includes('pecan'));
    if(allergen==='dairy') return recipeIngredients.some(i=>i.includes('cheese')||i.includes('milk')||i.includes('butter')||i.includes('cream'));
    return false;
}

// -----------------
// Recipe Action Handlers (Favorite, Comment, Plan)
// -----------------
function toggleFavorite(recipeName) {
    if (!currentUser) return alert('Please sign in to save favorites.');
    
    let favorites = getFavorites(currentUser);
    const index = favorites.findIndex(f => f.name === recipeName);

    if (index === -1) {
        // Find the full recipe object to save, for easier re-rendering
        const recipe = allRecipes.find(r => r.name === recipeName);
        if (recipe) {
            favorites.push(recipe);
            alert(`Added ${recipeName} to favorites!`);
        }
    } else {
        favorites.splice(index, 1);
        alert(`Removed ${recipeName} from favorites.`);
    }

    saveFavorites(currentUser, favorites);
    
    // Re-render relevant sections
    renderRecipes(currentResults); // Update heart icons on search results
    if (document.querySelector('.tab-button[data-tab="favorites"]').classList.contains('active')) {
        renderFavorites(); // Update favorites list if currently visible
    }
}

function openPlanModal(recipeName) {
    if (!currentUser) return alert('Please sign in to create a meal plan.');
    
    selectedRecipeForPlan = allRecipes.find(r => r.name === recipeName);
    if (!selectedRecipeForPlan) return;

    planRecipeName.textContent = selectedRecipeForPlan.name;
    planModal.style.display = 'flex';
}

// -----------------
// Render Recipes (Used for Search Results and Favorites)
// -----------------
function createRecipeCard(recipe, isFavoriteView=false){
    const card = document.createElement('div'); 
    card.className = 'recipe-card';
    card.setAttribute('data-recipe-name', recipe.name);

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');
    const isFavorited = currentUser ? getFavorites(currentUser).some(f=>f.name===recipe.name) : false;
    const favBtnClass = isFavorited ? 'fav-btn favorited' : 'fav-btn';
    const favBtnText = isFavorited ? '❤️ Unfavorite' : '🤍 Favorite';

    card.innerHTML = `
        <h3>${emojis} ${recipe.name}</h3>
        <div class="recipe-details">
            <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
            <p><strong>Instructions:</strong> ${recipe.instructions.substring(0, 100)}...</p>
            <p><strong>Time:</strong> ${recipe.prep_time_min} min prep, ${recipe.cook_time_min} min cook</p>
            <p><strong>Nutrition:</strong> ${recipe.nutrition.calories} kcal</p>
        </div>
        <div class="recipe-actions">
            <button class="${favBtnClass}" data-action="favorite">${favBtnText}</button>
            <button class="add-to-plan-btn btn-secondary" data-action="plan">📅 Add to Plan</button>
            ${isFavoriteView ? `<button class="remove-btn btn-secondary" data-action="remove-favorite">❌ Remove</button>` : ''}
        </div>
    `;

    // Attach event listeners to the dynamic buttons
    card.querySelector('[data-action="favorite"]').addEventListener('click', () => toggleFavorite(recipe.name));
    card.querySelector('[data-action="plan"]').addEventListener('click', () => openPlanModal(recipe.name));
    if (isFavoriteView) {
        card.querySelector('[data-action="remove-favorite"]').addEventListener('click', () => toggleFavorite(recipe.name));
    }

    return card;
}

function renderRecipes(recipes, containerId = 'results', isFavoriteView = false){
    const container = document.getElementById(containerId);
    container.innerHTML='';
    currentResults = recipes; // Update for search results only

    if(!recipes.length){ container.innerHTML='<div class="no-results">No matches found!</div>'; return; }

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
// General Comments Logic
// -----------------
function renderGeneralComments() {
    const comments = getGeneralComments();
    generalCommentsContainer.innerHTML = '';

    if (comments.length === 0) {
        generalCommentsContainer.innerHTML = '<div class="no-results">Be the first to leave a comment!</div>';
        return;
    }

    comments.slice().reverse().forEach(comment => { // Show newest first
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


// -----------------
// Weekly Plan Logic
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
            const recipeName = recipe ? recipe.name : 'Empty Slot';
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

// Remove meal from plan via delegation on the plan container
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
    // Save a minimal representation to avoid excessive storage use
    const recipeStub = { 
        name: selectedRecipeForPlan.name, 
        ingredients: selectedRecipeForPlan.ingredients 
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
    
    if(!selectedIngredients.length && !selectedAllergens.length){ 
        alert('Select at least one ingredient or allergen filter!'); 
        return; 
    }
    
    currentResults=findRecipes(selectedIngredients,selectedAllergens);
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
