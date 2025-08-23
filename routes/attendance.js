const express = require('express');
const router = express.Router();
const {
  quickCheckIn,
  qrCodeCheckIn,
  uniqueCodeCheckIn,
  ownerScanCheckIn,
  checkOut,
  getCheckInStatus,
  validateLocation,
  getUserAttendance,
  getActiveSession
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/attendance/quick-checkin:
 *   post:
 *     tags: [Attendance]
 *     summary: Quick check-in using location
 *     description: Check in to a nearby gym based on user location and subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: User's current latitude
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 description: User's current longitude
 *                 example: -74.0060
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *                 example: 10
 *     responses:
 *       201:
 *         description: Successfully checked in
 *       400:
 *         description: Invalid input or validation error
 *       404:
 *         description: No nearby gyms found
 *       409:
 *         description: Already checked in somewhere
 *       500:
 *         description: Server error
 */
router.post('/quick-checkin', authenticate, authorize('1'), quickCheckIn);

/**
 * @swagger
 * /api/attendance/qr-checkin:
 *   post:
 *     tags: [Attendance]
 *     summary: Check-in using gym QR code
 *     description: Check in to a gym using a valid QR code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCode
 *             properties:
 *               qrCode:
 *                 type: string
 *                 description: The gym's QR code
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               latitude:
 *                 type: number
 *                 description: User's current latitude (required if location validation is enabled)
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 description: User's current longitude (required if location validation is enabled)
 *                 example: -74.0060
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *                 example: 10
 *     responses:
 *       201:
 *         description: Successfully checked in using QR code
 *       400:
 *         description: Invalid QR code or validation error
 *       404:
 *         description: QR code not found or expired
 *       409:
 *         description: Already checked in somewhere
 *       500:
 *         description: Server error
 */
router.post('/qr-checkin', authenticate, authorize('1'), qrCodeCheckIn);

/**
 * @swagger
 * /api/attendance/code-checkin:
 *   post:
 *     tags: [Attendance]
 *     summary: Check-in using gym unique code
 *     description: Check in to a gym using a valid unique access code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uniqueCode
 *             properties:
 *               uniqueCode:
 *                 type: string
 *                 description: The gym's unique access code
 *                 example: "ABC123"
 *               latitude:
 *                 type: number
 *                 description: User's current latitude (required if location validation is enabled)
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 description: User's current longitude (required if location validation is enabled)
 *                 example: -74.0060
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *                 example: 10
 *     responses:
 *       201:
 *         description: Successfully checked in using unique code
 *       400:
 *         description: Invalid unique code or validation error
 *       404:
 *         description: Unique code not found or expired
 *       409:
 *         description: Already checked in somewhere
 *       500:
 *         description: Server error
 */
router.post('/code-checkin', authenticate, authorize('1'), uniqueCodeCheckIn);

/**
 * @swagger
 * /api/attendance/owner-scan:
 *   post:
 *     tags: [Attendance]
 *     summary: Owner scan user QR for check-in
 *     description: Gym owners can scan user QR codes to check them in
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userQRCode
 *               - gymId
 *             properties:
 *               userQRCode:
 *                 type: string
 *                 description: The user's QR code (typically their email)
 *                 example: "user@example.com"
 *               gymId:
 *                 type: integer
 *                 description: The gym ID where user is checking in
 *                 example: 1
 *     responses:
 *       201:
 *         description: Successfully checked in user via owner scan
 *       400:
 *         description: Invalid input or validation error
 *       403:
 *         description: Not authorized to check in users to this gym
 *       404:
 *         description: User or gym not found
 *       409:
 *         description: User already checked in somewhere
 *       500:
 *         description: Server error
 */
router.post('/owner-scan', authenticate, authorize('2', '3'), ownerScanCheckIn);

/**
 * @swagger
 * /api/attendance/checkout:
 *   post:
 *     tags: [Attendance]
 *     summary: Check out from gym
 *     description: Check out from current gym session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attendanceId:
 *                 type: integer
 *                 description: Specific attendance ID to check out (optional, defaults to user's active check-in)
 *                 example: 123
 *               latitude:
 *                 type: number
 *                 description: User's current latitude
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 description: User's current longitude
 *                 example: -74.0060
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *                 example: 10
 *     responses:
 *       200:
 *         description: Successfully checked out
 *       403:
 *         description: Not authorized to check out this attendance
 *       404:
 *         description: No active check-in found
 *       500:
 *         description: Server error
 */
router.post('/checkout', authenticate, authorize('1', '2', '3'), checkOut);

/**
 * @swagger
 * /api/attendance/status:
 *   get:
 *     tags: [Attendance]
 *     summary: Get current check-in status
 *     description: Get user's current check-in status and active session details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-in status retrieved successfully
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
 *                     isCheckedIn:
 *                       type: boolean
 *                       description: Whether user is currently checked in
 *                     attendance:
 *                       type: object
 *                       description: Current attendance details (if checked in)
 *                     currentDuration:
 *                       type: string
 *                       description: Current session duration (if checked in)
 *       500:
 *         description: Server error
 */
router.get('/status', authenticate, authorize('1'), getCheckInStatus);

/**
 * @swagger
 * /api/attendance/validate-location:
 *   post:
 *     tags: [Attendance]
 *     summary: Validate location for gym check-in
 *     description: Validate if user's location is within acceptable range for gym check-in
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - gymId
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: User's current latitude
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 description: User's current longitude
 *                 example: -74.0060
 *               gymId:
 *                 type: integer
 *                 description: Gym ID to validate location against
 *                 example: 1
 *     responses:
 *       200:
 *         description: Location validation completed
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
 *                     isValid:
 *                       type: boolean
 *                       description: Whether location is valid for check-in
 *                     distance:
 *                       type: number
 *                       description: Distance from gym in meters
 *                     accuracy:
 *                       type: string
 *                       description: Location accuracy assessment
 *       400:
 *         description: Invalid input or coordinates
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.post('/validate-location', authenticate, validateLocation);

/**
 * @swagger
 * /api/attendance/user/{userId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get user's attendance history
 *     description: Get attendance history for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID or email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User attendance retrieved successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', authenticate, authorize('1', '2', '3'), getUserAttendance);

/**
 * @swagger
 * /api/attendance/active-session/{userId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get user's active session
 *     description: Get the current active session for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID or email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active session retrieved successfully
 *       404:
 *         description: User not found or no active session
 *       500:
 *         description: Server error
 */
router.get('/active-session/:userId', authenticate, authorize('1', '2', '3'), getActiveSession);

module.exports = router;
