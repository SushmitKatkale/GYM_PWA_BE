const ResponseUtil = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);

  // Sequelize errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0].path;
    return ResponseUtil.conflictError(res, `${field} already exists`);
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => error.message);
    return ResponseUtil.validationError(res, errors);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return ResponseUtil.error(res, 'Referenced resource does not exist', 400);
  }

  if (err.name === 'SequelizeConnectionError') {
    return ResponseUtil.error(res, 'Database connection error', 503);
  }

  // MySQL/Database errors (fallback)
  if (err.code === 'ER_DUP_ENTRY') {
    return ResponseUtil.conflictError(res, 'Resource already exists');
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return ResponseUtil.error(res, 'Referenced resource does not exist', 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseUtil.authError(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseUtil.authError(res, 'Token expired');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseUtil.validationError(res, err.message);
  }

  // Default error
  return ResponseUtil.error(res, 'Internal Server Error', 500);
};

// 404 handler
const notFoundHandler = (req, res) => {
  return ResponseUtil.notFoundError(res, `Route ${req.originalUrl} not found`);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
