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
const ingredientsInput = document.getElementById('ingredients-input');

// Ingredients display container
const ingredientsContainer = document.getElementById('ingredients-container');

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
        populateIngredientList();

    } catch (err) {
        console.error('Failed to load recipes.json:', err);
        ingredientsContainer.innerHTML =
            `<div class="no-results">Error loading recipes: ${err.message}</div>`;
    }
}

// -----------------
// Populate ingredient list dynamically
// -----------------
function populateIngredientList() {
    const ingredientSet = new Set();

    allRecipes.forEach(r => {
        r.ingredients.forEach(i => ingredientSet.add(i));
    });

    const sorted = [...ingredientSet].sort();

    ingredientsContainer.innerHTML =
        sorted.map(ing => `
            <label class="ingredient-option">
                <input type="checkbox" class="ingredient-checkbox" value="${ing}">
                ${ing}
            </label>
        `).join('');
}

// -----------------
// LocalStorage Helpers
// -----------------
function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUser(username, password) {
    const users = getUsers();
    users[username] = password;
    localStorage.setItem('users', JSON.stringify(users));
}

function getFavorites(username) { return JSON.parse(localStorage.getItem(`favorites_${username}`) || '[]'); }
function saveFavorites(username, favorites) {
    localStorage.setItem(`favorites_${username}`, JSON.stringify(favorites));
}

function getRecipeComments(recipeName) { return JSON.parse(localStorage.getItem(`comments_${recipeName}`) || '[]'); }
function saveRecipeComments(recipeName, comments) {
    localStorage.setItem(`comments_${recipeName}`, JSON.stringify(comments));
}

function getGeneralComments() { return JSON.parse(localStorage.getItem('generalComments') || '[]'); }
function saveGeneralComments(comments) {
    localStorage.setItem('generalComments', JSON.stringify(comments));
}

function getMealPlan(username) {
    const key = `mealPlan_${username}`;
    const defaultPlan = {
        Sunday: {}, Monday: {}, Tuesday: {}, Wednesday: {},
        Thursday: {}, Friday: {}, Saturday: {}
    };

    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
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

function saveMealPlan(username, mealPlan) {
    localStorage.setItem(`mealPlan_${username}`, JSON.stringify(mealPlan));
}

// -----------------
// Authentication Logic
// -----------------
function showMainContent(username) {
    authDiv.style.display = 'none';
    mainContent.style.display = 'block';
    displayUser.textContent = username;
    currentUser = username;
    localStorage.setItem('currentUser', username);

    renderFavorites();
    renderGeneralComments();
    renderWeeklyPlan();

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
// Attach Auth Events
// -----------------
signInBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    const users = getUsers();

    if (users[user] && users[user] === pass) {
        authMessage.textContent = '';
        showMainContent(user);
    } else {
        authMessage.textContent = 'Invalid username or password.';
    }
});

signUpBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    const users = getUsers();

    if (!user || !pass) {
        authMessage.textContent = 'Enter username and password.';
        return;
    }

    if (users[user]) {
        authMessage.textContent = 'Username already exists.';
        return;
    }

    saveUser(user, pass);
    authMessage.textContent = 'Account created. You may sign in.';
});

signOutBtn.addEventListener('click', showAuth);

