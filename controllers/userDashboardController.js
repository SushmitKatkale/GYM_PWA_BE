const DashboardService = require('../services/dashboardService');
const ResponseUtil = require('../utils/response');

class UserDashboardController {
  static async getDashboardData(req, res) {
    try {
      const userId = req.user.id; // Use user ID as primary identifier
      const userEmail = req.user.email; // Keep email for backward compatibility
      const result = await DashboardService.getUserDashboardData(userId, userEmail);
      
      if (result.success) {
        return ResponseUtil.success(res, result.data, 'User dashboard data retrieved successfully');
      } else {
        return ResponseUtil.error(res, result.message);
      }
    } catch (error) {
      console.error('User dashboard error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user dashboard data');
    }
  }

  static async getPersonalStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      // Calculate personal statistics
      const personalStats = {
        workoutStreak: Math.floor(Math.random() * 15) + 1,
        totalWorkouts: Math.floor(Math.random() * 100) + 20,
        caloriesBurned: Math.floor(Math.random() * 10000) + 5000,
        averageWorkoutTime: Math.floor(Math.random() * 30) + 45, // minutes
        favoriteWorkoutTime: '7:00 PM',
        achievements: [
          { id: 1, name: 'Early Bird', description: '10 morning workouts', unlocked: true, icon: '🌅' },
          { id: 2, name: 'Consistency King', description: '30-day streak', unlocked: false, icon: '👑' },
          { id: 3, name: 'Calorie Crusher', description: 'Burn 5000+ calories', unlocked: true, icon: '🔥' }
        ],
        weeklyProgress: [
          { day: 'Mon', workouts: Math.floor(Math.random() * 2) },
          { day: 'Tue', workouts: Math.floor(Math.random() * 2) },
          { day: 'Wed', workouts: Math.floor(Math.random() * 2) },
          { day: 'Thu', workouts: Math.floor(Math.random() * 2) },
          { day: 'Fri', workouts: Math.floor(Math.random() * 2) },
          { day: 'Sat', workouts: Math.floor(Math.random() * 2) },
          { day: 'Sun', workouts: Math.floor(Math.random() * 2) }
        ]
      };

      return ResponseUtil.success(res, personalStats, 'Personal statistics retrieved successfully');
    } catch (error) {
      console.error('Personal stats error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve personal statistics');
    }
  }

  static async getActivitySummary(req, res) {
    try {
      const userId = req.user.id;

      const activitySummary = {
        thisWeek: {
          workouts: Math.floor(Math.random() * 7) + 2,
          duration: Math.floor(Math.random() * 300) + 180, // minutes
          calories: Math.floor(Math.random() * 2000) + 800
        },
        thisMonth: {
          workouts: Math.floor(Math.random() * 25) + 10,
          duration: Math.floor(Math.random() * 1200) + 600, // minutes
          calories: Math.floor(Math.random() * 8000) + 3000
        },
        recentWorkouts: [
          {
            id: 1,
            gymName: 'FitZone Downtown',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000),
            duration: 45,
            type: 'Strength Training',
            calories: 320
          },
          {
            id: 2,
            gymName: 'PowerHouse Gym',
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            duration: 60,
            type: 'Cardio',
            calories: 450
          },
          {
            id: 3,
            gymName: 'FitZone Downtown',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            duration: 30,
            type: 'Yoga',
            calories: 180
          }
        ]
      };

      return ResponseUtil.success(res, activitySummary, 'Activity summary retrieved successfully');
    } catch (error) {
      console.error('Activity summary error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve activity summary');
    }
  }

  static async getRecommendations(req, res) {
    try {
      const userId = req.user.id;

      // Mock recommendations based on user activity
      const recommendations = {
        nearbyGyms: [
          {
            id: 1,
            name: 'Elite Fitness Center',
            distance: 0.8,
            rating: 4.5,
            price: '$29/month',
            image: '/api/uploads/gym1.jpg'
          },
          {
            id: 2,
            name: 'Iron Paradise',
            distance: 1.2,
            rating: 4.7,
            price: '$35/month',
            image: '/api/uploads/gym2.jpg'
          }
        ],
        suggestedPlans: [
          {
            id: 1,
            title: 'Premium Monthly',
            price: 49.99,
            features: ['All gym access', 'Personal trainer', 'Nutrition plan'],
            discount: 15
          },
          {
            id: 2,
            title: 'Weekend Warrior',
            price: 25.99,
            features: ['Weekend access', 'Group classes'],
            discount: 20
          }
        ],
        workoutTips: [
          {
            title: 'Perfect Your Form',
            description: 'Focus on proper form rather than heavy weights to prevent injury.',
            category: 'Safety'
          },
          {
            title: 'Stay Hydrated',
            description: 'Drink water before, during, and after your workout for optimal performance.',
            category: 'Health'
          }
        ]
      };

      return ResponseUtil.success(res, recommendations, 'Recommendations retrieved successfully');
    } catch (error) {
      console.error('Recommendations error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve recommendations');
    }
  }
}

module.exports = UserDashboardController;
