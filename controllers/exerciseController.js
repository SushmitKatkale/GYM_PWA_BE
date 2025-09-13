const { Exercise, User, Gym, Media } = require('../models');
const { Op } = require('sequelize');

/**
 * Exercise Controller
 * 
 * Access Control:
 * - Public exercises: Anyone can view
 * - Private exercises: Only subscribed gym users can view
 * - Add/Update/Delete: Only admins can perform these operations
 */

// Helper function to fetch media for exercises
const getExerciseMediaData = async (exerciseIds, req) => {
  try {
    const media = await Media.findAll({
      where: {
        entity_type: 'exercise',
        entity_id: { [Op.in]: exerciseIds },
        record_status: 1
      },
      order: [['created_at', 'DESC']]
    });

    // Get base URL from request
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Group media by exercise ID and type
    const mediaByExercise = {};
    media.forEach(mediaItem => {
      const exerciseId = mediaItem.entity_id;
      if (!mediaByExercise[exerciseId]) {
        mediaByExercise[exerciseId] = {
          videos: [],
          thumbnails: []
        };
      }

      const mediaData = {
        id: mediaItem.id,
        url: mediaItem.url, // Relative URL
        fullUrl: `${baseUrl}${mediaItem.url}`, // Full URL for images
        mimeType: mediaItem.mime_type,
        altText: mediaItem.alt_text,
        createdAt: mediaItem.created_at
      };

      if (mediaItem.media_type === 'video') {
        // For videos, provide both direct URL and streaming URL
        const filename = mediaItem.url.split('/').pop(); // Extract filename from path
        mediaData.streamUrl = `${baseUrl}/api/video-stream/stream/${filename}`;
        mediaData.fullUrl = `${baseUrl}/api/video-stream/stream/${filename}`; // Use streaming URL as primary
        mediaByExercise[exerciseId].videos.push(mediaData);
      } else if (mediaItem.media_type === 'image') {
        mediaByExercise[exerciseId].thumbnails.push(mediaData);
      }
    });

    return mediaByExercise;
  } catch (error) {
    console.error('Error fetching exercise media:', error);
    return {};
  }
};

