const { Gym, UserSubscription, Subscription, Attendance, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');

class OwnerAnalyticsService {
  /**
   * Get comprehensive gym analytics for owner dashboard
   */
  static async getOwnerGymAnalytics(ownerId, gymId) {
    try {
      // Get owner's gym to ensure ownership
      const ownerGym = await Gym.findOne({
        where: { 
          id: gymId,
          ownerId: ownerId,
          recordStatus: 1
        }
      });

      if (!ownerGym) {
        return {
          success: false,
          message: 'Gym not found or access denied'
        };
      }

      // Get real analytics data
      const [
        weeklyTrends,
        popularTimes,
        currentOccupancy,
        monthlyStats,
        todayStats
      ] = await Promise.all([
        this.getWeeklyAttendanceTrends(gymId),
        this.getPopularTimes(gymId),
        this.getCurrentOccupancy(gymId),
        this.getMonthlyGymStats(gymId),
        this.getTodayStats(gymId)
      ]);

      return {
        success: true,
        data: {
          gymInfo: {
            id: ownerGym.id,
            name: ownerGym.name,
            capacity: ownerGym.capacity || 100,
            currentOccupancy,
            occupancyRate: ownerGym.capacity > 0 ? Math.round((currentOccupancy / ownerGym.capacity) * 100) : 0,
            rating: parseFloat(ownerGym.rating || 0),
            activeMembers: monthlyStats.activeMembers,
            address: ownerGym.address,
            city: ownerGym.city || 'Unknown',
            state: ownerGym.state || 'Unknown'
          },
          weeklyTrends,
          popularTimes,
          monthlyStats: {
            ...monthlyStats,
            revenue: this.formatINR(monthlyStats.revenue),
            avgSessionDuration: monthlyStats.avgSessionDuration + ' minutes'
          },
          todayStats: {
            ...todayStats,
            revenue: this.formatINR(todayStats.revenue)
          }
        }
      };
    } catch (error) {
      console.error('Error getting gym analytics:', error);
      return {
        success: false,
        message: 'Failed to fetch gym analytics'
      };
    }
  }

  /**
   * Get weekly attendance trends with real data
   */
  static async getWeeklyAttendanceTrends(gymId) {
    try {
      if (!Attendance) {
        return [];
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const weeklyData = await sequelize.query(`
        SELECT 
          DAYNAME(check_in_time) as day,
          DATE(check_in_time) as date,
          COUNT(*) as checkins
        FROM attendances
        WHERE gym_id = :gymId
          AND check_in_time >= :startDate
          AND record_status = 1
        GROUP BY DATE(check_in_time), DAYNAME(check_in_time)
        ORDER BY date ASC
      `, {
        replacements: { gymId, startDate: oneWeekAgo },
        type: sequelize.QueryTypes.SELECT
      });

      // Fill in missing days with 0 checkins
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const trends = dayNames.map(dayName => {
        const dayData = weeklyData.find(d => d.day === dayName);
        return {
          day: dayName.slice(0, 3), // Mon, Tue, etc.
          checkins: parseInt(dayData?.checkins || 0)
        };
      });

      return trends;
    } catch (error) {
      console.error('Error getting weekly trends:', error);
      return [];
    }
  }

  /**
   * Get popular gym usage times
   */
  static async getPopularTimes(gymId) {
    try {
      if (!Attendance) {
        return [];
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const timeData = await sequelize.query(`
        SELECT 
          HOUR(check_in_time) as hour,
          COUNT(*) as visit_count
        FROM attendances
        WHERE gym_id = :gymId
          AND check_in_time >= :startDate
          AND record_status = 1
        GROUP BY HOUR(check_in_time)
        ORDER BY hour ASC
      `, {
        replacements: { gymId, startDate: thirtyDaysAgo },
        type: sequelize.QueryTypes.SELECT
      });

      // Convert to 24-hour format display and fill gaps
      const popularTimes = [];
      for (let hour = 6; hour <= 22; hour++) { // Gym hours 6 AM to 10 PM
        const hourData = timeData.find(t => parseInt(t.hour) === hour);
        const usage = parseInt(hourData?.visit_count || 0);
        
        popularTimes.push({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          usage
        });
      }

      return popularTimes;
    } catch (error) {
      console.error('Error getting popular times:', error);
      return [];
    }
  }

  /**
   * Get current gym occupancy
   */
  static async getCurrentOccupancy(gymId) {
    try {
      if (!Attendance) {
        return 0;
      }

      const currentOccupancy = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM attendances
        WHERE gym_id = :gymId
          AND check_out_time IS NULL
          AND record_status = 1
          AND DATE(check_in_time) = CURDATE()
      `, {
        replacements: { gymId },
        type: sequelize.QueryTypes.SELECT
      });

      return parseInt(currentOccupancy[0]?.count || 0);
    } catch (error) {
      console.error('Error getting current occupancy:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive monthly statistics
   */
  static async getMonthlyGymStats(gymId) {
    try {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);

      const [revenueData, memberData, sessionData, totalSessions] = await Promise.all([
        this.calculateMonthlyGymRevenue(gymId, firstDayOfMonth),
        this.getGymActiveMembers(gymId),
        this.getAverageSessionDuration(gymId),
        this.getMonthlySessionCount(gymId)
      ]);

      return {
        revenue: revenueData,
        activeMembers: memberData,
        avgSessionDuration: sessionData,
        totalSessions
      };
    } catch (error) {
      console.error('Error getting monthly stats:', error);
      return {
        revenue: 0,
        activeMembers: 0,
        avgSessionDuration: 0,
        totalSessions: 0
      };
    }
  }

  /**
   * Get today's statistics
   */
  static async getTodayStats(gymId) {
    try {
      const [todayRevenue, todayCheckIns, todayNewMembers] = await Promise.all([
        this.calculateTodayRevenue(gymId),
        this.getTodayCheckInCount(gymId),
        this.getTodayNewMembers(gymId)
      ]);

      return {
        revenue: todayRevenue,
        checkIns: todayCheckIns,
        newMembers: todayNewMembers
      };
    } catch (error) {
      console.error('Error getting today stats:', error);
      return {
        revenue: 0,
        checkIns: 0,
        newMembers: 0
      };
    }
  }

  /**
   * Calculate monthly revenue from payments
   */
  static async calculateMonthlyGymRevenue(gymId, startDate) {
    try {
      if (!Payment) {
        return 0;
      }

      const revenueQuery = await sequelize.query(`
        SELECT COALESCE(SUM(p.amount), 0) as revenue
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND p.created_at >= :startDate
          AND p.status = 'completed'
          AND p.record_status = 1
      `, {
        replacements: { gymId, startDate },
        type: sequelize.QueryTypes.SELECT
      });

      return parseFloat(revenueQuery[0]?.revenue || 0);
    } catch (error) {
      console.error('Error calculating monthly revenue:', error);
      return 0;
    }
  }

  /**
   * Calculate today's revenue
   */
  static async calculateTodayRevenue(gymId) {
    try {
      if (!Payment) {
        return 0;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const revenueQuery = await sequelize.query(`
        SELECT COALESCE(SUM(p.amount), 0) as revenue
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND DATE(p.created_at) = CURDATE()
          AND p.status = 'completed'
          AND p.record_status = 1
      `, {
        replacements: { gymId },
        type: sequelize.QueryTypes.SELECT
      });

      return parseFloat(revenueQuery[0]?.revenue || 0);
    } catch (error) {
      console.error('Error calculating today revenue:', error);
      return 0;
    }
  }

  /**
   * Get active members count for gym
   */
  static async getGymActiveMembers(gymId) {
    try {
      const activeMembers = await sequelize.query(`
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
        replacements: { gymId },
        type: sequelize.QueryTypes.SELECT
      });

      return parseInt(activeMembers[0]?.count || 0);
    } catch (error) {
      console.error('Error getting active members:', error);
      return 0;
    }
  }

  /**
   * Get average session duration
   */
  static async getAverageSessionDuration(gymId) {
    try {
      if (!Attendance) {
        return 0;
      }

      const avgDuration = await sequelize.query(`
        SELECT AVG(duration_minutes) as avg_duration
        FROM attendances
        WHERE gym_id = :gymId
          AND duration_minutes IS NOT NULL
          AND duration_minutes > 0
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          AND record_status = 1
      `, {
        replacements: { gymId },
        type: sequelize.QueryTypes.SELECT
      });

      return Math.round(parseFloat(avgDuration[0]?.avg_duration || 60));
    } catch (error) {
      console.error('Error getting average session duration:', error);
      return 0;
    }
  }

  /**
   * Get monthly session count
   */
  static async getMonthlySessionCount(gymId) {
    try {
      if (!Attendance) {
        return 0;
      }

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);

      const sessionCount = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM attendances
        WHERE gym_id = :gymId
          AND check_in_time >= :startDate
          AND record_status = 1
      `, {
        replacements: { gymId, startDate: firstDayOfMonth },
        type: sequelize.QueryTypes.SELECT
      });

      return parseInt(sessionCount[0]?.count || 0);
    } catch (error) {
      console.error('Error getting monthly session count:', error);
      return 0;
    }
  }

  /**
   * Get today's check-in count
   */
  static async getTodayCheckInCount(gymId) {
    try {
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
      console.error('Error getting today check-in count:', error);
      return 0;
    }
  }

  /**
   * Get today's new members
   */
  static async getTodayNewMembers(gymId) {
    try {
      if (!UserSubscription) {
        return 0;
      }

      const newMembers = await sequelize.query(`
        SELECT COUNT(DISTINCT us.user_id) as count
        FROM user_subscriptions us
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND DATE(us.created_at) = CURDATE()
          AND us.record_status = 1
      `, {
        replacements: { gymId },
        type: sequelize.QueryTypes.SELECT
      });

      return parseInt(newMembers[0]?.count || 0);
    } catch (error) {
      console.error('Error getting today new members:', error);
      return 0;
    }
  }

  /**
   * Format currency in INR
   */
  static formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

}

module.exports = OwnerAnalyticsService;