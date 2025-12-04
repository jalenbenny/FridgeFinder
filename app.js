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
const newPlanBtn = document.getElementById('new-plan-btn');
const savePlanBtn = document.getElementById('save-plan-btn');
const loadPlanSelect = document.getElementById('load-plan-select');
const suggestionsList = document.getElementById('suggestions-list');

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
// Load Recipes from TheMealDB
// -----------------
async function loadRecipes() {
    console.log('Loading recipes from TheMealDB...');
    try {
        allRecipes = await RemoteRecipes.loadDiverseRecipes();
        console.log('Recipes loaded:', allRecipes.length);
    } catch (err) {
        console.error('Failed to load recipes from TheMealDB:', err);
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

function saveMealPlan(username, plan) { localStorage.setItem(`mealPlan_${username}`, JSON.stringify(plan)); }

function getSavedPlans(username) {
    const key = `savedPlans_${username}`;
    return JSON.parse(localStorage.getItem(key) || '{}');
}

function saveNamedPlan(username, planName, plan) {
    const savedPlans = getSavedPlans(username);
    savedPlans[planName] = plan;
    localStorage.setItem(`savedPlans_${username}`, JSON.stringify(savedPlans));
}

function loadNamedPlan(username, planName) {
    const savedPlans = getSavedPlans(username);
    return savedPlans[planName] || null;
}

function updateLoadPlanDropdown() {
    if (!currentUser) return;
    const savedPlans = getSavedPlans(currentUser);
    loadPlanSelect.innerHTML = '<option disabled selected>-- Load Saved Plan --</option>';
    Object.keys(savedPlans).forEach(planName => {
        const option = document.createElement('option');
        option.value = planName;
        option.textContent = planName;
        loadPlanSelect.appendChild(option);
    });
}

// -----------------
// Authentication Logic
// -----------------
function signIn() {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    if (!user || !pass) {
        authMessage.textContent = 'Enter username and password';
        return;
    }

    const users = getUsers();
    if (users[user] && users[user] === pass) {
        authMessage.textContent = '';
        showMainContent(user);
    } else {
        authMessage.textContent = 'Invalid username or password';
    }
}

function signUp() {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    if (!user || !pass) {
        authMessage.textContent = 'Enter username and password';
        return;
    }

    const users = getUsers();
    if (users[user]) {
        authMessage.textContent = 'Username already exists';
        return;
    }

    saveUser(user, pass);
    authMessage.textContent = '';
    showMainContent(user);
}

function signOut() {
    showAuth();
}

function showMainContent(username) {
    authDiv.style.display = 'none';
    mainContent.style.display = 'block';
    displayUser.textContent = username;
    currentUser = username;

    localStorage.setItem('currentUser', username);

    renderFavorites();
    renderGeneralComments();
    renderWeeklyPlan();
    updateLoadPlanDropdown();

    switchTab('search');
}

function showAuth() {
    authDiv.style.display = 'flex';
    mainContent.style.display = 'none';

    usernameInput.value = '';
    passwordInput.value = '';
    currentUser = null;

    localStorage.removeItem('currentUser');

    resultsDiv.innerHTML = '';
    document.getElementById('favorites-list').innerHTML = '';
}

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
function getAllIngredients() {
    const ingredients = new Set();
    allRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
            let normalized = ingredient.toLowerCase().trim();
            
            // Improved pluralization handling
            if (normalized.endsWith('s') && normalized.length > 3) {
                // Keep these words as-is (always plural or proper form)
                const keepPlural = ['peas', 'beans', 'lentils', 'oats', 'grits', 'olives', 
                                   'strawberries', 'blueberries', 'raspberries', 'cranberries', 
                                   'blackberries', 'cherries', 'pears', 'apples', 'grapes',
                                   'onions', 'potatoes', 'tomatoes', 'carrots', 'peppers',
                                   'eggs', 'mushrooms', 'noodles', 'chips', 'cookies'];
                
                if (!keepPlural.includes(normalized)) {
                    // Handle -ies ending (berries, cherries) -> remove -ies, add -y
                    if (normalized.endsWith('ies') && normalized.length > 4) {
                        const base = normalized.slice(0, -3);
                        // Don't singularize if it ends in a vowel before 'ies'
                        if (!'aeiou'.includes(base[base.length - 1])) {
                            normalized = base + 'y';
                        }
                    }
                    // Handle -oes ending (tomatoes, potatoes) -> remove -es
                    else if (normalized.endsWith('oes') && normalized.length > 4) {
                        normalized = normalized.slice(0, -2);
                    }
                    // Handle -shes, -ches ending -> remove -es
                    else if ((normalized.endsWith('shes') || normalized.endsWith('ches')) && normalized.length > 5) {
                        normalized = normalized.slice(0, -2);
                    }
                    // Handle -sses ending (glasses) -> remove -es
                    else if (normalized.endsWith('sses') && normalized.length > 5) {
                        normalized = normalized.slice(0, -2);
                    }
                    // Default: just remove the 's'
                    else if (!normalized.endsWith('ss') && !normalized.endsWith('us')) {
                        normalized = normalized.slice(0, -1);
                    }
                }
            }
            
            // Consolidate similar ingredients into common names
            const consolidationMap = {
                // Eggs
                'egg': 'eggs',
                'egg white': 'eggs',
                'egg yolk': 'eggs',
                'beaten egg': 'eggs',
                
                // Flour types
                'plain flour': 'flour',
                'all-purpose flour': 'flour',
                'self-raising flour': 'flour',
                'self-rising flour': 'flour',
                'wheat flour': 'flour',
                
                // Milk types
                'whole milk': 'milk',
                'skim milk': 'milk',
                'skimmed milk': 'milk',
                '2% milk': 'milk',
                
                // Cream types
                'heavy cream': 'cream',
                'double cream': 'cream',
                'single cream': 'cream',
                'whipping cream': 'cream',
                
                // Sugar types
                'granulated sugar': 'sugar',
                'caster sugar': 'sugar',
                'white sugar': 'sugar',
                'brown sugar': 'sugar',
                
                // Butter
                'salted butter': 'butter',
                'unsalted butter': 'butter',
                
                // Oil
                'vegetable oil': 'oil',
                'olive oil': 'olive oil',
                'canola oil': 'oil',
                'cooking oil': 'oil',
                
                // Salt
                'sea salt': 'salt',
                'kosher salt': 'salt',
                'table salt': 'salt',
                
                // Pepper
                'black pepper': 'pepper',
                'ground pepper': 'pepper',
                'white pepper': 'pepper'
            };
            
            // Check if this ingredient should be consolidated
            let finalIngredient = normalized;
            for (const [key, value] of Object.entries(consolidationMap)) {
                if (normalized === key || normalized.includes(key)) {
                    finalIngredient = value;
                    break;
                }
            }
            
            ingredients.add(finalIngredient);
        });
    });
    return Array.from(ingredients).sort();
}

