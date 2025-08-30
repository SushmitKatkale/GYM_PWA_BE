const { Gym, Media, User, Subscription, SubscriptionFeature, sequelize, GymAmenity, GymFeature } = require('../models');
const ResponseUtil = require('../utils/response');
const DataFilter = require('../utils/dataFilter');
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
      email,
      phone,
      websiteUrl,
      gstNumber,
      registrationNo,
      openingTime,
      closingTime,
      daysOpen,
      amenities = [],
      plans = [],
      ownerId,
      createdBy
    } = req.body;

    // Validate required fields
    if (!name || !address || !latitude || !longitude || !ownerId) {
      await transaction.rollback();
      return ResponseUtil.error(res, 'Missing required fields: name, address, latitude, longitude, ownerId', 400);
    }

    let gymData = {
      name: name,
      ownerId: ownerId,
      address: address,
      latitude: latitude,
      longitude: longitude,
      rating: rating,
      capacity: capacity,
      email: email,
      phone: phone,
      websiteUrl: websiteUrl,
      gstNumber: gstNumber,
      registrationNo: registrationNo,
      openingTime: openingTime,
      closingTime: closingTime,
      daysOpen: daysOpen,
      description: description,
      createdBy: req.user.id,
      recordStatus: 1
    }

    // Create the gym
    const gym = await Gym.create(gymData, { transaction });

    // Create amenities if provided
    if (amenities && amenities.length > 0) {
      const amenityData = amenities.map(amenity => ({
        name: amenity.name,
        description: amenity.description,
        gymId: gym.id,
        createdBy: req.user.id,
        recordStatus: 1
      }));
      await GymAmenity.bulkCreate(amenityData, { transaction });
    }

    // Create subscription plans and their features if provided
    if (plans && plans.length > 0) {
      for (const plan of plans) {
        const createdPlan = await Subscription.create({
          gymId: gym.id,
          name: plan.title,
          price: plan.price,
          validityDays: plan.validityDays,
          discountPercent: plan.discountPercent || 0,
          bufferDays: plan.bufferDays || 0,
          bufferFee: plan.bufferFee || 0,
          createdBy: req.user.id,
          recordStatus: 1
        }, { transaction });

        // Create subscription features if provided
        if (plan.features && plan.features.length > 0) {
          const featureData = plan.features.map(feature => ({
            subscriptionId: createdPlan.id,
            title: feature.title,
            description: feature.description || '',
            isHighlighted: feature.isHighlighted || false,
            displayOrder: 0,
            createdBy: req.user.id,
            recordStatus: 1
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
          model: GymAmenity,
          as: 'amenities',
          where: { recordStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { recordStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { recordStatus: true },
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
      activeOnly = 'true',
      owner = '',
      minRating = '',
      capacity = ''
    } = req.query;

    console.log('DEBUG: Received query params:', { page, limit, search, activeOnly, owner, minRating, capacity });

    const offset = (page - 1) * limit;
    const whereClause = {};
    const ownerWhereClause = {};

    if (activeOnly === 'true') {
      whereClause.recordStatus = true;
    }

    // Search in gym name and address
    if (search && search.trim().length > 0) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { state: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filter by owner name or email
    if (owner && owner.trim().length > 0) {
      ownerWhereClause[Op.or] = [
        { firstName: { [Op.like]: `%${owner}%` } },
        { lastName: { [Op.like]: `%${owner}%` } },
        { email: { [Op.like]: `%${owner}%` } },
        sequelize.where(
          sequelize.fn('CONCAT', sequelize.col('firstName'), ' ', sequelize.col('lastName')),
          { [Op.like]: `%${owner}%` }
        )
      ];
    }

    // Filter by minimum rating
    if (minRating && minRating !== '') {
      const ratingValue = parseFloat(minRating.replace('+', ''));
      if (!isNaN(ratingValue)) {
        whereClause.rating = { [Op.gte]: ratingValue };
      }
    }

    // Filter by capacity range
    if (capacity && capacity !== '') {
      switch (capacity) {
        case 'small':
          whereClause.capacity = { [Op.lte]: 50 };
          break;
        case 'medium':
          whereClause.capacity = { [Op.and]: [{ [Op.gt]: 50 }, { [Op.lte]: 200 }] };
          break;
        case 'large':
          whereClause.capacity = { [Op.gt]: 200 };
          break;
      }
    }

    // Apply ownership filter for owners (only their own gyms)
    if (req.user.role === 2) { // Owner (updated role system: 1=member, 2=owner, 3=trainer, 4=admin)
      whereClause.ownerId = req.user.id; // Use user.id instead of email
    }
    // Admin gets all gyms (no additional filter needed)

    whereClause.recordStatus = [0, 1];
    
    const { count, rows } = await Gym.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: GymAmenity,
          as: 'amenities',
          where: { recordStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { recordStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { recordStatus: true },
            required: false
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          where: Object.keys(ownerWhereClause).length > 0 ? ownerWhereClause : undefined,
          required: Object.keys(ownerWhereClause).length > 0 ? true : false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Apply role-based data filtering
    const gymsData = rows.map(gym => gym.toJSON());
    const filteredGyms = DataFilter.filterGymData(req.user, gymsData);

    return ResponseUtil.success(res, {
      gyms: filteredGyms,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(gymsData.length / limit),
        totalItems: gymsData.length,
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
          model: GymAmenity,
          as: 'amenities',
          where: { recordStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { recordStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { recordStatus: true },
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
      email,
      phone,
      websiteUrl,
      gstNumber,
      registrationNo,
      daysOpen,
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
      email,
      phone,
      websiteUrl,
      gstNumber,
      registrationNo,
      daysOpen,
      openingTime: operatingHours?.open,
      closingTime: operatingHours?.close,
      updatedBy,
      updatedAt: new Date()
    });

    if (amenities.length) {
      await GymAmenity.destroy({ where: { gymId: id } });
      const amenityData = amenities.map(({ name, description }) => ({
        name,
        description,
        gymId: id,
        recordStatus: true
      }));
      await GymAmenity.bulkCreate(amenityData);
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
          recordStatus: true
        });
        if (plan.features && plan.features.length) {
          const featureData = plan.features.map(({ title, isHighlighted }) => ({
            title,
            isHighlighted,
            subscriptionId: createdPlan.id,
            recordStatus: true
          }));
          await SubscriptionFeature.bulkCreate(featureData);
        }
      }
    }

    const updatedGym = await Gym.findByPk(id, {
      include: [
        {
          model: GymAmenity,
          as: 'amenities',
          where: { recordStatus: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { recordStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { recordStatus: true },
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

// Soft delete gym (set recordStatus to false)
const deleteGym = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const gym = await Gym.findByPk(id);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    await gym.update({
      recordStatus: false,
      updatedBy,
      updatedAt: new Date()
    });

    return ResponseUtil.success(res, null, 'Gym deleted successfully');
  } catch (error) {
    console.error('Error deleting gym:', error);
    return ResponseUtil.error(res, 'Failed to delete gym', 500);
  }
};

// Public gym discovery with location-based filtering and sorting
const getPublicGyms = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 50,
      minRating,
      maxPrice,
      amenities,
      city,
      state,
      sortBy = 'distance',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { recordStatus: true };

    if (minRating) {
      whereClause.rating = { [Op.gte]: parseFloat(minRating) };
    }

    if (maxPrice) {
      whereClause['$subscriptions.price$'] = { [Op.lte]: parseFloat(maxPrice) };
    }

    if (city) {
      whereClause.city = city;
    }

    if (state) {
      whereClause.state = state;
    }

    if (amenities) {
      whereClause['$amenities.name$'] = { [Op.in]: amenities.split(',') };
    }

    const { count, rows } = await Gym.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: GymAmenity,
          as: 'amenities',
          where: { recordStatus: true },
          required: amenities ? true : false
        },
        {
          model: Subscription,
          as: 'subscriptions',
          where: { recordStatus: true },
          required: false,
          include: [{
            model: SubscriptionFeature,
            as: 'features',
            where: { recordStatus: true },
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
      offset: parseInt(offset)
    });

    let gymsData = rows.map(gym => gym.toJSON());

    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);

      gymsData = gymsData.map(gym => {
        const gymLat = typeof gym.latitude === 'string' ? parseFloat(gym.latitude) : gym.latitude;
        const gymLng = typeof gym.longitude === 'string' ? parseFloat(gym.longitude) : gym.longitude;

        const distance = Math.sqrt(Math.pow(userLat - gymLat, 2) + Math.pow(userLng - gymLng, 2));
        return { ...gym, distance };
      }).filter(gym => gym.distance <= radius);
    }

    gymsData.sort((a, b) => {
      if (sortBy === 'distance') return sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance;
      if (sortBy === 'rating') return sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;
      return 0;
    });

    return ResponseUtil.success(res, {
      gyms: gymsData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }, 'Public gyms retrieved successfully');
  } catch (error) {
    console.error('Error fetching public gyms:', error);
    return ResponseUtil.error(res, 'Failed to fetch public gyms', 500);
  }
};

module.exports = {
  createGym,
  getAllGyms,
  getGymById,
  updateGym,
  deleteGym,
  getPublicGyms
};
