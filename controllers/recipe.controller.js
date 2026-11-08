import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { Recipe } from '../models/Recipe.js';
import { User } from '../models/User.js';
import { verifyStripeSubscriptionStatus } from '../config/stripe.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/apiResponse.js';
import {
  generateGroceryList,
  inferDietaryLabels,
  detectAllergens,
} from '../services/culinary.service.js';

// Recipe publishing quotas by account tier
const NORMAL_TIER_RECIPE_LIMIT = 5;

/**
 * @desc    Secure, production-ready Express controller to create and publish a recipe.
 *          Features:
 *          1) JWT Authentication & RBAC (Normal vs. Premium vs. Admin)
 *          2) express-validator input validation
 *          3) Stripe subscription verification for publishing quotas
 *          4) Structured JSON error & success responses with appropriate HTTP status codes
 * @route   POST /api/recipes
 * @access  Private (Authenticated Normal, Premium, or Admin user)
 */
export const createRecipe = asyncHandler(async (req, res) => {
  // =========================================================================
  // 1. JWT AUTHENTICATION & IDENTITY EXTRACTION (Defense-in-Depth)
  // =========================================================================
  let user = req.user;

  // If user is not already attached by an upstream middleware, extract from JWT Bearer token
  if (!user || !user._id) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_TOKEN_MISSING',
        message: 'Authentication failed: Missing or malformed Bearer token in Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'chefflow_super_secret_jwt_key_2026_dev'
      );

      user = await User.findById(decoded.id).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_USER_NOT_FOUND',
          message: 'Authentication failed: The user account associated with this token no longer exists.',
        });
      }
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_TOKEN_INVALID',
        message: 'Authentication failed: Token is invalid or has expired.',
        error: process.env.NODE_ENV === 'development' ? jwtErr.message : undefined,
      });
    }
  }

  // Account standing check
  if (user.membershipStatus === 'suspended') {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_SUSPENDED',
      message: 'Access denied: Your account is currently suspended. Please contact support.',
    });
  }

  // =========================================================================
  // 2. EXPRESS-VALIDATOR INPUT VALIDATION
  // =========================================================================
  const validationErrors = validationResult(req);

  if (!validationErrors.isEmpty()) {
    const formattedErrors = validationErrors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      rejectedValue: err.value !== undefined ? err.value : null,
    }));

    return res.status(400).json({
      success: false,
      code: 'VALIDATION_FAILED',
      message: 'Validation failed: Required recipe fields (title, ingredients) or nested properties are invalid.',
      errors: formattedErrors,
    });
  }

  // =========================================================================
  // 3. ROLE-BASED ACCESS CONTROL (RBAC) & STRIPE SUBSCRIPTION VERIFICATION
  // =========================================================================
  const userRole = (user.role || 'normal').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isPremium = userRole === 'premium' || userRole === 'chef';

  // Count recipes already published by this author in MongoDB
  const currentPublishedCount = await Recipe.countDocuments({
    author: user._id,
    status: 'published',
  });

  // CASE A: NORMAL TIER USERS (Free tier with quota limit)
  if (!isAdmin && !isPremium) {
    if (currentPublishedCount >= NORMAL_TIER_RECIPE_LIMIT) {
      return res.status(402).json({
        success: false,
        code: 'PUBLISHING_QUOTA_EXCEEDED',
        message: `Free Normal Tier publishing limit reached (${NORMAL_TIER_RECIPE_LIMIT} recipes). Please upgrade to Premium for unlimited publishing.`,
        quota: {
          tier: 'normal',
          limit: NORMAL_TIER_RECIPE_LIMIT,
          publishedCount: currentPublishedCount,
          remaining: 0,
          upgradeUrl: '/pricing?plan=premium',
        },
      });
    }
  }

  // CASE B: PREMIUM TIER USERS (Verified via Stripe API)
  if (isPremium && !isAdmin) {
    if (!user.stripeSubscriptionId) {
      return res.status(402).json({
        success: false,
        code: 'STRIPE_SUBSCRIPTION_REQUIRED',
        message: 'No active Stripe subscription found on file for this Premium account. Please subscribe to unlock unlimited publishing.',
        subscription: {
          status: 'none',
          checkoutUrl: '/checkout/premium-chef',
        },
      });
    }

    // Query Stripe to verify current subscription standing
    const stripeVerification = await verifyStripeSubscriptionStatus(user.stripeSubscriptionId);

    if (!stripeVerification.isValid) {
      // Sync subscription state to MongoDB
      user.subscriptionStatus = stripeVerification.status || 'canceled';
      await user.save();

      return res.status(402).json({
        success: false,
        code: 'STRIPE_SUBSCRIPTION_INACTIVE',
        message: `Your Stripe subscription is currently '${stripeVerification.status}'. An active subscription is required to publish recipes.`,
        subscription: {
          status: stripeVerification.status,
          subscriptionId: user.stripeSubscriptionId,
          billingPortalUrl: '/billing/portal',
        },
      });
    }

    // Refresh cached period end if present
    if (stripeVerification.currentPeriodEnd) {
      user.stripeCurrentPeriodEnd = stripeVerification.currentPeriodEnd;
      user.subscriptionStatus = 'active';
      await user.save();
    }
  }

  // =========================================================================
  // 4. DUPLICATE RECIPE TITLE PREVENTION (409 Conflict)
  // =========================================================================
  const { title } = req.body;
  const normalizedTitle = title.trim();

  const duplicateRecipe = await Recipe.findOne({
    author: user._id,
    title: new RegExp(`^${normalizedTitle}$`, 'i'),
  });

  if (duplicateRecipe) {
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_RECIPE_TITLE',
      message: `You have already published a recipe titled '${normalizedTitle}'. Please choose a distinct title.`,
      conflict: {
        existingRecipeId: duplicateRecipe._id,
        existingSlug: duplicateRecipe.slug,
      },
    });
  }

  // =========================================================================
  // 5. RECIPE DOCUMENT PREPARATION & MONGODB PERSISTENCE
  // =========================================================================
  const recipeData = { ...req.body };

  // Bind authenticated author metadata
  recipeData.author = user._id;
  recipeData.authorName = user.name || 'ChefFlow Chef';

  // Ensure totalTime calculation
  if (recipeData.prepTime != null && recipeData.cookTime != null) {
    recipeData.totalTime = Number(recipeData.prepTime) + Number(recipeData.cookTime);
  }

  // Automatically infer dietary preferences if not explicitly populated
  if (!recipeData.dietaryInfo || recipeData.dietaryInfo.length === 0) {
    recipeData.dietaryInfo = inferDietaryLabels(recipeData.ingredients);
  }

  // Persist recipe (triggers pre-validate hooks for slug generation)
  const newRecipe = new Recipe(recipeData);
  await newRecipe.save();

  // Update user published recipe count atomically
  await User.findByIdAndUpdate(user._id, {
    $inc: { publishedRecipesCount: 1 },
  });

  // Populate author details for the client
  await newRecipe.populate('author', 'name email avatar role specialties');

  // =========================================================================
  // 6. STRUCTURED SUCCESS RESPONSE (201 Created)
  // =========================================================================
  const remainingQuota = isPremium || isAdmin
    ? 'unlimited'
    : Math.max(0, NORMAL_TIER_RECIPE_LIMIT - (currentPublishedCount + 1));

  return res.status(201).json({
    success: true,
    code: 'RECIPE_PUBLISHED',
    message: 'Recipe created and published successfully.',
    data: {
      recipe: newRecipe,
      publishingQuota: {
        tier: userRole,
        publishedCount: currentPublishedCount + 1,
        limit: isPremium || isAdmin ? 'unlimited' : NORMAL_TIER_RECIPE_LIMIT,
        remainingQuota,
      },
    },
  });
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

/**
 * @desc    Generate a consolidated supermarket shopping list from multiple recipes
 * @route   POST /api/recipes/grocery-list
 * @access  Public
 */
export const generateShoppingList = asyncHandler(async (req, res) => {
  const { recipeIds = [], customServings = {} } = req.body;

  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    return sendError(res, 'Please provide an array of recipe IDs to compile a shopping list', 400);
  }

  // Validate ObjectIds
  const validIds = recipeIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    return sendError(res, 'No valid recipe ObjectIds provided', 400);
  }

  const recipes = await Recipe.find({ _id: { $in: validIds } }).lean();
  if (recipes.length === 0) {
    return sendError(res, 'None of the requested recipes were found', 404);
  }

  // Build items array for grocery generator with custom or default servings
  const items = recipes.map((recipe) => ({
    recipe,
    targetServings: customServings[recipe._id.toString()] || recipe.servings,
  }));

  const groceryList = generateGroceryList(items);

  return sendSuccess(res, 'Grocery list generated successfully', {
    recipeCount: recipes.length,
    recipesIncluded: recipes.map((r) => ({ id: r._id, title: r.title, servings: customServings[r._id.toString()] || r.servings })),
    groceryList,
  });
});

