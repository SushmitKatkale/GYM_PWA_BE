const express = require('express');
const router = express.Router();
const {
  getGymCheckInMethods,
  updateGymCheckInMethods,
  getAvailableCheckInMethods,
  resetGymCheckInMethods,
  validateCheckInConfiguration
} = require('../controllers/checkInMethodsController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/checkin-methods/{gymId}:
 *   get:
 *     tags: [Check-in Methods]
 *     summary: Get gym check-in methods configuration
 *     description: Get check-in methods configuration for a gym (gym owners and admins only)
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
 *         description: Check-in methods configuration retrieved successfully
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
 *                     quickCheckInEnabled:
 *                       type: boolean
 *                     qrCodeEnabled:
 *                       type: boolean
 *                     uniqueCodeEnabled:
 *                       type: boolean
 *                     ownerScanEnabled:
 *                       type: boolean
 *                     biometricEnabled:
 *                       type: boolean
 *                     checkInRadius:
 *                       type: integer
 *                     qrCodeLocationRequired:
 *                       type: boolean
 *                     uniqueCodeLocationRequired:
 *                       type: boolean
 *                     allowSimultaneousCheckIns:
 *                       type: boolean
 *                     maxCheckInDuration:
 *                       type: integer
 *                     autoCheckOut:
 *                       type: boolean
 *                     locationAccuracyRequired:
 *                       type: integer
 *                     notifications:
 *                       type: object
 *       403:
 *         description: Not authorized to view check-in methods for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/:gymId', authenticate, authorize('2', '3'), getGymCheckInMethods);

/**
 * @swagger
 * /api/checkin-methods/{gymId}:
 *   put:
 *     tags: [Check-in Methods]
 *     summary: Update gym check-in methods configuration
 *     description: Update check-in methods configuration for a gym (gym owners and admins only)
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quickCheckInEnabled:
 *                 type: boolean
 *                 description: Enable quick check-in using location
 *                 example: true
 *               qrCodeEnabled:
 *                 type: boolean
 *                 description: Enable QR code check-in
 *                 example: true
 *               uniqueCodeEnabled:
 *                 type: boolean
 *                 description: Enable unique code check-in
 *                 example: true
 *               ownerScanEnabled:
 *                 type: boolean
 *                 description: Enable owner scan check-in
 *                 example: true
 *               biometricEnabled:
 *                 type: boolean
 *                 description: Enable biometric check-in (future feature)
 *                 example: false
 *               checkInRadius:
 *                 type: integer
 *                 description: Check-in radius in meters (10-1000)
 *                 example: 100
 *               qrCodeLocationRequired:
 *                 type: boolean
 *                 description: Require location validation for QR code check-ins
 *                 example: true
 *               uniqueCodeLocationRequired:
 *                 type: boolean
 *                 description: Require location validation for unique code check-ins
 *                 example: true
 *               allowSimultaneousCheckIns:
 *                 type: boolean
 *                 description: Allow users to be checked in to multiple gyms
 *                 example: false
 *               maxCheckInDuration:
 *                 type: integer
 *                 description: Maximum check-in duration in minutes (60-1440)
 *                 example: 480
 *               autoCheckOut:
 *                 type: boolean
 *                 description: Automatically check out users after max duration
 *                 example: true
 *               locationAccuracyRequired:
 *                 type: integer
 *                 description: Required location accuracy in meters (5-500)
 *                 example: 50
 *               notifications:
 *                 type: object
 *                 description: Notification preferences
 *                 properties:
 *                   checkInNotification:
 *                     type: boolean
 *                   checkOutNotification:
 *                     type: boolean
 *                   occupancyAlerts:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Check-in methods configuration updated successfully
 *       400:
 *         description: Invalid input or validation error
 *       403:
 *         description: Not authorized to update check-in methods for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.put('/:gymId', authenticate, authorize('2', '3'), updateGymCheckInMethods);

/**
 * @swagger
 * /api/checkin-methods/available/{gymId}:
 *   get:
 *     tags: [Check-in Methods]
 *     summary: Get available check-in methods for a gym
 *     description: Get available check-in methods for a gym (public endpoint for users to see what methods are enabled)
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     responses:
 *       200:
 *         description: Available check-in methods retrieved successfully
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
 *                     gym:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         address:
 *                           type: string
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     methods:
 *                       type: object
 *                       properties:
 *                         quickCheckInEnabled:
 *                           type: boolean
 *                         qrCodeEnabled:
 *                           type: boolean
 *                         uniqueCodeEnabled:
 *                           type: boolean
 *                         ownerScanEnabled:
 *                           type: boolean
 *                         biometricEnabled:
 *                           type: boolean
 *                         checkInRadius:
 *                           type: integer
 *                         qrCodeLocationRequired:
 *                           type: boolean
 *                         uniqueCodeLocationRequired:
 *                           type: boolean
 *                         allowSimultaneousCheckIns:
 *                           type: boolean
 *                         locationAccuracyRequired:
 *                           type: integer
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/available/:gymId', getAvailableCheckInMethods);

/**
 * @swagger
 * /api/checkin-methods/reset/{gymId}:
 *   post:
 *     tags: [Check-in Methods]
 *     summary: Reset check-in methods to defaults
 *     description: Reset gym check-in methods configuration to default settings (gym owners and admins only)
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
 *         description: Check-in methods configuration reset to defaults successfully
 *       403:
 *         description: Not authorized to reset check-in methods for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.post('/reset/:gymId', authenticate, authorize('2', '3'), resetGymCheckInMethods);

/**
 * @swagger
 * /api/checkin-methods/validate/{gymId}:
 *   get:
 *     tags: [Check-in Methods]
 *     summary: Validate check-in configuration
 *     description: Validate gym check-in methods configuration and get recommendations (gym owners and admins only)
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
 *         description: Configuration validation completed
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
 *                       description: Whether configuration is valid
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Configuration warnings
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Configuration recommendations
 *                     configuration:
 *                       type: object
 *                       description: Current configuration details
 *       403:
 *         description: Not authorized to validate configuration for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/validate/:gymId', authenticate, authorize('2', '3'), validateCheckInConfiguration);

module.exports = router;
