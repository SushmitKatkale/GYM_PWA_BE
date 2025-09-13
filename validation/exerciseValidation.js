const Joi = require('joi');

// Valid muscle groups
const validMuscleGroups = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'lower_back', 'glutes', 'quadriceps', 
  'hamstrings', 'calves', 'full_body', 'core', 'upper_body', 'lower_body'
];

// Valid equipment
const validEquipment = [
  'none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell',
  'medicine_ball', 'pull_up_bar', 'bench', 'treadmill', 'bike',
  'rowing_machine', 'cable_machine', 'smith_machine', 'yoga_mat',
  'foam_roller', 'stability_ball', 'suspension_trainer', 'other'
];

// Valid categories
const validCategories = [
  'strength', 'cardio', 'flexibility', 'balance', 'sports', 
  'yoga', 'pilates', 'crossfit', 'bodyweight', 'weightlifting', 'other'
];

// Valid difficulty levels
const validDifficulties = ['beginner', 'intermediate', 'advanced'];

// Exercise creation validation schema
const createExerciseSchema = Joi.object({
  exerciseTitle: Joi.string().min(1).max(200).required().messages({
    'string.base': 'Exercise title must be a string',
    'string.min': 'Exercise title must be at least 1 character long',
    'string.max': 'Exercise title must not exceed 200 characters',
    'any.required': 'Exercise title is required'
  }),

  description: Joi.string().max(5000).allow('', null).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 5000 characters'
  }),

  instructions: Joi.string().max(5000).allow('', null).messages({
    'string.base': 'Instructions must be a string',
    'string.max': 'Instructions must not exceed 5000 characters'
  }),

  youtubeUrl: Joi.string().uri().pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//).allow('', null).messages({
    'string.base': 'YouTube URL must be a string',
    'string.uri': 'YouTube URL must be a valid URL',
    'string.pattern.base': 'YouTube URL must be a valid YouTube URL'
  }),

  thumbnailUrl: Joi.string().uri().allow('', null).messages({
    'string.base': 'Thumbnail URL must be a string',
    'string.uri': 'Thumbnail URL must be a valid URL'
  }),

  duration: Joi.number().integer().min(1).max(300).allow(null).messages({
    'number.base': 'Duration must be a number',
    'number.integer': 'Duration must be an integer',
    'number.min': 'Duration must be at least 1 minute',
    'number.max': 'Duration must not exceed 300 minutes'
  }),

  difficulty: Joi.string().valid(...validDifficulties).required().messages({
    'string.base': 'Difficulty must be a string',
    'any.only': `Difficulty must be one of: ${validDifficulties.join(', ')}`,
    'any.required': 'Difficulty is required'
  }),

  category: Joi.string().valid(...validCategories).required().messages({
    'string.base': 'Category must be a string',
    'any.only': `Category must be one of: ${validCategories.join(', ')}`,
    'any.required': 'Category is required'
  }),

  muscleGroups: Joi.array().items(
    Joi.string().valid(...validMuscleGroups)
  ).unique().allow(null).messages({
    'array.base': 'Muscle groups must be an array',
    'array.unique': 'Muscle groups must be unique',
    'any.only': `Each muscle group must be one of: ${validMuscleGroups.join(', ')}`
  }),

  equipmentNeeded: Joi.array().items(
    Joi.string().valid(...validEquipment)
  ).unique().allow(null).messages({
    'array.base': 'Equipment needed must be an array',
    'array.unique': 'Equipment items must be unique',
    'any.only': `Each equipment item must be one of: ${validEquipment.join(', ')}`
  }),

  calories: Joi.number().integer().min(0).max(2000).allow(null).messages({
    'number.base': 'Calories must be a number',
    'number.integer': 'Calories must be an integer',
    'number.min': 'Calories must be at least 0',
    'number.max': 'Calories must not exceed 2000'
  }),

  sets: Joi.number().integer().min(1).max(10).allow(null).messages({
    'number.base': 'Sets must be a number',
    'number.integer': 'Sets must be an integer',
    'number.min': 'Sets must be at least 1',
    'number.max': 'Sets must not exceed 10'
  }),

  reps: Joi.string().max(50).allow('', null).messages({
    'string.base': 'Reps must be a string',
    'string.max': 'Reps must not exceed 50 characters'
  }),

  restTime: Joi.number().integer().min(0).max(600).allow(null).messages({
    'number.base': 'Rest time must be a number',
    'number.integer': 'Rest time must be an integer',
    'number.min': 'Rest time must be at least 0 seconds',
    'number.max': 'Rest time must not exceed 600 seconds'
  }),

  tags: Joi.array().items(
    Joi.string().max(50)
  ).max(20).allow(null).messages({
    'array.base': 'Tags must be an array',
    'array.max': 'Cannot have more than 20 tags',
    'string.max': 'Each tag must not exceed 50 characters'
  }),

  isPublic: Joi.boolean().default(true).messages({
    'boolean.base': 'isPublic must be a boolean'
  }),

  gymId: Joi.number().integer().positive().allow(null).messages({
    'number.base': 'Gym ID must be a number',
    'number.integer': 'Gym ID must be an integer',
    'number.positive': 'Gym ID must be a positive number'
  })
});

