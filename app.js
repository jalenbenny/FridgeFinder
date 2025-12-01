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
    console.log('Recipes loaded successfully:', allRecipes.length, 'recipes');
  } catch (err) {
    console.error('Failed to load recipes.json:', err);
    alert('Error loading recipes.json. Make sure the file exists in data/recipes.json\n\nError: ' + err.message);
  }
}

// -----------------
// LocalStorage Helpers
// -----------------
function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '{}');
}

function saveUser(username, password) {
  const users = getUsers();
  users[username] = password;
  localStorage.setItem('users', JSON.stringify(users));
}

function getFavorites(username) {
  const key = `favorites_${username}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveFavorites(username, favorites) {
  const key = `favorites_${username}`;
  localStorage.setItem(key, JSON.stringify(favorites));
}

function getRecipeComments(recipeName) {
  const key = `comments_${recipeName}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveRecipeComments(recipeName, comments) {
  const key = `comments_${recipeName}`;
  localStorage.setItem(key, JSON.stringify(comments));
}

function getGeneralComments() {
  return JSON.parse(localStorage.getItem('generalComments') || '[]');
}

function saveGeneralComments(comments) {
  localStorage.setItem('generalComments', JSON.stringify(comments));
}

function getMealPlan(username) {
  const key = `mealPlan_${username}`;
  const defaultPlan = {
    Saturday: { breakfast: null, lunch: null, dinner: null },
    Sunday: { breakfast: null, lunch: null, dinner: null },
    Monday: { breakfast: null, lunch: null, dinner: null },
    Tuesday: { breakfast: null, lunch: null, dinner: null },
    Wednesday: { breakfast: null, lunch: null, dinner: null },
    Thursday: { breakfast: null, lunch: null, dinner: null },
    Friday: { breakfast: null, lunch: null, dinner: null }
  };
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultPlan));
}

function saveMealPlan(username, mealPlan) {
  const key = `mealPlan_${username}`;
  localStorage.setItem(key, JSON.stringify(mealPlan));
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
  for (const key in mapping) {
    if (ingredient.toLowerCase().includes(key)) return mapping[key];
  }
  return "";
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
}

function showAuth() {
  authDiv.style.display = 'flex';
  mainContent.style.display = 'none';
  usernameInput.value = '';
  passwordInput.value = '';
  currentUser = null;
  localStorage.removeItem('currentUser');
}

signInBtn.addEventListener('click', () => {
  const user = usernameInput.value.trim();
  const pass = passwordInput.value;
  if (!user || !pass) {
    authMessage.textContent = 'Enter username and password';
    return;
  }
  
  const users = getUsers();
  if (users[user] && users[user] === pass) {
    showMainContent(user);
    authMessage.textContent = '';
  } else {
    authMessage.textContent = 'Invalid username or password';
  }
});

signUpBtn.addEventListener('click', () => {
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
  showMainContent(user);
  authMessage.textContent = '';
});

signOutBtn.addEventListener('click', () => {
  showAuth();
  renderFavorites();
});

// -----------------
// Ingredient Boxes
// -----------------
function getAllIngredients() {
  const ingredients = new Set();
  allRecipes.forEach(r => r.ingredients.forEach(i => ingredients.add(i.toLowerCase())));
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
    container.innerHTML = '<div class="no-results">No ingredients found. Check recipes.json file.</div>';
    return;
  }
  
  ingredients.forEach(ing => {
    const box = document.createElement('div');
    box.className = 'ingredient-box';
    const emoji = getIngredientEmoji(ing);
    box.textContent = `${emoji} ${ing}`;
    box.addEventListener('click', () => box.classList.toggle('selected'));
    container.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll('.ingredient-box.selected'))
    .map(b => b.textContent.replace(/[^\w\s]/g, '').trim().toLowerCase());
}

function getSelectedAllergens() {
  return Array.from(document.querySelectorAll('.allergy-filter:checked'))
    .map(b => b.value.toLowerCase());
}

// -----------------
// Find Recipes
// -----------------
function findRecipes(selectedIngredients, selectedAllergens) {
  return allRecipes.filter(recipe => {
    const ing = recipe.ingredients.map(i => i.toLowerCase());

    for (const allergen of selectedAllergens) {
      if (allergensMatch(ing, allergen)) return false;
    }

    return ing.some(i => selectedIngredients.includes(i));
  });
}

