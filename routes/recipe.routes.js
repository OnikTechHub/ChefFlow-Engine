import { Router } from 'express';
import {
  createRecipe,
  getRecipes,
  getRecipeByIdOrSlug,
  updateRecipe,
  deleteRecipe,
  scaleRecipe,
  searchByIngredients,
} from '../controllers/recipe.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  createRecipeSchema,
  updateRecipeSchema,
  scaleRecipeSchema,
} from '../validations/recipe.validation.js';
import { verifyAuth } from '../middlewares/auth.middleware.js';
import { recipeCreationLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

/**
 * @route   POST /api/recipes
 * @desc    Create a new recipe with Zod validation, rate limiting, and author binding
 */
router.post(
  '/',
  recipeCreationLimiter,
  verifyAuth,
  validateBody(createRecipeSchema),
  createRecipe
);

/**
 * @route   GET /api/recipes
 * @desc    List recipes with search, multi-field filters, and pagination
 */
router.get('/', getRecipes);

/**
 * @route   POST /api/recipes/search-by-ingredients
 * @desc    Find recipes matching available pantry items
 */
router.post('/search-by-ingredients', searchByIngredients);

/**
 * @route   GET /api/recipes/:idOrSlug
 * @desc    Fetch a single recipe by MongoDB ObjectId or URL slug
 */
router.get('/:idOrSlug', getRecipeByIdOrSlug);

/**
 * @route   PUT /api/recipes/:id
 * @desc    Update recipe by ID (requires author ownership or admin role)
 */
router.put(
  '/:id',
  verifyAuth,
  validateBody(updateRecipeSchema),
  updateRecipe
);

/**
 * @route   DELETE /api/recipes/:id
 * @desc    Delete recipe by ID (requires author ownership or admin role)
 */
router.delete('/:id', verifyAuth, deleteRecipe);

/**
 * @route   POST /api/recipes/:id/scale
 * @desc    Dynamically scale recipe ingredient quantities for N servings
 */
router.post(
  '/:id/scale',
  validateBody(scaleRecipeSchema),
  scaleRecipe
);

export default router;

