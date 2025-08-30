const { Gym, Amenity, GymImage, Subscription, SubscriptionFeature } = require('../models');
const ResponseUtil = require('../utils/response');

/**
 * Middleware to check if user owns the gym or is admin
 * For gym-related operations
 */
const checkGymOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role;
    const gymId = req.params.id || req.params.gymId;

    // Admin can access any gym
    if (userType === '3') {
      return next();
    }

    // Owner can only access their own gyms
    if (userType === '2') {
      const gym = await Gym.findByPk(gymId);
      if (!gym) {
        return ResponseUtil.notFoundError(res, 'Gym not found');
      }

      if (gym.ownerId !== userId) {
        return ResponseUtil.forbiddenError(res, 'Access denied. You can only manage your own gyms');
      }

      return next();
    }

    // Regular users cannot perform gym management operations
    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Ownership check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

/**
 * Middleware to check if user owns the gym associated with an amenity
 */
const checkAmenityOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const amenityId = req.params.id;

    // Admin can access any amenity
    if (userType === '3') {
      return next();
    }

    // Owner can only access amenities for their own gyms
    if (userType === '2') {
      const amenity = await Amenity.findByPk(amenityId, {
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['ownerId']
        }]
      });

      if (!amenity) {
        return ResponseUtil.notFoundError(res, 'Amenity not found');
      }

      if (amenity.gym.ownerId !== userId) {
        return ResponseUtil.forbiddenError(res, 'Access denied. You can only manage amenities for your own gyms');
      }

      return next();
    }

    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Amenity ownership check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

/**
 * Middleware to check if user owns the gym associated with an image
 */
const checkImageOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const imageId = req.params.id;
    const gymId = req.params.gymId;

    // Admin can access any image
    if (userType === '3') {
      return next();
    }

    // Owner can only access images for their own gyms
    if (userType === '2') {
      if (gymId) {
        // For upload operations where gymId is in params
        const gym = await Gym.findByPk(gymId);
        if (!gym) {
          return ResponseUtil.notFoundError(res, 'Gym not found');
        }

        if (gym.ownerId !== userId) {
          return ResponseUtil.forbiddenError(res, 'Access denied. You can only manage images for your own gyms');
        }
      } else if (imageId) {
        // For update/delete operations where imageId is in params
        const image = await GymImage.findByPk(imageId, {
          include: [{
            model: Gym,
            as: 'gym',
            attributes: ['ownerId']
          }]
        });

        if (!image) {
          return ResponseUtil.notFoundError(res, 'Image not found');
        }

        if (image.gym.ownerId !== userId) {
          return ResponseUtil.forbiddenError(res, 'Access denied. You can only manage images for your own gyms');
        }
      }

      return next();
    }

    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Image ownership check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

/**
 * Middleware to check if user owns the gym associated with a subscription
 */
const checkSubscriptionOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const subscriptionId = req.params.id;

    // Admin can access any subscription
    if (userType === '3') {
      return next();
    }

    // Owner can only access subscriptions for their own gyms
    if (userType === '2') {
      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['ownerId']
        }]
      });

      if (!subscription) {
        return ResponseUtil.notFoundError(res, 'Subscription not found');
      }

      if (subscription.gym.ownerId !== userId) {
        return ResponseUtil.forbiddenError(res, 'Access denied. You can only manage subscriptions for your own gyms');
      }

      return next();
    }

    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Subscription ownership check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

/**
 * Middleware to check if user owns the gym associated with a subscription feature
 */
const checkSubscriptionFeatureOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const featureId = req.params.id;

    // Admin can access any subscription feature
    if (userType === '3') {
      return next();
    }

    // Owner can only access features for subscriptions of their own gyms
    if (userType === '2') {
      const feature = await SubscriptionFeature.findByPk(featureId, {
        include: [{
          model: Subscription,
          as: 'subscription',
          include: [{
            model: Gym,
            as: 'gym',
            attributes: ['ownerId']
          }]
        }]
      });

      if (!feature) {
        return ResponseUtil.notFoundError(res, 'Subscription feature not found');
      }

      if (feature.subscription.gym.ownerId !== userId) {
        return ResponseUtil.forbiddenError(res, 'Access denied. You can only manage features for your own gym subscriptions');
      }

      return next();
    }

    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Subscription feature ownership check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

/**
 * Middleware to validate gym ownership for creation operations
 * Used when gymId is in request body
 */
const checkGymOwnershipForCreation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const gymId = req.body.gymId;

    // Admin can create for any gym
    if (userType === '3') {
      return next();
    }

    // Owner can only create for their own gyms
    if (userType === '2') {
      if (!gymId) {
        return ResponseUtil.error(res, 'Gym ID is required', 400);
      }

      const gym = await Gym.findByPk(gymId);
      if (!gym) {
        return ResponseUtil.notFoundError(res, 'Gym not found');
      }

      if (gym.ownerId !== userId) {
        return ResponseUtil.forbiddenError(res, 'Access denied. You can only create resources for your own gyms');
      }

      return next();
    }

    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Gym ownership creation check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

/**
 * Middleware to check if user owns the gym associated with a slot
 */
const checkSlotOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    const slotId = req.params.id || req.params.slotId;

    // Admin can access any slot
    if (userType === '3') {
      return next();
    }

    // Owner can only access slots for their own gyms
    if (userType === '2') {
      const { GymSlot } = require('../models');
      const slot = await GymSlot.findByPk(slotId, {
        include: [{
          model: Gym,
          as: 'gym',
          attributes: ['ownerId']
        }]
      });

      if (!slot) {
        return ResponseUtil.notFoundError(res, 'Gym slot not found');
      }

      if (slot.gym.ownerId !== userId) {
        return ResponseUtil.forbiddenError(res, 'Access denied. You can only manage slots for your own gyms');
      }

      return next();
    }

    return ResponseUtil.forbiddenError(res, 'Access denied. Insufficient permissions');
  } catch (error) {
    console.error('Slot ownership check error:', error);
    return ResponseUtil.error(res, 'Error checking ownership', 500);
  }
};

module.exports = {
  checkGymOwnership,
  checkAmenityOwnership,
  checkImageOwnership,
  checkSubscriptionOwnership,
  checkSubscriptionFeatureOwnership,
  checkGymOwnershipForCreation,
  checkSlotOwnership
};
