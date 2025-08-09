const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AdvertisementController = require('../controllers/advertisementController');
const { authenticate } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
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
 *         - adType
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         title:
 *           type: string
 *           description: Advertisement title
 *         description:
 *           type: string
 *           description: Brief description
 *         content:
 *           type: string
 *           description: Advertisement content
 *         adType:
 *           type: string
 *           enum: [banner, popup, card, video, carousel]
 *           description: Type of advertisement
 *         status:
 *           type: string
 *           enum: [active, inactive, draft, expired]
 *           description: Advertisement status
 *         targetAudience:
 *           type: string
 *           enum: [all, members, gym_owners, specific_gyms, location_based]
 *           description: Target audience
 *         priority:
 *           type: integer
 *           minimum: 0
 *           maximum: 10
 *           description: Advertisement priority
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: End date
 *         budget:
 *           type: number
 *           description: Advertisement budget
 *         clicks:
 *           type: integer
 *           description: Total clicks
 *         impressions:
 *           type: integer
 *           description: Total impressions
 *     AdvertisementMedia:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         mediaType:
 *           type: string
 *           enum: [image, video, gif]
 *         mediaUrl:
 *           type: string
 *         mediaAltText:
 *           type: string
 *         mediaOrder:
 *           type: integer
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
router.get('/stats', authenticate, adminAuth, AdvertisementController.getStats);

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
// router.patch('/bulk-update', auth, adminAuth, AdvertisementController.bulkUpdate);
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
// router.post('/bulk-delete', auth, adminAuth, AdvertisementController.bulkDelete);

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
router.get('/', authenticate, adminAuth, AdvertisementController.getAllAdvertisements);

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
router.get('/:id', authenticate, adminAuth, AdvertisementController.getAdvertisementById);

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
router.post('/', authenticate, adminAuth, AdvertisementController.createAdvertisement);

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
router.put('/:id', authenticate, adminAuth, AdvertisementController.updateAdvertisement);

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
router.delete('/:id', authenticate, adminAuth, AdvertisementController.deleteAdvertisement);

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
router.post('/:id/duplicate', authenticate, adminAuth, AdvertisementController.duplicateAdvertisement);

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
router.put('/:id/status', authenticate, adminAuth, AdvertisementController.toggleAdvertisementStatus);

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
router.get('/:id/performance', authenticate, adminAuth, AdvertisementController.getPerformance);

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
router.post('/:id/media', authenticate, adminAuth, upload.single('file'), async (req, res) => {
  try {
    const { Advertisement, AdvertisementMedia } = require('../models');
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

    // Get the next media order for this advertisement
    const maxOrderResult = await AdvertisementMedia.findOne({
      where: { advertisementId: id },
      order: [['mediaOrder', 'DESC']],
      attributes: ['mediaOrder']
    });
    const mediaOrder = (maxOrderResult?.mediaOrder || 0) + 1;

    // Create media record in database
    const mediaRecord = await AdvertisementMedia.create({
      advertisementId: id,
      mediaType: mediaType || 'image',
      mediaUrl: fullMediaUrl,
      mediaAltText: altText || null,
      mediaOrder: mediaOrder,
      fileSize: stats.size,
      mimeType: req.file.mimetype
    });

    // Update advertisement's updateTimestamp
    await advertisement.update({ updateTimestamp: new Date() });

    const responseData = {
      id: mediaRecord.id,
      advertisementId: id,
      mediaUrl: fullMediaUrl,
      mediaType: mediaRecord.mediaType,
      mediaAltText: mediaRecord.mediaAltText,
      mediaOrder: mediaRecord.mediaOrder,
      fileName: req.file.originalname,
      fileSize: stats.size,
      mimeType: req.file.mimetype,
      createTimestamp: mediaRecord.createTimestamp
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
router.get('/:id/media', authenticate, adminAuth, async (req, res) => {
  try {
    const { AdvertisementMedia } = require('../models');
    const { id } = req.params;

    const media = await AdvertisementMedia.findAll({
      where: { advertisementId: id },
      order: [['mediaOrder', 'ASC']],
      attributes: [
        'id',
        'advertisementId',
        'mediaType',
        'mediaUrl',
        'mediaAltText',
        'mediaOrder',
        'fileSize',
        'mimeType',
        'createTimestamp'
      ]
    });

    res.json({
      success: true,
      data: media
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
router.delete('/:id/media/:mediaId', authenticate, adminAuth, async (req, res) => {
  try {
    const { AdvertisementMedia } = require('../models');
    const { id, mediaId } = req.params;

    const media = await AdvertisementMedia.findOne({
      where: {
        id: mediaId,
        advertisementId: id
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
      const filePath = path.join('uploads', 'advertisements', path.basename(media.mediaUrl));
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn('Failed to delete media file:', fileError.message);
    }

    // Delete from database
    await media.destroy();

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
