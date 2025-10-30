async function loadRecipes() {
  const res = await fetch("data/recipes.json");
  return res.json();
}

function getAllIngredients(recipes) {
  const ingredients = new Set();
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => {
      ingredients.add(ingredient.toLowerCase());
    });
  });
  return Array.from(ingredients).sort();
}

function createIngredientBoxes(ingredients) {
  const container = document.getElementById("ingredients-container");
  container.innerHTML = "";
  
  ingredients.forEach(ingredient => {
    const box = document.createElement("div");
    box.className = "ingredient-box";
    box.textContent = ingredient;
    box.addEventListener("click", () => {
      box.classList.toggle("selected");
    });
    container.appendChild(box);
  });
}

function getSelectedIngredients() {
  return Array.from(document.querySelectorAll(".ingredient-box.selected"))
    .map(box => box.textContent.toLowerCase());
}

function findRecipes(userIngredients, recipes) {
  return recipes.filter(r =>
    r.ingredients.every(i => userIngredients.includes(i.toLowerCase()))
  );
}

function renderRecipes(recipes) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (recipes.length === 0) {
    resultsDiv.textContent = "No matches found.";
    return;
  }

  for (const r of recipes) {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <img src="${r.image}" alt="${r.name}">
      <h3>${r.name}</h3>
      <p><strong>Ingredients:</strong> ${r.ingredients.join(", ")}</p>
      <p>${r.instructions}</p>
    `;
    resultsDiv.appendChild(card);
  }
}

async function initializeApp() {
  const recipes = await loadRecipes();
  const allIngredients = getAllIngredients(recipes);
  createIngredientBoxes(allIngredients);
}

async function performSearch() {
  const userIngredients = getSelectedIngredients();
  const recipes = await loadRecipes();
  const matches = findRecipes(userIngredients, recipes);
  renderRecipes(matches);
}

document.getElementById("search-btn").addEventListener("click", performSearch);

// Initialize the app when the page loads
window.addEventListener("load", initializeApp);
