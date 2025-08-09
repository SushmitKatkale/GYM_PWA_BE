const { User, Gym, Subscription, UserSubscription, Payment, AdvertisementAnalytics, sequelize } = require('../models');
const { Op } = require('sequelize');

// Fallback for models that might not exist yet
const safeModels = {
  User,
  Gym,
  Subscription: Subscription || null,
  UserSubscription: UserSubscription || null,
  Payment: Payment || null,
  AdvertisementAnalytics: AdvertisementAnalytics || null
};

class DashboardService {
  // Admin Dashboard Analytics
  static async getAdminDashboardOverview() {
    try {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);

      const [
        totalStats,
        monthlyStats,
        lastMonthStats,
        yearlyStats,
        recentActivities,
        systemHealth
      ] = await Promise.all([
        // Total counts
        Promise.all([
          User.count(),
          User.count({ where: { activeStatus: '1' } }),
          Gym.count(),
          Gym.count({ where: { activeStatus: true } }),
          UserSubscription ? UserSubscription.count({ 
            where: { 
              activeStatus: true,
              validTo: { [Op.gte]: new Date() } 
            } 
          }) : 0
        ]),
        
        // This month stats
        Promise.all([
          User.count({ where: { createTimestamp: { [Op.gte]: firstDayOfMonth } } }),
          Gym.count({ where: { createTimestamp: { [Op.gte]: firstDayOfMonth } } }),
          UserSubscription ? UserSubscription.count({ 
            where: { 
              createTimestamp: { [Op.gte]: firstDayOfMonth },
              activeStatus: true,
              validTo: { [Op.gte]: new Date() }
            } 
          }) : 0
        ]),
        
        // Last month stats for comparison
        Promise.all([
          User.count({ 
            where: { 
              createTimestamp: { 
                [Op.gte]: firstDayOfLastMonth,
                [Op.lte]: lastDayOfLastMonth
              } 
            } 
          }),
          Gym.count({ 
            where: { 
              createTimestamp: { 
                [Op.gte]: firstDayOfLastMonth,
                [Op.lte]: lastDayOfLastMonth
              } 
            } 
          })
        ]),
        
        // Yearly growth
        Promise.all([
          User.count({ where: { createTimestamp: { [Op.gte]: firstDayOfYear } } }),
          Gym.count({ where: { createTimestamp: { [Op.gte]: firstDayOfYear } } })
        ]),
        
        // Recent activities (last 7 days)
        this.getRecentAdminActivities(),
        
        // System health check
        this.getSystemHealth()
      ]);

      const [totalUsers, activeUsers, totalGyms, activeGyms, activeSubscriptions] = totalStats;
      const [newUsersThisMonth, newGymsThisMonth, newSubscriptionsThisMonth] = monthlyStats;
      const [newUsersLastMonth, newGymsLastMonth] = lastMonthStats;
      const [newUsersThisYear, newGymsThisYear] = yearlyStats;

      // Calculate growth percentages
      const userGrowth = newUsersLastMonth > 0 ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1) : 100;
      const gymGrowth = newGymsLastMonth > 0 ? ((newGymsThisMonth - newGymsLastMonth) / newGymsLastMonth * 100).toFixed(1) : 100;

