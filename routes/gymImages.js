const express = require('express');
const router = express.Router();
const {
  uploadGymImage,
  uploadGymImageGeneral,
  getImagesByGym,
  getAllGymImages,
  getGymImageById,
  updateGymImage,
  deleteGymImage,
  hardDeleteGymImage
} = require('../controllers/gymImageController');
const { authenticate } = require('../middleware/auth');
const upload = require('../config/multer');

/**
 * @swagger
 * /api/gym-images/gym/{gymId}/upload:
 *   post:
 *     tags: [Gym Images]
 *     summary: Upload image for a specific gym
 *     description: Upload an image and associate it with a specific gym ID in the Media table.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the gym to associate the image with
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
 *                 description: Image title/alt text
 *               createdBy:
 *                 type: string
 *                 description: User ID who is uploading the image
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
router.post('/gym/:gymId/upload', authenticate, upload.single('image'), uploadGymImage);

/**
 * @swagger
 * /api/gym-images/gym/{gymId}:
 *   get:
 *     tags: [Gym Images]
 *     summary: Get all images for a specific gym
 *     description: Retrieve all images associated with a specific gym from the Media table.
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the gym
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Whether to return only active images
 *     responses:
 *       200:
 *         description: Images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
 * /api/gym-images:
 *   get:
 *     tags: [Gym Images]
 *     summary: Get all gym images with pagination
 *     description: Retrieve all gym images from the Media table with pagination support.
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
 *         description: Number of items per page
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Whether to return only active images
 *     responses:
 *       200:
 *         description: Images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
 * /api/gym-images/{id}:
 *   get:
 *     tags: [Gym Images]
 *     summary: Get gym image by ID
 *     description: Retrieve a specific gym image by its ID from the Media table.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image retrieved successfully
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
router.get('/:id', getGymImageById);

/**
 * @swagger
 * /api/gym-images/{id}:
 *   put:
 *     tags: [Gym Images]
 *     summary: Update gym image metadata
 *     description: Update metadata for a gym image in the Media table.
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New image title/alt text
 *               updatedBy:
 *                 type: string
 *                 description: User ID who is updating the image
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
router.put('/:id', authenticate, updateGymImage);

/**
 * @swagger
 * /api/gym-images/{id}:
 *   delete:
 *     tags: [Gym Images]
 *     summary: Soft delete gym image
 *     description: Soft delete a gym image (set record_status to 0) in the Media table.
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updatedBy:
 *                 type: string
 *                 description: User ID who is deleting the image
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
router.delete('/:id', authenticate, deleteGymImage);

/**
 * @swagger
 * /api/gym-images/{id}/hard-delete:
 *   delete:
 *     tags: [Gym Images]
 *     summary: Hard delete gym image
 *     description: Permanently delete a gym image from both database and file system.
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
router.delete('/:id/hard-delete', authenticate, hardDeleteGymImage);

module.exports = router;
