/**
 * Role-based authorization middleware
 * Checks if user has the required role to access endpoints
 */

/**
 * Middleware to authorize admin users (role = 3)
 * Note: Admin role is typically 3, trainers are role 4
 */
const authorizeAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 3) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * Middleware to authorize gym owners (role = 2)
 */
const authorizeOwner = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 2) {
      return res.status(403).json({
        success: false,
        message: 'Gym owner access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * Middleware to authorize trainers (role = 4 for trainers in users table)
 * Note: Based on the user's request, trainers have role = 4
 */
const authorizeTrainer = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 4) {
      return res.status(403).json({
        success: false,
        message: 'Trainer access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * Middleware to authorize regular users (role = 1)
 */
const authorizeUser = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 1) {
      return res.status(403).json({
        success: false,
        message: 'User access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * Middleware to allow multiple roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Middleware to check if user is owner or admin
 */
const authorizeOwnerOrAdmin = authorizeRoles(2, 3);

/**
 * Middleware to check if user is trainer or admin
 */
const authorizeTrainerOrAdmin = authorizeRoles(3, 4); // Admin (3) or Trainer (4)

module.exports = {
  authorizeAdmin,
  authorizeOwner,
  authorizeTrainer,
  authorizeUser,
  authorizeRoles,
  authorizeOwnerOrAdmin,
  authorizeTrainerOrAdmin
};