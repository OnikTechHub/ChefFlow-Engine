import { body, validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';

/**
 * express-validator rules specifically enforcing required `title` and `ingredients` fields,
 * along with comprehensive validation of the recipe payload before saving to MongoDB.
 */
export const validateRecipeCreationRules = [
  // 1. Title Validation: Required, trimmed, sanitized, length 3-120 characters
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Recipe title is required')
    .isLength({ min: 3, max: 120 })
    .withMessage('Recipe title must be between 3 and 120 characters'),

  // 2. Ingredients Validation: Required array with at least one element
  body('ingredients')
    .isArray({ min: 1 })
    .withMessage('Ingredients are required and must contain at least one item'),

  // Nested validation for each ingredient item
  body('ingredients.*.name')
    .trim()
    .notEmpty()
    .withMessage('Each ingredient must have a name')
    .isLength({ max: 100 })
    .withMessage('Ingredient name cannot exceed 100 characters'),

  body('ingredients.*.amount')
    .notEmpty()
    .withMessage('Each ingredient must have an amount')
    .isFloat({ gt: 0 })
    .withMessage('Ingredient amount must be a number greater than 0')
    .toFloat(),

  body('ingredients.*.unit')
    .trim()
    .notEmpty()
    .withMessage('Each ingredient must have a measurement unit')
    .isLength({ max: 30 })
    .withMessage('Measurement unit cannot exceed 30 characters'),

  body('ingredients.*.notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Ingredient notes cannot exceed 200 characters'),

  body('ingredients.*.isOptional')
    .optional()
    .isBoolean()
    .withMessage('isOptional must be a boolean value'),

  // 3. Description Validation: Required, trimmed, length 10-2000
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Recipe description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Recipe description must be between 10 and 2000 characters'),

  // 4. Cuisine & Category Validation
  body('cuisine')
    .trim()
    .notEmpty()
    .withMessage('Cuisine is required')
    .isLength({ min: 2, max: 60 })
    .withMessage('Cuisine must be between 2 and 60 characters'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn([
      'Breakfast',
      'Lunch',
      'Dinner',
      'Dessert',
      'Appetizer',
      'Soup',
      'Salad',
      'Snack',
      'Beverage',
      'Baking',
      'Side Dish',
    ])
    .withMessage(
      'Invalid recipe category. Must be one of: Breakfast, Lunch, Dinner, Dessert, Appetizer, Soup, Salad, Snack, Beverage, Baking, Side Dish'
    ),

  // 5. Preparation & Cook Time Validation
  body('prepTime')
    .notEmpty()
    .withMessage('Prep time is required')
    .isInt({ min: 0 })
    .withMessage('Prep time must be a non-negative integer')
    .toInt(),

  body('cookTime')
    .notEmpty()
    .withMessage('Cook time is required')
    .isInt({ min: 0 })
    .withMessage('Cook time must be a non-negative integer')
    .toInt(),

  // 6. Servings Yield Validation
  body('servings')
    .notEmpty()
    .withMessage('Servings count is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Servings must be an integer between 1 and 100')
    .toInt(),

  // 7. Instruction Steps Validation
  body('instructions')
    .isArray({ min: 1 })
    .withMessage('Instructions are required and must contain at least one step'),

  body('instructions.*.step')
    .isInt({ min: 1 })
    .withMessage('Instruction step must be a positive integer')
    .toInt(),

  body('instructions.*.description')
    .trim()
    .notEmpty()
    .withMessage('Step description is required')
    .isLength({ min: 5, max: 1500 })
    .withMessage('Step description must be between 5 and 1500 characters'),

  // 8. Optional fields validation
  body('difficulty')
    .optional()
    .isIn(['Easy', 'Medium', 'Hard', 'Chef Special'])
    .withMessage('Difficulty must be Easy, Medium, Hard, or Chef Special'),

  body('dietaryInfo')
    .optional()
    .isArray()
    .withMessage('dietaryInfo must be an array of dietary labels'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('tags must be an array of string tags'),

  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
];

/**
 * Middleware that checks the result of express-validator execution.
 * If any validation errors exist, it halts the request lifecycle immediately
 * and sends a 400 Bad Request error response, preventing any write to MongoDB.
 */
export const handleValidationErrors = (req, res, next) => {
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

  next();
};

/**
 * Combined express-validator middleware chain for recipe creation
 */
export const validateRecipeCreation = [
  ...validateRecipeCreationRules,
  handleValidationErrors,
];

