const { GymImage, Gym } = require('../models');
const ResponseUtil = require('../utils/response');
const path = require('path');
const fs = require('fs');

// Upload gym image
const uploadGymImage = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { title, createdBy } = req.body;

    // Check if gym exists
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.error(res, 'Gym not found', 404);
    }

    // Check if file was uploaded
    if (!req.file) {
      return ResponseUtil.error(res, 'No image file provided', 400);
    }

    // Create relative path for storing in database
    const relativePath = `/uploads/gyms/${req.file.filename}`;

    const gymImage = await GymImage.create({
      title: title || req.file.originalname,
      path: relativePath,
      gymId,
      createdBy,
      activeStatus: true
    });

    return ResponseUtil.success(res, {
      ...gymImage.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${relativePath}`
    }, 'Image uploaded successfully', 201);
  } catch (error) {
    console.error('Error uploading gym image:', error);
    
    // Clean up uploaded file if database operation failed
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    return ResponseUtil.error(res, 'Failed to upload image', 500);
  }
};

// Get all images for a gym
const getImagesByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const whereClause = { gymId };
    if (activeOnly === 'true') {
      whereClause.activeStatus = true;
    }

    const images = await GymImage.findAll({
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

    // Add full URL to each image
    const imagesWithUrl = images.map(image => ({
      ...image.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${image.path}`
    }));

    return ResponseUtil.success(res, imagesWithUrl, 'Images retrieved successfully');
  } catch (error) {
    console.error('Error fetching gym images:', error);
    return ResponseUtil.error(res, 'Failed to fetch images', 500);
  }
};

// Get all gym images with pagination
const getAllGymImages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      activeOnly = 'true'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (activeOnly === 'true') {
      whereClause.activeStatus = true;
    }

    const { count, rows } = await GymImage.findAndCountAll({
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

    // Add full URL to each image
    const imagesWithUrl = rows.map(image => ({
      ...image.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${image.path}`
    }));

    return ResponseUtil.success(res, {
      images: imagesWithUrl,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }, 'Images retrieved successfully');
  } catch (error) {
    console.error('Error fetching gym images:', error);
    return ResponseUtil.error(res, 'Failed to fetch images', 500);
  }
};

// Get gym image by ID
const getGymImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await GymImage.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!image) {
      return ResponseUtil.error(res, 'Image not found', 404);
    }

    const imageWithUrl = {
      ...image.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${image.path}`
    };

    return ResponseUtil.success(res, imageWithUrl, 'Image retrieved successfully');
  } catch (error) {
    console.error('Error fetching gym image:', error);
    return ResponseUtil.error(res, 'Failed to fetch image', 500);
  }
};

// Update gym image metadata
const updateGymImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, updatedBy } = req.body;

    const image = await GymImage.findByPk(id);
    if (!image) {
      return ResponseUtil.error(res, 'Image not found', 404);
    }

    await image.update({
      title,
      updatedBy,
      updateTimestamp: new Date()
    });

    const updatedImage = await GymImage.findByPk(id, {
      include: [
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name']
        }
      ]
    });

    const imageWithUrl = {
      ...updatedImage.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${updatedImage.path}`
    };

    return ResponseUtil.success(res, imageWithUrl, 'Image updated successfully');
  } catch (error) {
    console.error('Error updating gym image:', error);
    return ResponseUtil.error(res, 'Failed to update image', 500);
  }
};

// Soft delete gym image
const deleteGymImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const image = await GymImage.findByPk(id);
    if (!image) {
      return ResponseUtil.error(res, 'Image not found', 404);
    }

    await image.update({
      activeStatus: false,
      updatedBy,
      updateTimestamp: new Date()
    });

    return ResponseUtil.success(res, null, 'Image deleted successfully');
  } catch (error) {
    console.error('Error deleting gym image:', error);
    return ResponseUtil.error(res, 'Failed to delete image', 500);
  }
};

// Hard delete gym image (removes from database and file system)
const hardDeleteGymImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await GymImage.findByPk(id);
    if (!image) {
      return ResponseUtil.error(res, 'Image not found', 404);
    }

    // Delete file from file system
    const filePath = path.join(__dirname, '..', image.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await image.destroy();

    return ResponseUtil.success(res, null, 'Image permanently deleted');
  } catch (error) {
    console.error('Error hard deleting gym image:', error);
    return ResponseUtil.error(res, 'Failed to permanently delete image', 500);
  }
};

// Upload gym image without gym validation (gym_id = -1)
const uploadGymImageGeneral = async (req, res) => {
  try {
    const { title, createdBy } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return ResponseUtil.error(res, 'No image file provided', 400);
    }

    // Create relative path for storing in database
    const relativePath = `/uploads/gyms/${req.file.filename}`;

    const gymImage = await GymImage.create({
      title: title || req.file.originalname,
      path: relativePath,
      gymId: -1, // Set gym_id to -1 as requested
      createdBy,
      activeStatus: true
    });

    return ResponseUtil.success(res, {
      ...gymImage.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${relativePath}`
    }, 'Image uploaded successfully', 201);
  } catch (error) {
    console.error('Error uploading gym image:', error);
    
    // Clean up uploaded file if database operation failed
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    return ResponseUtil.error(res, 'Failed to upload image', 500);
  }
};

module.exports = {
  uploadGymImage,
  uploadGymImageGeneral,
  getImagesByGym,
  getAllGymImages,
  getGymImageById,
  updateGymImage,
  deleteGymImage,
  hardDeleteGymImage
};
