import { Router } from 'express';
import {
  register,
  login,
  getMe,
  toggleBookmark,
  getMyBookmarks,
} from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../validations/auth.validation.js';
import { verifyAuth } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user or chef account
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and retrieve JWT token
 */
router.post('/login', validateLogin, login);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve authenticated chef profile & stats
 */
router.get('/me', verifyAuth, getMe);

/**
 * @route   POST /api/auth/bookmarks/:recipeId
 * @desc    Toggle saving recipe to user's favorites/bookmarks
 */
router.post('/bookmarks/:recipeId', verifyAuth, toggleBookmark);

/**
 * @route   GET /api/auth/bookmarks
 * @desc    Retrieve all bookmarked recipes for current user
 */
router.get('/bookmarks', verifyAuth, getMyBookmarks);

export default router;

