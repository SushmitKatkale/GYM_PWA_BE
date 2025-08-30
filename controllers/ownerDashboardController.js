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
      const ownerId = req.user.id; // Updated to use user ID

      // TODO: Add specific gym analytics
      // For now, return basic gym info
      const { Gym, UserSubscription } = require('../models');
      
      const gym = await Gym.findOne({
        where: { 
          id: gymId,
          owner_id: ownerId // Updated field name and ensure owner can only access their gym
        }
      });

      // Get active subscriptions count separately
      const activeSubscriptions = UserSubscription ? await UserSubscription.count({
        where: {
          subscriptionId: gymId, // Assuming subscriptionId relates to gym
          record_status: 1, // Updated field name
          validTo: { [require('sequelize').Op.gte]: new Date() }
        }
      }) : 0;

      if (!gym) {
        return ResponseUtil.notFoundError(res, 'Gym not found or access denied');
      }

      const analytics = {
        gymInfo: {
          id: gym.id,
          name: gym.name,
          capacity: gym.capacity,
          currentOccupancy: gym.currentOccupancy || 0,
          occupancyRate: gym.capacity > 0 ? Math.round((gym.currentOccupancy || 0) / gym.capacity * 100) : 0,
          rating: parseFloat(gym.rating || 0),
          activeMembers: activeSubscriptions
        },
        weeklyTrends: [
          { day: 'Mon', checkins: Math.floor(Math.random() * 50) + 20 },
          { day: 'Tue', checkins: Math.floor(Math.random() * 50) + 20 },
          { day: 'Wed', checkins: Math.floor(Math.random() * 50) + 20 },
          { day: 'Thu', checkins: Math.floor(Math.random() * 50) + 20 },
          { day: 'Fri', checkins: Math.floor(Math.random() * 50) + 20 },
          { day: 'Sat', checkins: Math.floor(Math.random() * 50) + 20 },
          { day: 'Sun', checkins: Math.floor(Math.random() * 50) + 20 }
        ],
        popularTimes: [
          { hour: '06:00', usage: 45 },
          { hour: '07:00', usage: 75 },
          { hour: '08:00', usage: 85 },
          { hour: '09:00', usage: 65 },
          { hour: '18:00', usage: 90 },
          { hour: '19:00', usage: 95 },
          { hour: '20:00', usage: 80 }
        ]
      };

      return ResponseUtil.success(res, analytics, 'Gym analytics retrieved successfully');
    } catch (error) {
      console.error('Gym analytics error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve gym analytics');
    }
  }
}

module.exports = OwnerDashboardController;
