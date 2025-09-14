const { Media, DietPlanMeal, sequelize } = require('../models');
const ResponseUtil = require('../utils/response');
const path = require('path');
const fs = require('fs');

// Upload meal image
const uploadMealImage = async (req, res) => {
  try {
    const { mealId, title, type = 'meal' } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return ResponseUtil.error(res, 'No image file provided', 400);
    }

    // Create relative path for storing in database
    const relativePath = `/uploads/meals/${req.file.filename}`;

    const mealImage = await Media.create({
      entity_type: 'meal',
      entity_id: mealId || -1, // Use -1 if no mealId provided
      media_type: 'image',
      location: relativePath,
      url: relativePath,
      alt_text: title || req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      created_by: req.user?.id || null,
      record_status: 1
    });

    return ResponseUtil.success(res, {
      ...mealImage.toJSON(),
      url: relativePath,
      fullUrl: `${req.protocol}://${req.get('host')}${relativePath}`,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    }, 'Meal image uploaded successfully', 201);
  } catch (error) {
    console.error('Error uploading meal image:', error);
    
    // Clean up uploaded file if database operation failed
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    return ResponseUtil.error(res, 'Failed to upload meal image', 500);
  }
};

// Delete meal image by URL (transactional)
const deleteMealImage = async (req, res) => {
  const transaction = await sequelize.transaction();
  let fileToDelete = null;
  
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      await transaction.rollback();
      return ResponseUtil.error(res, 'Image URL is required', 400);
    }

    // Find the image record by URL
    const image = await Media.findOne({
      where: {
        entity_type: 'meal',
        url: imageUrl
      },
      transaction
    });

    if (!image) {
      await transaction.rollback();
      return ResponseUtil.error(res, 'Meal image not found', 404);
    }

    // Get the meal ID to update meal's image reference if needed
    const mealId = image.entity_id;
    
    // Store file path for deletion after successful DB operations
    const filePath = path.join(__dirname, '..', image.url || image.location);
    if (fs.existsSync(filePath)) {
      fileToDelete = filePath;
    }

    // If image is associated with a specific meal, remove the image reference
    if (mealId && mealId !== -1) {
      const associatedMeal = await DietPlanMeal.findOne({
        where: { id: mealId },
        transaction
      });

      if (associatedMeal) {
        // Clear the image_url field in the meal if it matches this image
        const imageUrlToCheck = image.url || image.location;
        if (associatedMeal.image_url === imageUrlToCheck || 
            associatedMeal.image_url === `${req.protocol}://${req.get('host')}${imageUrlToCheck}`) {
          await associatedMeal.update({
            image_url: null,
            updated_by: req.user?.id || null
          }, { transaction });
        }
      }
    }

    // Delete from database
    await image.destroy({ transaction });

    // Commit the transaction
    await transaction.commit();

    // Only delete file after successful database operations
    if (fileToDelete) {
      try {
        fs.unlinkSync(fileToDelete);
        console.log(`Successfully deleted file: ${fileToDelete}`);
      } catch (fileError) {
        console.error('Error deleting file after successful DB operation:', fileError);
        // Don't fail the request if file deletion fails after DB success
        // Log it for manual cleanup if needed
      }
    }

    return ResponseUtil.success(res, null, 'Meal image deleted successfully');
  } catch (error) {
    console.error('Error deleting meal image:', error);
    
    // Rollback transaction on any error
    await transaction.rollback();
    
    return ResponseUtil.error(res, 'Failed to delete meal image', 500);
  }
};

// Soft delete meal image by URL
const softDeleteMealImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return ResponseUtil.error(res, 'Image URL is required', 400);
    }

    // Find the image record by URL
    const image = await Media.findOne({
      where: {
        entity_type: 'meal',
        url: imageUrl
      }
    });

    if (!image) {
      return ResponseUtil.error(res, 'Meal image not found', 404);
    }

    // Soft delete by setting record_status to 0
    await image.update({
      record_status: 0,
      updated_by: req.user?.id || null,
      updated_at: new Date()
    });

    return ResponseUtil.success(res, null, 'Meal image deleted successfully');
  } catch (error) {
    console.error('Error deleting meal image:', error);
    return ResponseUtil.error(res, 'Failed to delete meal image', 500);
  }
};

// Get meal images by meal ID
const getMealImages = async (req, res) => {
  try {
    const { mealId } = req.params;
    const { activeOnly = 'true' } = req.query;

    const whereClause = {
      entity_type: 'meal',
      entity_id: mealId
    };
    
    if (activeOnly === 'true') {
      whereClause.record_status = 1;
    }

    const images = await Media.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    // Add full URL to each image
    const imagesWithUrl = images.map(image => ({
      ...image.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${image.url || image.location}`
    }));

    return ResponseUtil.success(res, imagesWithUrl, 'Meal images retrieved successfully');
  } catch (error) {
    console.error('Error fetching meal images:', error);
    return ResponseUtil.error(res, 'Failed to fetch meal images', 500);
  }
};

// Get all meal images with pagination
const getAllMealImages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      activeOnly = 'true'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      entity_type: 'meal'
    };

    if (activeOnly === 'true') {
      whereClause.record_status = 1;
    }

    const { count, rows } = await Media.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Add full URL to each image
    const imagesWithUrl = rows.map(image => ({
      ...image.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${image.url || image.location}`
    }));

    return ResponseUtil.success(res, {
      images: imagesWithUrl,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }, 'Meal images retrieved successfully');
  } catch (error) {
    console.error('Error fetching meal images:', error);
    return ResponseUtil.error(res, 'Failed to fetch meal images', 500);
  }
};

// Get meal image by ID
const getMealImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Media.findByPk(id);

    if (!image || image.entity_type !== 'meal') {
      return ResponseUtil.error(res, 'Meal image not found', 404);
    }

    const imageWithUrl = {
      ...image.toJSON(),
      fullUrl: `${req.protocol}://${req.get('host')}${image.url || image.location}`
    };

    return ResponseUtil.success(res, imageWithUrl, 'Meal image retrieved successfully');
  } catch (error) {
    console.error('Error fetching meal image:', error);
    return ResponseUtil.error(res, 'Failed to fetch meal image', 500);
  }
};

module.exports = {
  uploadMealImage,
  deleteMealImage,
  softDeleteMealImage,
  getMealImages,
  getAllMealImages,
  getMealImageById
};
