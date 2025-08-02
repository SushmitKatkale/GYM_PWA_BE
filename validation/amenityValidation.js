const Joi = require('joi');

const createAmenitySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Amenity name must be at least 2 characters long',
    'string.max': 'Amenity name cannot exceed 100 characters',
    'any.required': 'Amenity name is required'
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description cannot exceed 500 characters'
  }),
  gymId: Joi.number().integer().required().messages({
    'number.base': 'Gym ID must be a number',
    'any.required': 'Gym ID is required'
  }),
  createdBy: Joi.string().optional()
});

const updateAmenitySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Amenity name must be at least 2 characters long',
    'string.max': 'Amenity name cannot exceed 100 characters'
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description cannot exceed 500 characters'
  }),
  updatedBy: Joi.string().optional()
});

const deleteAmenitySchema = Joi.object({
  updatedBy: Joi.string().required().messages({
    'any.required': 'updatedBy is required for deletion'
  })
});

module.exports = {
  createAmenitySchema,
  updateAmenitySchema,
  deleteAmenitySchema
};
