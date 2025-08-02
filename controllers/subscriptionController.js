const { Subscription, SubscriptionFeature, Gym } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const { Op } = require('sequelize');

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
    const {
      title,
      validityDays,
      price,
      discountedPrice,
      gymId,
      isMostPopular,
      isCheapest,
      createdBy
    } = req.body;

    // Check if gym exists
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return errorResponse(res, 'Gym not found', 404);
    }

    const subscription = await Subscription.create({
      title,
      validityDays,
      price,
      discountedPrice,
      gymId,
      isMostPopular: isMostPopular || false,
      isCheapest: isCheapest || false,
      createdBy,
      activeStatus: true
    });

    return successResponse(res, 'Subscription created successfully', subscription, 201);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return errorResponse(res, 'Failed to create subscription', 500);
  }
};

// Get all subscriptions with pagination and filtering
const getAllSubscriptions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      gymId = '',
      activeOnly = 'true'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (activeOnly === 'true') {
      whereClause.activeStatus = true;
    }

    if (gymId) {
      whereClause.gymId = gymId;
    }

    if (search) {
      whereClause.title = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Subscription.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { activeStatus: true },
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createTimestamp', 'DESC']]
    });

    return successResponse(res, 'Subscriptions retrieved successfully', {
      subscriptions: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return errorResponse(res, 'Failed to fetch subscriptions', 500);
  }
};

// Get subscriptions by gym ID
const getSubscriptionsByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const whereClause = { gymId };
    if (activeOnly === 'true') {
      whereClause.activeStatus = true;
    }

    const subscriptions = await Subscription.findAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { activeStatus: true },
          required: false
        }
      ],
      order: [['createTimestamp', 'DESC']]
    });

    return successResponse(res, 'Subscriptions retrieved successfully', subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions by gym:', error);
    return errorResponse(res, 'Failed to fetch subscriptions', 500);
  }
};

// Get subscription by ID
const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { activeStatus: true },
          required: false
        }
      ]
    });

    if (!subscription) {
      return errorResponse(res, 'Subscription not found', 404);
    }

    return successResponse(res, 'Subscription retrieved successfully', subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return errorResponse(res, 'Failed to fetch subscription', 500);
  }
};

// Update subscription
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      validityDays,
      price,
      discountedPrice,
      isMostPopular,
      isCheapest,
      updatedBy
    } = req.body;

    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return errorResponse(res, 'Subscription not found', 404);
    }

    await subscription.update({
      title,
      validityDays,
      price,
      discountedPrice,
      isMostPopular,
      isCheapest,
      updatedBy,
      updateTimestamp: new Date()
    });

    const updatedSubscription = await Subscription.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { activeStatus: true },
          required: false
        }
      ]
    });

    return successResponse(res, 'Subscription updated successfully', updatedSubscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return errorResponse(res, 'Failed to update subscription', 500);
  }
};

// Soft delete subscription
const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return errorResponse(res, 'Subscription not found', 404);
    }

    await subscription.update({
      activeStatus: false,
      updatedBy,
      updateTimestamp: new Date()
    });

    return successResponse(res, 'Subscription deleted successfully');
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return errorResponse(res, 'Failed to delete subscription', 500);
  }
};

module.exports = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionsByGym,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription
};
