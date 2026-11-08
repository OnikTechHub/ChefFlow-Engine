import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { Recipe } from '../models/Recipe.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/apiResponse.js';

/**
 * @desc    Create a new recipe
 * @route   POST /api/recipes
 * @access  Private (or authenticated chef)
 */
export const createRecipe = asyncHandler(async (req, res) => {
  // Defense-in-depth: check express-validator errors before database interaction
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value !== undefined ? err.value : null,
    }));
    return sendError(
      res,
      'Validation failed: Title and valid ingredients are required before creating a recipe.',
      400,
      formattedErrors
    );
  }

  const recipeData = { ...req.body };

  // Associate recipe with authenticated user if present
  if (req.user && req.user._id) {
    recipeData.author = req.user._id;
    recipeData.authorName = req.user.name || recipeData.authorName;
  } else if (!recipeData.authorName) {
    recipeData.authorName = 'ChefFlow Culinary Team';
  }

  // Ensure totalTime is computed
  if (recipeData.prepTime != null && recipeData.cookTime != null) {
    recipeData.totalTime = recipeData.prepTime + recipeData.cookTime;
  }

  // Check for duplicate recipe title by the same author to prevent accidental re-submissions
  if (recipeData.author) {
    const existingRecipe = await Recipe.findOne({
      title: new RegExp(`^${recipeData.title.trim()}$`, 'i'),
      author: recipeData.author,
    });

    if (existingRecipe) {
      return sendError(
        res,
        'You have already created a recipe with this exact title',
        409,
        { existingRecipeId: existingRecipe._id, existingSlug: existingRecipe.slug }
      );
    }
  }

  // Instantiate and save the recipe document (triggers Mongoose schema pre-validate hooks)
  const newRecipe = new Recipe(recipeData);
  await newRecipe.save();

  // Populate author details if referenced
  if (newRecipe.author) {
    await newRecipe.populate('author', 'name email avatar specialties');
  }

  return sendSuccess(res, 'Recipe created successfully', newRecipe, 201);
});

/**
 * @desc    Get all recipes with pagination, full-text search, and multi-faceted filtering
 * @route   GET /api/recipes
 * @access  Public
 */
export const getRecipes = asyncHandler(async (req, res) => {
  const {
    search,
    cuisine,
    category,
    difficulty,
    dietary,
    maxTime,
    minRating,
    author,
    status = 'published',
    sort = 'newest',
    page = 1,
    limit = 10,
  } = req.query;

  const query = {};

  // Filter by publication status
  if (status) {
    query.status = status;
  }

  // Full-text or regex search across title, cuisine, description, tags, ingredients
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { cuisine: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
      { 'ingredients.name': { $regex: search, $options: 'i' } },
    ];
  }

  // Faceted filters
  if (cuisine) {
    query.cuisine = { $regex: new RegExp(`^${cuisine}$`, 'i') };
  }

  if (category) {
    query.category = category;
  }

  if (difficulty) {
    query.difficulty = difficulty;
  }

  if (dietary) {
    const dietaryList = Array.isArray(dietary) ? dietary : dietary.split(',').map((d) => d.trim());
    query.dietaryInfo = { $all: dietaryList };
  }

  if (maxTime) {
    query.totalTime = { $lte: Number(maxTime) };
  }

  if (minRating) {
    query['ratings.average'] = { $gte: Number(minRating) };
  }

  if (author && mongoose.Types.ObjectId.isValid(author)) {
    query.author = author;
  }

  // Sorting logic
  let sortOption = { createdAt: -1 }; // default newest
  switch (sort) {
    case 'oldest':
      sortOption = { createdAt: 1 };
      break;
    case 'rating':
      sortOption = { 'ratings.average': -1, 'ratings.count': -1 };
      break;
    case 'popular':
      sortOption = { likesCount: -1, 'ratings.count': -1 };
      break;
    case 'quickest':
      sortOption = { totalTime: 1 };
      break;
    case 'title':
      sortOption = { title: 1 };
      break;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [recipes, totalCount] = await Promise.all([
    Recipe.find(query)
      .populate('author', 'name avatar specialties')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Recipe.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return sendSuccess(res, 'Recipes retrieved successfully', recipes, 200, {
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalCount,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
});

/**
 * @desc    Get a single recipe by its MongoDB ID or unique URL slug
 * @route   GET /api/recipes/:idOrSlug
 * @access  Public
 */
export const getRecipeByIdOrSlug = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;

  let query = {};
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    query = { _id: idOrSlug };
  } else {
    query = { slug: idOrSlug.toLowerCase() };
  }

  const recipe = await Recipe.findOne(query).populate('author', 'name email avatar bio specialties');

  if (!recipe) {
    return sendError(res, `Recipe with identifier '${idOrSlug}' not found`, 404);
  }

  return sendSuccess(res, 'Recipe retrieved successfully', recipe);
});

/**
 * @desc    Update an existing recipe
 * @route   PUT /api/recipes/:id
 * @access  Private (Author or Admin)
 */
export const updateRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid recipe ID format', 400);
  }

  const recipe = await Recipe.findById(id);
  if (!recipe) {
    return sendError(res, 'Recipe not found', 404);
  }

  // Authorization check: only author or admin can modify
  if (
    req.user &&
    recipe.author &&
    recipe.author.toString() !== req.user._id?.toString() &&
    req.user.role !== 'admin'
  ) {
    return sendError(res, 'Unauthorized: You can only update recipes you created', 403);
  }

  const updateData = { ...req.body };

  // Recalculate totalTime if prepTime or cookTime changed
  const prep = updateData.prepTime !== undefined ? updateData.prepTime : recipe.prepTime;
  const cook = updateData.cookTime !== undefined ? updateData.cookTime : recipe.cookTime;
  updateData.totalTime = prep + cook;

  // Apply updates
  Object.assign(recipe, updateData);
  await recipe.save();

  return sendSuccess(res, 'Recipe updated successfully', recipe);
});