// Get all exercises with filtering and pagination
const getAllExercises = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      muscleGroup,
      equipment,
      search,
      gymId,
      includePrivate = false
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {
      record_status: 1
    };

    // Access control for viewing exercises
    if (req.user) {
      if (includePrivate === 'true') {
        // For logged-in users, include both public and gym-specific exercises
        // Check if user has subscription to specific gym for private exercises
        if (gymId) {
          // TODO: Add subscription check logic here
          // For now, include gym-specific exercises if gymId is provided
          where[Op.or] = [
            { is_public: true },
            { gym_id: gymId }
          ];
        } else {
          // Include all public exercises and user's gym exercises
          where.is_public = true;
        }
      } else {
        where.is_public = true;
      }
    } else {
      // For non-authenticated users, only show public exercises
      where.is_public = true;
    }

    // Apply filters
    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (muscleGroup) {
      where.muscle_groups = {
        [Op.contains]: muscleGroup
      };
    }

    if (equipment) {
      where.equipment_needed = {
        [Op.contains]: equipment
      };
    }

    if (gymId) {
      if (where[Op.or]) {
        // Already handled in access control above
      } else {
        where.gym_id = gymId;
      }
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { exercise_title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { instructions: { [Op.like]: `%${search}%` } }
      ];
    }

    const exercises = await Exercise.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['exercise_title', 'ASC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address'],
          required: false
        }
      ]
    });

    // Fetch media for all exercises
    const exerciseIds = exercises.rows.map(ex => ex.id);
    const exerciseMedia = await getExerciseMediaData(exerciseIds, req);

    // Add formatted data to each exercise
    const formattedExercises = exercises.rows.map(exercise => {
      const exerciseData = exercise.toJSON();
      const exerciseId = exercise.id;
      const media = exerciseMedia[exerciseId] || { videos: [], thumbnails: [] };
      
      return {
        ...exerciseData,
        formattedDuration: exercise.getFormattedDuration(),
        youtubeThumbnail: exercise.getYouTubeThumbnail(),
        youtubeVideoId: exercise.getYouTubeVideoId(),
        media: {
          videos: media.videos,
          thumbnails: media.thumbnails,
          // Provide primary video and thumbnail for easier access
          primaryVideo: media.videos[0] || null,
          primaryThumbnail: media.thumbnails[0] || null
        }
      };
    });

    res.status(200).json({
      success: true,
      data: {
        exercises: formattedExercises,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(exercises.count / limit),
          totalItems: exercises.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exercises',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single exercise by ID
const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findOne({
      where: {
        id,
        record_status: 1
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address'],
          required: false
        }
      ]
    });

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    // Access control for viewing specific exercise
    if (!exercise.isPublic) {
      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This exercise is not public.'
        });
      }
      // TODO: Add subscription check for gym-specific exercises
      // For now, allow authenticated users to view private exercises
    }

    // Fetch media for this exercise
    const exerciseMedia = await getExerciseMediaData([id], req);
    const media = exerciseMedia[id] || { videos: [], thumbnails: [] };

    const exerciseData = exercise.toJSON();
    const formattedExercise = {
      ...exerciseData,
      formattedDuration: exercise.getFormattedDuration(),
      youtubeThumbnail: exercise.getYouTubeThumbnail(),
      youtubeVideoId: exercise.getYouTubeVideoId(),
      media: {
        videos: media.videos,
        thumbnails: media.thumbnails,
        // Provide primary video and thumbnail for easier access
        primaryVideo: media.videos[0] || null,
        primaryThumbnail: media.thumbnails[0] || null
      }
    };

    res.status(200).json({
      success: true,
      data: formattedExercise
    });
  } catch (error) {
    console.error('Error fetching exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exercise',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new exercise (Admin only)
const createExercise = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 3) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can create exercises.'
      });
    }

    const exerciseData = {
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    // Validate gym existence if gymId is provided
    if (exerciseData.gymId) {
      const gym = await Gym.findByPk(exerciseData.gymId);
      if (!gym) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gym ID provided'
        });
      }
    }

    const exercise = await Exercise.create(exerciseData);

    // Fetch the created exercise with associations
    const createdExercise = await Exercise.findByPk(exercise.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Exercise created successfully',
      data: createdExercise
    });
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating exercise',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update exercise (Admin only)
const updateExercise = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 3) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can update exercises.'
      });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    const exercise = await Exercise.findOne({
      where: {
        id,
        record_status: 1
      }
    });

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    // Validate gym existence if gymId is being updated
    if (updateData.gymId) {
      const gym = await Gym.findByPk(updateData.gymId);
      if (!gym) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gym ID provided'
        });
      }
    }

    await exercise.update(updateData);

    // Fetch updated exercise with associations
    const updatedExercise = await Exercise.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name', 'address'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Exercise updated successfully',
      data: updatedExercise
    });
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating exercise',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete exercise (Admin only)
const deleteExercise = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 3) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can delete exercises.'
      });
    }

    const { id } = req.params;

    const exercise = await Exercise.findOne({
      where: {
        id,
        record_status: 1
      }
    });

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    // Soft delete by updating record_status
    await exercise.update({
      record_status: 0,
      updatedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Exercise deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting exercise',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get exercises by category
const getExercisesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10, difficulty, includePrivate = false } = req.query;

    const options = {
      difficulty,
      isPublic: includePrivate === 'true' ? undefined : true
    };

    if (req.user && includePrivate === 'true') {
      // TODO: Add gym subscription logic for private exercises
    }

    const exercises = await Exercise.findByCategory(category, {
      ...options,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    const limitedExercises = exercises.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: limitedExercises
    });
  } catch (error) {
    console.error('Error fetching exercises by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exercises by category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Search exercises
const searchExercises = async (req, res) => {
  try {
    const { q: searchTerm, limit = 20, category, difficulty } = req.query;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const options = {
      category,
      difficulty,
      isPublic: true,
      limit: parseInt(limit)
    };

    // TODO: Add subscription-based private exercise search for authenticated users

    const exercises = await Exercise.search(searchTerm.trim(), {
      ...options,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: Gym,
          as: 'gym',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: exercises
    });
  } catch (error) {
    console.error('Error searching exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching exercises',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get exercise categories with counts
const getCategories = async (req, res) => {
  try {
    const categories = await Exercise.getCategories();

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get muscle groups
const getMuscleGroups = async (req, res) => {
  try {
    const muscleGroups = await Exercise.getMuscleGroups();

    res.status(200).json({
      success: true,
      data: muscleGroups
    });
  } catch (error) {
    console.error('Error fetching muscle groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching muscle groups',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get equipment list
const getEquipmentList = async (req, res) => {
  try {
    const equipment = await Exercise.getEquipmentList();

    res.status(200).json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('Error fetching equipment list:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching equipment list',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get popular exercises
const getPopularExercises = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const exercises = await Exercise.getPopular(parseInt(limit));

    res.status(200).json({
      success: true,
      data: exercises
    });
  } catch (error) {
    console.error('Error fetching popular exercises:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular exercises',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Toggle exercise public/private status (Admin only)
const toggleExerciseVisibility = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 3) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can change exercise visibility.'
      });
    }

    const { id } = req.params;

    const exercise = await Exercise.findOne({
      where: {
        id,
        record_status: 1
      }
    });

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found'
      });
    }

    const newVisibility = !exercise.is_public;
    await exercise.update({
      is_public: newVisibility,
      updatedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: `Exercise ${newVisibility ? 'made public' : 'made private'} successfully`,
      data: {
        id: exercise.id,
        isPublic: newVisibility
      }
    });
  } catch (error) {
    console.error('Error toggling exercise visibility:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling exercise visibility',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  getExercisesByCategory,
  searchExercises,
  getCategories,
  getMuscleGroups,
  getEquipmentList,
  getPopularExercises,
  toggleExerciseVisibility
};