function allergensMatch(recipeIngredients, allergen) {
  if (allergen === 'gluten') return recipeIngredients.some(i => 
    i.includes('bread') || i.includes('pasta') || i.includes('naan'));
  if (allergen === 'nuts') return recipeIngredients.some(i => 
    i.includes('nuts') || i.includes('peanut') || i.includes('almond'));
  if (allergen === 'dairy') return recipeIngredients.some(i => 
    i.includes('cheese') || i.includes('milk') || i.includes('butter'));
  return false;
}

// -----------------
// Render Recipes
// -----------------
function renderRecipes(recipes) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  if (!recipes.length) {
    resultsDiv.innerHTML = '<div class="no-results">No matches found!</div>';
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');
    const favorites = getFavorites(currentUser);
    const isFavorited = favorites.some(f => f.name === recipe.name);

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
      <p><strong>Instructions:</strong> ${recipe.instructions}</p>
      <p><strong>Prep:</strong> ${recipe.prep_time_min} min, <strong>Cook:</strong> ${recipe.cook_time_min} min at ${recipe.heat}</p>
      <p><strong>Nutrition:</strong> ${recipe.nutrition.calories} kcal, ${recipe.nutrition.protein_g}g protein, ${recipe.nutrition.fat_g}g fat, ${recipe.nutrition.carbs_g}g carbs</p>
    `;

    // Buttons container
    const buttonsDiv = document.createElement('div');
    
    const favButton = document.createElement('button');
    favButton.className = 'fav-btn';
    favButton.textContent = isFavorited ? '★ Favorited' : '☆ Favorite';
    favButton.addEventListener('click', () => toggleFavorite(recipe));
    buttonsDiv.appendChild(favButton);

    const commentButton = document.createElement('button');
    commentButton.className = 'comment-btn';
    commentButton.textContent = '💬 Comments';
    commentButton.addEventListener('click', () => toggleRecipeComments(recipe, card));
    buttonsDiv.appendChild(commentButton);

    const addToPlanButton = document.createElement('button');
    addToPlanButton.className = 'add-to-plan-btn';
    addToPlanButton.textContent = '📅 Add to Plan';
    addToPlanButton.addEventListener('click', () => openDaySelector(recipe));
    buttonsDiv.appendChild(addToPlanButton);

    card.appendChild(buttonsDiv);
    resultsDiv.appendChild(card);
  });
}

// -----------------
// Recipe Comments
// -----------------
function toggleRecipeComments(recipe, card) {
  // Check if comments section already exists
  let commentsSection = card.querySelector('.recipe-comments');
  
  if (commentsSection) {
    commentsSection.remove();
    return;
  }

  // Create comments section
  commentsSection = document.createElement('div');
  commentsSection.className = 'recipe-comments';

  commentsSection.innerHTML = `
    <h4>💬 Comments on this recipe</h4>
    <div class="recipe-comment-input">
      <input type="text" placeholder="Write a comment..." class="recipe-comment-text">
      <button class="post-recipe-comment">Post</button>
    </div>
    <div class="recipe-comments-list"></div>
  `;

  card.appendChild(commentsSection);

  // Add event listener for posting
  const commentInput = commentsSection.querySelector('.recipe-comment-text');
  const postBtn = commentsSection.querySelector('.post-recipe-comment');
  
  postBtn.addEventListener('click', () => {
    const text = commentInput.value.trim();
    if (!text) return;
    
    const comments = getRecipeComments(recipe.name);
    comments.push({
      user: currentUser,
      text: text,
      timestamp: new Date().toLocaleString()
    });
    saveRecipeComments(recipe.name, comments);
    
    commentInput.value = '';
    renderRecipeComments(recipe.name, commentsSection);
  });

  renderRecipeComments(recipe.name, commentsSection);
}

function renderRecipeComments(recipeName, commentsSection) {
  const commentsList = commentsSection.querySelector('.recipe-comments-list');
  commentsList.innerHTML = '';

  const comments = getRecipeComments(recipeName);

  if (!comments.length) {
    commentsList.innerHTML = '<p style="color: #B8732E; font-style: italic;">No comments yet. Be the first!</p>';
    return;
  }

  comments.slice().reverse().forEach(comment => {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'recipe-comment';
    commentDiv.innerHTML = `
      <strong>${comment.user}</strong> - <em>${comment.timestamp}</em><br>
      ${comment.text}
    `;
    commentsList.appendChild(commentDiv);
  });
}

// -----------------
// Favorites
// -----------------
function toggleFavorite(recipe) {
  if (!currentUser) return;
  
  const favorites = getFavorites(currentUser);
  const index = favorites.findIndex(f => f.name === recipe.name);
  
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(recipe);
  }
  
  saveFavorites(currentUser, favorites);
  renderRecipes(currentResults);
  renderFavorites();
}

function renderFavorites() {
  const favoritesDiv = document.getElementById('favorites');
  favoritesDiv.innerHTML = '';

  if (!currentUser) {
    favoritesDiv.innerHTML = '<div class="no-results">Sign in to save favorites!</div>';
    return;
  }

  const favs = getFavorites(currentUser);

  if (!favs.length) {
    favoritesDiv.innerHTML = '<div class="no-results">No favorites yet!</div>';
    return;
  }

  favs.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const emojis = recipe.ingredients.map(getIngredientEmoji).filter(Boolean).join(' ');

    card.innerHTML = `
      <h3>${emojis} ${recipe.name}</h3>
      <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
      <p><strong>Instructions:</strong> ${recipe.instructions}</p>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '★ Remove';
    removeBtn.className = 'fav-btn';
    removeBtn.addEventListener('click', () => {
      toggleFavorite(recipe);
    });
    card.appendChild(removeBtn);

    favoritesDiv.appendChild(card);
  });
}