/**
 * @desc    Delete a recipe
 * @route   DELETE /api/recipes/:id
 * @access  Private (Author or Admin)
 */
export const deleteRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid recipe ID format', 400);
  }

  const recipe = await Recipe.findById(id);
  if (!recipe) {
    return sendError(res, 'Recipe not found', 404);
  }

  if (
    req.user &&
    recipe.author &&
    recipe.author.toString() !== req.user._id?.toString() &&
    req.user.role !== 'admin'
  ) {
    return sendError(res, 'Unauthorized: You can only delete recipes you created', 403);
  }

  await recipe.deleteOne();

  return sendSuccess(res, 'Recipe deleted successfully', { id });
});

/**
 * @desc    Scale recipe ingredient quantities and nutrition dynamically based on target servings
 * @route   POST /api/recipes/:id/scale
 * @access  Public
 */
export const scaleRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { targetServings } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'Invalid recipe ID format', 400);
  }

  const recipe = await Recipe.findById(id);
  if (!recipe) {
    return sendError(res, 'Recipe not found', 404);
  }

  const originalServings = recipe.servings;
  const scaleRatio = targetServings / originalServings;

  const scaledIngredients = recipe.ingredients.map((item) => {
    const rawScaledAmount = item.amount * scaleRatio;
    // Round to 2 decimal places cleanly
    const formattedAmount = Math.round(rawScaledAmount * 100) / 100;

    return {
      name: item.name,
      amount: formattedAmount,
      unit: item.unit,
      notes: item.notes,
      isOptional: item.isOptional,
    };
  });

  return sendSuccess(res, `Recipe scaled from ${originalServings} to ${targetServings} servings`, {
    recipeId: recipe._id,
    title: recipe.title,
    originalServings,
    targetServings,
    scaleFactor: Math.round(scaleRatio * 100) / 100,
    ingredients: scaledIngredients,
    nutritionPerServing: recipe.nutrition, // Nutrition per serving stays consistent!
  });
});

/**
 * @desc    Search recipes by available pantry ingredients ("What's in my fridge?")
 * @route   POST /api/recipes/search-by-ingredients
 * @access  Public
 */
export const searchByIngredients = asyncHandler(async (req, res) => {
  const { ingredients } = req.body;

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return sendError(res, 'Please provide an array of ingredients to search for', 400);
  }

  const searchTerms = ingredients.map((i) => i.trim().toLowerCase());

  // Find published recipes that contain any of the given ingredients
  const recipes = await Recipe.find({
    status: 'published',
    'ingredients.name': { $in: searchTerms.map((t) => new RegExp(t, 'i')) },
  }).lean();

  // Rank recipes by number of matched ingredients
  const scoredRecipes = recipes
    .map((recipe) => {
      const matchedIngredients = recipe.ingredients.filter((item) =>
        searchTerms.some((term) => item.name.toLowerCase().includes(term))
      );
      const matchPercentage = Math.round((matchedIngredients.length / recipe.ingredients.length) * 100);

      return {
        ...recipe,
        matchedCount: matchedIngredients.length,
        totalIngredients: recipe.ingredients.length,
        matchPercentage,
        matchedIngredientNames: matchedIngredients.map((i) => i.name),
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  return sendSuccess(res, 'Recipes matched by pantry ingredients', scoredRecipes, 200, {
    matchedCount: scoredRecipes.length,
    searchedIngredients: searchTerms,
  });
});