// Exercise update validation schema (all fields optional)
const updateExerciseSchema = Joi.object({
  exerciseTitle: Joi.string().min(1).max(200).messages({
    'string.base': 'Exercise title must be a string',
    'string.min': 'Exercise title must be at least 1 character long',
    'string.max': 'Exercise title must not exceed 200 characters'
  }),

  description: Joi.string().max(5000).allow('', null).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 5000 characters'
  }),

  instructions: Joi.string().max(5000).allow('', null).messages({
    'string.base': 'Instructions must be a string',
    'string.max': 'Instructions must not exceed 5000 characters'
  }),

  youtubeUrl: Joi.string().uri().pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//).allow('', null).messages({
    'string.base': 'YouTube URL must be a string',
    'string.uri': 'YouTube URL must be a valid URL',
    'string.pattern.base': 'YouTube URL must be a valid YouTube URL'
  }),

  thumbnailUrl: Joi.string().uri().allow('', null).messages({
    'string.base': 'Thumbnail URL must be a string',
    'string.uri': 'Thumbnail URL must be a valid URL'
  }),

  duration: Joi.number().integer().min(1).max(300).allow(null).messages({
    'number.base': 'Duration must be a number',
    'number.integer': 'Duration must be an integer',
    'number.min': 'Duration must be at least 1 minute',
    'number.max': 'Duration must not exceed 300 minutes'
  }),

  difficulty: Joi.string().valid(...validDifficulties).messages({
    'string.base': 'Difficulty must be a string',
    'any.only': `Difficulty must be one of: ${validDifficulties.join(', ')}`
  }),

  category: Joi.string().valid(...validCategories).messages({
    'string.base': 'Category must be a string',
    'any.only': `Category must be one of: ${validCategories.join(', ')}`
  }),

  muscleGroups: Joi.array().items(
    Joi.string().valid(...validMuscleGroups)
  ).unique().allow(null).messages({
    'array.base': 'Muscle groups must be an array',
    'array.unique': 'Muscle groups must be unique',
    'any.only': `Each muscle group must be one of: ${validMuscleGroups.join(', ')}`
  }),

  equipmentNeeded: Joi.array().items(
    Joi.string().valid(...validEquipment)
  ).unique().allow(null).messages({
    'array.base': 'Equipment needed must be an array',
    'array.unique': 'Equipment items must be unique',
    'any.only': `Each equipment item must be one of: ${validEquipment.join(', ')}`
  }),

  calories: Joi.number().integer().min(0).max(2000).allow(null).messages({
    'number.base': 'Calories must be a number',
    'number.integer': 'Calories must be an integer',
    'number.min': 'Calories must be at least 0',
    'number.max': 'Calories must not exceed 2000'
  }),

  sets: Joi.number().integer().min(1).max(10).allow(null).messages({
    'number.base': 'Sets must be a number',
    'number.integer': 'Sets must be an integer',
    'number.min': 'Sets must be at least 1',
    'number.max': 'Sets must not exceed 10'
  }),

  reps: Joi.string().max(50).allow('', null).messages({
    'string.base': 'Reps must be a string',
    'string.max': 'Reps must not exceed 50 characters'
  }),

  restTime: Joi.number().integer().min(0).max(600).allow(null).messages({
    'number.base': 'Rest time must be a number',
    'number.integer': 'Rest time must be an integer',
    'number.min': 'Rest time must be at least 0 seconds',
    'number.max': 'Rest time must not exceed 600 seconds'
  }),

  tags: Joi.array().items(
    Joi.string().max(50)
  ).max(20).allow(null).messages({
    'array.base': 'Tags must be an array',
    'array.max': 'Cannot have more than 20 tags',
    'string.max': 'Each tag must not exceed 50 characters'
  }),

  isPublic: Joi.boolean().messages({
    'boolean.base': 'isPublic must be a boolean'
  }),

  gymId: Joi.number().integer().positive().allow(null).messages({
    'number.base': 'Gym ID must be a number',
    'number.integer': 'Gym ID must be an integer',
    'number.positive': 'Gym ID must be a positive number'
  })
});

