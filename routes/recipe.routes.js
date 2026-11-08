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
import {
  addOrUpdateReview,
  getRecipeReviews,
  deleteReview,
} from '../controllers/review.controller.js';
import { validateRecipeCreation } from '../middlewares/recipeValidator.middleware.js';
import { validateReview } from '../validations/review.validation.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  updateRecipeSchema,
  scaleRecipeSchema,
} from '../validations/recipe.validation.js';
import {
  verifyAuth,
  requireRole,
  requireActiveMembership,
} from '../middlewares/auth.middleware.js';
import { recipeCreationLimiter } from '../middlewares/rateLimiter.middleware.js';
import { uploadRecipeImage } from '../middlewares/upload.middleware.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const router = Router();

/**
 * @route   POST /api/recipes
 * @desc    Create a new recipe with:
 *          1. Rate limiting
 *          2. JWT authentication
 *          3. Role-based access control (chef or admin)
 *          4. Active membership status check (blocks expired/inactive accounts)
 *          5. express-validator checks (enforcing required title & ingredients)
 *          6. MongoDB persistence with automatic slug generation
 */
router.post(
  '/',
  recipeCreationLimiter,
  verifyAuth,
  requireRole('chef', 'admin'),
  requireActiveMembership,
  validateRecipeCreation,
  createRecipe
);

/**
 * @route   POST /api/recipes/upload-image
 * @desc    Upload recipe food photography or demonstration image
 */
router.post(
  '/upload-image',
  verifyAuth,
  requireRole('chef', 'admin'),
  requireActiveMembership,
  uploadRecipeImage.single('image'),
  (req, res) => {
    if (!req.file) {
      return sendError(res, 'No image file uploaded', 400);
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    return sendSuccess(res, 'Image uploaded successfully', {
      filename: req.file.filename,
      imageUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 201);
  }
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
  requireRole('chef', 'admin'),
  requireActiveMembership,
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

/**
 * @route   POST /api/recipes/:recipeId/reviews
 * @desc    Submit a review and rating for a recipe (recalculates recipe average)
 */
router.post(
  '/:recipeId/reviews',
  verifyAuth,
  validateReview,
  addOrUpdateReview
);

/**
 * @route   GET /api/recipes/:recipeId/reviews
 * @desc    Retrieve reviews for a recipe
 */
router.get('/:recipeId/reviews', getRecipeReviews);

/**
 * @route   DELETE /api/recipes/:recipeId/reviews/:reviewId
 * @desc    Delete a review
 */
router.delete('/:recipeId/reviews/:reviewId', verifyAuth, deleteReview);

export default router;
