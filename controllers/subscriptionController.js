const { Subscription, SubscriptionFeature, Gym } = require('../models');
const ResponseUtil = require('../utils/response');
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
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Extract buffer fields from request
    const {
      buffer_days = 0,
      buffer_fee = 0.00,
      allow_buffer = false
    } = req.body;

    const subscription = await Subscription.create({
      title,
      validityDays,
      price,
      discountedPrice,
      gymId,
      isMostPopular: isMostPopular || false,
      isCheapest: isCheapest || false,
      buffer_days,
      buffer_fee,
      allow_buffer,
      createdBy,
      record_status: 1 // Updated field name
    });

    return ResponseUtil.success(res, subscription, 'Subscription created successfully', 201);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return ResponseUtil.error(res, 'Failed to create subscription', 500);
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
      whereClause.record_status = 1; // Updated field name
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
                  },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { record_status: 1 }, // Updated field name
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']] // Updated field name
    });

    return ResponseUtil.success(res, {
      subscriptions: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }, 'Subscriptions retrieved successfully');
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return ResponseUtil.error(res, 'Failed to fetch subscriptions', 500);
  }
};

// Get subscriptions by gym ID
const getSubscriptionsByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const whereClause = { gymId };
    if (activeOnly === 'true') {
      whereClause.record_status = 1; // Updated field name
    }

    const subscriptions = await Subscription.findAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          as: 'gym',
                  },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { record_status: 1 }, // Updated field name
          required: false
        }
      ],
      order: [['created_at', 'DESC']] // Updated field name
    });

    return ResponseUtil.success(res, subscriptions, 'Subscriptions retrieved successfully');
  } catch (error) {
    console.error('Error fetching subscriptions by gym:', error);
    return ResponseUtil.error(res, 'Failed to fetch subscriptions', 500);
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
                  },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { record_status: 1 }, // Updated field name
          required: false
        }
      ]
    });

    if (!subscription) {
      return ResponseUtil.notFoundError(res, 'Subscription not found');
    }

    return ResponseUtil.success(res, subscription, 'Subscription retrieved successfully');
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return ResponseUtil.error(res, 'Failed to fetch subscription', 500);
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
      return ResponseUtil.notFoundError(res, 'Subscription not found');
    }

    // Extract buffer fields from request
    const {
      buffer_days,
      buffer_fee,
      allow_buffer
    } = req.body;

    const updateData = {
      title,
      validityDays,
      price,
      discountedPrice,
      isMostPopular,
      isCheapest,
      updatedBy,
      updated_at: new Date() // Updated field name
    };

    // Add buffer fields if they are provided
    if (buffer_days !== undefined) updateData.buffer_days = buffer_days;
    if (buffer_fee !== undefined) updateData.buffer_fee = buffer_fee;
    if (allow_buffer !== undefined) updateData.allow_buffer = allow_buffer;

    await subscription.update(updateData);

    const updatedSubscription = await Subscription.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
                  },
        {
          model: SubscriptionFeature,
          as: 'features',
          where: { record_status: 1 }, // Updated field name
          required: false
        }
      ]
    });

    return ResponseUtil.success(res, updatedSubscription, 'Subscription updated successfully');
  } catch (error) {
    console.error('Error updating subscription:', error);
    return ResponseUtil.error(res, 'Failed to update subscription', 500);
  }
};

// Soft delete subscription
const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return ResponseUtil.notFoundError(res, 'Subscription not found');
    }

    await subscription.update({
      record_status: 0, // Updated field name for soft delete
      updatedBy,
      updated_at: new Date() // Updated field name
    });

    return ResponseUtil.success(res, null, 'Subscription deleted successfully');
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return ResponseUtil.error(res, 'Failed to delete subscription', 500);
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
