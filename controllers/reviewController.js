const reviewService = require('../services/reviewService');
const ResponseUtil = require('../utils/response');
const { body, validationResult } = require('express-validator');

class ReviewController {
  // Create a new review
  async createReview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtil.error(res, 'Validation errors', 400, errors.array());
      }

      const { gymId, rating, comment } = req.body;
      const userEmail = req.user.email;
      const userName = `${req.user.firstName} ${req.user.lastName}`;
      const userAvatar = req.user.currentProfileImage?.imageUrl || null;

      // Check if user can review this gym
      const canReview = await reviewService.canUserReviewGym(userEmail, gymId);
      if (!canReview) {
        return ResponseUtil.error(res, 'You need an active subscription to review this gym', 403);
      }

      const review = await reviewService.createReview({
        userEmail,
        gymId,
        rating,
        comment,
        userName,
        userAvatar
      });

      return ResponseUtil.success(res, review, 'Review created successfully', 201);
    } catch (error) {
      console.error('Create review error:', error);
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  // Get reviews for a gym
  async getGymReviews(req, res) {
    try {
      const { gymId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const result = await reviewService.getGymReviews(gymId, parseInt(limit), offset);
      const stats = await reviewService.getGymRatingStats(gymId);

      const response = {
        reviews: result.reviews,
        pagination: {
          currentPage: parseInt(page),
          totalReviews: result.totalCount,
          hasMore: result.hasMore,
          limit: parseInt(limit)
        },
        stats
      };

      return ResponseUtil.success(res, response, 'Gym reviews retrieved successfully');
    } catch (error) {
      console.error('Get gym reviews error:', error);
      return ResponseUtil.error(res, error.message, 500);
    }
  }

  // Get user's reviews
  async getUserReviews(req, res) {
    try {
      const userEmail = req.user.email;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const result = await reviewService.getUserReviews(userEmail, parseInt(limit), offset);

      const response = {
        reviews: result.reviews,
        pagination: {
          currentPage: parseInt(page),
          totalReviews: result.totalCount,
          hasMore: result.hasMore,
          limit: parseInt(limit)
        }
      };

      return ResponseUtil.success(res, response, 'User reviews retrieved successfully');
    } catch (error) {
      console.error('Get user reviews error:', error);
      return ResponseUtil.error(res, error.message, 500);
    }
  }

  // Update a review
  async updateReview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtil.error(res, 'Validation errors', 400, errors.array());
      }

      const { reviewId } = req.params;
      const { rating, comment } = req.body;
      const userEmail = req.user.email;

      const updatedReview = await reviewService.updateReview(reviewId, userEmail, {
        rating,
        comment
      });

      return ResponseUtil.success(res, updatedReview, 'Review updated successfully');
    } catch (error) {
      console.error('Update review error:', error);
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  // Delete a review
  async deleteReview(req, res) {
    try {
      const { reviewId } = req.params;
      const userEmail = req.user.email;

      await reviewService.deleteReview(reviewId, userEmail);

      return ResponseUtil.success(res, null, 'Review deleted successfully');
    } catch (error) {
      console.error('Delete review error:', error);
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  // Get gym rating statistics
  async getGymRatingStats(req, res) {
    try {
      const { gymId } = req.params;
      const stats = await reviewService.getGymRatingStats(gymId);

      return ResponseUtil.success(res, stats, 'Gym rating stats retrieved successfully');
    } catch (error) {
      console.error('Get gym rating stats error:', error);
      return ResponseUtil.error(res, error.message, 500);
    }
  }

  // Check if user can review gym
  async canUserReview(req, res) {
    try {
      const { gymId } = req.params;
      const userEmail = req.user.email;

      const canReview = await reviewService.canUserReviewGym(userEmail, gymId);

      return ResponseUtil.success(res, { canReview }, 'Review eligibility checked successfully');
    } catch (error) {
      console.error('Can user review error:', error);
      return ResponseUtil.error(res, error.message, 500);
    }
  }
}

// Validation middleware
const reviewValidation = [
  body('gymId')
    .isInt({ min: 1 })
    .withMessage('Valid gym ID is required'),
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

const reviewUpdateValidation = [
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

// Export functions directly instead of class methods
const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtil.error(res, 'Validation errors', 400, errors.array());
    }

    const { gymId, rating, comment } = req.body;
    const userEmail = req.user.email;
    const userName = `${req.user.firstName} ${req.user.lastName}`;
    const userAvatar = req.user.currentProfileImage?.imageUrl || null;

    // Check if user can review this gym
    const canReview = await reviewService.canUserReviewGym(userEmail, gymId);
    if (!canReview) {
      return ResponseUtil.error(res, 'You need an active subscription to review this gym', 403);
    }

    const review = await reviewService.createReview({
      userEmail,
      gymId,
      rating,
      comment,
      userName,
      userAvatar
    });

    return ResponseUtil.success(res, review, 'Review created successfully', 201);
  } catch (error) {
    console.error('Create review error:', error);
    return ResponseUtil.error(res, error.message, 400);
  }
};

const getGymReviews = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await reviewService.getGymReviews(gymId, parseInt(limit), offset);
    const stats = await reviewService.getGymRatingStats(gymId);

    const response = {
      reviews: result.reviews,
      pagination: {
        currentPage: parseInt(page),
        totalReviews: result.totalCount,
        hasMore: result.hasMore,
        limit: parseInt(limit)
      },
      stats
    };

    return ResponseUtil.success(res, response, 'Gym reviews retrieved successfully');
  } catch (error) {
    console.error('Get gym reviews error:', error);
    return ResponseUtil.error(res, error.message, 500);
  }
};

const getUserReviews = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await reviewService.getUserReviews(userEmail, parseInt(limit), offset);

    const response = {
      reviews: result.reviews,
      pagination: {
        currentPage: parseInt(page),
        totalReviews: result.totalCount,
        hasMore: result.hasMore,
        limit: parseInt(limit)
      }
    };

    return ResponseUtil.success(res, response, 'User reviews retrieved successfully');
  } catch (error) {
    console.error('Get user reviews error:', error);
    return ResponseUtil.error(res, error.message, 500);
  }
};

const updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtil.error(res, 'Validation errors', 400, errors.array());
    }

    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userEmail = req.user.email;

    const updatedReview = await reviewService.updateReview(reviewId, userEmail, {
      rating,
      comment
    });

    return ResponseUtil.success(res, updatedReview, 'Review updated successfully');
  } catch (error) {
    console.error('Update review error:', error);
    return ResponseUtil.error(res, error.message, 400);
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userEmail = req.user.email;

    await reviewService.deleteReview(reviewId, userEmail);

    return ResponseUtil.success(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('Delete review error:', error);
    return ResponseUtil.error(res, error.message, 400);
  }
};

const getGymRatingStats = async (req, res) => {
  try {
    const { gymId } = req.params;
    const stats = await reviewService.getGymRatingStats(gymId);

    return ResponseUtil.success(res, stats, 'Gym rating stats retrieved successfully');
  } catch (error) {
    console.error('Get gym rating stats error:', error);
    return ResponseUtil.error(res, error.message, 500);
  }
};

const canUserReview = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userEmail = req.user.email;

    const canReview = await reviewService.canUserReviewGym(userEmail, gymId);

    return ResponseUtil.success(res, { canReview }, 'Review eligibility checked successfully');
  } catch (error) {
    console.error('Can user review error:', error);
    return ResponseUtil.error(res, error.message, 500);
  }
};

module.exports = {
  createReview,
  getGymReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  getGymRatingStats,
  canUserReview,
  reviewValidation,
  reviewUpdateValidation
};
