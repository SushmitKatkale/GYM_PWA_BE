const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeOwner } = require('../middleware/roleAuth');
const OwnerTrainerController = require('../controllers/ownerTrainerController');

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(authorizeOwner); // Only owners can access these routes

/**
 * @swagger
 * /api/owner/trainers/invite:
 *   post:
 *     summary: Invite a trainer to join gym
 *     tags: [Owner - Trainers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Trainer's email address
 *             example:
 *               email: "trainer@example.com"
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Trainer invitation sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     invited_at:
 *                       type: string
 *                       format: date-time
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request (invalid email, duplicate invitation, etc.)
 *       404:
 *         description: No gym found for owner
 *       500:
 *         description: Server error
 */
router.post('/invite', OwnerTrainerController.inviteTrainer);

/**
 * @swagger
 * /api/owner/trainers:
 *   get:
 *     summary: Get all trainers for owner's gym
 *     tags: [Owner - Trainers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, inactive, declined]
 *         description: Filter by trainer status
 *     responses:
 *       200:
 *         description: List of trainers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                     trainers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           email:
 *                             type: string
 *                           status:
 *                             type: string
 *                           invited_at:
 *                             type: string
 *                             format: date-time
 *                           joined_at:
 *                             type: string
 *                             format: date-time
 *                           trainer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                     grouped:
 *                       type: object
 *                       properties:
 *                         active:
 *                           type: array
 *                         pending:
 *                           type: array
 *                         inactive:
 *                           type: array
 *                         declined:
 *                           type: array
 *                     counts:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         inactive:
 *                           type: integer
 *                         declined:
 *                           type: integer
 *       404:
 *         description: No gym found for owner
 *       500:
 *         description: Server error
 */
router.get('/', OwnerTrainerController.getGymTrainers);

/**
 * @swagger
 * /api/owner/trainers/{trainerId}/status:
 *   put:
 *     summary: Update trainer status (activate/deactivate)
 *     tags: [Owner - Trainers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trainerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Trainer assignment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: New status for the trainer
 *             example:
 *               status: "active"
 *     responses:
 *       200:
 *         description: Trainer status updated successfully
 *       400:
 *         description: Invalid status or cannot update pending invitations
 *       404:
 *         description: Trainer not found
 *       500:
 *         description: Server error
 */
router.put('/:trainerId/status', OwnerTrainerController.updateTrainerStatus);

/**
 * @swagger
 * /api/owner/trainers/{trainerId}/resend:
 *   post:
 *     summary: Resend trainer invitation
 *     tags: [Owner - Trainers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trainerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Trainer assignment ID
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *       404:
 *         description: Pending invitation not found
 *       500:
 *         description: Server error
 */
router.post('/:trainerId/resend', OwnerTrainerController.resendInvitation);

/**
 * @swagger
 * /api/owner/trainers/{trainerId}:
 *   delete:
 *     summary: Remove trainer from gym
 *     tags: [Owner - Trainers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trainerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Trainer assignment ID
 *     responses:
 *       200:
 *         description: Trainer removed successfully
 *       404:
 *         description: Trainer not found
 *       500:
 *         description: Server error
 */
router.delete('/:trainerId', OwnerTrainerController.removeTrainer);

module.exports = router;