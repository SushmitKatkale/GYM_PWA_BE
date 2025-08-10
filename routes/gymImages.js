const express = require('express');
const router = express.Router();
const {
  uploadGymImage,
  getImagesByGym,
  getAllGymImages,
  getGymImageById,
  updateGymImage,
  deleteGymImage,
  hardDeleteGymImage
} = require('../controllers/gymImageController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkImageOwnership } = require('../middleware/ownership');
const upload = require('../config/multer');

/**
 * @swagger
 * /api/gym-images/gym/{gymId}/upload:
 *   post:
 *     tags: [Gym Images]
 *     summary: Upload gym image
 *     description: Upload an image for a specific gym.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpeg, jpg, png, gif, webp)
 *               title:
 *                 type: string
 *                 description: Image title
 *               createdBy:
 *                 type: string
 *                 description: User who is uploading the image
 *             required:
 *               - image
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input or file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Gym not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/gym/:gymId/upload', authenticate, authorize('3', '2'), checkImageOwnership, upload.single('image'), uploadGymImage);

/**
 * @swagger
 * /api/gym-images:
 *   get:
 *     tags: [Gym Images]
 *     summary: Get all gym images
 *     description: Retrieve a paginated list of gym images.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter active images only
 *     responses:
 *       200:
 *         description: A list of gym images
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 images:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GymImage'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getAllGymImages);

/**
 * @swagger
 * /api/gym-images/gym/{gymId}:
 *   get:
 *     tags: [Gym Images]
 *     summary: Get images by gym ID
 *     description: Retrieve all images for a specific gym.
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter active images only
 *     responses:
 *       200:
 *         description: A list of images for the gym
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GymImage'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/gym/:gymId', getImagesByGym);

/**
 * @swagger
 * /api/gym-images/{id}:
 *   get:
 *     tags: [Gym Images]
 *     summary: Get gym image by ID
 *     description: Retrieve a specific gym image by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GymImage'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getGymImageById);

/**
 * @swagger
 * /api/gym-images/{id}:
 *   put:
 *     tags: [Gym Images]
 *     summary: Update gym image metadata
 *     description: Update gym image title and other metadata.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGymImage'
 *     responses:
 *       200:
 *         description: Image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', authenticate, authorize('3', '2'), checkImageOwnership, updateGymImage);

/**
 * @swagger
 * /api/gym-images/{id}:
 *   delete:
 *     tags: [Gym Images]
 *     summary: Soft delete gym image
 *     description: Soft delete gym image by setting active status to false.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, authorize('3', '2'), checkImageOwnership, deleteGymImage);

/**
 * @swagger
 * /api/gym-images/{id}/permanent:
 *   delete:
 *     tags: [Gym Images]
 *     summary: Permanently delete gym image
 *     description: Permanently delete gym image from database and file system.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id/permanent', authenticate, authorize('3'), checkImageOwnership, hardDeleteGymImage);

module.exports = router;
