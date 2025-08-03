const express = require('express');
const router = express.Router();
const {
  createAmenity,
  getAmenitiesByGym,
  getAllAmenities,
  getAmenityById,
  updateAmenity,
  deleteAmenity
} = require('../controllers/amenityController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/amenities:
 *   post:
 *     tags: [Amenities]
 *     summary: Create a new amenity
 *     description: Create a new amenity for a specific gym.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAmenity'
 *     responses:
 *       201:
 *         description: Amenity created successfully
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
router.post('/', authenticate, authorize(['admin', 'owner']), createAmenity);

/**
 * @swagger
 * /api/amenities:
 *   get:
 *     tags: [Amenities]
 *     summary: Get all amenities
 *     description: Retrieve a paginated list of amenities with optional search.
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
 *         description: Filter active amenities only
 *     responses:
 *       200:
 *         description: A list of amenities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 amenities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Amenity'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getAllAmenities);

/**
 * @swagger
 * /api/amenities/gym/{gymId}:
 *   get:
 *     tags: [Amenities]
 *     summary: Get amenities by gym ID
 *     description: Retrieve all amenities for a specific gym.
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
 *         description: Filter active amenities only
 *     responses:
 *       200:
 *         description: A list of amenities for the gym
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Amenity'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/gym/:gymId', getAmenitiesByGym);

/**
 * @swagger
 * /api/amenities/{id}:
 *   get:
 *     tags: [Amenities]
 *     summary: Get amenity by ID
 *     description: Retrieve a specific amenity by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Amenity ID
 *     responses:
 *       200:
 *         description: Amenity details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Amenity'
 *       404:
 *         description: Amenity not found
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
router.get('/:id', getAmenityById);

/**
 * @swagger
 * /api/amenities/{id}:
 *   put:
 *     tags: [Amenities]
 *     summary: Update amenity
 *     description: Update amenity details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Amenity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAmenity'
 *     responses:
 *       200:
 *         description: Amenity updated successfully
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
 *         description: Amenity not found
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
router.put('/:id', authenticate, authorize(['admin', 'owner']), updateAmenity);

/**
 * @swagger
 * /api/amenities/{id}:
 *   delete:
 *     tags: [Amenities]
 *     summary: Delete amenity
 *     description: Soft delete amenity by setting active status to false.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Amenity ID
 *     responses:
 *       200:
 *         description: Amenity deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Amenity not found
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
router.delete('/:id', authenticate, authorize(['admin', 'owner']), deleteAmenity);

module.exports = router;
