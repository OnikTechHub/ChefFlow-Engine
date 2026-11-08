import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware factory to validate request body using a Zod schema
 * @param {import('zod').ZodSchema} schema
 */
export const validateBody = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed; // assign validated and sanitized data
    next();
  } catch (error) {
    if (error.errors && Array.isArray(error.errors)) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return sendError(res, 'Validation failed for recipe payload', 400, formattedErrors);
    }

    return sendError(res, error.message || 'Validation error', 400);
  }
};

/**
 * Middleware factory to validate request query parameters
 * @param {import('zod').ZodSchema} schema
 */
export const validateQuery = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.query);
    req.query = parsed;
    next();
  } catch (error) {
    if (error.errors && Array.isArray(error.errors)) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return sendError(res, 'Invalid query parameters', 400, formattedErrors);
    }

    return sendError(res, error.message || 'Query validation error', 400);
  }
};

