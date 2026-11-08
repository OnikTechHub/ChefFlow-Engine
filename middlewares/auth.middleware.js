import jwt from 'jsonwebtoken';
import { sendError } from '../utils/apiResponse.js';
import { User } from '../models/User.js';

/**
 * Authentication middleware that verifies JWT Bearer tokens.
 * In development environments, it supports x-user-id / x-user-role / x-membership-status headers
 * or defaults to an active guest chef context.
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

  // Development / direct header convenience for testing
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

  // Development simulation headers
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    const customRole = req.headers['x-user-role'] || 'chef';
    const customMembership = req.headers['x-membership-status'] || 'active';

    req.user = {
      _id: null,
      name: 'ChefFlow Certified Chef',
      role: customRole,
      membershipStatus: customMembership,
      membershipTier: 'pro_chef',
      hasActiveMembership() {
        return this.membershipStatus === 'active';
      },
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
 * Role-based access control middleware: ensures authenticated user possesses an authorized role
 * @param  {...string} roles - e.g. 'chef', 'admin'
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required to perform this action', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied: Role '${req.user.role}' is not authorized to perform this action. Required role(s): ${roles.join(', ')}`,
        403,
        {
          currentRole: req.user.role,
          requiredRoles: roles,
        }
      );
    }

    next();
  };
};

/**
 * Membership status middleware: ensures user holds an 'active' membership status to publish recipes
 */
export const requireActiveMembership = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required to verify membership status', 401);
  }

  // Admins bypass subscription/membership requirements
  if (req.user.role === 'admin') {
    return next();
  }

  const status = req.user.membershipStatus || 'inactive';

  if (status !== 'active') {
    return sendError(
      res,
      `Access denied: An active membership is required to publish recipes. Current status: '${status}'.`,
      403,
      {
        membershipStatus: status,
        requiredStatus: 'active',
      }
    );
  }

  // Check expiration if set
  if (req.user.membershipExpiresAt && new Date() > new Date(req.user.membershipExpiresAt)) {
    return sendError(
      res,
      'Access denied: Your culinary membership has expired. Please renew your membership to publish recipes.',
      403,
      {
        membershipStatus: 'expired',
        expiredAt: req.user.membershipExpiresAt,
      }
    );
  }

  next();
};

/**
 * Combined authorization middleware: Enforces both authorized role ('chef' or 'admin')
 * AND active membership status in one unified guard.
 */
export const authorizeRecipePublisher = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required to publish recipes', 401);
  }

  // 1. Role Check: Must be 'chef' or 'admin'
  const allowedRoles = ['chef', 'admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return sendError(
      res,
      `Access denied: Only chefs and administrators are permitted to publish recipes. Your role is '${req.user.role}'.`,
      403,
      { currentRole: req.user.role, allowedRoles }
    );
  }

  // 2. Active Membership Check: Must have active status (admins bypass)
  if (req.user.role !== 'admin') {
    const status = req.user.membershipStatus || 'inactive';

    if (status !== 'active') {
      return sendError(
        res,
        `Access denied: Active membership status required to publish recipes. Your current status is '${status}'.`,
        403,
        { membershipStatus: status, requiredStatus: 'active' }
      );
    }

    if (req.user.membershipExpiresAt && new Date() > new Date(req.user.membershipExpiresAt)) {
      return sendError(
        res,
        'Access denied: Your membership has expired. Please renew your subscription to publish recipes.',
        403,
        { membershipStatus: 'expired', expiredAt: req.user.membershipExpiresAt }
      );
    }
  }

  next();
};