// -----------------
// Weekly Meal Plan
// -----------------
function renderWeeklyPlan() {
  // Note: Since favorites and comments also use 'favorites' and 'comments' as section IDs,
  // we need to ensure we target the correct one if they are placed in separate tab content divs.
  // The meal plan is correctly targeting 'weeklyPlan'.
  const weeklyPlanDiv = document.getElementById('weeklyPlan');
  weeklyPlanDiv.innerHTML = '';

  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const mealPlan = getMealPlan(currentUser);

  days.forEach(day => {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';
    dayCard.innerHTML = `<h3>${day}</h3>`;

    mealTypes.forEach(mealType => {
      const mealSlot = document.createElement('div');
      mealSlot.className = 'meal-slot';
      
      const meal = mealPlan[day][mealType];
      
      if (meal) {
        mealSlot.classList.add('filled');
        mealSlot.innerHTML = `
          <div class="meal-slot-header">${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</div>
          <div class="meal-item">
            ${getIngredientEmoji(meal.ingredients[0])} ${meal.name}
            <span class="remove-meal" data-day="${day}" data-meal="${mealType}">✕</span>
          </div>
        `;
      } else {
        mealSlot.innerHTML = `
          <div class="meal-slot-header">${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</div>
          <div style="color: #B8732E; font-style: italic;">Not planned</div>
        `;
      }

      dayCard.appendChild(mealSlot);
    });

    weeklyPlanDiv.appendChild(dayCard);
  });

  // Add event listeners for remove buttons
  document.querySelectorAll('.remove-meal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const day = e.target.dataset.day;
      const meal = e.target.dataset.meal;
      const mealPlan = getMealPlan(currentUser);
      mealPlan[day][meal] = null;
      saveMealPlan(currentUser, mealPlan);
      renderWeeklyPlan();
    });
  });
}

