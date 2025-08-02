const { Amenity, Gym } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
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
      return errorResponse(res, 'Gym not found', 404);
    }

    const amenity = await Amenity.create({
      name,
      description,
      gymId,
      createdBy,
      activeStatus: true
    });

    return successResponse(res, 'Amenity created successfully', amenity, 201);
  } catch (error) {
    console.error('Error creating amenity:', error);
    return errorResponse(res, 'Failed to create amenity', 500);
  }
};

// Get all amenities for a gym
const getAmenitiesByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const whereClause = { gymId };
    if (activeOnly === 'true') {
      whereClause.activeStatus = true;
    }

    const amenities = await Amenity.findAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        }
      ],
      order: [['createTimestamp', 'DESC']]
    });

    return successResponse(res, 'Amenities retrieved successfully', amenities);
  } catch (error) {
    console.error('Error fetching amenities:', error);
    return errorResponse(res, 'Failed to fetch amenities', 500);
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
      whereClause.activeStatus = true;
    }

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Amenity.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createTimestamp', 'DESC']]
    });

    return successResponse(res, 'Amenities retrieved successfully', {
      amenities: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching amenities:', error);
    return errorResponse(res, 'Failed to fetch amenities', 500);
  }
};

// Get amenity by ID
const getAmenityById = async (req, res) => {
  try {
    const { id } = req.params;

    const amenity = await Amenity.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!amenity) {
      return errorResponse(res, 'Amenity not found', 404);
    }

    return successResponse(res, 'Amenity retrieved successfully', amenity);
  } catch (error) {
    console.error('Error fetching amenity:', error);
    return errorResponse(res, 'Failed to fetch amenity', 500);
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

    const amenity = await Amenity.findByPk(id);
    if (!amenity) {
      return errorResponse(res, 'Amenity not found', 404);
    }

    await amenity.update({
      name,
      description,
      updatedBy,
      updateTimestamp: new Date()
    });

    const updatedAmenity = await Amenity.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        }
      ]
    });

    return successResponse(res, 'Amenity updated successfully', updatedAmenity);
  } catch (error) {
    console.error('Error updating amenity:', error);
    return errorResponse(res, 'Failed to update amenity', 500);
  }
};

// Soft delete amenity
const deleteAmenity = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const amenity = await Amenity.findByPk(id);
    if (!amenity) {
      return errorResponse(res, 'Amenity not found', 404);
    }

    await amenity.update({
      activeStatus: false,
      updatedBy,
      updateTimestamp: new Date()
    });

    return successResponse(res, 'Amenity deleted successfully');
  } catch (error) {
    console.error('Error deleting amenity:', error);
    return errorResponse(res, 'Failed to delete amenity', 500);
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
