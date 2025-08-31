const Joi = require('joi');

// User creation validation schema
const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.base': 'First name must be a string',
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required'
  }),
  
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.base': 'Last name must be a string',
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  
  username: Joi.string().alphanum().min(3).max(50).required().messages({
    'string.base': 'Username must be a string',
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 50 characters',
    'any.required': 'Username is required'
  }),
  
  email: Joi.string().email().required().messages({
    'string.base': 'Email must be a string',
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 100 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[0-9\s\-\(\)]+$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Phone number must contain only numbers, spaces, hyphens, parentheses, and plus sign'
    }),
  
  role: Joi.number().valid(1, 2, 3, 4).default(1).messages({
    'any.only': 'Role must be 1 (member), 2 (owner), 3 (trainer), or 4 (admin)'
  }),
  
  recordStatus: Joi.number().valid(0, 1).default(1).messages({
    'any.only': 'Record status must be 0 (inactive) or 1 (active)'
  })
});

// User update validation schema
const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).messages({
    'string.base': 'First name must be a string',
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters'
  }),
  
  lastName: Joi.string().min(2).max(50).messages({
    'string.base': 'Last name must be a string',
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters'
  }),
  
  username: Joi.string().alphanum().min(3).max(50).messages({
    'string.base': 'Username must be a string',
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 50 characters'
  }),
  
  email: Joi.string().email().messages({
    'string.base': 'Email must be a string',
    'string.email': 'Email must be a valid email address'
  }),
  
  phone: Joi.string()
    .pattern(/^[+]?[0-9\s\-\(\)]+$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Phone number must contain only numbers, spaces, hyphens, parentheses, and plus sign'
    }),
  
  role: Joi.number().valid(1, 2, 3, 4).messages({
    'any.only': 'Role must be 1 (member), 2 (owner), 3 (trainer), or 4 (admin)'
  }),
  
  recordStatus: Joi.number().valid(0, 1).messages({
    'any.only': 'Record status must be 0 (inactive) or 1 (active)'
  })
});

// Password change validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
    .required()
    .messages({
      'string.base': 'New password must be a string',
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must not exceed 100 characters',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

// Toggle status validation schema
const toggleStatusSchema = Joi.object({
  recordStatus: Joi.number().valid(0, 1).required().messages({
    'any.only': 'Record status must be 0 (inactive) or 1 (active)',
    'any.required': 'Record status is required'
  })
});

// Query parameters validation schema
const queryParamsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1'
  }),
  
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100'
  }),
  
  search: Joi.string().allow('').messages({
    'string.base': 'Search must be a string'
  }),
  
  type: Joi.string().valid('1', '2', '3', '4').messages({
    'any.only': 'Type must be 1 (member), 2 (owner), 3 (trainer), or 4 (admin)'
  }),
  
  activeStatus: Joi.string().valid('0', '1').messages({
    'any.only': 'Active status must be 0 (inactive) or 1 (active)'
  }),
  
  // Individual filter fields
  email: Joi.string().email().allow('').messages({
    'string.email': 'Email must be a valid email address'
  }),
  
  firstName: Joi.string().allow('').messages({
    'string.base': 'First name must be a string'
  }),
  
  lastName: Joi.string().allow('').messages({
    'string.base': 'Last name must be a string'
  }),
  
  username: Joi.string().allow('').messages({
    'string.base': 'Username must be a string'
  }),
  
  phoneNumber: Joi.string().allow('').messages({
    'string.base': 'Phone number must be a string'
  }),
  
  isVerified: Joi.boolean().messages({
    'boolean.base': 'isVerified must be a boolean'
  }),
  
  // Date filters
  createdAfter: Joi.string().isoDate().allow('').messages({
    'string.isoDate': 'createdAfter must be a valid ISO date'
  }),
  
  createdBefore: Joi.string().isoDate().allow('').messages({
    'string.isoDate': 'createdBefore must be a valid ISO date'
  }),
  
  lastLoginAfter: Joi.string().isoDate().allow('').messages({
    'string.isoDate': 'lastLoginAfter must be a valid ISO date'
  }),
  
  lastLoginBefore: Joi.string().isoDate().allow('').messages({
    'string.isoDate': 'lastLoginBefore must be a valid ISO date'
  }),
  
  // Export format
  format: Joi.string().valid('csv', 'xlsx').default('csv').messages({
    'any.only': 'Format must be csv or xlsx'
  }),
  
  // Activity days filter
  days: Joi.number().integer().min(1).max(365).default(30).messages({
    'number.base': 'Days must be a number',
    'number.integer': 'Days must be an integer',
    'number.min': 'Days must be at least 1',
    'number.max': 'Days must not exceed 365'
  }),
  
  sortBy: Joi.string().valid('created_at','firstName', 'lastName', 'username', 'email').default('created_at').messages({
    'any.only': 'Sort by must be one of: created_at, firstName, lastName, username, email'
  }),
  
  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC').messages({
    'any.only': 'Sort order must be ASC or DESC'
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

module.exports = {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  toggleStatusSchema,
  queryParamsSchema,
  validate,
  validateQuery
};
