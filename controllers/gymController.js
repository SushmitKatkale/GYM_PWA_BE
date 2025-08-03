const { Gym, Amenity, GymImage, User } = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

// Create a new gym
const createGym = async (req, res) => {
  try {
    const {
      name,
      capacity,
      address,
      latitude,
      longitude,
      description,
      openingTime,
      closingTime,
      createdBy,
      ownerId
    } = req.body;

    const gym = await Gym.create({
      name,
      capacity,
      address,
      latitude,
      longitude,
      description,
      openingTime,
      closingTime,
      createdBy,
      ownerId,
      activeStatus: true
    });

    return ResponseUtil.success(res, gym, 'Gym created successfully', 201);
  } catch (error) {
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
    const { id } = req.params;
    const {
      name,
      capacity,
      address,
      latitude,
      longitude,
      description,
      openingTime,
      closingTime,
      updatedBy
    } = req.body;

    const gym = await Gym.findByPk(id);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    await gym.update({
      name,
      capacity,
      address,
      latitude,
      longitude,
      description,
      openingTime,
      closingTime,
      updatedBy,
      updateTimestamp: new Date()
    });

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
        }
      ]
    });

    return ResponseUtil.success(res, updatedGym, 'Gym updated successfully');
  } catch (error) {
    console.error('Error updating gym:', error);
    return ResponseUtil.error(res, 'Failed to update gym', 500);
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
