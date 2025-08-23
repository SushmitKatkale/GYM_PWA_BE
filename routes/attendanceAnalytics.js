const express = require('express');
const router = express.Router();
const {
  getUserAttendanceHistory,
  getGymAttendanceAnalytics,
  getGymOccupancy,
  getMultiGymAttendanceSummary,
  exportAttendanceData
} = require('../controllers/attendanceAnalyticsController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/attendance-analytics/history/{userId}:
 *   get:
 *     tags: [Attendance Analytics]
 *     summary: Get user attendance history
 *     description: Get attendance history for a specific user (users can view their own, gym owners can view their gym users, admins can view all)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID (optional - defaults to current user)
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: gymId
 *         schema:
 *           type: integer
 *         description: Filter by specific gym
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, checked_in, checked_out]
 *           default: all
 *         description: Filter by attendance status
 *     responses:
 *       200:
 *         description: Attendance history retrieved successfully
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
 *                     attendances:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalVisits:
 *                           type: integer
 *                         completedVisits:
 *                           type: integer
 *                         activeCheckIns:
 *                           type: integer
 *                         averageDuration:
 *                           type: integer
 *                         totalDuration:
 *                           type: integer
 *                 pagination:
 *                   type: object
 *       403:
 *         description: Not authorized to view this user's attendance
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/history/:userId?', authenticate, getUserAttendanceHistory);

/**
 * @swagger
 * /api/attendance-analytics/gym/{gymId}:
 *   get:
 *     tags: [Attendance Analytics]
 *     summary: Get gym attendance analytics
 *     description: Get detailed attendance analytics for a specific gym (gym owners and admins only)
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
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: week
 *         description: Analytics period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (overrides period)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (overrides period)
 *     responses:
 *       200:
 *         description: Gym attendance analytics retrieved successfully
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
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                         period:
 *                           type: string
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         totalVisits:
 *                           type: integer
 *                         uniqueVisitors:
 *                           type: integer
 *                         completedVisits:
 *                           type: integer
 *                         activeCheckIns:
 *                           type: integer
 *                         averageDuration:
 *                           type: integer
 *                         totalDuration:
 *                           type: integer
 *                         peakHours:
 *                           type: object
 *                         popularDays:
 *                           type: object
 *                         checkInMethods:
 *                           type: object
 *                         dailyStats:
 *                           type: array
 *                         insights:
 *                           type: object
 *       403:
 *         description: Not authorized to view analytics for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/gym/:gymId', authenticate, authorize('2', '3'), getGymAttendanceAnalytics);

/**
 * @swagger
 * /api/attendance-analytics/occupancy/{gymId}:
 *   get:
 *     tags: [Attendance Analytics]
 *     summary: Get gym occupancy status
 *     description: Get current gym occupancy and live statistics (public endpoint)
 *     parameters:
 *       - in: path
 *         name: gymId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym ID
 *     responses:
 *       200:
 *         description: Gym occupancy retrieved successfully
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
 *                         capacity:
 *                           type: integer
 *                     occupancy:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         capacity:
 *                           type: integer
 *                         percentage:
 *                           type: integer
 *                         available:
 *                           type: integer
 *                         status:
 *                           type: string
 *                           enum: [quiet, moderate, busy, full]
 *                     activeCheckIns:
 *                       type: array
 *                       items:
 *                         type: object
 *                     todayStats:
 *                       type: object
 *                       properties:
 *                         totalVisits:
 *                           type: integer
 *                         uniqueVisitors:
 *                           type: integer
 *                         completedVisits:
 *                           type: integer
 *                         peakOccupancy:
 *                           type: integer
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/occupancy/:gymId', getGymOccupancy);

/**
 * @swagger
 * /api/attendance-analytics/multi-gym-summary:
 *   get:
 *     tags: [Attendance Analytics]
 *     summary: Get multi-gym attendance summary
 *     description: Get attendance summary for all gyms (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: today
 *         description: Summary period
 *     responses:
 *       200:
 *         description: Multi-gym attendance summary retrieved successfully
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
 *                     period:
 *                       type: object
 *                     overallSummary:
 *                       type: object
 *                       properties:
 *                         totalGyms:
 *                           type: integer
 *                         totalCapacity:
 *                           type: integer
 *                         totalActiveCheckIns:
 *                           type: integer
 *                         totalVisits:
 *                           type: integer
 *                         totalUniqueVisitors:
 *                           type: integer
 *                         averageOccupancyPercentage:
 *                           type: integer
 *                     gymSummaries:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Only administrators can view multi-gym summary
 *       500:
 *         description: Server error
 */
router.get('/multi-gym-summary', authenticate, authorize('3'), getMultiGymAttendanceSummary);

/**
 * @swagger
 * /api/attendance-analytics/export/{gymId}:
 *   get:
 *     tags: [Attendance Analytics]
 *     summary: Export attendance data
 *     description: Export attendance data for a gym in JSON or CSV format (gym owners and admins only)
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Attendance data exported successfully
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
 *                     totalRecords:
 *                       type: integer
 *                     dateRange:
 *                       type: object
 *                     data:
 *                       type: array
 *           text/csv:
 *             schema:
 *               type: string
 *       403:
 *         description: Not authorized to export data for this gym
 *       404:
 *         description: Gym not found
 *       500:
 *         description: Server error
 */
router.get('/export/:gymId', authenticate, authorize('2', '3'), exportAttendanceData);

module.exports = router;
