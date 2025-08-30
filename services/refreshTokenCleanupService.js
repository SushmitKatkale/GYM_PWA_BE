const { RefreshToken } = require('../models');

class RefreshTokenCleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  // Start the periodic cleanup job
  start(intervalMs = 24 * 60 * 60 * 1000) { // Default: 24 hours
    if (this.isRunning) {
      console.log('⚠️  Refresh token cleanup service is already running');
      return;
    }

    console.log('🧹 Starting refresh token cleanup service...');
    
    // Run immediately on start
    this.cleanup();
    
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
    
    this.isRunning = true;
    console.log(`✅ Refresh token cleanup service started (interval: ${intervalMs / 1000}s)`);
  }

  // Stop the cleanup service
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Refresh token cleanup service stopped');
  }

  // Perform the cleanup operation
  async cleanup() {
    try {
      console.log('🧹 Running refresh token cleanup...');
      
      // Clean up expired tokens
      const expiredCount = await RefreshToken.cleanupExpiredTokens();
      
      // Also delete very old revoked tokens (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      const revokedCount = await RefreshToken.destroy({
        where: {
          isRevoked: true,
          createdAt: {
            [require('sequelize').Op.lt]: thirtyDaysAgo
          }
        }
      });

      const totalCleaned = (expiredCount[0] || 0) + revokedCount;
      
      if (totalCleaned > 0) {
        console.log(`✅ Cleaned up ${totalCleaned} refresh tokens (${expiredCount[0] || 0} expired, ${revokedCount} old revoked)`);
      } else {
        console.log('ℹ️  No refresh tokens needed cleanup');
      }
      
      return totalCleaned;
    } catch (error) {
      console.error('❌ Error during refresh token cleanup:', error);
      return 0;
    }
  }

  // Get cleanup service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.cleanupInterval !== null
    };
  }

  // Manual cleanup method (can be called via API endpoint)
  async manualCleanup() {
    console.log('🔧 Manual refresh token cleanup initiated');
    return await this.cleanup();
  }
}

// Create singleton instance
const refreshTokenCleanupService = new RefreshTokenCleanupService();

module.exports = refreshTokenCleanupService;
