const { 
  Advertisement, 
  Media, 
  AdvertisementAnalytics,
  User,
  sequelize 
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const UAParser = require('ua-parser-js');

class AdvertisementController {
  // Create a new advertisement
  static async createAdvertisement(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const advertisementData = {
        ...req.body,
        createdBy: req.user ? req.user.id : null,
        updatedBy: req.user ? req.user.id : null,
      };

      const advertisement = await Advertisement.create(advertisementData, { transaction });

      // Handle media if provided
      if (req.body.media && Array.isArray(req.body.media)) {
        for (const mediaItem of req.body.media) {
          await Media.create({
            entity_type: 'advertisement',
            entity_id: advertisement.id,
            media_type: mediaItem.mediaType || 'image',
            location: mediaItem.location || mediaItem.mediaUrl,
            url: mediaItem.url || mediaItem.mediaUrl,
            alt_text: mediaItem.altText || mediaItem.mediaAltText,
            mime_type: mediaItem.mimeType,
            created_by: req.user ? req.user.id : null,
            ...mediaItem
          }, { transaction });
        }
      }

      await transaction.commit();

      // Fetch the created advertisement with media
      const createdAdvertisement = await Advertisement.findByPk(advertisement.id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username']
          }
        ]
      });

      // Get advertisement media separately using the Media model
      const advertisementMedia = await Media.findAll({
        where: {
          entity_type: 'advertisement',
          entity_id: advertisement.id,
          record_status: 1
        },
        order: [['created_at', 'ASC']]
      });

      // Add media to the response
      const responseData = {
        ...createdAdvertisement.toJSON(),
        media: advertisementMedia
      };

      return ResponseUtil.success(res, responseData, 'Advertisement created successfully', 201);
    } catch (error) {
      await transaction.rollback();
      
      if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(err => err.message);
        return ResponseUtil.validationError(res, errors);
      }
      console.error('Error creating advertisement:', error);
      return ResponseUtil.error(res, 'Failed to create advertisement');
    }
  }

  // Get all advertisements with pagination and filtering
  static async getAllAdvertisements(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        adType,
        targetAudience,
        startDate,
        endDate,
        minBudget,
        maxBudget,
        createdBy,
        hasActiveSchedule,
        sortBy = 'created_at', // Updated field name
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Add search filter
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { content: { [Op.like]: `%${search}%` } }
        ];
      }

      // Add individual filters
      if (status) {
        whereClause.status = status;
      }

      if (adType) {
        whereClause.adType = adType;
      }

      if (targetAudience) {
        whereClause.targetAudience = targetAudience;
      }

      if (createdBy) {
        whereClause.createdBy = createdBy;
      }

      // Date filters
      if (startDate) {
        whereClause.startDate = {
          ...whereClause.startDate,
          [Op.gte]: new Date(startDate)
        };
      }

      if (endDate) {
        whereClause.endDate = {
          ...whereClause.endDate,
          [Op.lte]: new Date(endDate)
        };
      }

      // Budget filters
      if (minBudget) {
        whereClause.budget = {
          ...whereClause.budget,
          [Op.gte]: parseFloat(minBudget)
        };
      }

      if (maxBudget) {
        whereClause.budget = {
          ...whereClause.budget,
          [Op.lte]: parseFloat(maxBudget)
        };
      }

      const result = await Advertisement.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username'],
            required: false,
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'firstName', 'lastName', 'username'],
            required: false,
          }
        ]
      });

      // Get media for all advertisements
      const advertisementIds = result.rows.map(ad => ad.id);
      const advertisementMediaMap = {};
      
      if (advertisementIds.length > 0) {
        const allMedia = await Media.findAll({
          where: {
            entity_type: 'advertisement',
            entity_id: { [Op.in]: advertisementIds },
            record_status: 1
          },
          order: [['created_at', 'ASC']]
        });
        
        // Group media by advertisement ID
        allMedia.forEach(media => {
          if (!advertisementMediaMap[media.entity_id]) {
            advertisementMediaMap[media.entity_id] = [];
          }
          advertisementMediaMap[media.entity_id].push(media);
        });
      }
      
      // Add media to each advertisement
      result.rows.forEach(ad => {
        ad.dataValues.media = advertisementMediaMap[ad.id] || [];
      });

      // Calculate stats
      const stats = await AdvertisementController.getAdvertisementStats();

      const totalPages = Math.ceil(result.count / parseInt(limit));

      return ResponseUtil.success(res, {
        advertisements: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total: result.count,
          limit: parseInt(limit)
        },
        stats: stats.data
      });
    } catch (error) {
      console.error('Error fetching advertisements:', error);
      return ResponseUtil.error(res, 'Failed to fetch advertisements');
    }
  }

  // Get advertisement by ID
  static async getAdvertisementById(req, res) {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'firstName', 'lastName', 'username']
          }
        ]
      });

      if (!advertisement) {
        return ResponseUtil.notFoundError(res, 'Advertisement not found');
      }

      // Get advertisement media separately
      const advertisementMedia = await Media.findAll({
        where: {
          entity_type: 'advertisement',
          entity_id: id,
          record_status: 1
        },
        order: [['created_at', 'ASC']]
      });

      // Add media to the response
      const responseData = {
        ...advertisement.toJSON(),
        media: advertisementMedia
      };

      return ResponseUtil.success(res, responseData);
    } catch (error) {
      console.error('Error fetching advertisement:', error);
      return ResponseUtil.error(res, 'Failed to fetch advertisement');
    }
  }

  // Update advertisement
  static async updateAdvertisement(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.user ? req.user.id : null,
      };

      const advertisement = await Advertisement.findByPk(id, { transaction });

      if (!advertisement) {
        await transaction.rollback();
        return ResponseUtil.notFoundError(res, 'Advertisement not found');
      }

      await advertisement.update(updateData, { transaction });

      // Handle media updates if provided - but don't automatically delete existing media
      // Media should be managed through separate endpoints for individual upload/delete operations
      if (req.body.media && Array.isArray(req.body.media) && req.body.replaceAllMedia === true) {
        // Only replace all media if explicitly requested
        // Remove existing media
        await Media.update({ 
          record_status: 0 
        }, {
          where: { 
            entity_type: 'advertisement',
            entity_id: id 
          },
          transaction 
        });

        // Add new media
        for (const mediaItem of req.body.media) {
          await Media.create({
            entity_type: 'advertisement',
            entity_id: id,
            media_type: mediaItem.mediaType || 'image',
            location: mediaItem.location || mediaItem.mediaUrl,
            url: mediaItem.url || mediaItem.mediaUrl,
            alt_text: mediaItem.altText || mediaItem.mediaAltText,
            mime_type: mediaItem.mimeType,
            created_by: req.user ? req.user.id : null,
            ...mediaItem
          }, { transaction });
        }
      }

      await transaction.commit();

      // Fetch updated advertisement with media
      const updatedAdvertisement = await Advertisement.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'firstName', 'lastName', 'username']
          }
        ]
      });

      // Get updated advertisement media
      const updatedMedia = await Media.findAll({
        where: {
          entity_type: 'advertisement',
          entity_id: id,
          record_status: 1
        },
        order: [['created_at', 'ASC']]
      });

      const responseData = {
        ...updatedAdvertisement.toJSON(),
        media: updatedMedia
      };

      return ResponseUtil.success(res, responseData, 'Advertisement updated successfully');
    } catch (error) {
      await transaction.rollback();
      
      if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(err => err.message);
        return ResponseUtil.validationError(res, errors);
      }
      console.error('Error updating advertisement:', error);
      return ResponseUtil.error(res, 'Failed to update advertisement');
    }
  }

  // Delete advertisement
  static async deleteAdvertisement(req, res) {
    try {
      const { id } = req.params;

      const advertisement = await Advertisement.findByPk(id);

      if (!advertisement) {
        return ResponseUtil.notFoundError(res, 'Advertisement not found');
      }

      // Get advertisement media
      const advertisementMedia = await Media.findAll({
        where: {
          entity_type: 'advertisement',
          entity_id: id,
          record_status: 1
        }
      });

      // Delete associated media files
      if (advertisementMedia && advertisementMedia.length > 0) {
        for (const media of advertisementMedia) {
          try {
            const filePath = path.join('uploads', path.basename(media.url || media.location));
            await fs.unlink(filePath);
          } catch (fileError) {
            console.warn('Failed to delete media file:', fileError.message);
          }
        }

        // Mark media as deleted
        await Media.update(
          { record_status: 0 },
          {
            where: {
              entity_type: 'advertisement',
              entity_id: id
            }
          }
        );
      }

      await advertisement.destroy();

      return ResponseUtil.success(res, null, 'Advertisement deleted successfully');
    } catch (error) {
      console.error('Error deleting advertisement:', error);
      return ResponseUtil.error(res, 'Failed to delete advertisement');
    }
  }

  // Duplicate advertisement
  static async duplicateAdvertisement(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { title } = req.body;

      const originalAd = await Advertisement.findByPk(id, { transaction });

      if (!originalAd) {
        await transaction.rollback();
        return ResponseUtil.notFoundError(res, 'Advertisement not found');
      }

      // Get original advertisement media
      const originalMedia = await Media.findAll({
        where: {
          entity_type: 'advertisement',
          entity_id: id,
          record_status: 1
        },
        transaction
      });


      // Create duplicate advertisement
      const duplicateData = {
        ...originalAd.toJSON(),
        id: undefined,
        title: title || `${originalAd.title} - Copy`,
        status: 'draft',
        clicks: 0,
        impressions: 0,
        createdBy: req.user ? req.user.id : null,
        updatedBy: req.user ? req.user.id : null,
      };

      delete duplicateData.media;
      delete duplicateData.analytics;
      delete duplicateData.created_at; // Updated field name
      delete duplicateData.updated_at; // Updated field name

      const duplicateAd = await Advertisement.create(duplicateData, { transaction });

      // Duplicate media
      if (originalMedia && originalMedia.length > 0) {
        for (const media of originalMedia) {
          await Media.create({
            entity_type: 'advertisement',
            entity_id: duplicateAd.id,
            media_type: media.media_type,
            location: media.location,
            url: media.url,
            alt_text: media.alt_text,
            mime_type: media.mime_type,
            file_size: media.file_size,
            width: media.width,
            height: media.height,
            duration: media.duration,
            created_by: req.user ? req.user.id : null
          }, { transaction });
        }
      }

      await transaction.commit();

      // Fetch the duplicated advertisement with media
      const duplicatedAdvertisement = await Advertisement.findByPk(duplicateAd.id);
      
      // Get duplicated advertisement media
      const duplicatedMedia = await Media.findAll({
        where: {
          entity_type: 'advertisement',
          entity_id: duplicateAd.id,
          record_status: 1
        },
        order: [['created_at', 'ASC']]
      });

      const responseData = {
        ...duplicatedAdvertisement.toJSON(),
        media: duplicatedMedia
      };

      return ResponseUtil.success(res, responseData, 'Advertisement duplicated successfully', 201);
    } catch (error) {
      await transaction.rollback();
      console.error('Error duplicating advertisement:', error);
      return ResponseUtil.error(res, 'Failed to duplicate advertisement');
    }
  }

  // Toggle advertisement status
  static async toggleAdvertisementStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive'].includes(status)) {
        return ResponseUtil.validationError(res, ['Status must be either active or inactive']);
      }

      const advertisement = await Advertisement.findByPk(id);

      if (!advertisement) {
        return ResponseUtil.notFoundError(res, 'Advertisement not found');
      }

      await advertisement.update({
        status,
        updatedBy: req.user ? req.user.id : null
      });

      const updatedAdvertisement = await Advertisement.findByPk(id);
      
      // Get updated advertisement media
      const updatedMedia = await Media.findAll({
        where: {
          entity_type: 'advertisement',
          entity_id: id,
          record_status: 1
        },
        order: [['created_at', 'ASC']]
      });

      const responseData = {
        ...updatedAdvertisement.toJSON(),
        media: updatedMedia
      };

      return ResponseUtil.success(res, responseData, `Advertisement ${status === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling advertisement status:', error);
      return ResponseUtil.error(res, 'Failed to update advertisement status');
    }
  }

  // Get advertisement statistics
  static async getAdvertisementStats() {
    try {
      const [
        totalAds,
        activeAds,
        inactiveAds,
        draftAds,
        expiredAds,
        totalClicks,
        totalImpressions,
        topPerforming
      ] = await Promise.all([
        Advertisement.count(),
        Advertisement.count({ where: { status: 'active' } }),
        Advertisement.count({ where: { status: 'inactive' } }),
        Advertisement.count({ where: { status: 'draft' } }),
        Advertisement.count({ where: { status: 'expired' } }),
        Advertisement.sum('clicks'),
        Advertisement.sum('impressions'),
        Advertisement.findAll({
          limit: 5,
          order: [
            [sequelize.literal('(clicks + impressions)'), 'DESC'],
            ['clicks', 'DESC']
          ],
          attributes: ['id', 'title', 'clicks', 'impressions']
        })
      ]);

      const averageCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const totalBudget = await Advertisement.sum('budget') || 0;

      const topPerformingAds = topPerforming.map(ad => ({
        id: ad.id,
        title: ad.title,
        clicks: ad.clicks,
        impressions: ad.impressions,
        ctr: ad.impressions > 0 ? ad.clicks / ad.impressions : 0
      }));

      return {
        success: true,
        data: {
          totalAds,
          activeAds,
          inactiveAds,
          draftAds,
          expiredAds,
          totalClicks: totalClicks || 0,
          totalImpressions: totalImpressions || 0,
          averageCTR,
          totalBudget,
          topPerformingAds
        }
      };
    } catch (error) {
      console.error('Error calculating advertisement stats:', error);
      return {
        success: false,
        message: 'Failed to calculate advertisement statistics'
      };
    }
  }

  // Get advertisement statistics endpoint
  static async getStats(req, res) {
    try {
      const stats = await AdvertisementController.getAdvertisementStats();
      
      if (stats.success) {
        return ResponseUtil.success(res, stats.data);
      } else {
        return ResponseUtil.error(res, stats.message);
      }
    } catch (error) {
      console.error('Error fetching advertisement stats:', error);
      return ResponseUtil.error(res, 'Failed to fetch advertisement statistics');
    }
  }

  // Track advertisement event
  static async trackEvent(req, res) {
    try {
      const { id } = req.params;
      const { eventType, userId, metadata } = req.body;

      const advertisement = await Advertisement.findByPk(id);

      if (!advertisement) {
        return ResponseUtil.notFoundError(res, 'Advertisement not found');
      }

      // Parse user agent
      const userAgent = req.headers['user-agent'];
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      // Determine device type
      let deviceType = 'desktop';
      if (result.device.type === 'mobile') deviceType = 'mobile';
      else if (result.device.type === 'tablet') deviceType = 'tablet';

      // Get client IP
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

      // Create analytics record
      await AdvertisementAnalytics.create({
        advertisementId: id,
        userId: userId || null,
        eventType,
        userAgent,
        ipAddress,
        deviceType,
        browserType: result.browser.name,
        osType: result.os.name,
        referrerUrl: req.headers.referer,
        sessionId: req.session?.id,
        viewDuration: metadata?.viewDuration || null
      });

      // Update advertisement counters
      if (eventType === 'view') {
        await advertisement.increment('impressions');
      } else if (eventType === 'click') {
        await advertisement.increment('clicks');
      }

      return ResponseUtil.success(res, null, 'Event tracked successfully');
    } catch (error) {
      console.error('Error tracking advertisement event:', error);
      return ResponseUtil.error(res, 'Failed to track event');
    }
  }

  // Get advertisement performance
  static async getPerformance(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const advertisement = await Advertisement.findByPk(id);

      if (!advertisement) {
        return ResponseUtil.notFoundError(res, 'Advertisement not found');
      }

      let dateFilter = {};
      if (startDate) {
        dateFilter[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        dateFilter[Op.lte] = new Date(endDate);
      }

      const whereClause = {
        advertisementId: id,
        ...(Object.keys(dateFilter).length > 0 && { eventTimestamp: dateFilter })
      };

      const [
        totalViews,
        totalClicks,
        totalShares,
        dailyStats,
        geographicData,
        deviceStats
      ] = await Promise.all([
        AdvertisementAnalytics.count({ 
          where: { ...whereClause, eventType: 'view' } 
        }),
        AdvertisementAnalytics.count({ 
          where: { ...whereClause, eventType: 'click' } 
        }),
        AdvertisementAnalytics.count({ 
          where: { ...whereClause, eventType: 'share' } 
        }),
        sequelize.query(`
          SELECT DATE(event_timestamp) as date, 
                 COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
                 COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
                 COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares
          FROM advertisement_analytics 
          WHERE advertisement_id = :adId
            ${startDate ? 'AND event_timestamp >= :startDate' : ''}
            ${endDate ? 'AND event_timestamp <= :endDate' : ''}
          GROUP BY DATE(event_timestamp)
          ORDER BY date DESC
          LIMIT 30
        `, {
          replacements: { 
            adId: id,
            ...(startDate && { startDate }),
            ...(endDate && { endDate })
          },
          type: sequelize.QueryTypes.SELECT
        }),
        sequelize.query(`
          SELECT JSON_EXTRACT(location_data, '$.country') as location,
                 COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
                 COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
          FROM advertisement_analytics 
          WHERE advertisement_id = :adId 
            AND location_data IS NOT NULL
            ${startDate ? 'AND event_timestamp >= :startDate' : ''}
            ${endDate ? 'AND event_timestamp <= :endDate' : ''}
          GROUP BY JSON_EXTRACT(location_data, '$.country')
          ORDER BY views DESC
          LIMIT 10
        `, {
          replacements: { 
            adId: id,
            ...(startDate && { startDate }),
            ...(endDate && { endDate })
          },
          type: sequelize.QueryTypes.SELECT
        }),
        sequelize.query(`
          SELECT device_type,
                 COUNT(*) as count
          FROM advertisement_analytics 
          WHERE advertisement_id = :adId
            ${startDate ? 'AND event_timestamp >= :startDate' : ''}
            ${endDate ? 'AND event_timestamp <= :endDate' : ''}
          GROUP BY device_type
        `, {
          replacements: { 
            adId: id,
            ...(startDate && { startDate }),
            ...(endDate && { endDate })
          },
          type: sequelize.QueryTypes.SELECT
        })
      ]);

      const ctr = totalViews > 0 ? totalClicks / totalViews : 0;

      const deviceBreakdown = {
        mobile: 0,
        desktop: 0,
        tablet: 0
      };

      deviceStats.forEach(stat => {
        if (stat.device_type && deviceBreakdown.hasOwnProperty(stat.device_type)) {
          deviceBreakdown[stat.device_type] = stat.count;
        }
      });

      const performance = {
        advertisementId: id,
        title: advertisement.title,
        totalViews,
        totalClicks,
        totalShares,
        ctr,
        dailyStats: dailyStats.map(stat => ({
          date: stat.date,
          views: parseInt(stat.views),
          clicks: parseInt(stat.clicks),
          shares: parseInt(stat.shares)
        })),
        geographicData: geographicData.map(geo => ({
          location: geo.location || 'Unknown',
          views: parseInt(geo.views),
          clicks: parseInt(geo.clicks)
        })),
        deviceStats: deviceBreakdown
      };

      return ResponseUtil.success(res, performance);
    } catch (error) {
      console.error('Error fetching advertisement performance:', error);
      return ResponseUtil.error(res, 'Failed to fetch advertisement performance');
    }
  }

  // Get active advertisements for public display
  static async getActiveAdvertisements(req, res) {
    try {
      const { 
        adType, 
        placement, 
        limit = 10,
        targetAudience = 'all'
      } = req.query;

      const whereClause = {
        status: 'active',
        [Op.or]: [
          { startDate: { [Op.lte]: new Date() } },
          { startDate: null }
        ],
        [Op.or]: [
          { endDate: { [Op.gte]: new Date() } },
          { endDate: null }
        ]
      };

      if (adType) {
        whereClause.adType = adType;
      }

      if (targetAudience && targetAudience !== 'all') {
        whereClause[Op.or] = [
          { targetAudience: 'all' },
          { targetAudience }
        ];
      }

      const advertisements = await Advertisement.findAll({
        where: whereClause,
        limit: parseInt(limit),
        order: [
          ['priority', 'DESC'],
          ['created_at', 'DESC'] // Updated field name
        ]
      });

      // Get media for all active advertisements
      const advertisementIds = advertisements.map(ad => ad.id);
      const advertisementMediaMap = {};
      
      if (advertisementIds.length > 0) {
        const allMedia = await Media.findAll({
          where: {
            entity_type: 'advertisement',
            entity_id: { [Op.in]: advertisementIds },
            record_status: 1
          },
          order: [['created_at', 'ASC']]
        });
        
        // Group media by advertisement ID
        allMedia.forEach(media => {
          if (!advertisementMediaMap[media.entity_id]) {
            advertisementMediaMap[media.entity_id] = [];
          }
          advertisementMediaMap[media.entity_id].push(media);
        });
      }
      
      // Add media to each advertisement
      const advertisementsWithMedia = advertisements.map(ad => ({
        ...ad.toJSON(),
        media: advertisementMediaMap[ad.id] || []
      }));

      return ResponseUtil.success(res, advertisementsWithMedia);
    } catch (error) {
      console.error('Error fetching active advertisements:', error);
      return ResponseUtil.error(res, 'Failed to fetch active advertisements');
    }
  }

  // Bulk operations
  static async bulkUpdate(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { advertisementIds, updates } = req.body;

      if (!Array.isArray(advertisementIds) || advertisementIds.length === 0) {
        return ResponseUtil.validationError(res, ['Advertisement IDs are required']);
      }

      const updateData = {
        ...updates,
        updatedBy: req.user ? req.user.id : null
      };

      const [updatedCount] = await Advertisement.update(updateData, {
        where: {
          id: { [Op.in]: advertisementIds }
        },
        transaction
      });

      await transaction.commit();

      return ResponseUtil.success(res, { 
        updated: updatedCount,
        errors: [] 
      }, `${updatedCount} advertisements updated successfully`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error bulk updating advertisements:', error);
      return ResponseUtil.error(res, 'Failed to bulk update advertisements');
    }
  }

  static async bulkDelete(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { advertisementIds } = req.body;

      if (!Array.isArray(advertisementIds) || advertisementIds.length === 0) {
        return ResponseUtil.validationError(res, ['Advertisement IDs are required']);
      }

      const deletedCount = await Advertisement.destroy({
        where: {
          id: { [Op.in]: advertisementIds }
        },
        transaction
      });

      await transaction.commit();

      return ResponseUtil.success(res, { 
        deleted: deletedCount,
        errors: [] 
      }, `${deletedCount} advertisements deleted successfully`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error bulk deleting advertisements:', error);
      return ResponseUtil.error(res, 'Failed to bulk delete advertisements');
    }
  }
}

module.exports = AdvertisementController;
