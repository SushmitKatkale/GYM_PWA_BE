const express = require('express');
const AdminDashboardController = require('../controllers/adminDashboardController');
const OwnerDashboardController = require('../controllers/ownerDashboardController');
const UserDashboardController = require('../controllers/userDashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const dashboardRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardOverview:
 *       type: object
 *       properties:
 *         overview:
 *           type: object
 *         growth:
 *           type: object
 *         recentActivities:
 *           type: array
 *         systemHealth:
 *           type: object
 */

// ==================== ADMIN DASHBOARD ROUTES ====================

/**
 * @swagger
 * /api/dashboard/admin/overview:
 *   get:
 *     tags: [Admin Dashboard]
 *     summary: Get admin dashboard overview (Admin only)
 *     description: Get comprehensive platform analytics and metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardOverview'
 */
dashboardRouter.get('/admin/overview', authenticate, authorize('3'), AdminDashboardController.getDashboardOverview);

/**
 * @swagger
 * /api/dashboard/admin/analytics:
 *   get:
 *     tags: [Admin Dashboard]
 *     summary: Get admin analytics data (Admin only)
 *     description: Get detailed analytics with trends and charts data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: '30d'
 *           enum: ['7d', '30d', '90d', '365d']
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Admin analytics retrieved successfully
 */
dashboardRouter.get('/admin/analytics', authenticate, authorize('3'), AdminDashboardController.getDashboardAnalytics);

// ==================== OWNER DASHBOARD ROUTES ====================

/**
 * @swagger
 * /api/dashboard/owner:
 *   get:
 *     tags: [Owner Dashboard]
 *     summary: Get owner dashboard data (Owner only)
 *     description: Get gym performance metrics and member analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner dashboard data retrieved successfully
 */
dashboardRouter.get('/owner', authenticate, authorize('2'), OwnerDashboardController.getDashboardData);

/**
 * @swagger
 * /api/dashboard/owner/gym/{gymId}/analytics:
 *   get:
 *     tags: [Owner Dashboard]
 *     summary: Get specific gym analytics (Owner only)
 *     description: Get detailed analytics for a specific gym
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
 *         description: Gym analytics retrieved successfully
 *       404:
 *         description: Gym not found or access denied
 */
dashboardRouter.get('/owner/gym/:gymId/analytics', authenticate, authorize('2'), OwnerDashboardController.getGymAnalytics);

// ==================== USER DASHBOARD ROUTES ====================

/**
 * @swagger
 * /api/dashboard/user:
 *   get:
 *     tags: [User Dashboard]
 *     summary: Get user dashboard data
 *     description: Get personal fitness data and subscription info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User dashboard data retrieved successfully
 */
dashboardRouter.get('/user', authenticate, UserDashboardController.getDashboardData);

/**
 * @swagger
 * /api/dashboard/user/stats:
 *   get:
 *     tags: [User Dashboard]
 *     summary: Get personal statistics
 *     description: Get detailed personal workout statistics and achievements
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: '30d'
 *           enum: ['7d', '30d', '90d']
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Personal statistics retrieved successfully
 */
dashboardRouter.get('/user/stats', authenticate, UserDashboardController.getPersonalStats);

/**
 * @swagger
 * /api/dashboard/user/activity:
 *   get:
 *     tags: [User Dashboard]
 *     summary: Get activity summary
 *     description: Get workout activity summary and recent workouts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity summary retrieved successfully
 */
dashboardRouter.get('/user/activity', authenticate, UserDashboardController.getActivitySummary);

/**
 * @swagger
 * /api/dashboard/user/recommendations:
 *   get:
 *     tags: [User Dashboard]
 *     summary: Get personalized recommendations
 *     description: Get nearby gyms, suggested plans, and workout tips
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
dashboardRouter.get('/user/recommendations', authenticate, UserDashboardController.getRecommendations);

module.exports = dashboardRouter;
