const JWTUtils = require('../utils/jwt');
const ResponseUtil = require('../utils/response');
const { User } = require('../models');

// Authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return ResponseUtil.authError(res, 'Access token is required');
    }

    const decoded = JWTUtils.verifyAccessToken(token);
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return ResponseUtil.authError(res, 'Invalid token or user not found');
    }

    req.user = user;
    next();
  } catch (error) {
    return ResponseUtil.authError(res, 'Invalid or expired token');
  }
};

// Authorize based on user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseUtil.authError(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return ResponseUtil.forbiddenError(res, 'Insufficient permissions');
    }

    next();
  };
};

// Optional authentication (for endpoints that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = JWTUtils.verifyAccessToken(token);
      const user = await User.findByPk(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
