const DashboardService = require('../services/dashboardService');
const ResponseUtil = require('../utils/response');

class AdminDashboardController {
  static async getDashboardOverview(req, res) {
    try {
      const result = await DashboardService.getAdminDashboardOverview();
      
      if (result.success) {
        return ResponseUtil.success(res, result.data, 'Admin dashboard overview retrieved successfully');
      } else {
        return ResponseUtil.error(res, result.message);
      }
    } catch (error) {
      console.error('Admin dashboard overview error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve admin dashboard overview');
    }
  }

  static async getDashboardAnalytics(req, res) {
    try {
      const { period } = req.query;
      const result = await DashboardService.getAdminAnalytics(period);

      if (result.success) {
        return ResponseUtil.success(res, result.data, 'Admin dashboard analytics retrieved successfully');
      } else {
        return ResponseUtil.error(res, result.message);
      }
    } catch (error) {
      console.error('Admin dashboard analytics error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve admin dashboard analytics');
    }
  }
}

module.exports = AdminDashboardController;
