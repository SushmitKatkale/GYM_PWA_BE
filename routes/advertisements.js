const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AdvertisementController = require('../controllers/advertisementController');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join('uploads', 'advertisements');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `ad-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv|flv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Advertisement:
 *       type: object
 *       required:
 *         - title
 *         - type
 *         - startDate
 *         - endDate
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         title:
 *           type: string
 *           maxLength: 150
 *           description: Advertisement title
 *         description:
 *           type: string
 *           description: Advertisement description
 *         targetUrl:
 *           type: string
 *           maxLength: 255
 *           description: URL to redirect when clicked
 *         type:
 *           type: string
 *           enum: [banner, popup, carousel]
 *           description: Type of advertisement
 *         targetRole:
 *           type: string
 *           enum: [all, member, owner, trainer, admin]
 *           description: Target role for the advertisement
 *         targetGymId:
 *           type: integer
 *           description: ID of target gym (null for all gyms)
 *         targetLocation:
 *           type: string
 *           maxLength: 100
 *           description: Target location
 *         status:
 *           type: string
 *           enum: [draft, active, expired]
 *           description: Advertisement status
 *         priority:
 *           type: integer
 *           minimum: 0
 *           maximum: 10
 *           description: Advertisement priority (0-10)
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date (YYYY-MM-DD)
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date (YYYY-MM-DD)
 *         recordStatus:
 *           type: integer
 *           enum: [0, 1]
 *           description: Record status (0=inactive, 1=active)
 *         media:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Media'
 *           description: Associated media files
 *         analytics:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdvertisementAnalytics'
 *           description: Analytics data
 */

// Public routes (no authentication required)

/**
 * @swagger
 * /api/advertisements/public:
 *   get:
 *     summary: Get active advertisements for public display
 *     tags: [Advertisements - Public]
 *     parameters:
 *       - in: query
 *         name: adType
 *         schema:
 *           type: string
 *           enum: [banner, popup, card, video, carousel]
 *         description: Filter by advertisement type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of advertisements to return
 *       - in: query
 *         name: targetAudience
 *         schema:
 *           type: string
 *         description: Filter by target audience
 *     responses:
 *       200:
 *         description: Active advertisements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Advertisement'
 */
router.get('/public', AdvertisementController.getActiveAdvertisements);

/**
 * @swagger
 * /api/advertisements/{id}/track:
 *   post:
 *     summary: Track advertisement event
 *     tags: [Advertisements - Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [view, click, close, share]
 *               userId:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event tracked successfully
 */
router.post('/:id/track', AdvertisementController.trackEvent);

// Admin routes (authentication + admin privileges required)

// Analytics and Performance routes (must be before parameterized routes)

/**
 * @swagger
 * /api/advertisements/stats:
 *   get:
 *     summary: Get advertisement statistics
 *     tags: [Advertisements - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', authenticate, authorize('3'), AdvertisementController.getStats);

// Bulk operations (must be before parameterized routes)

// TODO: Uncomment bulk operations after fixing controller
// /**
//  * @swagger
//  * /api/advertisements/bulk-update:
//  *   patch:
//  *     summary: Bulk update advertisements
//  *     tags: [Advertisements - Bulk]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - advertisementIds
//  *               - updates
//  *             properties:
//  *               advertisementIds:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *               updates:
//  *                 type: object
//  *     responses:
//  *       200:
//  *         description: Advertisements updated successfully
//  */
// router.patch('/bulk-update', auth, authorize('3'), AdvertisementController.bulkUpdate);
// 
// /**
//  * @swagger
//  * /api/advertisements/bulk-delete:
//  *   post:
//  *     summary: Bulk delete advertisements
//  *     tags: [Advertisements - Bulk]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - advertisementIds
//  *             properties:
//  *               advertisementIds:
//  *                 type: array
//  *                 items:
//  *                   type: string
//  *     responses:
//  *       200:
//  *         description: Advertisements deleted successfully
//  */
// router.post('/bulk-delete', auth, authorize('3'), AdvertisementController.bulkDelete);

/**
 * @swagger
 * /api/advertisements:
 *   get:
 *     summary: Get all advertisements with pagination and filtering
 *     tags: [Advertisements - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft, expired]
 *       - in: query
 *         name: adType
 *         schema:
 *           type: string
 *           enum: [banner, popup, card, video, carousel]
 *     responses:
 *       200:
 *         description: Advertisements retrieved successfully
 */
router.get('/', authenticate, authorize('3'), AdvertisementController.getAllAdvertisements);

/**
 * @swagger
 * /api/advertisements/{id}:
 *   get:
 *     summary: Get advertisement by ID
 *     tags: [Advertisements - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Advertisement retrieved successfully
 *       404:
 *         description: Advertisement not found
 */
router.get('/:id', authenticate, authorize('3'), AdvertisementController.getAdvertisementById);

/**
 * @swagger
 * /api/advertisements:
 *   post:
 *     summary: Create a new advertisement
 *     tags: [Advertisements - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - adType
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               adType:
 *                 type: string
 *                 enum: [banner, popup, card, video, carousel]
 *               targetAudience:
 *                 type: string
 *                 enum: [all, members, gym_owners, specific_gyms, location_based]
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               budget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticate, authorize('3'), AdvertisementController.createAdvertisement);

/**
 * @swagger
 * /api/advertisements/{id}:
 *   put:
 *     summary: Update advertisement
 *     tags: [Advertisements - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Advertisement updated successfully
 *       404:
 *         description: Advertisement not found
 */
router.put('/:id', authenticate, authorize('3'), AdvertisementController.updateAdvertisement);

/**
 * @swagger
 * /api/advertisements/{id}:
 *   delete:
 *     summary: Delete advertisement
 *     tags: [Advertisements - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Advertisement deleted successfully
 *       404:
 *         description: Advertisement not found
 */
router.delete('/:id', authenticate, authorize('3'), AdvertisementController.deleteAdvertisement);

/**
 * @swagger
 * /api/advertisements/{id}/duplicate:
 *   post:
 *     summary: Duplicate advertisement
 *     tags: [Advertisements - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title for the duplicated advertisement
 *     responses:
 *       201:
 *         description: Advertisement duplicated successfully
 */
router.post('/:id/duplicate', authenticate, authorize('3'), AdvertisementController.duplicateAdvertisement);

/**
 * @swagger
 * /api/advertisements/{id}/status:
 *   put:
 *     summary: Toggle advertisement status
 *     tags: [Advertisements - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Advertisement status updated successfully
 */
router.put('/:id/status', authenticate, authorize('3'), AdvertisementController.toggleAdvertisementStatus);

/**
 * @swagger
 * /api/advertisements/{id}/performance:
 *   get:
 *     summary: Get advertisement performance metrics
 *     tags: [Advertisements - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 */
router.get('/:id/performance', authenticate, authorize('3'), AdvertisementController.getPerformance);

// Media Management routes

/**
 * @swagger
 * /api/advertisements/{id}/media:
 *   post:
 *     summary: Upload media for advertisement
 *     tags: [Advertisements - Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               mediaType:
 *                 type: string
 *                 enum: [image, video, gif]
 *               altText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 */
router.post('/:id/media', authenticate, authorize('3'), upload.single('file'), async (req, res) => {
  try {
    const { Advertisement, Media } = require('../models');
    const { id } = req.params;
    const { mediaType, altText } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate advertisement exists
    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      // Clean up uploaded file if advertisement doesn't exist
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Generate the media URL
    const mediaUrl = `/uploads/advertisements/${req.file.filename}`;
    const fullMediaUrl = `${req.protocol}://${req.get('host')}${mediaUrl}`;

    // Get file stats for additional metadata
    const stats = await fs.stat(req.file.path);

    // Create media record using the general Media model
    const mediaRecord = await Media.createMedia({
      entityType: 'advertisement',
      entityId: id,
      mediaType: mediaType || 'image',
      location: req.file.path,
      url: fullMediaUrl,
      altText: altText || null,
      mimeType: req.file.mimetype
    });

    // Update advertisement's updated_at timestamp
    await advertisement.update({ updated_at: new Date() });

    const responseData = {
      id: mediaRecord.id,
      advertisementId: id,
      mediaUrl: fullMediaUrl,
      mediaType: mediaRecord.mediaType,
      altText: mediaRecord.altText,
      fileName: req.file.originalname,
      fileSize: stats.size,
      mimeType: req.file.mimetype,
      createdAt: mediaRecord.created_at
    };

    res.json({
      success: true,
      message: 'Media uploaded and saved successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload media'
    });
  }
});

