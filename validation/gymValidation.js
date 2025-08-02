const Joi = require('joi');

const createGymSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Gym name must be at least 2 characters long',
    'string.max': 'Gym name cannot exceed 100 characters',
    'any.required': 'Gym name is required'
  }),
  capacity: Joi.number().integer().min(1).max(10000).required().messages({
    'number.min': 'Capacity must be at least 1',
    'number.max': 'Capacity cannot exceed 10,000',
    'any.required': 'Capacity is required'
  }),
  address: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters long',
    'string.max': 'Address cannot exceed 500 characters',
    'any.required': 'Address is required'
  }),
  description: Joi.string().max(1000).optional().messages({
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  openingTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Opening time must be in HH:MM format (24-hour)',
    'any.required': 'Opening time is required'
  }),
  closingTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Closing time must be in HH:MM format (24-hour)',
    'any.required': 'Closing time is required'
  }),
  createdBy: Joi.string().optional()
});

const updateGymSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Gym name must be at least 2 characters long',
    'string.max': 'Gym name cannot exceed 100 characters'
  }),
  capacity: Joi.number().integer().min(1).max(10000).optional().messages({
    'number.min': 'Capacity must be at least 1',
    'number.max': 'Capacity cannot exceed 10,000'
  }),
  address: Joi.string().min(10).max(500).optional().messages({
    'string.min': 'Address must be at least 10 characters long',
    'string.max': 'Address cannot exceed 500 characters'
  }),
  description: Joi.string().max(1000).optional().messages({
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  openingTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Opening time must be in HH:MM format (24-hour)'
  }),
  closingTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Closing time must be in HH:MM format (24-hour)'
  }),
  updatedBy: Joi.string().optional()
});

const deleteGymSchema = Joi.object({
  updatedBy: Joi.string().required().messages({
    'any.required': 'updatedBy is required for deletion'
  })
});

module.exports = {
  createGymSchema,
  updateGymSchema,
  deleteGymSchema
};
