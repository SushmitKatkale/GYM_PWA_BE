const express = require('express');
const router = express.Router();
const {
  uploadMealImage,
  deleteMealImage,
  softDeleteMealImage,
  getMealImages,
  getAllMealImages,
  getMealImageById
} = require('../controllers/mealImageController');
const { authenticate } = require('../middleware/auth');
const mealImageUpload = require('../config/mealImageMulter');

/**
 * @swagger
 * /api/meal-images/upload:
 *   post:
 *     tags: [Meal Images]
 *     summary: Upload meal image
 *     description: Upload an image for a meal and store it in the Media table with entity_type 'meal'.
 *     security:
 *       - bearerAuth: []
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
 *               mealId:
 *                 type: string
 *                 description: ID of the meal to associate the image with (optional)
 *               title:
 *                 type: string
 *                 description: Image title/alt text (optional)
 *               type:
 *                 type: string
 *                 default: meal
 *                 description: Type of image (defaults to 'meal')
 *             required:
 *               - image
 *     responses:
 *       201:
 *         description: Meal image uploaded successfully
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/upload', mealImageUpload.single('image'), uploadMealImage);

/**
 * @swagger
 * /api/meal-images/delete:
 *   delete:
 *     tags: [Meal Images]
 *     summary: Delete meal image by URL
 *     description: Permanently delete a meal image by its URL from both database and file system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the image to delete
 *             required:
 *               - imageUrl
 *     responses:
 *       200:
 *         description: Meal image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Image URL is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Meal image not found
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
router.delete('/delete', deleteMealImage);

/**
 * @swagger
 * /api/meal-images/soft-delete:
 *   delete:
 *     tags: [Meal Images]
 *     summary: Soft delete meal image by URL
 *     description: Soft delete a meal image by setting record_status to 0.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the image to soft delete
 *             required:
 *               - imageUrl
 *     responses:
 *       200:
 *         description: Meal image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Image URL is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Meal image not found
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
router.delete('/soft-delete', authenticate, softDeleteMealImage);

/**
 * @swagger
 * /api/meal-images/meal/{mealId}:
 *   get:
 *     tags: [Meal Images]
 *     summary: Get all images for a specific meal
 *     description: Retrieve all images associated with a specific meal from the Media table.
 *     parameters:
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the meal
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Whether to return only active images
 *     responses:
 *       200:
 *         description: Meal images retrieved successfully
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
router.get('/meal/:mealId', getMealImages);

/**
 * @swagger
 * /api/meal-images:
 *   get:
 *     tags: [Meal Images]
 *     summary: Get all meal images with pagination
 *     description: Retrieve all meal images from the Media table with pagination support.
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
 *         description: Meal images retrieved successfully
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
router.get('/', getAllMealImages);

/**
 * @swagger
 * /api/meal-images/{id}:
 *   get:
 *     tags: [Meal Images]
 *     summary: Get meal image by ID
 *     description: Retrieve a specific meal image by its ID from the Media table.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Meal image retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Meal image not found
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
router.get('/:id', getMealImageById);

module.exports = router;
