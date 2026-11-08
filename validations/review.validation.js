import { body } from 'express-validator';
import { handleValidationErrors } from '../middlewares/recipeValidator.middleware.js';

export const reviewValidationRules = [
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be a number between 1.0 and 5.0')
    .toFloat(),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
];

export const validateReview = [...reviewValidationRules, handleValidationErrors];

