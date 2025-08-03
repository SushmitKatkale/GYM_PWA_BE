const { Gym, Amenity, GymImage, User, Subscription, SubscriptionFeature, sequelize } = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

// Create a new gym with amenities and subscription plans
const createGym = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      capacity,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      description,
      rating,
      currentOccupancy,
      operatingHours,
      amenities = [],
      plans = [],
      ownerId,
      createdBy
    } = req.body;

    // Validate required fields
    if (!name || !capacity || !address || !operatingHours) {
      await transaction.rollback();
      return ResponseUtil.error(res, 'Missing required fields: name, capacity, address, operatingHours', 400);
    }

    // Create the gym
    const gym = await Gym.create({
      name,
      capacity,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      description,
      rating: rating || 0.0,
      currentOccupancy: currentOccupancy || 0,
      openingTime: operatingHours.open,
      closingTime: operatingHours.close,
      ownerId,
      createdBy,
      activeStatus: true
    }, { transaction });

    // Create amenities if provided
    if (amenities && amenities.length > 0) {
      const amenityData = amenities.map(amenity => ({
        name: amenity.name,
        description: amenity.description,
        gymId: gym.id,
        createdBy,
        activeStatus: true
      }));
      await Amenity.bulkCreate(amenityData, { transaction });
    }

    // Create subscription plans and their features if provided
    if (plans && plans.length > 0) {
      for (const plan of plans) {
        const subscription = await Subscription.create({
          title: plan.title,
          validityDays: plan.validityDays,
          price: plan.price,
          discountedPrice: plan.discountedPrice,
          isMostPopular: plan.isMostPopular || false,
          isCheapest: plan.isCheapest || false,
          gymId: gym.id,
          createdBy,
          activeStatus: true
        }, { transaction });

        // Create subscription features if provided
        if (plan.features && plan.features.length > 0) {
          const featureData = plan.features.map(feature => ({
            title: feature.title,
            isHighlighted: feature.isHighlighted || false,
            subscriptionId: subscription.id,
            createdBy,
            activeStatus: true
          }));
          await SubscriptionFeature.bulkCreate(featureData, { transaction });
        }
      }
    }

    // Commit the transaction
    await transaction.commit();

    // Fetch the complete gym data with all related entities
    const createdGym = await Gym.findByPk(gym.id, {
      include: [
        {
          model: Amenity,
          as: 'amenities',
          where: { activeStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { activeStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { activeStatus: true },
            required: false
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    return ResponseUtil.success(res, createdGym, 'Gym created successfully with all details', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating gym:', error);
    return ResponseUtil.error(res, 'Failed to create gym', 500);
  }
};

// Get all gyms with pagination and filtering
const getAllGyms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      activeOnly = 'true'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (activeOnly === 'true') {
      whereClause.activeStatus = true;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Gym.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Amenity,
          as: 'amenities',
          where: { activeStatus: true },
          required: false
        },
        {
          model: GymImage,
          as: 'images',
          where: { activeStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { activeStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { activeStatus: true },
            required: false
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createTimestamp', 'DESC']]
    });

    return ResponseUtil.success(res, {
      gyms: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }, 'Gyms retrieved successfully');
  } catch (error) {
    console.error('Error fetching gyms:', error);
    return ResponseUtil.error(res, 'Failed to fetch gyms', 500);
  }
};

// Get gym by ID
const getGymById = async (req, res) => {
  try {
    const { id } = req.params;

    const gym = await Gym.findByPk(id, {
      include: [
        {
          model: Amenity,
          as: 'amenities',
          where: { activeStatus: true },
          required: false
        },
        {
          model: GymImage,
          as: 'images',
          where: { activeStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { activeStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { activeStatus: true },
            required: false
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    return ResponseUtil.success(res, gym, 'Gym retrieved successfully');
  } catch (error) {
    console.error('Error fetching gym:', error);
    return ResponseUtil.error(res, 'Failed to fetch gym', 500);
  }
};

// Update gym
const updateGym = async (req, res) => {
  try {
    // Check if response already sent
    if (res.headersSent) {
      console.log('Headers already sent, skipping updateGym');
      return;
    }

    const { id } = req.params;
    const {
      name,
      capacity,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      description,
      rating,
      currentOccupancy,
      operatingHours,
      updatedBy,
      amenities = [],
      plans = []
    } = req.body;

    const gym = await Gym.findByPk(id);
    if (!gym) {
      if (res.headersSent) return;
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    await gym.update({
      name,
      capacity,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      description,
      rating,
      currentOccupancy,
      openingTime: operatingHours?.open,
      closingTime: operatingHours?.close,
      updatedBy,
      updateTimestamp: new Date()
    });

    if (amenities.length) {
      await Amenity.destroy({ where: { gymId: id } });
      const amenityData = amenities.map(({ name, description }) => ({
        name,
        description,
        gymId: id,
        activeStatus: true
      }));
      await Amenity.bulkCreate(amenityData);
    }

    if (plans.length) {
      await Subscription.destroy({ where: { gymId: id } });
      for (const plan of plans) {
        const createdPlan = await Subscription.create({
          title: plan.title,
          validityDays: plan.validityDays,
          price: plan.price,
          discountedPrice: plan.discountedPrice,
          isMostPopular: plan.isMostPopular || false,
          isCheapest: plan.isCheapest || false,
          gymId: id,
          activeStatus: true
        });
        if (plan.features && plan.features.length) {
          const featureData = plan.features.map(({ title, isHighlighted }) => ({
            title,
            isHighlighted,
            subscriptionId: createdPlan.id,
            activeStatus: true
          }));
          await SubscriptionFeature.bulkCreate(featureData);
        }
      }
    }

    const updatedGym = await Gym.findByPk(id, {
      include: [
        {
          model: Amenity,
          as: 'amenities',
          where: { activeStatus: true },
          required: false
        },
        {
          model: GymImage,
          as: 'images',
          where: { activeStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { activeStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { activeStatus: true },
            required: false
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    // Final check before sending success response
    if (res.headersSent) {
      console.log('Headers already sent before success response');
      return;
    }
    
    return ResponseUtil.success(res, updatedGym, 'Gym updated successfully');
  } catch (error) {
    console.error('Error updating gym:', error);
    if (!res.headersSent) {
      return ResponseUtil.error(res, 'Failed to update gym', 500);
    } else {
      console.log('Headers already sent, cannot send error response');
    }
  }
};

// Soft delete gym (set activeStatus to false)
const deleteGym = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const gym = await Gym.findByPk(id);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    await gym.update({
      activeStatus: false,
      updatedBy,
      updateTimestamp: new Date()
    });

    return ResponseUtil.success(res, null, 'Gym deleted successfully');
  } catch (error) {
    console.error('Error deleting gym:', error);
    return ResponseUtil.error(res, 'Failed to delete gym', 500);
  }
};

module.exports = {
  createGym,
  getAllGyms,
  getGymById,
  updateGym,
  deleteGym
};
