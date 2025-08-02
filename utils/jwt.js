const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTUtils {
  // Generate access token
  static generateAccessToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  // Generate refresh token
  static generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Verify access token
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Get token expiration date for refresh token
  static getRefreshTokenExpiration() {
    const expirationTime = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    const match = expirationTime.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const [, amount, unit] = match;
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    const expiration = new Date(Date.now() + (parseInt(amount) * multipliers[unit]));
    return expiration;
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = JWTUtils;
