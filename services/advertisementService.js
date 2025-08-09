const { Op, Sequelize } = require('sequelize');
const { Advertisement, AdvertisementMedia, AdvertisementAnalytics, User } = require('../models');
const fs = require('fs').promises;
const path = require('path');

class AdvertisementService {
  /**
   * Calculate advertisement performance metrics
   * @param {string} advertisementId 
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Object} Performance metrics
   */
  static async calculatePerformanceMetrics(advertisementId, startDate, endDate) {
    const whereClause = {
      advertisementId,
      ...(startDate && endDate && {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      })
    };

    const analytics = await AdvertisementAnalytics.findAll({
      where: whereClause,
      attributes: [
        'eventType',
        'deviceInfo',
        'location',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date']
      ],
      group: ['eventType', 'deviceInfo', 'location', 'date'],
      order: [['createdAt', 'ASC']]
    });

    // Calculate CTR (Click Through Rate)
    const totalViews = analytics
      .filter(item => item.eventType === 'view')
      .reduce((sum, item) => sum + parseInt(item.getDataValue('count')), 0);
    
    const totalClicks = analytics
      .filter(item => item.eventType === 'click')
      .reduce((sum, item) => sum + parseInt(item.getDataValue('count')), 0);

    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0;

    // Group by device type
    const deviceStats = analytics.reduce((acc, item) => {
      const deviceInfo = item.deviceInfo || 'Unknown';
      const count = parseInt(item.getDataValue('count'));
      
      if (!acc[deviceInfo]) {
        acc[deviceInfo] = { views: 0, clicks: 0 };
      }
      
      if (item.eventType === 'view') {
        acc[deviceInfo].views += count;
      } else if (item.eventType === 'click') {
        acc[deviceInfo].clicks += count;
      }
      
      return acc;
    }, {});

    // Group by location
    const locationStats = analytics.reduce((acc, item) => {
      const location = item.location || 'Unknown';
      const count = parseInt(item.getDataValue('count'));
      
      if (!acc[location]) {
        acc[location] = { views: 0, clicks: 0 };
      }
      
      if (item.eventType === 'view') {
        acc[location].views += count;
      } else if (item.eventType === 'click') {
        acc[location].clicks += count;
      }
      
      return acc;
    }, {});

    // Daily performance
    const dailyStats = analytics.reduce((acc, item) => {
      const date = item.getDataValue('date');
      const count = parseInt(item.getDataValue('count'));
      
      if (!acc[date]) {
        acc[date] = { views: 0, clicks: 0 };
      }
      
      if (item.eventType === 'view') {
        acc[date].views += count;
      } else if (item.eventType === 'click') {
        acc[date].clicks += count;
      }
      
      return acc;
    }, {});

    return {
      summary: {
        totalViews,
        totalClicks,
        clickThroughRate: `${ctr}%`,
        totalEngagement: totalViews + totalClicks
      },
      deviceBreakdown: deviceStats,
      locationBreakdown: locationStats,
      dailyPerformance: Object.keys(dailyStats).map(date => ({
        date,
        ...dailyStats[date],
        ctr: dailyStats[date].views > 0 
          ? ((dailyStats[date].clicks / dailyStats[date].views) * 100).toFixed(2) + '%'
          : '0%'
      }))
    };
  }

  /**
   * Check if advertisement should be automatically expired
   * @param {Object} advertisement 
   * @returns {boolean}
   */
  static shouldExpireAdvertisement(advertisement) {
    const now = new Date();
    return advertisement.endDate && new Date(advertisement.endDate) < now;
  }

  /**
   * Auto-expire advertisements that have passed their end date
   */
  static async expireOverdueAdvertisements() {
    const now = new Date();
    
    const [updatedCount] = await Advertisement.update(
      { status: 'expired' },
      {
        where: {
          status: { [Op.in]: ['active', 'draft'] },
          endDate: { [Op.lt]: now }
        }
      }
    );

    console.log(`Auto-expired ${updatedCount} overdue advertisements`);
    return updatedCount;
  }

  /**
   * Clean up orphaned media files
   */
  static async cleanupOrphanedMedia() {
    const mediaRecords = await AdvertisementMedia.findAll({
      include: [{
        model: Advertisement,
        required: false // LEFT JOIN to find orphaned media
      }]
    });

    const orphanedMedia = mediaRecords.filter(media => !media.Advertisement);
    
    for (const media of orphanedMedia) {
      try {
        // Delete file from filesystem
        const filePath = path.join('uploads', 'advertisements', path.basename(media.mediaUrl));
        await fs.unlink(filePath);
      } catch (fileError) {
        console.warn(`Failed to delete media file: ${media.mediaUrl}`, fileError.message);
      }
      
      // Delete database record
      await media.destroy();
    }

    console.log(`Cleaned up ${orphanedMedia.length} orphaned media files`);
    return orphanedMedia.length;
  }

