const { Gym, Amenity, GymImage } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const { Op } = require('sequelize');

// Create a new gym
const createGym = async (req, res) => {
  try {
    const {
      name,
      capacity,
      address,
      description,
      openingTime,
      closingTime,
      createdBy
    } = req.body;

    const gym = await Gym.create({
      name,
      capacity,
      address,
      description,
      openingTime,
      closingTime,
      createdBy,
      activeStatus: true
    });

    return successResponse(res, 'Gym created successfully', gym, 201);
  } catch (error) {
    console.error('Error creating gym:', error);
    return errorResponse(res, 'Failed to create gym', 500);
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
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createTimestamp', 'DESC']]
    });

    return successResponse(res, 'Gyms retrieved successfully', {
      gyms: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching gyms:', error);
    return errorResponse(res, 'Failed to fetch gyms', 500);
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
        }
      ]
    });

    if (!gym) {
      return errorResponse(res, 'Gym not found', 404);
    }

    return successResponse(res, 'Gym retrieved successfully', gym);
  } catch (error) {
    console.error('Error fetching gym:', error);
    return errorResponse(res, 'Failed to fetch gym', 500);
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
      description,
      openingTime,
      closingTime,
      updatedBy
    } = req.body;

    const gym = await Gym.findByPk(id);
    if (!gym) {
      return errorResponse(res, 'Gym not found', 404);
    }

    await gym.update({
      name,
      capacity,
      address,
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

    return successResponse(res, 'Gym updated successfully', updatedGym);
  } catch (error) {
    console.error('Error updating gym:', error);
    return errorResponse(res, 'Failed to update gym', 500);
  }
};

// Soft delete gym (set activeStatus to false)
const deleteGym = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const gym = await Gym.findByPk(id);
    if (!gym) {
      return errorResponse(res, 'Gym not found', 404);
    }

    await gym.update({
      activeStatus: false,
      updatedBy,
      updateTimestamp: new Date()
    });

    return successResponse(res, 'Gym deleted successfully');
  } catch (error) {
    console.error('Error deleting gym:', error);
    return errorResponse(res, 'Failed to delete gym', 500);
  }
};

module.exports = {
  createGym,
  getAllGyms,
  getGymById,
  updateGym,
  deleteGym
};