function createIngredientBoxes() {
    const container = document.getElementById('ingredients-container');
    container.innerHTML = '';
    
    if (allRecipes.length === 0) {
        container.innerHTML = '<div class="no-results">Loading recipes...</div>';
        return;
    }
    
    const ingredients = getAllIngredients();
    if (ingredients.length === 0) {
        container.innerHTML = '<div class="no-results">No ingredients found.</div>';
        return;
    }
    
    ingredients.forEach(ing => {
        const box = document.createElement('div');
        box.className = 'ingredient-box';
        box.textContent = ing;
        box.title = `Filter by ${ing}`;
        
        box.addEventListener('click', () => box.classList.toggle('selected'));
        container.appendChild(box);
    });
}

function getIngredientEmoji(ingredient) {
    const emojiMap = {
        'chicken': '🍗', 'beef': '🥩', 'pork': '🥓', 'fish': '🐟', 'salmon': '🐟',
        'egg': '🥚', 'cheese': '🧀', 'milk': '🥛', 'butter': '🧈',
        'tomato': '🍅', 'potato': '🥔', 'carrot': '🥕', 'onion': '🧅', 'garlic': '🧄',
        'bread': '🍞', 'pasta': '🍝', 'rice': '🍚',
        'apple': '🍎', 'banana': '🍌', 'lemon': '🍋', 'strawberry': '🍓',
        'mushroom': '🍄', 'pepper': '🌶️', 'broccoli': '🥦', 'corn': '🌽',
        'avocado': '🥑', 'lettuce': '🥬', 'cucumber': '🥒'
    };
    return emojiMap[ingredient] || '';
}

function getSelectedIngredients() {
    return Array.from(document.querySelectorAll('#ingredients-container .ingredient-box.selected'))
        .map(b => b.textContent.replace(/[^\w\s]/g, '').trim().toLowerCase());
}

function getSelectedAllergens() {
    return Array.from(document.querySelectorAll('.allergy-filter:checked')).map(b => b.value.toLowerCase());
}

