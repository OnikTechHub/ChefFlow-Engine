import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Recipe } from '../models/Recipe.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/apiResponse.js';

/**
 * Recalculate average rating and total review count for a recipe
 */
const updateRecipeRatingStats = async (recipeId) => {
  const stats = await Review.aggregate([
    { $match: { recipe: new mongoose.Types.ObjectId(recipeId) } },
    {
      $group: {
        _id: '$recipe',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Recipe.findByIdAndUpdate(recipeId, {
      ratings: {
        average: Math.round(stats[0].averageRating * 10) / 10,
        count: stats[0].reviewCount,
      },
    });
  } else {
    await Recipe.findByIdAndUpdate(recipeId, {
      ratings: {
        average: 0,
        count: 0,
      },
    });
  }
};

/**
 * @desc    Add or update a recipe review and recalculate ratings
 * @route   POST /api/recipes/:recipeId/reviews
 * @access  Private
 */
export const addOrUpdateReview = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  const { rating, comment = '' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(recipeId)) {
    return sendError(res, 'Invalid recipe ID format', 400);
  }

  const recipe = await Recipe.findById(recipeId);
  if (!recipe) {
    return sendError(res, 'Recipe not found', 404);
  }

  const userId = req.user?._id;
  if (!userId) {
    return sendError(res, 'Authentication required to post a review', 401);
  }

  // Prevent recipe author from rating their own recipe
  if (recipe.author && recipe.author.toString() === userId.toString()) {
    return sendError(res, 'You cannot review your own recipe', 400);
  }

  // Upsert the review (update if already reviewed, insert if new)
  const review = await Review.findOneAndUpdate(
    { recipe: recipeId, user: userId },
    { rating, comment },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('user', 'name avatar');

  // Recalculate ratings on Recipe
  await updateRecipeRatingStats(recipeId);

  const updatedRecipe = await Recipe.findById(recipeId).select('ratings');

  return sendSuccess(
    res,
    'Review submitted successfully',
    {
      review,
      recipeRatings: updatedRecipe.ratings,
    },
    201
  );
});

/**
 * @desc    Get all reviews for a specific recipe
 * @route   GET /api/recipes/:recipeId/reviews
 * @access  Public
 */
export const getRecipeReviews = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(recipeId)) {
    return sendError(res, 'Invalid recipe ID format', 400);
  }

  const reviews = await Review.find({ recipe: recipeId })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });

  return sendSuccess(res, 'Reviews retrieved successfully', reviews);
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/recipes/:recipeId/reviews/:reviewId
 * @access  Private (Reviewer or Admin)
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const { recipeId, reviewId } = req.params;

  const review = await Review.findById(reviewId);
  if (!review) {
    return sendError(res, 'Review not found', 404);
  }

  if (
    req.user &&
    review.user.toString() !== req.user._id?.toString() &&
    req.user.role !== 'admin'
  ) {
    return sendError(res, 'Unauthorized to delete this review', 403);
  }

  await review.deleteOne();
  await updateRecipeRatingStats(recipeId);

  return sendSuccess(res, 'Review deleted successfully', { reviewId });
});

