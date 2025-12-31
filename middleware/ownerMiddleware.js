const ResponseUtil = require('../utils/response');

/**
 * Middleware to check if user has owner role
 */
const ownerMiddleware = (req, res, next) => {
  try {
    // Check if user is authenticated (authMiddleware should run before this)
    if (!req.user) {
      return ResponseUtil.unauthorizedError(res, 'Authentication required');
    }

    // Check if user has owner role (role = 2 for owners)
    if (req.user.role !== 2 && req.user.role !== '2') {
      return ResponseUtil.forbiddenError(res, 'Owner access required');
    }

    // User is authenticated and has owner role
    next();
  } catch (error) {
    console.error('Owner middleware error:', error);
    return ResponseUtil.error(res, 'Authorization check failed');
  }
};

module.exports = ownerMiddleware;