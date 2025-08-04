const express = require('express');
const router = express.Router();
const {
  createGym,
  getAllGyms,
  getGymById,
  updateGym,
  deleteGym,
  getPublicGyms
} = require('../controllers/gymController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkGymOwnership } = require('../middleware/ownership');

/**
 * @swagger
 * /api/gyms:
 *   post:
 *     tags: [Gyms]
 *     summary: Create a new gym
 *     description: Create a new gym with all the required details.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGym'
 *     responses:
 *       201:
 *         description: Gym created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input
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
// Admin and Owner can create gyms (type='3' or type='2')
router.post('/', authenticate, authorize('3', '2'), createGym);

/**
 * @swagger
 * /api/gyms:
 *   get:
 *     tags: [Gyms]
 *     summary: Get all gyms
 *     description: Retrieve a paginated list of gyms with optional search and filters. Owners see only their gyms, Admins see all gyms.
 *     security:
 *       - bearerAuth: []
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search string
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter active gyms only
 *     responses:
 *       200:
 *         description: A list of gyms with role-based filtering
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gyms:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Gym'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Admin and Owner can view gyms (with ownership filtering)
router.get('/', authenticate, authorize('3', '2'), getAllGyms);

/**
 * @swagger
 * /api/gyms/{id}:
 *   get:
 *     tags: [Gyms]
 *     summary: Get gym by ID
 *     description: Retrieve a specific gym by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     responses:
 *       200:
 *         description: Gym details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gym'
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
router.get('/:id', getGymById);

/**
 * @swagger
 * /api/gyms/{id}:
 *   put:
 *     tags: [Gyms]
 *     summary: Update gym
 *     description: Update gym details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGym'
 *     responses:
 *       200:
 *         description: Gym updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid input
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
// Admin and Owner can update gyms (with ownership check)
router.put('/:id', authenticate, authorize('3', '2'), checkGymOwnership, updateGym);

/**
 * @swagger
 * /api/gyms/{id}:
 *   delete:
 *     tags: [Gyms]
 *     summary: Delete gym
 *     description: Soft delete gym by setting active status to false.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     responses:
 *       200:
 *         description: Gym deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
// Admin and Owner can delete gyms (with ownership check)
router.delete('/:id', authenticate, authorize('3', '2'), checkGymOwnership, deleteGym);

/**
 * @swagger
 * /api/gyms/public/discover:
 *   get:
 *     tags: [Public Gyms]
 *     summary: Get public gyms for discovery
 *     description: Retrieve gyms for public discovery with location-based filtering and sorting. No authentication required.
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: User's latitude for distance calculation
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: User's longitude for distance calculation
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 50
 *         description: Search radius in kilometers
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *         description: Minimum rating filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: amenities
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by amenities
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [distance, rating, price, name]
 *           default: distance
 *         description: Sort criteria
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
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
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of gyms for discovery
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     gyms:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Gym'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Public gym discovery endpoint - no authentication required
router.get('/public/discover', getPublicGyms);

module.exports = router;
