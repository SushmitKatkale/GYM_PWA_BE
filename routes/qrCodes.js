const express = require('express');
const router = express.Router();
const {
  generateQRCode,
  getGymQRCodes,
  getQRCodeDetails,
  updateQRCode,
  deleteQRCode,
  getQRCodeStats
} = require('../controllers/qrCodeController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/qr-codes/generate:
 *   post:
 *     tags: [QR Codes]
 *     summary: Generate QR code for gym
 *     description: Generate a new QR code for gym check-ins (gym owners and admins only)
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
 *               purpose:
 *                 type: string
 *                 description: Purpose of the QR code
 *                 example: "checkin"
 *                 default: "checkin"
 *               expiresInHours:
 *                 type: number
 *                 description: Hours until QR code expires (null for no expiry)
 *                 example: 24
 *               maxUsage:
 *                 type: integer
 *                 description: Maximum number of times code can be used (null for unlimited)
 *                 example: 100
 *     responses:
 *       201:
 *         description: QR code generated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized to generate QR codes for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.post('/generate', authenticate, authorize('2', '3'), generateQRCode);

/**
 * @swagger
 * /api/qr-codes/gym/{gymId}:
 *   get:
 *     tags: [QR Codes]
 *     summary: Get all QR codes for a gym
 *     description: Retrieve all QR codes for a specific gym (gym owners and admins only)
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
 *         description: Filter active QR codes only
 *     responses:
 *       200:
 *         description: QR codes retrieved successfully
 *       403:
 *         description: Not authorized to view QR codes for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/gym/:gymId', authenticate, authorize('2', '3'), getGymQRCodes);

/**
 * @swagger
 * /api/qr-codes/{qrCode}:
 *   get:
 *     tags: [QR Codes]
 *     summary: Get QR code details
 *     description: Get details of a specific QR code for validation (used during check-in process)
 *     parameters:
 *       - in: path
 *         name: qrCode
 *         required: true
 *         schema:
 *           type: string
 *         description: QR code string
 *     responses:
 *       200:
 *         description: QR code details retrieved successfully
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
 *                     qrCode:
 *                       type: object
 *                       description: QR code details
 *                     isValid:
 *                       type: boolean
 *                       description: Whether QR code is currently valid
 *                     isExpired:
 *                       type: boolean
 *                       description: Whether QR code has expired
 *                     isMaxUsageReached:
 *                       type: boolean
 *                       description: Whether maximum usage has been reached
 *                     remainingUsage:
 *                       type: integer
 *                       description: Remaining usage count (null if unlimited)
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Server error
 */
router.get('/:qrCode', getQRCodeDetails);

/**
 * @swagger
 * /api/qr-codes/{qrCodeId}:
 *   put:
 *     tags: [QR Codes]
 *     summary: Update QR code
 *     description: Update QR code settings (gym owners and admins only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: QR code ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               purpose:
 *                 type: string
 *                 description: Purpose of the QR code
 *                 example: "checkin"
 *               expiresInHours:
 *                 type: number
 *                 description: Hours until QR code expires (0 to remove expiry)
 *                 example: 24
 *               maxUsage:
 *                 type: integer
 *                 description: Maximum number of times code can be used
 *                 example: 100
 *               isActive:
 *                 type: boolean
 *                 description: Whether QR code is active
 *                 example: true
 *     responses:
 *       200:
 *         description: QR code updated successfully
 *       403:
 *         description: Not authorized to update this QR code
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Server error
 */
router.put('/:qrCodeId', authenticate, authorize('2', '3'), updateQRCode);

/**
 * @swagger
 * /api/qr-codes/{qrCodeId}:
 *   delete:
 *     tags: [QR Codes]
 *     summary: Delete (deactivate) QR code
 *     description: Deactivate a QR code (gym owners and admins only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: QR code ID
 *     responses:
 *       200:
 *         description: QR code deactivated successfully
 *       403:
 *         description: Not authorized to delete this QR code
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Server error
 */
router.delete('/:qrCodeId', authenticate, authorize('2', '3'), deleteQRCode);

/**
 * @swagger
 * /api/qr-codes/stats/{gymId}:
 *   get:
 *     tags: [QR Codes]
 *     summary: Get QR code usage statistics
 *     description: Get usage statistics for all QR codes of a gym (gym owners and admins only)
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
 *         description: QR code statistics retrieved successfully
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
 *                         totalQRCodes:
 *                           type: integer
 *                         activeQRCodes:
 *                           type: integer
 *                         totalUsage:
 *                           type: integer
 *                         expiredQRCodes:
 *                           type: integer
 *                         mostUsed:
 *                           type: object
 *                     qrCodes:
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
router.get('/stats/:gymId', authenticate, authorize('2', '3'), getQRCodeStats);

module.exports = router;