// -----------------
// Find Recipes Logic with 50% matching
// -----------------
function findRecipes(userIngredients, selectedAllergens) {
    if (userIngredients.length === 0) return [];

    return allRecipes
        .map(recipe => {
            const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase());

            // Exclude allergens
            for (const allergen of selectedAllergens) {
                if (allergensMatch(recipeIngredients, allergen)) return null;
            }

            // Calculate match ratio
            const matchCount = recipeIngredients.filter(i => userIngredients.includes(i)).length;
            const matchRatio = matchCount / recipeIngredients.length;

            return { recipe, matchRatio, matchCount, totalIngredients: recipeIngredients.length };
        })
        .filter(item => item !== null && item.matchRatio >= 0.5) // At least 50% match
        .sort((a, b) => b.matchRatio - a.matchRatio) // Sort by best match
        .map(item => item.recipe);
}

function allergensMatch(recipeIngredients, allergen) {
    const ingredientsLower = recipeIngredients.map(i => i.toLowerCase());
    
    if (allergen === 'gluten') {
        const glutenItems = [
            'bread', 'pasta', 'naan', 'flour', 'wheat', 'barley', 'rye', 
            'couscous', 'semolina', 'farina', 'spelt', 'bulgur', 'malt',
            'noodles', 'crackers', 'baguette', 'tortilla', 'pita', 'croissant',
            'breadcrumbs', 'spaghetti', 'macaroni', 'lasagna', 'linguine',
            'fettuccine', 'penne', 'orzo', 'cereal', 'biscuit', 'scone'
        ];
        return ingredientsLower.some(ingredient => 
            glutenItems.some(item => ingredient.includes(item))
        );
    }
    
    if (allergen === 'nuts') {
        const nutItems = [
            'nut', 'peanut', 'almond', 'pecan', 'walnut', 'cashew',
            'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut',
            'chestnut', 'nutmeg', 'peanut butter', 'almond milk'
        ];
        return ingredientsLower.some(ingredient => 
            nutItems.some(item => ingredient.includes(item))
        );
    }
    
    if (allergen === 'dairy') {
        const dairyItems = [
            'cheese', 'milk', 'butter', 'cream', 'yogurt', 'yoghurt',
            'cheddar', 'mozzarella', 'parmesan', 'feta', 'brie', 'gouda',
            'ricotta', 'cottage cheese', 'sour cream', 'whipped cream',
            'ice cream', 'custard', 'buttermilk', 'ghee', 'paneer',
            'mascarpone', 'goat cheese', 'blue cheese', 'cream cheese'
        ];
        return ingredientsLower.some(ingredient => 
            dairyItems.some(item => ingredient.includes(item))
        );
    }
    
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
function createRecipeCard(recipe, isFavoriteView = false) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.setAttribute('data-recipe-name', recipe.name);

    const isFavorited = currentUser ? getFavorites(currentUser).some(f => f.name === recipe.name) : false;
    const favBtnClass = isFavorited ? 'fav-btn favorited' : 'fav-btn';
    const favBtnText = isFavorited ? '★ Favorited' : '☆ Favorite';

    // Build ingredient list with measurements if available
    const ingredientsList = recipe.ingredientsWithMeasures && recipe.ingredientsWithMeasures.length > 0
        ? recipe.ingredientsWithMeasures.map(ing => `• ${ing}`).join('<br>')
        : recipe.ingredients.map(ing => `• ${ing}`).join('<br>');

    // Format instructions
    const formattedInstructions = recipe.instructions.replace(/\n/g, '<br>');

    card.innerHTML = `
        <h3>${recipe.name}</h3>
        <div class="recipe-details">
            <p><strong>Ingredients:</strong><br>${ingredientsList}</p>
            <p><strong>Instructions:</strong><br>${formattedInstructions}</p>
        </div>
        <div class="recipe-actions">
            ${currentUser ? `<button class="${favBtnClass}" data-action="favorite">${favBtnText}</button>` : ''}
            <button class="add-to-plan-btn btn-secondary" data-action="plan">📅 Add to Plan</button>
            <button class="comment-btn btn-secondary" data-action="comment">💬 Comments</button>
            ${isFavoriteView ? `<button class="remove-btn btn-secondary" data-action="remove-favorite">✕ Remove</button>` : ''}
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

function renderRecipes(recipes, containerId, isFavoriteView = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!recipes.length) {
        container.innerHTML = '<div class="no-results">No recipes found. Try adjusting your filters!</div>';
        return;
    }

    recipes.forEach(recipe => {
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
// Comments Logic (General and Recipe)
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
    const recipeStub = {
        name: selectedRecipeForPlan.name
    };
    
    plan[day][meal] = recipeStub;
    saveMealPlan(currentUser, plan);
    alert(`${selectedRecipeForPlan.name} added to your ${day} ${meal}!`);

    planModal.style.display = 'none';
    selectedRecipeForPlan = null;
    renderWeeklyPlan();
});

// -----------------
// New Plan / Save Plan / Load Plan
// -----------------
newPlanBtn.addEventListener('click', () => {
    if (!confirm('Create a new empty plan? This will clear your current plan.')) return;
    const emptyPlan = { Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {}, Saturday: {} };
    ['breakfast','lunch','dinner'].forEach(meal => {
        Object.keys(emptyPlan).forEach(day => emptyPlan[day][meal] = null);
    });
    saveMealPlan(currentUser, emptyPlan);
    renderWeeklyPlan();
    alert('New empty plan created!');
});

savePlanBtn.addEventListener('click', () => {
    const planName = prompt('Enter a name for this meal plan:');
    if (!planName || !planName.trim()) return alert('Plan name cannot be empty.');
    const currentPlan = getMealPlan(currentUser);
    saveNamedPlan(currentUser, planName.trim(), currentPlan);
    updateLoadPlanDropdown();
    alert(`Plan "${planName}" saved successfully!`);
});

loadPlanSelect.addEventListener('change', () => {
    const planName = loadPlanSelect.value;
    if (!planName) return;
    const plan = loadNamedPlan(currentUser, planName);
    if (plan) {
        saveMealPlan(currentUser, plan);
        renderWeeklyPlan();
        alert(`Plan "${planName}" loaded!`);
    }
    loadPlanSelect.selectedIndex = 0;
});

// -----------------
// Suggestions Panel Logic
// -----------------
document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mealType = btn.getAttribute('data-meal');
        showMealSuggestions(mealType);
    });
});

function showMealSuggestions(mealType) {
    // Get recipes appropriate for the meal type from our loaded recipes
    let suggestions = [];
    
    if (allRecipes.length > 0) {
        // Use actual recipe names from TheMealDB
        suggestions = allRecipes.slice(0, 8).map(r => r.name);
    } else {
        // Fallback suggestions if recipes haven't loaded yet
        const exampleSuggestions = {
            breakfast: ['Pancakes', 'Oatmeal', 'Smoothie Bowl', 'French Toast', 'Breakfast Burrito'],
            lunch: ['Chicken Salad', 'Veggie Wrap', 'Grilled Cheese', 'Caesar Salad', 'Turkey Sandwich'],
            dinner: ['Spaghetti Bolognese', 'Grilled Salmon', 'Stir Fry Vegetables', 'Roast Chicken', 'Beef Tacos']
        };
        suggestions = exampleSuggestions[mealType] || [];
    }

    suggestionsList.innerHTML = '';

    suggestions.forEach(recipeName => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.margin = '5px 0';
        li.style.padding = '5px';
        li.style.borderRadius = '4px';
        li.style.transition = 'background-color 0.2s';
        li.textContent = recipeName;
        
        li.addEventListener('mouseenter', () => {
            li.style.backgroundColor = 'rgba(0,0,0,0.1)';
        });
        li.addEventListener('mouseleave', () => {
            li.style.backgroundColor = 'transparent';
        });
        
        li.addEventListener('click', () => {
            selectedRecipeForPlan = { name: recipeName };
            planRecipeName.textContent = recipeName;
            planMealSelect.value = mealType;
            planModal.style.display = 'flex';
        });
        suggestionsList.appendChild(li);
    });
}

// -----------------
// Search Button Action
// -----------------
searchBtn.addEventListener('click', () => {
    const selectedIngredients = getSelectedIngredients();
    const selectedAllergens = getSelectedAllergens();
    
    if (!selectedIngredients.length && !selectedAllergens.length) {
        alert('Select at least one ingredient or allergen filter!');
        return;
    }
    
    currentResults = findRecipes(selectedIngredients, selectedAllergens);
    renderRecipes(currentResults, 'results');
});

// Select All / Clear All Buttons
// -----------------
const selectAllBtn = document.getElementById('select-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

selectAllBtn.addEventListener('click', () => {
    const boxes = document.querySelectorAll('.ingredient-box');
    boxes.forEach(box => box.classList.add('selected'));
});

clearAllBtn.addEventListener('click', () => {
    const boxes = document.querySelectorAll('.ingredient-box');
    boxes.forEach(box => box.classList.remove('selected'));
});

// -----------------
// Auth Button Event Listeners
// -----------------
signInBtn.addEventListener('click', signIn);
signUpBtn.addEventListener('click', signUp);
signOutBtn.addEventListener('click', signOut);

// Allow Enter key to submit on password field
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        signIn();
    }
});

// -----------------
// Initialize
// -----------------
window.addEventListener('load', async () => {
    await loadRecipes();
    createIngredientBoxes();
    
    const rememberedUser = localStorage.getItem('currentUser');
    if (rememberedUser) {
        showMainContent(rememberedUser);
    } else {
        showAuth();
    }
});
