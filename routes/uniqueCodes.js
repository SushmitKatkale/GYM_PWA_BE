const express = require('express');
const router = express.Router();
const {
  generateUniqueCode,
  getGymUniqueCodes,
  getUniqueCodeDetails,
  updateUniqueCode,
  deleteUniqueCode,
  getUniqueCodeStats,
  bulkGenerateUniqueCodes
} = require('../controllers/uniqueCodeController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/unique-codes/generate:
 *   post:
 *     tags: [Unique Codes]
 *     summary: Generate unique code for gym
 *     description: Generate a new unique access code for gym check-ins (gym owners and admins only)
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
 *             properties:
 *               gymId:
 *                 type: integer
 *                 description: ID of the gym
 *                 example: 1
 *               codeLength:
 *                 type: integer
 *                 description: Length of the generated code (4-10 characters)
 *                 example: 6
 *                 default: 6
 *               expiresInHours:
 *                 type: number
 *                 description: Hours until code expires (null for no expiry)
 *                 example: 24
 *               maxUsage:
 *                 type: integer
 *                 description: Maximum number of times code can be used (null for unlimited)
 *                 example: 100
 *               customCode:
 *                 type: string
 *                 description: Custom code to use instead of random generation (4-10 alphanumeric)
 *                 example: "GYM123"
 *     responses:
 *       201:
 *         description: Unique code generated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized to generate codes for this gym
 *       404:
 *         description: Gym not found
 *       409:
 *         description: Custom code already exists
 *       500:
 *         description: Server error
 */
router.post('/generate', authenticate, authorize('2', '3'), generateUniqueCode);

/**
 * @swagger
 * /api/unique-codes/bulk-generate:
 *   post:
 *     tags: [Unique Codes]
 *     summary: Bulk generate unique codes for gym
 *     description: Generate multiple unique access codes at once (gym owners and admins only)
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
 *             properties:
 *               gymId:
 *                 type: integer
 *                 description: ID of the gym
 *                 example: 1
 *               count:
 *                 type: integer
 *                 description: Number of codes to generate (max 100)
 *                 example: 10
 *                 default: 10
 *               codeLength:
 *                 type: integer
 *                 description: Length of each generated code (4-10 characters)
 *                 example: 6
 *                 default: 6
 *               expiresInHours:
 *                 type: number
 *                 description: Hours until codes expire (null for no expiry)
 *                 example: 24
 *               maxUsage:
 *                 type: integer
 *                 description: Maximum number of times each code can be used (null for unlimited)
 *                 example: 100
 *     responses:
 *       201:
 *         description: Unique codes generated successfully
 *       400:
 *         description: Invalid input or count too high
 *       403:
 *         description: Not authorized to generate codes for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.post('/bulk-generate', authenticate, authorize('2', '3'), bulkGenerateUniqueCodes);

/**
 * @swagger
 * /api/unique-codes/gym/{gymId}:
 *   get:
 *     tags: [Unique Codes]
 *     summary: Get all unique codes for a gym
 *     description: Retrieve all unique codes for a specific gym (gym owners and admins only)
 *     security:
 *       - bearerAuth: []
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
 *         description: Items per page
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter active codes only
 *     responses:
 *       200:
 *         description: Unique codes retrieved successfully
 *       403:
 *         description: Not authorized to view codes for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/gym/:gymId', authenticate, authorize('2', '3'), getGymUniqueCodes);

/**
 * @swagger
 * /api/unique-codes/{uniqueCode}:
 *   get:
 *     tags: [Unique Codes]
 *     summary: Get unique code details
 *     description: Get details of a specific unique code for validation (used during check-in process)
 *     parameters:
 *       - in: path
 *         name: uniqueCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique code string
 *     responses:
 *       200:
 *         description: Unique code details retrieved successfully
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
 *                     uniqueCode:
 *                       type: object
 *                       description: Unique code details
 *                     isValid:
 *                       type: boolean
 *                       description: Whether code is currently valid
 *                     isExpired:
 *                       type: boolean
 *                       description: Whether code has expired
 *                     isMaxUsageReached:
 *                       type: boolean
 *                       description: Whether maximum usage has been reached
 *                     remainingUsage:
 *                       type: integer
 *                       description: Remaining usage count (null if unlimited)
 *       404:
 *         description: Unique code not found
 *       500:
 *         description: Server error
 */
router.get('/:uniqueCode', getUniqueCodeDetails);

/**
 * @swagger
 * /api/unique-codes/{uniqueCodeId}:
 *   put:
 *     tags: [Unique Codes]
 *     summary: Update unique code
 *     description: Update unique code settings (gym owners and admins only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueCodeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique code ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresInHours:
 *                 type: number
 *                 description: Hours until code expires (0 to remove expiry)
 *                 example: 24
 *               maxUsage:
 *                 type: integer
 *                 description: Maximum number of times code can be used
 *                 example: 100
 *               isActive:
 *                 type: boolean
 *                 description: Whether code is active
 *                 example: true
 *     responses:
 *       200:
 *         description: Unique code updated successfully
 *       403:
 *         description: Not authorized to update this code
 *       404:
 *         description: Unique code not found
 *       500:
 *         description: Server error
 */
router.put('/:uniqueCodeId', authenticate, authorize('2', '3'), updateUniqueCode);

/**
 * @swagger
 * /api/unique-codes/{uniqueCodeId}:
 *   delete:
 *     tags: [Unique Codes]
 *     summary: Delete (deactivate) unique code
 *     description: Deactivate a unique code (gym owners and admins only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueCodeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique code ID
 *     responses:
 *       200:
 *         description: Unique code deactivated successfully
 *       403:
 *         description: Not authorized to delete this code
 *       404:
 *         description: Unique code not found
 *       500:
 *         description: Server error
 */
router.delete('/:uniqueCodeId', authenticate, authorize('2', '3'), deleteUniqueCode);

/**
 * @swagger
 * /api/unique-codes/stats/{gymId}:
 *   get:
 *     tags: [Unique Codes]
 *     summary: Get unique code usage statistics
 *     description: Get usage statistics for all unique codes of a gym (gym owners and admins only)
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
 *         description: Unique code statistics retrieved successfully
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalUniqueCodes:
 *                           type: integer
 *                         activeUniqueCodes:
 *                           type: integer
 *                         totalUsage:
 *                           type: integer
 *                         expiredUniqueCodes:
 *                           type: integer
 *                         mostUsed:
 *                           type: object
 *                     uniqueCodes:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Not authorized to view statistics for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/stats/:gymId', authenticate, authorize('2', '3'), getUniqueCodeStats);

module.exports = router;
