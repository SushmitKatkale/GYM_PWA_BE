const { GymAmenity, Gym } = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

// Create a new amenity
const createAmenity = async (req, res) => {
  try {
    const {
      name,
      description,
      gymId,
      createdBy
    } = req.body;

    // Check if gym exists
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.error(res, 'Gym not found', 404);
    }

    const amenity = await GymAmenity.create({
      name,
      description,
      gymId,
      createdBy,
      recordStatus: true
    });

    return ResponseUtil.success(res, 'Amenity created successfully', amenity, 201);
  } catch (error) {
    console.error('Error creating amenity:', error);
    return ResponseUtil.error(res, 'Failed to create amenity', 500);
  }
};

// Get all amenities for a gym
const getAmenitiesByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const whereClause = { gymId };
    if (activeOnly === 'true') {
      whereClause.recordStatus = true;
    }

    const amenities = await GymAmenity.findAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          as: 'gym',
                  }
      ],
      order: [['createdAt', 'DESC']]
    });

    return ResponseUtil.success(res, 'Amenities retrieved successfully', amenities);
  } catch (error) {
    console.error('Error fetching amenities:', error);
    return ResponseUtil.error(res, 'Failed to fetch amenities', 500);
  }
};

// Get all amenities with pagination
const getAllAmenities = async (req, res) => {
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
      whereClause.recordStatus = 1;
    }

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    // Simplified query without includes to avoid association issues
    const { count, rows } = await GymAmenity.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return ResponseUtil.success(res, {
      amenities: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }, 'Amenities retrieved successfully');
  } catch (error) {
    console.error('Error fetching amenities:', error);
    return ResponseUtil.error(res, 'Failed to fetch amenities', 500);
  }
};

// Get amenity by ID
const getAmenityById = async (req, res) => {
  try {
    const { id } = req.params;

    const amenity = await GymAmenity.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
                  }
      ]
    });

    if (!amenity) {
      return ResponseUtil.error(res, 'Amenity not found', 404);
    }

    return ResponseUtil.success(res, 'Amenity retrieved successfully', amenity);
  } catch (error) {
    console.error('Error fetching amenity:', error);
    return ResponseUtil.error(res, 'Failed to fetch amenity', 500);
  }
};

// Update amenity
const updateAmenity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      updatedBy
    } = req.body;

    const amenity = await GymAmenity.findByPk(id);
    if (!amenity) {
      return ResponseUtil.error(res, 'Amenity not found', 404);
    }

    await amenity.update({
      name,
      description,
      updatedBy,
      updatedAt: new Date()
    });

    const updatedAmenity = await GymAmenity.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
                  }
      ]
    });

    return ResponseUtil.success(res, 'Amenity updated successfully', updatedAmenity);
  } catch (error) {
    console.error('Error updating amenity:', error);
    return ResponseUtil.error(res, 'Failed to update amenity', 500);
  }
};

// Soft delete amenity
const deleteAmenity = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const amenity = await GymAmenity.findByPk(id);
    if (!amenity) {
      return ResponseUtil.error(res, 'Amenity not found', 404);
    }

    await amenity.update({
      recordStatus: false,
      updatedBy,
      updatedAt: new Date()
    });

    return ResponseUtil.success(res, 'Amenity deleted successfully');
  } catch (error) {
    console.error('Error deleting amenity:', error);
    return ResponseUtil.error(res, 'Failed to delete amenity', 500);
  }
};

module.exports = {
  createAmenity,
  getAmenitiesByGym,
  getAllAmenities,
  getAmenityById,
  updateAmenity,
  deleteAmenity
};
