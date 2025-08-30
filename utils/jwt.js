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

  // Create refresh token in database
  static async createRefreshToken(userId, deviceInfo = null, ipAddress = null, userAgent = null) {
    const RefreshToken = require('../models/RefreshToken');
    
    // Clean up any existing expired tokens for this user
    await RefreshToken.destroy({
      where: {
        userId,
        expiresAt: {
          [require('sequelize').Op.lt]: new Date()
        }
      }
    });

    // Optionally revoke existing valid tokens (for single session per user)
    // Uncomment if you want only one active session per user:
    // await RefreshToken.revokeAllUserTokens(userId);

    const token = this.generateRefreshToken();
    const expiresAt = this.getRefreshTokenExpiration();

    const refreshToken = await RefreshToken.create({
      token,
      userId,
      expiresAt,
      deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
      ipAddress,
      userAgent
    });

    return refreshToken.token;
  }

  // Validate refresh token
  static async validateRefreshToken(token) {
    const RefreshToken = require('../models/RefreshToken');
    return await RefreshToken.findValidToken(token);
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
  static getRefreshTokenExpiration(isAdmin = false) {
    const expirationTime = isAdmin ? '15m' : process.env.JWT_REFRESH_EXPIRES_IN || '30d';
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
