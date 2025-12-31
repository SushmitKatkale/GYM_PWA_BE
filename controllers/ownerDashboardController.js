const DashboardService = require('../services/dashboardService');
const ResponseUtil = require('../utils/response');

class OwnerDashboardController {
  static async getDashboardData(req, res) {
    try {
      const ownerId = req.user.id; // Updated to use user ID
      const result = await DashboardService.getOwnerDashboardData(ownerId);
      
      if (result.success) {
        return ResponseUtil.success(res, result.data, 'Owner dashboard data retrieved successfully');
      } else {
        return ResponseUtil.error(res, result.message);
      }
    } catch (error) {
      console.error('Owner dashboard error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve owner dashboard data');
    }
  }

  static async getGymAnalytics(req, res) {
    try {
      const { gymId } = req.params;
      const ownerId = req.user.id;
      
      // Use the new analytics service for real data
      const OwnerAnalyticsService = require('../services/ownerAnalyticsService');
      const result = await OwnerAnalyticsService.getOwnerGymAnalytics(ownerId, parseInt(gymId));
      
      if (result.success) {
        return ResponseUtil.success(res, result.data, 'Gym analytics retrieved successfully');
      } else {
        return ResponseUtil.notFoundError(res, result.message);
      }
    } catch (error) {
      console.error('Gym analytics error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve gym analytics');
    }
  }
}

module.exports = OwnerDashboardController;
