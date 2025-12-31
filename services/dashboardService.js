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
          User.count({ where: { record_status: 1 } }), // Updated field name
          Gym.count(),
          Gym.count({ where: { record_status: 1 } }), // Updated field name
          UserSubscription ? UserSubscription.count({ 
            where: { 
              record_status: 1, // Updated field name
              endDate: { [Op.gte]: new Date() } 
            } 
          }) : 0
        ]),
        
        // This month stats
        Promise.all([
          User.count({ where: { created_at: { [Op.gte]: firstDayOfMonth } } }), // Updated field name
          Gym.count({ where: { created_at: { [Op.gte]: firstDayOfMonth } } }), // Updated field name
          UserSubscription ? UserSubscription.count({ 
            where: { 
              created_at: { [Op.gte]: firstDayOfMonth }, // Updated field name
              record_status: 1, // Updated field name
              endDate: { [Op.gte]: new Date() }
            } 
          }) : 0
        ]),
        
        // Last month stats for comparison
        Promise.all([
          User.count({ 
            where: { 
              created_at: { // Updated field name
                [Op.gte]: firstDayOfLastMonth,
                [Op.lte]: lastDayOfLastMonth
              } 
            } 
          }),
          Gym.count({ 
            where: { 
              created_at: { // Updated field name
                [Op.gte]: firstDayOfLastMonth,
                [Op.lte]: lastDayOfLastMonth
              } 
            } 
          })
        ]),
        
        // Yearly growth
        Promise.all([
          User.count({ where: { created_at: { [Op.gte]: firstDayOfYear } } }), // Updated field name
          Gym.count({ where: { created_at: { [Op.gte]: firstDayOfYear } } }) // Updated field name
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
          SELECT DATE(created_at) as date,
                 COUNT(*) as count
          FROM users 
          WHERE created_at >= :startDate 
            AND created_at <= :endDate
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `, {
          replacements: { startDate, endDate },
          type: sequelize.QueryTypes.SELECT
        }),
        
        // Gym registration trends  
        sequelize.query(`
          SELECT DATE(created_at) as date,
                 COUNT(*) as count
          FROM gyms 
          WHERE created_at >= :startDate 
            AND created_at <= :endDate
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `, {
          replacements: { startDate, endDate },
          type: sequelize.QueryTypes.SELECT
        }),
        
        // Revenue trends from actual payments data
        this.getRealRevenueTrends(startDate, endDate),
        
        // User role breakdown - updated to use role field
        User.findAll({
          attributes: [
            'role', // Updated field name
            [sequelize.fn('COUNT', sequelize.col('role')), 'count']
          ],
          group: ['role'],
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
          userRoleBreakdown: { // Updated to reflect role field
            users: userTypeBreakdown.find(u => u.role === 1)?.count || 0, // Updated role values
            owners: userTypeBreakdown.find(u => u.role === 2)?.count || 0,
            admins: userTypeBreakdown.find(u => u.role === 4)?.count || 0 // Admin role is 4
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

  // Owner Dashboard Analytics - Single Gym Model
  static async getOwnerDashboardData(ownerId) {
    try {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Get owner's single gym (owner_id field stores user ID)
      const ownerGym = await Gym.findOne({
        where: { 
          ownerId: ownerId, // This maps to owner_id field
          recordStatus: 1   // Updated field name
        }
      });

      // If no gym found, return empty data structure
      if (!ownerGym) {
        return {
          success: true,
          data: {
            totalActiveMembers: 0,
            totalMonthlyRevenue: 0,
            averageOccupancyRate: 0,
            todayCheckIns: 0,
            revenueGrowthRate: 0,
            gym: null,
            recentActivity: [],
            last7DaysData: {
              members: [0, 0, 0, 0, 0, 0, 0],
              revenue: [0, 0, 0, 0, 0, 0, 0],
              checkIns: [0, 0, 0, 0, 0, 0, 0],
              occupancy: [0, 0, 0, 0, 0, 0, 0]
            }
          }
        };
      }

      const [
        activeMembers,
        monthlyRevenue,
        todayCheckIns,
        recentActivity,
        last7DaysData
      ] = await Promise.all([
        // Active members for this gym (join through subscription->gym relationship)
        UserSubscription ? sequelize.query(`
          SELECT COUNT(DISTINCT us.user_id) as count
          FROM user_subscriptions us
          JOIN subscriptions s ON us.subscription_id = s.id
          WHERE s.gym_id = :gymId
            AND us.record_status = 1
            AND (
              us.end_date >= CURDATE() 
              OR (
                us.buffer_applied = 1 
                AND us.buffer_end_date >= CURDATE()
              )
            )
        `, {
          replacements: { gymId: ownerGym.id },
          type: sequelize.QueryTypes.SELECT
        }).then(result => parseInt(result[0]?.count) || 0) : 0,
        
        // Monthly revenue (mock calculation for single gym)
        this.calculateOwnerMonthlyRevenue([ownerGym.id], firstDayOfMonth),
        
        // Today's check-ins (real data from attendance)
        this.getTodayCheckIns(ownerGym.id),
        
        // Recent activity for this gym
        this.getRecentOwnerActivity([ownerGym.id]),
        
        // Last 7 days historical data for charts
        this.getLast7DaysData(ownerGym.id)
      ]);

      // Calculate real occupancy rate based on today's attendance
      const occupancyRate = await this.calculateCurrentOccupancyRate(ownerGym.id, ownerGym.capacity);
      
      // Calculate real revenue growth rate
      const revenueGrowthRate = await this.calculateRevenueGrowthRate(ownerGym.id, firstDayOfMonth);

      return {
        success: true,
        data: {
          // Single gym owner dashboard data structure
          totalActiveMembers: activeMembers,
          totalMonthlyRevenue: monthlyRevenue,
          averageOccupancyRate: occupancyRate,
          todayCheckIns,
          revenueGrowthRate,
          gym: {
            id: ownerGym.id,
            name: ownerGym.name,
            address: ownerGym.address,
            capacity: ownerGym.capacity,
            activeMembers,
            occupancyRate,
            monthlyRevenue,
            status: ownerGym.record_status === 1 ? 'active' : 'inactive',
            city: ownerGym.city || 'Unknown',
            state: ownerGym.state || 'Unknown'
          },
          recentActivity,
          last7DaysData // Real historical data for charts
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
  static async getUserDashboardData(userId, userEmail) { // Accept both parameters
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
        // Active subscriptions - support both user_id and userEmail
        UserSubscription ? UserSubscription.findAll({
          where: { 
            [Op.or]: [
              { user_id: userId },
              { userEmail: userEmail }
            ],
            record_status: 1, // Updated field name
            endDate: { [Op.gte]: new Date() }
          }
        }) : [],
        
        // Weekly workouts from attendance data
        this.getWeeklyWorkouts(userId, weekAgo),
        
        // Monthly workouts from attendance data
        this.getMonthlyWorkouts(userId, monthAgo),
        
        // Favorite gym (most visited)
        this.getUserFavoriteGym(userId),
        
        // Upcoming bookings from database
        this.getUpcomingBookings(userId),
        
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
            planName: sub.subscription ? sub.subscription.name : 'Unknown Plan',
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
          where: { created_at: { [Op.gte]: weekAgo } }, // Updated field name
          attributes: ['firstName', 'lastName', 'email', 'created_at', 'role'], // Updated field names
          order: [['created_at', 'DESC']],
          limit: 5
        }),
        
        Gym.findAll({
          where: { created_at: { [Op.gte]: weekAgo } }, // Updated field name
          attributes: ['name', 'created_at', 'owner_id', 'ownerId'], // Include both fields
          order: [['created_at', 'DESC']],
          limit: 5
        })
      ]);

      const activities = [];

      recentUsers.forEach(user => {
        activities.push({
          type: 'user_registered',
          message: `New ${user.role === 2 ? 'owner' : user.role === 4 ? 'admin' : 'user'} registered: ${user.firstName} ${user.lastName}`, // Updated role values
          timestamp: user.created_at, // Updated field name
          metadata: { email: user.email }
        });
      });

      recentGyms.forEach(gym => {
        activities.push({
          type: 'gym_registered',
          message: `New gym registered: ${gym.name}`,
          timestamp: gym.created_at, // Updated field name
          metadata: { 
            ownerId: gym.owner_id || gym.ownerId || 'Unknown' // Support both fields
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
      // Test database connection
      const dbStart = Date.now();
      await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT });
      const dbTime = Date.now() - dbStart;

      // Get database connection info
      const connectionCount = await sequelize.query(
        'SHOW STATUS WHERE Variable_name = "Threads_connected"',
        { type: sequelize.QueryTypes.SELECT }
      ).catch(() => [{ Value: '0' }]);

      // Check recent payment success rate
      const paymentStats = await sequelize.query(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_payments
        FROM payments 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `, { type: sequelize.QueryTypes.SELECT }).catch(() => [{ total_payments: 0, successful_payments: 0 }]);

      const totalPayments = parseInt(paymentStats[0]?.total_payments || 0);
      const successfulPayments = parseInt(paymentStats[0]?.successful_payments || 0);
      const successRate = totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(1) : '100.0';

      return {
        server: {
          status: 'healthy',
          uptime: process.uptime ? `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m` : 'Unknown',
          responseTime: `${dbTime}ms`
        },
        database: {
          status: dbTime < 100 ? 'healthy' : 'slow',
          connections: `${connectionCount[0]?.Value || 0}/100`,
          queryTime: `${dbTime}ms`
        },
        paymentGateway: {
          status: parseFloat(successRate) > 95 ? 'healthy' : 'warning',
          successRate: `${successRate}%`,
          avgProcessTime: '~1.2s'
        }
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        server: { status: 'error', uptime: 'Unknown', responseTime: 'Error' },
        database: { status: 'error', connections: 'Error', queryTime: 'Error' },
        paymentGateway: { status: 'error', successRate: 'Error', avgProcessTime: 'Error' }
      };
    }
  }

  static async getRealRevenueTrends(startDate, endDate) {
    try {
      const revenueTrends = await sequelize.query(`
        SELECT DATE(p.created_at) as date,
               COALESCE(SUM(p.amount), 0) as revenue
        FROM payments p
        WHERE p.status = 'completed'
          AND p.record_status = 1
          AND DATE(p.created_at) >= ?
          AND DATE(p.created_at) <= ?
        GROUP BY DATE(p.created_at)
        ORDER BY date ASC
      `, {
        replacements: [startDate, endDate],
        type: sequelize.QueryTypes.SELECT
      });

      return revenueTrends.map(item => ({
        date: item.date,
        revenue: parseFloat(item.revenue)
      }));
    } catch (error) {
      console.error('Error getting revenue trends:', error);
      return [];
    }
  }

  static async getTodayCheckIns(gymId) {
    try {
      const { Attendance } = require('../models');
      if (!Attendance) {
        return 0;
      }

      const todayCount = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM attendances
        WHERE gym_id = :gymId
          AND DATE(check_in_time) = CURDATE()
          AND record_status = 1
      `, {
        replacements: { gymId },
        type: sequelize.QueryTypes.SELECT
      });

      return parseInt(todayCount[0]?.count || 0);
    } catch (error) {
      console.error('Error getting today check-ins:', error);
      return 0;
    }
  }

  static async getLast7DaysData(gymId) {
    try {
      const { Attendance, Payment } = require('../models');
      
      // Generate last 7 days dates
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
      }
      
      const [
        checkInsData,
        revenueData,
        membersData,
        occupancyData
      ] = await Promise.all([
        // Daily check-ins for last 7 days
        this.getDailyCheckIns(gymId, last7Days),
        
        // Daily revenue for last 7 days
        this.getDailyRevenue(gymId, last7Days),
        
        // Daily active members for last 7 days
        this.getDailyActiveMembers(gymId, last7Days),
        
        // Daily occupancy rate for last 7 days
        this.getDailyOccupancy(gymId, last7Days)
      ]);
      
      return {
        members: membersData,
        revenue: revenueData,
        checkIns: checkInsData,
        occupancy: occupancyData,
        dates: last7Days // For reference
      };
      
    } catch (error) {
      console.error('Error getting last 7 days data:', error);
      // Return empty data on error
      return {
        members: Array(7).fill(0),
        revenue: Array(7).fill(0),
        checkIns: Array(7).fill(0),
        occupancy: Array(7).fill(0),
        dates: []
      };
    }
  }

  static async getDailyCheckIns(gymId, dates) {
    try {
      const { Attendance } = require('../models');
      if (!Attendance) {
        return dates.map(() => 0);
      }

      const checkInsQuery = await sequelize.query(`
        SELECT 
          DATE(check_in_time) as date,
          COUNT(*) as count
        FROM attendances
        WHERE gym_id = :gymId
          AND DATE(check_in_time) IN (${dates.map(() => '?').join(',')})
          AND record_status = 1
        GROUP BY DATE(check_in_time)
        ORDER BY date ASC
      `, {
        replacements: [gymId, ...dates],
        type: sequelize.QueryTypes.SELECT
      });

      // Fill missing dates with 0
      return dates.map(date => {
        const dayData = checkInsQuery.find(row => row.date === date);
        return parseInt(dayData?.count || 0);
      });
    } catch (error) {
      console.error('Error getting daily check-ins:', error);
      return dates.map(() => 0);
    }
  }

  static async getDailyRevenue(gymId, dates) {
    try {
      const { Payment } = require('../models');
      if (!Payment) {
        return dates.map(() => 0);
      }

      const revenueQuery = await sequelize.query(`
        SELECT 
          DATE(p.created_at) as date,
          COALESCE(SUM(p.amount), 0) as revenue
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND DATE(p.created_at) IN (${dates.map(() => '?').join(',')})
          AND p.status = 'completed'
          AND p.record_status = 1
        GROUP BY DATE(p.created_at)
        ORDER BY date ASC
      `, {
        replacements: [gymId, ...dates],
        type: sequelize.QueryTypes.SELECT
      });

      // Fill missing dates with 0
      return dates.map(date => {
        const dayData = revenueQuery.find(row => row.date === date);
        return parseFloat(dayData?.revenue || 0);
      });
    } catch (error) {
      console.error('Error getting daily revenue:', error);
      return dates.map(() => 0);
    }
  }

  static async getDailyActiveMembers(gymId, dates) {
    try {
      // Query actual active members for each specific date
      const membersQuery = await sequelize.query(`
        SELECT 
          :date as query_date,
          COUNT(DISTINCT us.user_id) as count
        FROM user_subscriptions us
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND us.record_status = 1
          AND us.start_date <= :date
          AND (
            us.end_date >= :date
            OR (
              us.buffer_applied = 1 
              AND us.buffer_end_date >= :date
            )
          )
      `, {
        replacements: { gymId, date: dates[0] }, // Get template query structure
        type: sequelize.QueryTypes.SELECT
      });

      // Get actual count for each date
      const memberCounts = await Promise.all(
        dates.map(async (date) => {
          const result = await sequelize.query(`
            SELECT COUNT(DISTINCT us.user_id) as count
            FROM user_subscriptions us
            JOIN subscriptions s ON us.subscription_id = s.id
            WHERE s.gym_id = :gymId
              AND us.record_status = 1
              AND us.start_date <= :date
              AND (
                us.end_date >= :date
                OR (
                  us.buffer_applied = 1 
                  AND us.buffer_end_date >= :date
                )
              )
          `, {
            replacements: { gymId, date },
            type: sequelize.QueryTypes.SELECT
          });
          
          return parseInt(result[0]?.count || 0);
        })
      );
      
      return memberCounts;
    } catch (error) {
      console.error('Error getting daily active members:', error);
      return dates.map(() => 0);
    }
  }

  static async getDailyOccupancy(gymId, dates) {
    try {
      const { Attendance } = require('../models');
      if (!Attendance) {
        return dates.map(() => 0);
      }

      // Get gym capacity
      const gym = await Gym.findByPk(gymId);
      const capacity = gym?.capacity || 100;

      const occupancyQuery = await sequelize.query(`
        SELECT 
          DATE(check_in_time) as date,
          MAX(HOUR(check_in_time)) as peak_hour,
          COUNT(*) as daily_visits
        FROM attendances
        WHERE gym_id = :gymId
          AND DATE(check_in_time) IN (${dates.map(() => '?').join(',')})
          AND record_status = 1
        GROUP BY DATE(check_in_time)
        ORDER BY date ASC
      `, {
        replacements: [gymId, ...dates],
        type: sequelize.QueryTypes.SELECT
      });

      // Calculate occupancy rate as percentage of capacity
      return dates.map(date => {
        const dayData = occupancyQuery.find(row => row.date === date);
        if (!dayData) return 0;
        
        // Estimate occupancy as percentage (daily visits / capacity * 100, capped at 100)
        const occupancyRate = Math.min(100, Math.round((dayData.daily_visits / capacity) * 100));
        return occupancyRate;
      });
    } catch (error) {
      console.error('Error getting daily occupancy:', error);
      return dates.map(() => 0);
    }
  }

  static async calculateOwnerMonthlyRevenue(gymIds, startDate) {
    try {
      if (!gymIds || gymIds.length === 0) {
        return 0;
      }

      const { Payment } = require('../models');
      if (!Payment) {
        return 0;
      }

      const endDate = new Date();
      const monthlyRevenue = await sequelize.query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_revenue
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id IN (${gymIds.map(() => '?').join(',')})
          AND p.status = 'completed'
          AND p.record_status = 1
          AND p.created_at >= ?
          AND p.created_at <= ?
      `, {
        replacements: [...gymIds, startDate, endDate],
        type: sequelize.QueryTypes.SELECT
      });

      return parseFloat(monthlyRevenue[0]?.total_revenue || 0);
    } catch (error) {
      console.error('Error calculating monthly revenue:', error);
      return 0;
    }
  }

  static async getRecentOwnerActivity(gymIds) {
    try {
      if (!gymIds || gymIds.length === 0) {
        return [];
      }

      const activities = [];
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      // Get recent check-ins
      const recentCheckIns = await sequelize.query(`
        SELECT a.check_in_time, u.first_name, u.last_name, g.name as gym_name
        FROM attendances a
        JOIN users u ON a.user_id = u.id
        JOIN gyms g ON a.gym_id = g.id
        WHERE a.gym_id IN (${gymIds.map(() => '?').join(',')})
          AND a.record_status = 1
          AND a.check_in_time >= ?
        ORDER BY a.check_in_time DESC
        LIMIT 5
      `, {
        replacements: [...gymIds, last7Days],
        type: sequelize.QueryTypes.SELECT
      });

      recentCheckIns.forEach(checkin => {
        activities.push({
          type: 'member_checkin',
          message: `${checkin.first_name} ${checkin.last_name} checked in to ${checkin.gym_name}`,
          timestamp: checkin.check_in_time
        });
      });

      // Get recent subscriptions
      const recentSubscriptions = await sequelize.query(`
        SELECT us.created_at, u.first_name, u.last_name, s.name as subscription_name, s.price, g.name as gym_name
        FROM user_subscriptions us
        JOIN users u ON us.user_id = u.id
        JOIN subscriptions s ON us.subscription_id = s.id
        JOIN gyms g ON s.gym_id = g.id
        WHERE s.gym_id IN (${gymIds.map(() => '?').join(',')})
          AND us.record_status = 1
          AND us.created_at >= ?
        ORDER BY us.created_at DESC
        LIMIT 5
      `, {
        replacements: [...gymIds, last7Days],
        type: sequelize.QueryTypes.SELECT
      });

      recentSubscriptions.forEach(sub => {
        activities.push({
          type: 'member_joined',
          message: `${sub.first_name} ${sub.last_name} subscribed to ${sub.subscription_name} at ${sub.gym_name}`,
          timestamp: sub.created_at
        });
      });

      // Get recent payments
      const recentPayments = await sequelize.query(`
        SELECT p.created_at, p.amount, u.first_name, u.last_name, g.name as gym_name
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN users u ON us.user_id = u.id
        JOIN subscriptions s ON us.subscription_id = s.id
        JOIN gyms g ON s.gym_id = g.id
        WHERE s.gym_id IN (${gymIds.map(() => '?').join(',')})
          AND p.status = 'completed'
          AND p.record_status = 1
          AND p.created_at >= ?
        ORDER BY p.created_at DESC
        LIMIT 3
      `, {
        replacements: [...gymIds, last7Days],
        type: sequelize.QueryTypes.SELECT
      });

      recentPayments.forEach(payment => {
        activities.push({
          type: 'payment_received',
          message: `Payment received from ${payment.first_name} ${payment.last_name} - ₹${payment.amount.toLocaleString()}`,
          timestamp: payment.created_at
        });
      });

      // Sort by timestamp and return latest 10
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

    } catch (error) {
      console.error('Error getting recent owner activity:', error);
      return [];
    }
  }

  static async getUserFavoriteGym(userId) {
    try {
      // Get user's most visited gym
      const favoriteGym = await sequelize.query(`
        SELECT g.name, g.id, COUNT(*) as visit_count
        FROM attendances a
        JOIN gyms g ON a.gym_id = g.id
        WHERE a.user_id = ?
          AND a.record_status = 1
        GROUP BY g.id, g.name
        ORDER BY visit_count DESC
        LIMIT 1
      `, {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT
      });

      return favoriteGym.length > 0 ? favoriteGym[0] : null;
    } catch (error) {
      console.error('Error getting user favorite gym:', error);
      return null;
    }
  }

  static async getRecentUserActivity(userId) {
    try {
      const activities = [];
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      // Get recent check-ins
      const recentCheckIns = await sequelize.query(`
        SELECT a.check_in_time, g.name as gym_name,
               TIMESTAMPDIFF(HOUR, a.check_in_time, COALESCE(a.check_out_time, NOW())) as duration
        FROM attendances a
        JOIN gyms g ON a.gym_id = g.id
        WHERE a.user_id = ?
          AND a.record_status = 1
          AND a.check_in_time >= ?
        ORDER BY a.check_in_time DESC
        LIMIT 5
      `, {
        replacements: [userId, last30Days],
        type: sequelize.QueryTypes.SELECT
      });

      recentCheckIns.forEach(checkin => {
        const duration = checkin.duration || 0;
        activities.push({
          type: 'workout_completed',
          message: `Completed ${duration}h workout at ${checkin.gym_name}`,
          timestamp: checkin.check_in_time
        });
      });

      // Get recent subscriptions
      const recentSubscriptions = await sequelize.query(`
        SELECT us.created_at, s.name, g.name as gym_name, sub.price
        FROM user_subscriptions us
        JOIN subscriptions sub ON us.subscription_id = sub.id
        JOIN subscriptions s ON us.subscription_id = s.id
        JOIN gyms g ON s.gym_id = g.id
        WHERE us.user_id = ?
          AND us.record_status = 1
          AND us.created_at >= ?
        ORDER BY us.created_at DESC
        LIMIT 3
      `, {
        replacements: [userId, last30Days],
        type: sequelize.QueryTypes.SELECT
      });

      recentSubscriptions.forEach(sub => {
        activities.push({
          type: 'subscription_renewed',
          message: `Subscribed to ${sub.name} at ${sub.gym_name}`,
          timestamp: sub.created_at
        });
      });

      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

    } catch (error) {
      console.error('Error getting recent user activity:', error);
      return [];
    }
  }

  // New helper methods for real data calculations
  static async calculateRevenueGrowthRate(gymId, currentMonthStart) {
    try {
      const lastMonthStart = new Date(currentMonthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(currentMonthStart);
      lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);

      const [currentRevenue, lastRevenue] = await Promise.all([
        this.calculateOwnerMonthlyRevenue([gymId], currentMonthStart),
        this.calculateOwnerMonthlyRevenue([gymId], lastMonthStart)
      ]);

      if (lastRevenue === 0) {
        return currentRevenue > 0 ? 100 : 0;
      }

      return Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100);
    } catch (error) {
      console.error('Error calculating revenue growth rate:', error);
      return 0;
    }
  }

  static async calculateCurrentOccupancyRate(gymId, capacity) {
    try {
      if (!capacity || capacity === 0) {
        return 0;
      }

      // Get today's unique check-ins (people currently in gym)
      const currentOccupancy = await sequelize.query(`
        SELECT COUNT(DISTINCT a.user_id) as count
        FROM attendances a
        WHERE a.gym_id = ?
          AND DATE(a.check_in_time) = CURDATE()
          AND a.record_status = 1
          AND (a.check_out_time IS NULL OR a.check_out_time > NOW())
      `, {
        replacements: [gymId],
        type: sequelize.QueryTypes.SELECT
      });

      const occupancyCount = parseInt(currentOccupancy[0]?.count || 0);
      return Math.min(100, Math.round((occupancyCount / capacity) * 100));
    } catch (error) {
      console.error('Error calculating occupancy rate:', error);
      return 0;
    }
  }

  static async getWeeklyWorkouts(userId, weekAgo) {
    try {
      const weeklyWorkouts = await sequelize.query(`
        SELECT COUNT(DISTINCT DATE(check_in_time)) as count
        FROM attendances
        WHERE user_id = ?
          AND check_in_time >= ?
          AND record_status = 1
      `, {
        replacements: [userId, weekAgo],
        type: sequelize.QueryTypes.SELECT
      });

      return parseInt(weeklyWorkouts[0]?.count || 0);
    } catch (error) {
      console.error('Error getting weekly workouts:', error);
      return 0;
    }
  }

  static async getMonthlyWorkouts(userId, monthAgo) {
    try {
      const monthlyWorkouts = await sequelize.query(`
        SELECT COUNT(DISTINCT DATE(check_in_time)) as count
        FROM attendances
        WHERE user_id = ?
          AND check_in_time >= ?
          AND record_status = 1
      `, {
        replacements: [userId, monthAgo],
        type: sequelize.QueryTypes.SELECT
      });

      return parseInt(monthlyWorkouts[0]?.count || 0);
    } catch (error) {
      console.error('Error getting monthly workouts:', error);
      return 0;
    }
  }

  static async getUpcomingBookings(userId) {
    try {
      // This would require a bookings table - for now return empty
      // In future, implement with actual booking system
      return [];
    } catch (error) {
      console.error('Error getting upcoming bookings:', error);
      return [];
    }
  }
}

module.exports = DashboardService;
