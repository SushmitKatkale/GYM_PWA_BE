const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ResponseUtil = require('../utils/response');

/**
 * Admin authentication middleware
 * Ensures user is authenticated and has admin privileges (role = 4)
 */
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.authError(res, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return ResponseUtil.authError(res, 'Access denied. Invalid token format.');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.id, {
      where: { 
        record_status: 1,
        role: 4 // Admin only (1=member, 2=owner, 3=trainer, 4=admin)
      }
    });

    if (!user) {
      return ResponseUtil.forbiddenError(res, 'Access denied. Admin privileges required.');
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.authError(res, 'Access denied. Invalid token.');
    } else if (error.name === 'TokenExpiredError') {
      return ResponseUtil.authError(res, 'Access denied. Token expired.');
    } else {
      console.error('Admin auth middleware error:', error);
      return ResponseUtil.error(res, 'Internal server error', 500);
    }
  }
};

module.exports = adminAuth;
