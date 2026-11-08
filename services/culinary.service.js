/**
 * Culinary Intelligence & Helper Service
 * Provides automated allergen detection, dietary inference, and grocery list aggregation.
 */

// Allergen dictionary with keyword matching
const ALLERGEN_RULES = {
  Dairy: ['milk', 'cheese', 'butter', 'cream', 'parmigiano', 'yogurt', 'mozzarella', 'cheddar', 'ghee', 'whey', 'mascarpone', 'ricotta'],
  Gluten: ['flour', 'wheat', 'bread', 'pasta', 'soy sauce', 'barley', 'rye', 'beer', 'semolina', 'couscous', 'breadcrumbs'],
  Peanuts: ['peanut', 'peanuts', 'peanut butter', 'groundnut'],
  'Tree Nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'pine nut'],
  Shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop'],
  Fish: ['salmon', 'tuna', 'cod', 'halibut', 'anchovy', 'fish sauce', 'mackerel', 'bass', 'snapper'],
  Eggs: ['egg', 'eggs', 'egg yolk', 'egg white', 'mayonnaise'],
  Soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'soy sauce', 'tamari', 'miso'],
  Sesame: ['sesame', 'tahini', 'sesame oil'],
};

// Meat / animal product rules for dietary classification
const MEAT_KEYWORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'ham', 'sausage',
  'duck', 'veal', 'venison', 'steak', 'meat', 'prosciutto', 'pancetta',
];

/**
 * Detect allergens present in a list of ingredients
 * @param {Array<{ name: string }>} ingredients
 * @returns {Array<string>} List of identified allergens
 */
export const detectAllergens = (ingredients = []) => {
  const detected = new Set();

  for (const item of ingredients) {
    const itemName = (item.name || '').toLowerCase();

    for (const [allergen, keywords] of Object.entries(ALLERGEN_RULES)) {
      if (keywords.some((kw) => itemName.includes(kw))) {
        detected.add(allergen);
      }
    }
  }

  return Array.from(detected);
};

/**
 * Automatically deduce dietary classifications from ingredients
 * @param {Array<{ name: string }>} ingredients
 * @returns {Array<string>} Inferred dietary labels (e.g. Vegetarian, Dairy-Free, Gluten-Free)
 */
export const inferDietaryLabels = (ingredients = []) => {
  const allergens = detectAllergens(ingredients);
  const labels = [];

  const hasMeat = ingredients.some((i) =>
    MEAT_KEYWORDS.some((kw) => (i.name || '').toLowerCase().includes(kw))
  );

  const hasFishOrShellfish = allergens.includes('Fish') || allergens.includes('Shellfish');
  const hasDairy = allergens.includes('Dairy');
  const hasGluten = allergens.includes('Gluten');
  const hasEggs = allergens.includes('Eggs');
  const hasNuts = allergens.includes('Peanuts') || allergens.includes('Tree Nuts');

  if (!hasMeat && !hasFishOrShellfish) {
    if (!hasDairy && !hasEggs) {
      labels.push('Vegan');
    }
    labels.push('Vegetarian');
  } else if (!hasMeat && hasFishOrShellfish) {
    labels.push('Pescatarian');
  }

  if (!hasGluten) {
    labels.push('Gluten-Free');
  }

  if (!hasDairy) {
    labels.push('Dairy-Free');
  }

  if (!hasNuts) {
    labels.push('Nut-Free');
  }

  return labels;
};

// Pantry categorization rules for grocery lists
const CATEGORY_MAP = {
  Produce: ['tomato', 'onion', 'garlic', 'shallot', 'lemon', 'lime', 'basil', 'cilantro', 'spinach', 'mushroom', 'potato', 'carrot', 'herb', 'pepper', 'chili', 'thyme', 'rosemary'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'salmon', 'prawn', 'steak', 'turkey', 'lamb', 'bacon', 'egg'],
  Dairy: ['milk', 'cheese', 'butter', 'cream', 'parmigiano', 'yogurt', 'mozzarella'],
  Bakery: ['bread', 'baguette', 'tortilla', 'bun', 'pita'],
  'Pantry & Staples': ['rice', 'pasta', 'flour', 'sugar', 'olive oil', 'oil', 'vinegar', 'sauce', 'broth', 'stock', 'wine', 'bean', 'lentil'],
  'Spices & Seasonings': ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'cinnamon', 'curry', 'turmeric', 'chili powder'],
};

const getAisleCategory = (ingredientName) => {
  const name = ingredientName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => name.includes(kw))) {
      return category;
    }
  }
  return 'Other Pantry Items';
};

/**
 * Generate an aggregated, organized grocery shopping list from one or more recipes
 * @param {Array<{ recipe: object, servings?: number }>} items
 * @returns {object} Categorized grocery items
 */
export const generateGroceryList = (items = []) => {
  const ingredientMap = new Map();

  for (const item of items) {
    const { recipe, targetServings } = item;
    const scale = targetServings && recipe.servings ? targetServings / recipe.servings : 1;

    for (const ing of recipe.ingredients || []) {
      const normalizedKey = `${ing.name.trim().toLowerCase()}_${ing.unit.trim().toLowerCase()}`;
      const scaledAmount = (ing.amount || 0) * scale;

      if (ingredientMap.has(normalizedKey)) {
        const existing = ingredientMap.get(normalizedKey);
        existing.amount += scaledAmount;
        existing.recipeSources.push(recipe.title);
      } else {
        ingredientMap.set(normalizedKey, {
          name: ing.name.trim(),
          amount: scaledAmount,
          unit: ing.unit.trim(),
          aisle: getAisleCategory(ing.name),
          recipeSources: [recipe.title],
        });
      }
    }
  }

  // Format quantities and group by supermarket aisle
  const groupedList = {};
  for (const item of ingredientMap.values()) {
    item.amount = Math.round(item.amount * 100) / 100;
    item.recipeSources = Array.from(new Set(item.recipeSources));

    if (!groupedList[item.aisle]) {
      groupedList[item.aisle] = [];
    }
    groupedList[item.aisle].push(item);
  }

  return groupedList;
};

