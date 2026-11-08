import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 200, // max 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again later.',
  },
});

export const recipeCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 creations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Recipe creation rate limit exceeded. Please wait a minute before publishing more recipes.',
  },
});