  /**
   * Get advertisement statistics for dashboard
   * @returns {Object} Statistics summary
   */
  static async getAdvertisementStatistics() {
    const [
      totalAds,
      activeAds,
      draftAds,
      expiredAds,
      inactiveAds,
      totalViews,
      totalClicks,
      topPerformers
    ] = await Promise.all([
      Advertisement.count(),
      Advertisement.count({ where: { status: 'active' } }),
      Advertisement.count({ where: { status: 'draft' } }),
      Advertisement.count({ where: { status: 'expired' } }),
      Advertisement.count({ where: { status: 'inactive' } }),
      AdvertisementAnalytics.count({ where: { eventType: 'view' } }),
      AdvertisementAnalytics.count({ where: { eventType: 'click' } }),
      Advertisement.findAll({
        attributes: [
          'id',
          'title',
          'clicks',
          'impressions',
          [Sequelize.literal('(clicks / GREATEST(impressions, 1)) * 100'), 'ctr']
        ],
        order: [[Sequelize.literal('ctr'), 'DESC']],
        limit: 5
      })
    ]);

    return {
      overview: {
        totalAdvertisements: totalAds,
        activeAdvertisements: activeAds,
        draftAdvertisements: draftAds,
        expiredAdvertisements: expiredAds,
        inactiveAdvertisements: inactiveAds
      },
      performance: {
        totalViews,
        totalClicks,
        averageCTR: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) + '%' : '0%'
      },
      topPerformers: topPerformers.map(ad => ({
        id: ad.id,
        title: ad.title,
        clicks: ad.clicks,
        impressions: ad.impressions,
        ctr: ad.getDataValue('ctr') ? parseFloat(ad.getDataValue('ctr')).toFixed(2) + '%' : '0%'
      }))
    };
  }

  /**
   * Validate advertisement targeting and scheduling
   * @param {Object} adData 
   * @returns {Object} Validation result
   */
  static validateAdvertisementData(adData) {
    const errors = [];

    // Validate dates
    if (adData.startDate && adData.endDate) {
      const startDate = new Date(adData.startDate);
      const endDate = new Date(adData.endDate);
      
      if (startDate >= endDate) {
        errors.push('Start date must be before end date');
      }
      
      if (endDate < new Date()) {
        errors.push('End date cannot be in the past');
      }
    }

    // Validate priority
    if (adData.priority !== undefined && (adData.priority < 0 || adData.priority > 10)) {
      errors.push('Priority must be between 0 and 10');
    }

    // Validate budget
    if (adData.budget !== undefined && adData.budget < 0) {
      errors.push('Budget cannot be negative');
    }

    // Validate required fields
    if (!adData.title || adData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!adData.adType) {
      errors.push('Advertisement type is required');
    }

    const validAdTypes = ['banner', 'popup', 'card', 'video', 'carousel'];
    if (adData.adType && !validAdTypes.includes(adData.adType)) {
      errors.push(`Invalid ad type. Must be one of: ${validAdTypes.join(', ')}`);
    }

    const validTargetAudiences = ['all', 'members', 'gym_owners', 'specific_gyms', 'location_based'];
    if (adData.targetAudience && !validTargetAudiences.includes(adData.targetAudience)) {
      errors.push(`Invalid target audience. Must be one of: ${validTargetAudiences.join(', ')}`);
    }

    const validStatuses = ['active', 'inactive', 'draft', 'expired'];
    if (adData.status && !validStatuses.includes(adData.status)) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get active advertisements based on targeting criteria
   * @param {Object} criteria - Targeting criteria
   * @returns {Array} Active advertisements
   */
  static async getTargetedAdvertisements(criteria = {}) {
    const now = new Date();
    const whereClause = {
      status: 'active',
      [Op.or]: [
        { startDate: null },
        { startDate: { [Op.lte]: now } }
      ],
      [Op.or]: [
        { endDate: null },
        { endDate: { [Op.gte]: now } }
      ]
    };

    // Add targeting filters
    if (criteria.adType) {
      whereClause.adType = criteria.adType;
    }

    if (criteria.targetAudience) {
      whereClause.targetAudience = { [Op.in]: ['all', criteria.targetAudience] };
    }

    const advertisements = await Advertisement.findAll({
      where: whereClause,
      include: [{
        model: AdvertisementMedia,
        as: 'media',
        required: false
      }],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: criteria.limit || 10
    });

    return advertisements;
  }

  /**
   * Duplicate advertisement with all its media
   * @param {string} advertisementId 
   * @param {Object} options 
   * @returns {Object} Duplicated advertisement
   */
  static async duplicateAdvertisement(advertisementId, options = {}) {
    const originalAd = await Advertisement.findByPk(advertisementId, {
      include: [{
        model: AdvertisementMedia,
        as: 'media'
      }]
    });

    if (!originalAd) {
      throw new Error('Advertisement not found');
    }

    // Create duplicate advertisement
    const adData = originalAd.toJSON();
    delete adData.id;
    delete adData.createdAt;
    delete adData.updatedAt;
    delete adData.media;
    
    // Modify data for duplicate
    adData.title = options.title || `${adData.title} (Copy)`;
    adData.status = 'draft';
    adData.clicks = 0;
    adData.impressions = 0;
    adData.createdBy = options.userId;
    adData.updatedBy = options.userId;

    const duplicatedAd = await Advertisement.create(adData);

    // Duplicate media files
    if (originalAd.media && originalAd.media.length > 0) {
      for (const media of originalAd.media) {
        try {
          // Copy file
          const originalPath = path.join('uploads', 'advertisements', path.basename(media.mediaUrl));
          const newFilename = `ad-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(originalPath)}`;
          const newPath = path.join('uploads', 'advertisements', newFilename);
          
          await fs.copyFile(originalPath, newPath);
          
          // Create media record
          await AdvertisementMedia.create({
            advertisementId: duplicatedAd.id,
            mediaType: media.mediaType,
            mediaUrl: `/uploads/advertisements/${newFilename}`,
            mediaAltText: media.mediaAltText,
            mediaOrder: media.mediaOrder
          });
        } catch (error) {
          console.warn(`Failed to duplicate media: ${media.mediaUrl}`, error.message);
        }
      }
    }

    return duplicatedAd;
  }
}

module.exports = AdvertisementService;