// Exercise query parameters validation schema
const exerciseQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1'
  }),

  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100'
  }),

  category: Joi.string().valid(...validCategories).allow('').messages({
    'string.base': 'Category must be a string',
    'any.only': `Category must be one of: ${validCategories.join(', ')}`
  }),

  difficulty: Joi.string().valid(...validDifficulties).allow('').messages({
    'string.base': 'Difficulty must be a string',
    'any.only': `Difficulty must be one of: ${validDifficulties.join(', ')}`
  }),

  muscleGroup: Joi.string().valid(...validMuscleGroups).allow('').messages({
    'string.base': 'Muscle group must be a string',
    'any.only': `Muscle group must be one of: ${validMuscleGroups.join(', ')}`
  }),

  equipment: Joi.string().valid(...validEquipment).allow('').messages({
    'string.base': 'Equipment must be a string',
    'any.only': `Equipment must be one of: ${validEquipment.join(', ')}`
  }),

  search: Joi.string().max(100).allow('').messages({
    'string.base': 'Search term must be a string',
    'string.max': 'Search term must not exceed 100 characters'
  }),

  gymId: Joi.number().integer().positive().messages({
    'number.base': 'Gym ID must be a number',
    'number.integer': 'Gym ID must be an integer',
    'number.positive': 'Gym ID must be a positive number'
  }),

  includePrivate: Joi.boolean().default(false).messages({
    'boolean.base': 'includePrivate must be a boolean'
  }),

  sortBy: Joi.string().valid('exercise_title', 'category', 'difficulty', 'created_at', 'duration', 'calories').default('exercise_title').messages({
    'string.base': 'sortBy must be a string',
    'any.only': 'sortBy must be one of: exercise_title, category, difficulty, created_at, duration, calories'
  }),

  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('ASC').messages({
    'string.base': 'sortOrder must be a string',
    'any.only': 'sortOrder must be ASC or DESC'
  })
});

// Search query validation schema
const searchQuerySchema = Joi.object({
  q: Joi.string().min(1).max(100).required().messages({
    'string.base': 'Search query must be a string',
    'string.min': 'Search query must be at least 1 character long',
    'string.max': 'Search query must not exceed 100 characters',
    'any.required': 'Search query is required'
  }),

  limit: Joi.number().integer().min(1).max(50).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 50'
  }),

  category: Joi.string().valid(...validCategories).allow('').messages({
    'string.base': 'Category must be a string',
    'any.only': `Category must be one of: ${validCategories.join(', ')}`
  }),

  difficulty: Joi.string().valid(...validDifficulties).allow('').messages({
    'string.base': 'Difficulty must be a string',
    'any.only': `Difficulty must be one of: ${validDifficulties.join(', ')}`
  })
});

// Category parameter validation schema
const categoryParamSchema = Joi.object({
  category: Joi.string().valid(...validCategories).required().messages({
    'string.base': 'Category must be a string',
    'any.only': `Category must be one of: ${validCategories.join(', ')}`,
    'any.required': 'Category is required'
  })
});

// Popular exercises query validation schema
const popularQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 50'
  })
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
        timestamp: new Date().toISOString()
      });
    }
    req.body = value; // Use validated and transformed data
    next();
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: error.details.map(detail => detail.message),
        timestamp: new Date().toISOString()
      });
    }
    req.query = value; // Use validated and transformed data
    next();
  };
};

// Parameters validation middleware
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Parameter validation error',
        errors: error.details.map(detail => detail.message),
        timestamp: new Date().toISOString()
      });
    }
    req.params = value; // Use validated and transformed data
    next();
  };
};

module.exports = {
  createExerciseSchema,
  updateExerciseSchema,
  exerciseQuerySchema,
  searchQuerySchema,
  categoryParamSchema,
  popularQuerySchema,
  validate,
  validateQuery,
  validateParams,
  validMuscleGroups,
  validEquipment,
  validCategories,
  validDifficulties
};
