const cron = require('node-cron');
const AdvertisementService = require('../services/advertisementService');

class AdvertisementScheduler {
  static init() {
    // Run every hour to check for expired advertisements
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running scheduled task: Check for expired advertisements...');
        await AdvertisementService.expireOverdueAdvertisements();
      } catch (error) {
        console.error('Error in advertisement expiry scheduler:', error);
      }
    });

    // Run daily at midnight to cleanup orphaned media
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('Running scheduled task: Cleanup orphaned media...');
        await AdvertisementService.cleanupOrphanedMedia();
      } catch (error) {
        console.error('Error in media cleanup scheduler:', error);
      }
    });

    console.log('Advertisement scheduler initialized ✅');
  }

  /**
   * Manual trigger for expiring advertisements (for testing or manual execution)
   */
  static async expireAdvertisements() {
    return await AdvertisementService.expireOverdueAdvertisements();
  }

  /**
   * Manual trigger for media cleanup (for testing or manual execution)
   */
  static async cleanupMedia() {
    return await AdvertisementService.cleanupOrphanedMedia();
  }
}

module.exports = AdvertisementScheduler;