/**
 * @swagger
 * /api/advertisements/{id}/media:
 *   get:
 *     summary: Get all media for an advertisement
 *     tags: [Advertisements - Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media retrieved successfully
 */
router.get('/:id/media', authenticate, authorize('3'), async (req, res) => {
  try {
    const { Media } = require('../models');
    const { id } = req.params;

    const media = await Media.findAll({
      where: { 
        entity_type: 'advertisement',
        entity_id: id,
        record_status: 1
      },
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'entity_id',
        'media_type',
        'url',
        'alt_text',
        'mime_type',
        'created_at'
      ]
    });

    // Transform response to match expected format
    const transformedMedia = media.map(item => ({
      id: item.id,
      advertisementId: item.entity_id,
      mediaUrl: item.url,
      mediaType: item.media_type,
      altText: item.alt_text,
      mimeType: item.mime_type,
      createdAt: item.created_at
    }));

    res.json({
      success: true,
      data: transformedMedia
    });
  } catch (error) {
    console.error('Error retrieving media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve media'
    });
  }
});

/**
 * @swagger
 * /api/advertisements/{id}/media/{mediaId}:
 *   delete:
 *     summary: Delete advertisement media
 *     tags: [Advertisements - Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media deleted successfully
 */
router.delete('/:id/media/:mediaId', authenticate, authorize('3'), async (req, res) => {
  try {
    const { Media } = require('../models');
    const { id, mediaId } = req.params;

    const media = await Media.findOne({
      where: {
        id: mediaId,
        entity_type: 'advertisement',
        entity_id: id
      }
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete file from filesystem
    try {
      const filePath = media.location;
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn('Failed to delete media file:', fileError.message);
    }

    // Delete from database (soft delete by setting record_status to 0)
    await media.update({ record_status: 0 });

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete media'
    });
  }
});

module.exports = router;
