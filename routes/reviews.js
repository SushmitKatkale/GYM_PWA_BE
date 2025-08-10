const express = require('express');
const { createReview, getGymReviews, getUserReviews, updateReview, deleteReview, getGymRatingStats, canUserReview, reviewValidation, reviewUpdateValidation } = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - gymId
 *         - rating
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated review ID
 *         gymId:
 *           type: integer
 *           description: ID of the gym being reviewed
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Rating given to the gym (1-5)
 *         comment:
 *           type: string
 *           maxLength: 1000
 *           description: Optional review comment
 *         userName:
 *           type: string
 *           description: Name of the reviewer
 *         userAvatar:
 *           type: string
 *           description: Avatar URL of the reviewer
 *         createTimestamp:
 *           type: string
 *           format: date-time
 *           description: When the review was created
 *       example:
 *         id: 1
 *         gymId: 1
 *         rating: 4.5
 *         comment: "Great gym with excellent equipment!"
 *         userName: "John Doe"
 *         userAvatar: "https://example.com/avatar.jpg"
 *         createTimestamp: "2024-01-15T10:30:00Z"
 * 
 *     ReviewStats:
 *       type: object
 *       properties:
 *         averageRating:
 *           type: number
 *           description: Average rating of the gym
 *         totalReviews:
 *           type: integer
 *           description: Total number of reviews
 *         ratingDistribution:
 *           type: object
 *           properties:
 *             5:
 *               type: integer
 *             4:
 *               type: integer
 *             3:
 *               type: integer
 *             2:
 *               type: integer
 *             1:
 *               type: integer
 *           description: Distribution of ratings
 */

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Gym review management
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gymId
 *               - rating
 *             properties:
 *               gymId:
 *                 type: integer
 *                 description: ID of the gym to review
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating (1-5)
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional review comment
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error or user already reviewed
 *       403:
 *         description: User needs active subscription to review
 *       401:
 *         description: Authentication required
 */
router.post('/', authMiddleware, reviewValidation, createReview);

/**
 * @swagger
 * /api/reviews/gym/{gymId}:
 *   get:
 *     summary: Get reviews for a specific gym
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
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
 *         description: Number of reviews per page
 *     responses:
 *       200:
 *         description: Gym reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalReviews:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *                         limit:
 *                           type: integer
 *                     stats:
 *                       $ref: '#/components/schemas/ReviewStats'
 */
router.get('/gym/:gymId', getGymReviews);

/**
 * @swagger
 * /api/reviews/user:
 *   get:
 *     summary: Get current user's reviews
 *     tags: [Reviews]
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
 *     responses:
 *       200:
 *         description: User reviews retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/user', authMiddleware, getUserReviews);

/**
 * @swagger
 * /api/reviews/gym/{gymId}/stats:
 *   get:
 *     summary: Get gym rating statistics
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     responses:
 *       200:
 *         description: Gym rating statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReviewStats'
 */
router.get('/gym/:gymId/stats', getGymRatingStats);

/**
 * @swagger
 * /api/reviews/gym/{gymId}/can-review:
 *   get:
 *     summary: Check if user can review a gym
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     responses:
 *       200:
 *         description: Review eligibility checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     canReview:
 *                       type: boolean
 *       401:
 *         description: Authentication required
 */
router.get('/gym/:gymId/can-review', authMiddleware, canUserReview);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Validation error or review not found
 *       401:
 *         description: Authentication required
 */
router.put('/:reviewId', authMiddleware, reviewUpdateValidation, updateReview);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       400:
 *         description: Review not found or permission denied
 *       401:
 *         description: Authentication required
 */
router.delete('/:reviewId', authMiddleware, deleteReview);

module.exports = router;