// Day selector modal
function openDaySelector(recipe) {
  selectedRecipeForPlan = recipe;
  
  const modal = document.createElement('div');
  modal.className = 'day-selector-modal';
  modal.style.display = 'flex';
  
  modal.innerHTML = `
    <div class="day-selector-content">
      <h3>Add "${recipe.name}" to your meal plan</h3>
      <p>Select a day and meal type:</p>
      
      <div class="day-buttons">
        <button data-day="Saturday">Saturday</button>
        <button data-day="Sunday">Sunday</button>
        <button data-day="Monday">Monday</button>
        <button data-day="Tuesday">Tuesday</button>
        <button data-day="Wednesday">Wednesday</button>
        <button data-day="Thursday">Thursday</button>
        <button data-day="Friday">Friday</button>
      </div>
      
      <div class="meal-type-selector">
        <label for="mealType">Meal Type:</label>
        <select id="mealType">
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </select>
      </div>
      
      <div class="modal-buttons">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-btn">Add to Plan</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let selectedDay = null;
  
  modal.querySelectorAll('[data-day]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      modal.querySelectorAll('[data-day]').forEach(b => {
        // Reset style for all day buttons
        b.style.background = '#FFF8EB';
        b.style.color = '#6B4423';
      });
      // Apply selected style
      e.target.style.background = 'linear-gradient(135deg, #FFA347 0%, #FF8C42 100%)';
      e.target.style.color = 'white';
      selectedDay = e.target.dataset.day;
    });
  });
  
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    if (!selectedDay) {
      alert('Please select a day!');
      return;
    }
    
    const mealType = document.getElementById('mealType').value;
    const mealPlan = getMealPlan(currentUser);
    mealPlan[selectedDay][mealType] = recipe;
    saveMealPlan(currentUser, mealPlan);
    renderWeeklyPlan();
    modal.remove();
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Suggest meals button
document.getElementById('suggestMealsBtn').addEventListener('click', () => {
  if (allRecipes.length === 0) {
    alert('No recipes loaded yet!');
    return;
  }
  
  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const mealPlan = getMealPlan(currentUser);
  
  // Clear current plan
  days.forEach(day => {
    mealTypes.forEach(mealType => {
      mealPlan[day][mealType] = null;
    });
  });
  
  // Fill with random suggestions
  days.forEach(day => {
    mealTypes.forEach(mealType => {
      const randomRecipe = allRecipes[Math.floor(Math.random() * allRecipes.length)];
      mealPlan[day][mealType] = randomRecipe;
    });
  });
  
  saveMealPlan(currentUser, mealPlan);
  renderWeeklyPlan();
  alert('Meal plan generated! Feel free to customize it.');
});

// -----------------
// General Comments
// -----------------
document.getElementById('postCommentBtn').addEventListener('click', () => {
  const text = document.getElementById('commentInput').value.trim();
  if (!text) return;
  if (!currentUser) {
    alert('Please sign in to post comments!');
    return;
  }
  
  const comments = getGeneralComments();
  comments.push({
    user: currentUser,
    text: text,
    timestamp: new Date().toLocaleString()
  });
  saveGeneralComments(comments);
  
  document.getElementById('commentInput').value = '';
  renderGeneralComments();
});

function renderGeneralComments() {
  const commentList = document.getElementById('commentList');
  commentList.innerHTML = '';
  
  const comments = getGeneralComments();
  
  if (!comments.length) {
    commentList.innerHTML = '<div class="no-results">No comments yet!</div>';
    return;
  }

  comments.slice().reverse().forEach(comment => {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <strong>${comment.user}</strong> - <em>${comment.timestamp}</em><br>
      ${comment.text}
    `;
    commentList.appendChild(commentDiv);
  });
}

// -----------------
// Search Button
// -----------------
document.getElementById('search-btn').addEventListener('click', () => {
  const selectedIngredients = getSelectedIngredients();
  const selectedAllergens = getSelectedAllergens();

  if (!selectedIngredients.length) {
    alert('Select at least one ingredient!');
    return;
  }

  currentResults = findRecipes(selectedIngredients, selectedAllergens);
  renderRecipes(currentResults);
});


// -----------------
// Tab Switching Logic
// -----------------
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Deactivate all buttons and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activate clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Re-render content when a tab is clicked
            if (targetTab === 'favorites') renderFavorites();
            if (targetTab === 'comments') renderGeneralComments();
            if (targetTab === 'plan') renderWeeklyPlan();
        });
    });
}


// -----------------
// Initialize
// -----------------
window.addEventListener('load', async () => {
  console.log('Starting app initialization...');
  
  await loadRecipes();
  
  if (allRecipes.length === 0) {
    console.error('No recipes loaded!');
    alert('Failed to load recipes. Please check:\n1. data/recipes.json exists\n2. Your Python server is running\n3. Check browser console for errors');
  } else {
    console.log('Successfully loaded', allRecipes.length, 'recipes');
  }
  
  createIngredientBoxes();
  
  // Setup the tab switching listeners
  setupTabs();

  // Check if user was previously logged in
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    const users = getUsers();
    if (users[savedUser]) {
      console.log('Auto-logging in user:', savedUser);
      showMainContent(savedUser);
    } else {
      showAuth();
    }
  } else {
    showAuth();
  }
});
