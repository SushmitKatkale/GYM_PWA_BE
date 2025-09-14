// Temporarily disable model imports to avoid circular dependency during server startup
// const { Review, Gym, UserSubscription, User } = require('../models');
const { Op } = require('sequelize');

class ReviewService {
  // Create a new review
  async createReview(reviewData) {
    try {
      const { userEmail, gymId, rating, comment, userName, userAvatar } = reviewData;
      
      // Check if user has already reviewed this gym
      const existingReview = await Review.findOne({
        where: { userEmail, gymId, activeStatus: true }
      });
      
      if (existingReview) {
        throw new Error('You have already reviewed this gym');
      }
      
      // Create review
      const review = await Review.create({
        userEmail,
        gymId,
        rating,
        comment,
        userName,
        userAvatar,
        createdBy: userEmail
      });
      
      // Update gym's average rating
      await this.updateGymRating(gymId);
      
      return review;
    } catch (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }
  
  // Get reviews for a specific gym
  async getGymReviews(gymId, limit = 10, offset = 0) {
    try {
      const { count, rows } = await Review.findAndCountAll({
        where: { 
          gymId, 
          activeStatus: true 
        },
        order: [['createTimestamp', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      return {
        reviews: rows,
        totalCount: count,
        hasMore: (offset + limit) < count
      };
    } catch (error) {
      throw new Error(`Failed to get gym reviews: ${error.message}`);
    }
  }
  
  // Get reviews by a specific user
  async getUserReviews(userEmail, limit = 10, offset = 0) {
    try {
      const { count, rows } = await Review.findAndCountAll({
        where: { 
          userEmail, 
          activeStatus: true 
        },
        include: [
          {
            model: Gym,
            as: 'gym',
                      }
        ],
        order: [['createTimestamp', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      return {
        reviews: rows,
        totalCount: count,
        hasMore: (offset + limit) < count
      };
    } catch (error) {
      throw new Error(`Failed to get user reviews: ${error.message}`);
    }
  }
  
  // Update a review
  async updateReview(reviewId, userEmail, updateData) {
    try {
      const { rating, comment } = updateData;
      
      // Check if the review belongs to the user
      const review = await Review.findOne({
        where: { 
          id: reviewId, 
          userEmail, 
          activeStatus: true 
        }
      });
      
      if (!review) {
        throw new Error('Review not found or you do not have permission to update it');
      }
      
      await review.update({
        rating,
        comment,
        updatedBy: userEmail,
        updateTimestamp: new Date()
      });
      
      // Update gym's average rating
      await this.updateGymRating(review.gymId);
      
      return review;
    } catch (error) {
      throw new Error(`Failed to update review: ${error.message}`);
    }
  }
  
  // Delete a review (soft delete)
  async deleteReview(reviewId, userEmail) {
    try {
      const review = await Review.findOne({
        where: { 
          id: reviewId, 
          userEmail, 
          activeStatus: true 
        }
      });
      
      if (!review) {
        throw new Error('Review not found or you do not have permission to delete it');
      }
      
      await review.update({
        activeStatus: false,
        updatedBy: userEmail,
        updateTimestamp: new Date()
      });
      
      // Update gym's average rating
      await this.updateGymRating(review.gymId);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }
  
  // Get gym rating statistics
  async getGymRatingStats(gymId) {
    try {
      const reviews = await Review.findAll({
        where: { 
          gymId, 
          activeStatus: true 
        },
              });
      
      if (reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };
      }
      
      const ratings = reviews.map(r => parseFloat(r.rating));
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratings.forEach(rating => {
        const roundedRating = Math.round(rating);
        if (distribution[roundedRating] !== undefined) {
          distribution[roundedRating]++;
        }
      });
      
      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: reviews.length,
        ratingDistribution: distribution
      };
    } catch (error) {
      throw new Error(`Failed to get gym rating stats: ${error.message}`);
    }
  }
  
  // Update gym's average rating
  async updateGymRating(gymId) {
    try {
      const stats = await this.getGymRatingStats(gymId);
      
      await Gym.update(
        { 
          rating: stats.averageRating 
        },
        { 
          where: { id: gymId } 
        }
      );
      
      return stats;
    } catch (error) {
      throw new Error(`Failed to update gym rating: ${error.message}`);
    }
  }
  
  // Check if user can review gym (has active subscription)
  async canUserReviewGym(userEmail, gymId) {
    try {
      // Check if user has any active subscription
      const subscription = await UserSubscription.findOne({
        where: {
          userEmail,
          status: 'active'
        },
        include: [
          {
            model: require('../models').Subscription,
            as: 'subscription',
            where: { gymId }
          }
        ]
      });
      
      return !!subscription;
    } catch (error) {
      throw new Error(`Failed to check review eligibility: ${error.message}`);
    }
  }
}

module.exports = new ReviewService();
