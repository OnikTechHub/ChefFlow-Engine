import { sendError } from '../utils/apiResponse.js';

/**
 * 404 Route Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  return sendError(res, `Endpoint not found: [${req.method}] ${req.originalUrl}`, 404);
};

/**
 * Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error(`[Error Handler] ${err.name}: ${err.message}`);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    return sendError(res, 'Mongoose Schema Validation Failed', 400, errors);
  }

  // Mongoose Duplicate Key Error (e.g. unique slug collision)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue);
    const message = `Duplicate value entered for ${fields.join(', ')}. Please use unique values.`;
    return sendError(res, message, 409, { duplicateFields: err.keyValue });
  }

  // Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, `Invalid format for field '${err.path}': ${err.value}`, 400);
  }

  // JSON parse error in body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON payload provided in request body', 400);
  }

  // Fallback to internal server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};