// -----------------
// Tab Switching
// -----------------
function switchTab(tabId) {
    tabContents.forEach(c => c.style.display = 'none');
    tabButtons.forEach(b => b.classList.remove('active'));

    document.getElementById(`${tabId}-tab`).style.display = 'block';
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// -----------------
// SEARCH FUNCTIONALITY
// -----------------
searchBtn.addEventListener('click', () => {
    const checked = [...document.querySelectorAll('.ingredient-checkbox:checked')]
        .map(i => i.value.toLowerCase());

    if (checked.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">Select at least one ingredient.</div>';
        return;
    }

    currentResults = allRecipes.filter(recipe =>
        checked.every(q =>
            recipe.ingredients.some(ing => ing.toLowerCase().includes(q))
        )
    );

    if (currentResults.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No matching recipes found.</div>';
        return;
    }

    renderResults(currentResults);
});

function renderResults(recipes) {
    resultsDiv.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <h3>${recipe.name}</h3>
            <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>

            <button class="favorite-btn" data-name="${recipe.name}">Add to Favorites</button>
            <button class="comment-btn" data-name="${recipe.name}">Comments</button>
            <button class="add-to-plan-btn" data-name="${recipe.name}">Add to Weekly Plan</button>
        </div>
    `).join('');

    attachRecipeButtons();
}

function attachRecipeButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', () => addFavorite(btn.dataset.name));
    });

    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => openRecipeComments(btn.dataset.name));
    });

    document.querySelectorAll('.add-to-plan-btn').forEach(btn => {
        btn.addEventListener('click', () => openPlanModal(btn.dataset.name));
    });
}

// -----------------
// FAVORITES
// -----------------
function addFavorite(recipeName) {
    const favs = getFavorites(currentUser);
    if (!favs.includes(recipeName)) {
        favs.push(recipeName);
        saveFavorites(currentUser, favs);
        renderFavorites();
    }
}

function renderFavorites() {
    const favs = getFavorites(currentUser);
    const list = document.getElementById('favorites-list');

    if (favs.length === 0) {
        list.innerHTML = '<div class="no-results">No favorites yet.</div>';
        return;
    }

    list.innerHTML = favs.map(f => `<div class="favorite-item">${f}</div>`).join('');
}

// -----------------
// COMMENTS
// -----------------
function openRecipeComments(recipeName) {
    selectedRecipeForComment = recipeName;
    commentRecipeName.textContent = recipeName;

    const comments = getRecipeComments(recipeName);
    recipeCommentsList.innerHTML = comments.length
        ? comments.map(c => `<div class="comment">${c}</div>`).join('')
        : '<div class="no-results">No comments yet.</div>';

    recipeCommentModal.style.display = 'block';
}

recipeCommentBtn.addEventListener('click', () => {
    const text = recipeCommentTextarea.value.trim();
    if (!text) return;

    const comments = getRecipeComments(selectedRecipeForComment);
    comments.push(text);
    saveRecipeComments(selectedRecipeForComment, comments);

    openRecipeComments(selectedRecipeForComment);
    recipeCommentTextarea.value = '';
});

recipeCommentModalClose.addEventListener('click', () => {
    recipeCommentModal.style.display = 'none';
});

// -----------------
// GENERAL COMMENTS
// -----------------
function renderGeneralComments() {
    const comments = getGeneralComments();

    generalCommentsContainer.innerHTML = comments.length
        ? comments.map(c => `<div class="comment">${c}</div>`).join('')
        : '<div class="no-results">No general comments yet.</div>';
}

generalCommentBtn.addEventListener('click', () => {
    const text = generalCommentTextarea.value.trim();
    if (!text) return;

    const comments = getGeneralComments();
    comments.push(text);
    saveGeneralComments(comments);

    renderGeneralComments();
    generalCommentTextarea.value = '';
});

// -----------------
// WEEKLY PLAN
// -----------------
function openPlanModal(recipeName) {
    selectedRecipeForPlan = recipeName;
    planRecipeName.textContent = recipeName;
    planModal.style.display = 'block';
}

planModalClose.addEventListener('click', () => {
    planModal.style.display = 'none';
});

planConfirmBtn.addEventListener('click', () => {
    const day = planDaySelect.value;
    const meal = planMealSelect.value;

    if (!day || !meal) return;

    const plan = getMealPlan(currentUser);
    plan[day][meal] = selectedRecipeForPlan;
    saveMealPlan(currentUser, plan);

    renderWeeklyPlan();
    planModal.style.display = 'none';
});

function renderWeeklyPlan() {
    const plan = getMealPlan(currentUser);

    weeklyPlanContainer.innerHTML = Object.keys(plan).map(day => `
        <div class="plan-day">
            <h4>${day}</h4>
            <p>Breakfast: ${plan[day].breakfast || '-'}</p>
            <p>Lunch: ${plan[day].lunch || '-'}</p>
            <p>Dinner: ${plan[day].dinner || '-'}</p>
        </div>
    `).join('');
}

// -----------------
// On Page Load
// -----------------
window.onload = async () => {
    await loadRecipes();

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        showMainContent(savedUser);
    }
};
