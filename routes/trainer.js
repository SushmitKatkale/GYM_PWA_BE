const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeTrainer } = require('../middleware/roleAuth');
const TrainerController = require('../controllers/trainerController');

/**
 * @swagger
 * /api/trainers/invitation/{token}:
 *   get:
 *     summary: Get invitation details by token (public)
 *     tags: [Trainers]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *     responses:
 *       200:
 *         description: Invitation details
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
 *                     invitation:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         email:
 *                           type: string
 *                         status:
 *                           type: string
 *                         invited_at:
 *                           type: string
 *                           format: date-time
 *                         expires_at:
 *                           type: string
 *                           format: date-time
 *                         canAccept:
 *                           type: boolean
 *                     gym:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         address:
 *                           type: string
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         capacity:
 *                           type: integer
 *                     inviter:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *       400:
 *         description: Invitation expired or invalid status
 *       404:
 *         description: Invalid invitation token
 *       500:
 *         description: Server error
 */
router.get('/invitation/:token', TrainerController.getInvitationDetails);

/**
 * @swagger
 * /api/trainers/accept-invitation:
 *   get:
 *     summary: Accept trainer invitation via email link (public)
 *     tags: [Trainers]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token from email
 *     responses:
 *       302:
 *         description: Redirects to frontend with success/error message
 *       400:
 *         description: Invalid or expired invitation
 *       404:
 *         description: Invitation not found
 */
router.get('/accept-invitation', TrainerController.acceptInvitationFromEmail);

/**
 * @swagger
 * /api/trainers/accept-invitation:
 *   post:
 *     summary: Accept trainer invitation
 *     tags: [Trainers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Invitation token
 *             example:
 *               token: "abc123def456ghi789"
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
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
 *                   example: "Invitation accepted successfully! You are now a trainer for this gym."
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
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                     assignment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         status:
 *                           type: string
 *                         joined_at:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Cannot accept invitation (expired, already accepted, email mismatch, etc.)
 *       403:
 *         description: Only trainers can accept invitations
 *       404:
 *         description: Invalid invitation token
 *       500:
 *         description: Server error
 */
router.post('/accept-invitation', authenticate, TrainerController.acceptInvitation);

/**
 * @swagger
 * /api/trainers/decline-invitation:
 *   post:
 *     summary: Decline trainer invitation
 *     tags: [Trainers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Invitation token
 *               reason:
 *                 type: string
 *                 description: Optional reason for declining
 *             example:
 *               token: "abc123def456ghi789"
 *               reason: "Not available at this time"
 *     responses:
 *       200:
 *         description: Invitation declined successfully
 *       400:
 *         description: Invitation already processed
 *       404:
 *         description: Invalid invitation token
 *       500:
 *         description: Server error
 */
router.post('/decline-invitation', TrainerController.declineInvitation);

// Protected trainer routes (require authentication and trainer role)
router.use(authenticate);
router.use(authorizeTrainer);

/**
 * @swagger
 * /api/trainers/my-gyms:
 *   get:
 *     summary: Get trainer's assigned gyms
 *     tags: [Trainers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned gyms
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
 *                     totalGyms:
 *                       type: integer
 *                     gyms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           assignmentId:
 *                             type: integer
 *                           joinedAt:
 *                             type: string
 *                             format: date-time
 *                           gym:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                               state:
 *                                 type: string
 *                               capacity:
 *                                 type: integer
 *                               owner:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                   name:
 *                                     type: string
 *                                   email:
 *                                     type: string
 *                                   phone:
 *                                     type: string
 *       403:
 *         description: Only trainers can access this endpoint
 *       500:
 *         description: Server error
 */
router.get('/my-gyms', TrainerController.getAssignedGyms);

/**
 * @swagger
 * /api/trainers/profile:
 *   get:
 *     summary: Get trainer profile and stats
 *     tags: [Trainers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trainer profile and statistics
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
 *                     trainer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         profileImage:
 *                           type: string
 *                         memberSince:
 *                           type: string
 *                           format: date-time
 *                     stats:
 *                       type: object
 *                       properties:
 *                         activeGyms:
 *                           type: integer
 *                         totalDietPlans:
 *                           type: integer
 *                         activeDietPlans:
 *                           type: integer
 *                         totalClients:
 *                           type: integer
 *       404:
 *         description: Trainer not found
 *       500:
 *         description: Server error
 */
router.get('/profile', TrainerController.getTrainerProfile);

/**
 * @swagger
 * /api/trainers/leave-gym/{gymId}:
 *   post:
 *     summary: Leave a gym (trainer initiated)
 *     tags: [Trainers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID to leave
 *     responses:
 *       200:
 *         description: Successfully left the gym
 *       404:
 *         description: Gym assignment not found or already inactive
 *       500:
 *         description: Server error
 */
router.post('/leave-gym/:gymId', TrainerController.leaveGym);

module.exports = router;