      return {
        success: true,
        data: {
          overview: {
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            totalGyms,
            activeGyms,
            inactiveGyms: totalGyms - activeGyms,
            activeSubscriptions,
            platformGrowth: userGrowth
          },
          growth: {
            newUsersThisMonth,
            newGymsThisMonth,
            newSubscriptionsThisMonth,
            newUsersThisYear,
            newGymsThisYear,
            userGrowthPercentage: userGrowth,
            gymGrowthPercentage: gymGrowth
          },
          recentActivities,
          systemHealth
        }
      };
    } catch (error) {
      console.error('Error getting admin dashboard overview:', error);
      return {
        success: false,
        message: 'Failed to fetch admin dashboard data'
      };
    }
  }

  static async getAdminAnalytics(period = '30d') {
    try {
      const days = parseInt(period.replace('d', ''));
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const [userTrends, gymTrends, revenueTrends, userTypeBreakdown] = await Promise.all([
        // User registration trends
        sequelize.query(`
          SELECT DATE(create_timestamp) as date,
                 COUNT(*) as count
          FROM users 
          WHERE create_timestamp >= :startDate 
            AND create_timestamp <= :endDate
          GROUP BY DATE(create_timestamp)
          ORDER BY date ASC
        `, {
          replacements: { startDate, endDate },
          type: sequelize.QueryTypes.SELECT
        }),
        
        // Gym registration trends  
        sequelize.query(`
          SELECT DATE(create_timestamp) as date,
                 COUNT(*) as count
          FROM gyms 
          WHERE create_timestamp >= :startDate 
            AND create_timestamp <= :endDate
          GROUP BY DATE(create_timestamp)
          ORDER BY date ASC
        `, {
          replacements: { startDate, endDate },
          type: sequelize.QueryTypes.SELECT
        }),
        
        // Revenue trends (mock for now - would need payments table)
        this.getMockRevenueTrends(startDate, endDate),
        
        // User type breakdown
        User.findAll({
          attributes: [
            'type',
            [sequelize.fn('COUNT', sequelize.col('type')), 'count']
          ],
          group: ['type'],
          raw: true
        })
      ]);

      return {
        success: true,
        data: {
          userTrends: userTrends.map(item => ({
            date: item.date,
            users: parseInt(item.count)
          })),
          gymTrends: gymTrends.map(item => ({
            date: item.date,
            gyms: parseInt(item.count)
          })),
          revenueTrends,
          userTypeBreakdown: {
            users: userTypeBreakdown.find(u => u.type === '1')?.count || 0,
            owners: userTypeBreakdown.find(u => u.type === '2')?.count || 0,
            admins: userTypeBreakdown.find(u => u.type === '3')?.count || 0
          }
        }
      };
    } catch (error) {
      console.error('Error getting admin analytics:', error);
      return {
        success: false,
        message: 'Failed to fetch admin analytics'
      };
    }
  }

  // Owner Dashboard Analytics
  static async getOwnerDashboardData(ownerEmail) {
    try {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Get owner's gyms (ownerId field stores email address)
      const ownerGyms = await Gym.findAll({
        where: { ownerId: ownerEmail, activeStatus: true }
      });

      const gymIds = ownerGyms.map(gym => gym.id);

      if (gymIds.length === 0) {
        return {
          success: true,
          data: {
            overview: {
              totalGyms: 0,
              totalActiveMembers: 0,
              totalMonthlyRevenue: 0,
              averageOccupancyRate: 0
            },
            gyms: [],
            recentActivities: []
          }
        };
      }

      const [
        activeMembers,
        monthlyRevenue,
        todayCheckIns,
        recentActivity
      ] = await Promise.all([
        // Active members across owner's gyms (join through subscription->gym relationship)
        UserSubscription && gymIds.length > 0 ? sequelize.query(`
          SELECT COUNT(DISTINCT us.user_email) as count
          FROM user_subscriptions us
          JOIN subscriptions s ON us.subscription_id = s.id
          WHERE s.gym_id IN (:gymIds)
            AND us.active_status = true
            AND us.valid_to >= NOW()
        `, {
          replacements: { gymIds },
          type: sequelize.QueryTypes.SELECT
        }).then(result => parseInt(result[0]?.count) || 0) : 0,
        
        // Monthly revenue (mock calculation)
        this.calculateOwnerMonthlyRevenue(gymIds, firstDayOfMonth),
        
        // Today's check-ins (mock for now)
        Math.floor(Math.random() * 100) + 50,
        
        // Recent activity
        this.getRecentOwnerActivity(gymIds)
      ]);

      // Calculate average occupancy
      const totalCapacity = ownerGyms.reduce((sum, gym) => sum + gym.capacity, 0);
      const totalOccupancy = ownerGyms.reduce((sum, gym) => sum + (gym.currentOccupancy || 0), 0);
      const averageOccupancy = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

      return {
        success: true,
        data: {
          overview: {
            totalGyms: ownerGyms.length,
            activeMembers,
            monthlyRevenue,
            todayCheckIns,
            averageOccupancy
          },
          gyms: ownerGyms.map(gym => ({
            id: gym.id,
            name: gym.name,
            capacity: gym.capacity,
            currentOccupancy: gym.currentOccupancy || 0,
            occupancyRate: gym.capacity > 0 ? Math.round((gym.currentOccupancy || 0) / gym.capacity * 100) : 0,
            activeMembers: gym.subscriptions ? gym.subscriptions.length : 0,
            rating: parseFloat(gym.rating || 0)
          })),
          recentActivity
        }
      };
    } catch (error) {
      console.error('Error getting owner dashboard data:', error);
      return {
        success: false,
        message: 'Failed to fetch owner dashboard data'
      };
    }
  }

  // User Dashboard Analytics
  static async getUserDashboardData(userId) {
    try {
      const currentDate = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const [
        activeSubscriptions,
        weeklyWorkouts,
        monthlyWorkouts,
        favoriteGym,
        upcomingBookings,
        recentActivity
      ] = await Promise.all([
        // Active subscriptions - use userEmail to match user
        UserSubscription ? UserSubscription.findAll({
          where: { 
            userEmail: userId, // Assuming userId is actually email
            activeStatus: true,
            validTo: { [Op.gte]: new Date() }
          }
        }) : [],
        
        // Weekly workouts (mock for now)
        Math.floor(Math.random() * 7) + 3,
        
        // Monthly workouts (mock for now)
        Math.floor(Math.random() * 20) + 10,
        
        // Favorite gym (most visited)
        this.getUserFavoriteGym(userId),
        
        // Upcoming bookings (mock for now)
        this.getMockUpcomingBookings(userId),
        
        // Recent activity
        this.getRecentUserActivity(userId)
      ]);

      return {
        success: true,
        data: {
          overview: {
            activeSubscriptions: activeSubscriptions.length,
            weeklyWorkouts,
            monthlyWorkouts,
            favoriteGym: favoriteGym ? favoriteGym.name : 'None yet'
          },
          subscriptions: activeSubscriptions.map(sub => ({
            id: sub.id,
            gymName: sub.gym ? sub.gym.name : 'Unknown Gym',
            planName: sub.subscription ? sub.subscription.title : 'Unknown Plan',
            status: sub.status,
            startDate: sub.startDate,
            endDate: sub.endDate,
            price: sub.subscription ? parseFloat(sub.subscription.price) : 0
          })),
          upcomingBookings,
          recentActivity
        }
      };
    } catch (error) {
      console.error('Error getting user dashboard data:', error);
      return {
        success: false,
        message: 'Failed to fetch user dashboard data'
      };
    }
  }

  // Helper Methods
  static async getRecentAdminActivities() {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [recentUsers, recentGyms] = await Promise.all([
        User.findAll({
          where: { createTimestamp: { [Op.gte]: weekAgo } },
          attributes: ['firstName', 'lastName', 'email', 'createTimestamp', 'type'],
          order: [['createTimestamp', 'DESC']],
          limit: 5
        }),
        
        Gym.findAll({
          where: { createTimestamp: { [Op.gte]: weekAgo } },
          attributes: ['name', 'createTimestamp', 'ownerId'],
          order: [['createTimestamp', 'DESC']],
          limit: 5
        })
      ]);

      const activities = [];

      recentUsers.forEach(user => {
        activities.push({
          type: 'user_registered',
          message: `New ${user.type === '2' ? 'owner' : user.type === '3' ? 'admin' : 'user'} registered: ${user.firstName} ${user.lastName}`,
          timestamp: user.createTimestamp,
          metadata: { email: user.email }
        });
      });

      recentGyms.forEach(gym => {
        activities.push({
          type: 'gym_registered',
          message: `New gym registered: ${gym.name}`,
          timestamp: gym.createTimestamp,
          metadata: { 
            ownerId: gym.ownerId || 'Unknown'
          }
        });
      });

      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting recent admin activities:', error);
      return [];
    }
  }

  static async getSystemHealth() {
    try {
      // Mock system health - in real implementation, you'd check actual services
      return {
        server: {
          status: 'healthy',
          uptime: '99.9%',
          responseTime: '45ms'
        },
        database: {
          status: 'healthy',
          connections: '23/100',
          queryTime: '12ms'
        },
        paymentGateway: {
          status: 'healthy',
          successRate: '98.7%',
          avgProcessTime: '1.2s'
        }
      };
    } catch (error) {
      return {
        server: { status: 'error' },
        database: { status: 'error' },
        paymentGateway: { status: 'error' }
      };
    }
  }

  static getMockRevenueTrends(startDate, endDate) {
    const trends = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      trends.push({
        date: current.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 2000
      });
      current.setDate(current.getDate() + 1);
    }
    
    return trends;
  }

  static async calculateOwnerMonthlyRevenue(gymIds, startDate) {
    try {
      // Mock calculation - in real implementation, sum actual payments
      return Math.floor(Math.random() * 10000) + 5000;
    } catch (error) {
      return 0;
    }
  }

  static async getRecentOwnerActivity(gymIds) {
    try {
      // Mock recent activity - in real implementation, get actual member activities
      return [
        {
          type: 'member_joined',
          message: 'John Smith joined FitZone Downtown',
          timestamp: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          type: 'booking_made',
          message: 'Sarah Wilson booked evening session',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          type: 'payment_received',
          message: 'Monthly subscription payment received - $99',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
        }
      ];
    } catch (error) {
      return [];
    }
  }

  static async getUserFavoriteGym(userId) {
    try {
      // Mock favorite gym - simplified for now
      return null; // Will be implemented when associations are properly set up
    } catch (error) {
      return null;
    }
  }

  static getMockUpcomingBookings(userId) {
    // Mock upcoming bookings - in real implementation, get actual bookings
    return [
      {
        id: 1,
        gymName: 'FitZone Downtown',
        sessionType: 'Morning Workout',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        timeSlot: '09:00 AM - 10:00 AM'
      },
      {
        id: 2,
        gymName: 'PowerHouse Gym',
        sessionType: 'Yoga Class',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        timeSlot: '06:00 PM - 07:00 PM'
      }
    ];
  }

  static async getRecentUserActivity(userId) {
    try {
      // Mock recent user activity
      return [
        {
          type: 'workout_completed',
          message: 'Completed 45-min workout at FitZone Downtown',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          type: 'subscription_renewed',
          message: 'Monthly subscription renewed successfully',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          type: 'goal_achieved',
          message: 'Achieved 10-day workout streak! 🎉',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }
      ];
    } catch (error) {
      return [];
    }
  }
}

module.exports = DashboardService;
