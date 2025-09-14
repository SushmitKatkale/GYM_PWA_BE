const { SubscriptionFeature, Subscription, Gym } = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

// Create a new subscription feature
const createSubscriptionFeature = async (req, res) => {
  try {
    const {
      title,
      subscriptionId,
      isHighlighted,
      createdBy
    } = req.body;

    // Check if subscription exists
    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) {
      return ResponseUtil.error(res, 'Subscription not found', 404);
    }

    const feature = await SubscriptionFeature.create({
      title,
      subscriptionId,
      isHighlighted: isHighlighted || false,
      createdBy,
      recordStatus: true
    });

    return ResponseUtil.success(res, 'Subscription feature created successfully', feature, 201);
  } catch (error) {
    console.error('Error creating subscription feature:', error);
    return ResponseUtil.error(res, 'Failed to create subscription feature', 500);
  }
};

// Get all subscription features with pagination
const getAllSubscriptionFeatures = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      subscriptionId = '',
      activeOnly = 'true'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (activeOnly === 'true') {
      whereClause.recordStatus = true;
    }

    if (subscriptionId) {
      whereClause.subscriptionId = subscriptionId;
    }

    if (search) {
      whereClause.title = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await SubscriptionFeature.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'title'],
          include: [
            {
              model: Gym,
              as: 'gym',
                          }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return ResponseUtil.success(res, 'Subscription features retrieved successfully', {
      features: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscription features:', error);
    return ResponseUtil.error(res, 'Failed to fetch subscription features', 500);
  }
};

// Get features by subscription ID
const getFeaturesBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const whereClause = { subscriptionId };
    if (activeOnly === 'true') {
      whereClause.recordStatus = true;
    }

    const features = await SubscriptionFeature.findAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'title'],
          include: [
            {
              model: Gym,
              as: 'gym',
                          }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return ResponseUtil.success(res, 'Subscription features retrieved successfully', features);
  } catch (error) {
    console.error('Error fetching subscription features:', error);
    return ResponseUtil.error(res, 'Failed to fetch subscription features', 500);
  }
};

// Get subscription feature by ID
const getSubscriptionFeatureById = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await SubscriptionFeature.findByPk(id, {
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'title'],
          include: [
            {
              model: Gym,
              as: 'gym',
                          }
          ]
        }
      ]
    });

    if (!feature) {
      return ResponseUtil.error(res, 'Subscription feature not found', 404);
    }

    return ResponseUtil.success(res, 'Subscription feature retrieved successfully', feature);
  } catch (error) {
    console.error('Error fetching subscription feature:', error);
    return ResponseUtil.error(res, 'Failed to fetch subscription feature', 500);
  }
};

// Update subscription feature
const updateSubscriptionFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      isHighlighted,
      updatedBy
    } = req.body;

    const feature = await SubscriptionFeature.findByPk(id);
    if (!feature) {
      return ResponseUtil.error(res, 'Subscription feature not found', 404);
    }

    await feature.update({
      title,
      isHighlighted,
      updatedBy,
      updatedAt: new Date()
    });

    const updatedFeature = await SubscriptionFeature.findByPk(id, {
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'title'],
          include: [
            {
              model: Gym,
              as: 'gym',
                          }
          ]
        }
      ]
    });

    return ResponseUtil.success(res, 'Subscription feature updated successfully', updatedFeature);
  } catch (error) {
    console.error('Error updating subscription feature:', error);
    return ResponseUtil.error(res, 'Failed to update subscription feature', 500);
  }
};

// Soft delete subscription feature
const deleteSubscriptionFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const feature = await SubscriptionFeature.findByPk(id);
    if (!feature) {
      return ResponseUtil.error(res, 'Subscription feature not found', 404);
    }

    await feature.update({
      recordStatus: false,
      updatedBy,
      updatedAt: new Date()
    });

    return ResponseUtil.success(res, 'Subscription feature deleted successfully');
  } catch (error) {
    console.error('Error deleting subscription feature:', error);
    return ResponseUtil.error(res, 'Failed to delete subscription feature', 500);
  }
};

module.exports = {
  createSubscriptionFeature,
  getAllSubscriptionFeatures,
  getFeaturesBySubscription,
  getSubscriptionFeatureById,
  updateSubscriptionFeature,
  deleteSubscriptionFeature
};
