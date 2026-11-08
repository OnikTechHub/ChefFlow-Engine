import jwt from 'jsonwebtoken';
import { sendError } from '../utils/apiResponse.js';
import { User } from '../models/User.js';

/**
 * Authentication middleware that verifies JWT Bearer tokens.
 * In development environments, it also accepts an x-user-id header or attaches a default guest chef.
 */
export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chefflow_super_secret_jwt_key_2026_dev');
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return sendError(res, 'Authentication failed: User no longer exists', 401);
      }
      req.user = user;
      return next();
    } catch (err) {
      return sendError(res, 'Invalid or expired authentication token', 401);
    }
  }

  // Development / direct header convenience
  if (req.headers['x-user-id']) {
    try {
      const user = await User.findById(req.headers['x-user-id']).select('-password');
      if (user) {
        req.user = user;
        return next();
      }
    } catch {
      // Fall through if invalid ObjectId format
    }
  }

  // If no auth provided in development mode, allow proceeding with a demo chef context or return 401
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      _id: null,
      name: 'ChefFlow Guest Chef',
      role: 'chef',
    };
    return next();
  }

  return sendError(res, 'Authentication required. Missing Bearer token.', 401);
};

/**
 * Optional authentication middleware for public endpoints where user context is useful if present
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chefflow_super_secret_jwt_key_2026_dev');
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'Access denied: You lack required permissions for this action', 403);
    }
    next();
  };
};

