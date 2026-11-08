import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Recipe } from '../models/Recipe.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/apiResponse.js';

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'chefflow_super_secret_jwt_key_2026_dev',
    { expiresIn: '7d' }
  );
};

/**
 * @desc    Register a new chef or user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'chef', bio, specialties } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 'An account with this email address already exists', 409);
  }

  const user = new User({
    name,
    email,
    password,
    role,
    bio: bio || '',
    specialties: specialties || [],
  });

  await user.save();

  const token = generateToken(user._id);

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    specialties: user.specialties,
  };

  return sendSuccess(res, 'Chef profile registered successfully', { user: userResponse, token }, 201);
});

/**
 * @desc    Login chef or user and issue JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return sendError(res, 'Invalid email or password', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return sendError(res, 'Invalid email or password', 401);
  }

  const token = generateToken(user._id);

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    specialties: user.specialties,
    savedRecipes: user.savedRecipes,
  };

  return sendSuccess(res, 'Logged in successfully', { user: userResponse, token });
});

/**
 * @desc    Get current authenticated user profile with authored recipes count
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return sendError(res, 'Not authenticated', 401);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  const recipesCount = await Recipe.countDocuments({ author: user._id });

  return sendSuccess(res, 'User profile retrieved', {
    user,
    stats: {
      authoredRecipesCount: recipesCount,
      savedRecipesCount: user.savedRecipes.length,
    },
  });
});

/**
 * @desc    Bookmark or unbookmark a recipe
 * @route   POST /api/auth/bookmarks/:recipeId
 * @access  Private
 */
export const toggleBookmark = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;

  if (!req.user || !req.user._id) {
    return sendError(res, 'Authentication required to save recipes', 401);
  }

  const recipe = await Recipe.findById(recipeId);
  if (!recipe) {
    return sendError(res, 'Recipe not found', 404);
  }

  const user = await User.findById(req.user._id);
  const alreadySaved = user.savedRecipes.some((id) => id.toString() === recipeId);

  let isSaved = false;
  if (alreadySaved) {
    user.savedRecipes = user.savedRecipes.filter((id) => id.toString() !== recipeId);
    recipe.likesCount = Math.max(0, recipe.likesCount - 1);
    isSaved = false;
  } else {
    user.savedRecipes.push(recipeId);
    recipe.likesCount = (recipe.likesCount || 0) + 1;
    isSaved = true;
  }

  await Promise.all([user.save(), recipe.save()]);

  return sendSuccess(
    res,
    isSaved ? 'Recipe saved to bookmarks' : 'Recipe removed from bookmarks',
    {
      recipeId,
      isSaved,
      likesCount: recipe.likesCount,
    }
  );
});

/**
 * @desc    Get all bookmarked recipes for the current user
 * @route   GET /api/auth/bookmarks
 * @access  Private
 */
export const getMyBookmarks = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return sendError(res, 'Authentication required', 401);
  }

  const user = await User.findById(req.user._id).populate({
    path: 'savedRecipes',
    populate: { path: 'author', select: 'name avatar' },
  });

  return sendSuccess(res, 'Bookmarked recipes retrieved', user.savedRecipes);
});

