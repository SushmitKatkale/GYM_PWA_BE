const { 
  Attendance, 
  Gym, 
  User,
  sequelize 
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

/**
 * Get user's attendance history
 * Users can view their own history, gym owners can view their gym's users, admins can view all
 */
const getUserAttendanceHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate, 
      gymId, 
      status = 'all' 
    } = req.query;
    const userEmail = req.user.email;
    const userType = req.user.type;

    // Authorization check
    let targetUserEmail;
    if (userId) {
      // Verify user exists if userId provided
      const targetUser = await User.findByPk(userId);
      if (!targetUser) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }
      targetUserEmail = targetUser.email;

      // Check permissions
      if (userType !== '3' && targetUserEmail !== userEmail) {
        // Check if current user is gym owner and target user has attendance at their gyms
        if (userType === '2') {
          const ownerGyms = await Gym.findAll({
            where: { ownerId: userEmail },
            attributes: ['id']
          });
          const gymIds = ownerGyms.map(gym => gym.id);

          const hasAttendance = await Attendance.findOne({
            where: {
              userEmail: targetUserEmail,
              gymId: { [Op.in]: gymIds }
            }
          });

          if (!hasAttendance) {
            return ResponseUtil.forbiddenError(res, 'You are not authorized to view this user\'s attendance');
          }
        } else {
          return ResponseUtil.forbiddenError(res, 'You are not authorized to view this user\'s attendance');
        }
      }
    } else {
      targetUserEmail = userEmail;
    }

    const offset = (page - 1) * limit;
    const whereClause = { userEmail: targetUserEmail };

    // Date range filter
    if (startDate || endDate) {
      whereClause.checkInTime = {};
      if (startDate) whereClause.checkInTime[Op.gte] = new Date(startDate);
      if (endDate) whereClause.checkInTime[Op.lte] = new Date(endDate);
    }

    // Gym filter
    if (gymId) {
      whereClause.gymId = gymId;
    }

    // Status filter
    if (status !== 'all') {
      whereClause.status = status;
    }

    // Apply gym ownership filter for gym owners
    if (userType === '2' && targetUserEmail !== userEmail) {
      const ownerGyms = await Gym.findAll({
        where: { ownerId: userEmail },
        attributes: ['id']
      });
      whereClause.gymId = { [Op.in]: ownerGyms.map(gym => gym.id) };
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [{
        model: Gym,
        as: 'gym',
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
      }, {
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }],
      order: [['checkInTime', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    // Calculate summary statistics
    const summary = {
      totalVisits: count,
      completedVisits: rows.filter(r => r.status === 'checked_out').length,
      activeCheckIns: rows.filter(r => r.status === 'checked_in').length,
      averageDuration: 0,
      totalDuration: 0
    };

    const completedVisits = rows.filter(r => r.duration);
    if (completedVisits.length > 0) {
      summary.totalDuration = completedVisits.reduce((sum, r) => sum + (r.duration || 0), 0);
      summary.averageDuration = Math.round(summary.totalDuration / completedVisits.length);
    }

    return ResponseUtil.paginated(
      res, 
      { attendances: rows, summary }, 
      count, 
      parseInt(page), 
      parseInt(limit), 
      'Attendance history retrieved successfully'
    );

  } catch (error) {
    console.error('Error getting user attendance history:', error);
    return ResponseUtil.error(res, 'Failed to retrieve attendance history', 500);
  }
};

/**
 * Get gym attendance analytics
 * Only gym owners and admins can view gym analytics
 */
const getGymAttendanceAnalytics = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { 
      period = 'week', // week, month, year
      startDate, 
      endDate 
    } = req.query;
    const userEmail = req.user.email;
    const userType = req.user.type;

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check
    if (userType !== '3' && gym.ownerId !== userEmail) {
      return ResponseUtil.forbiddenError(res, 'You are not authorized to view analytics for this gym');
    }

    // Calculate date range based on period
    let dateStart, dateEnd;
    const now = new Date();

    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
    } else {
      dateEnd = now;
      switch (period) {
        case 'week':
          dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          dateStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    }

    // Get attendance data for the period
    const attendances = await Attendance.findAll({
      where: {
        gymId,
        checkInTime: {
          [Op.between]: [dateStart, dateEnd]
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }],
      order: [['checkInTime', 'ASC']]
    });

    // Calculate analytics
    const analytics = {
      totalVisits: attendances.length,
      uniqueVisitors: new Set(attendances.map(a => a.userEmail)).size,
      completedVisits: attendances.filter(a => a.status === 'checked_out').length,
      activeCheckIns: attendances.filter(a => a.status === 'checked_in').length,
      averageDuration: 0,
      totalDuration: 0,
      peakHours: {},
      popularDays: {},
      checkInMethods: {},
      dailyStats: []
    };

    // Calculate duration stats
    const completedVisits = attendances.filter(a => a.duration);
    if (completedVisits.length > 0) {
      analytics.totalDuration = completedVisits.reduce((sum, a) => sum + (a.duration || 0), 0);
      analytics.averageDuration = Math.round(analytics.totalDuration / completedVisits.length);
    }

    // Calculate peak hours (24-hour format)
    attendances.forEach(a => {
      const hour = new Date(a.checkInTime).getHours();
      analytics.peakHours[hour] = (analytics.peakHours[hour] || 0) + 1;
    });

    // Calculate popular days (0 = Sunday, 6 = Saturday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    attendances.forEach(a => {
      const day = new Date(a.checkInTime).getDay();
      const dayName = dayNames[day];
      analytics.popularDays[dayName] = (analytics.popularDays[dayName] || 0) + 1;
    });

    // Calculate check-in methods usage
    attendances.forEach(a => {
      const method = a.checkInMethod || 'unknown';
      analytics.checkInMethods[method] = (analytics.checkInMethods[method] || 0) + 1;
    });

    // Calculate daily stats
    const dailyStatsMap = {};
    attendances.forEach(a => {
      const date = new Date(a.checkInTime).toISOString().split('T')[0];
      if (!dailyStatsMap[date]) {
        dailyStatsMap[date] = {
          date,
          visits: 0,
          uniqueUsers: new Set(),
          completedVisits: 0,
          totalDuration: 0
        };
      }
      dailyStatsMap[date].visits++;
      dailyStatsMap[date].uniqueUsers.add(a.userEmail);
      if (a.status === 'checked_out' && a.duration) {
        dailyStatsMap[date].completedVisits++;
        dailyStatsMap[date].totalDuration += a.duration;
      }
    });

    // Convert daily stats to array
    analytics.dailyStats = Object.values(dailyStatsMap).map(stat => ({
      date: stat.date,
      visits: stat.visits,
      uniqueUsers: stat.uniqueUsers.size,
      completedVisits: stat.completedVisits,
      averageDuration: stat.completedVisits > 0 ? Math.round(stat.totalDuration / stat.completedVisits) : 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Find peak hour and day
    const peakHour = Object.keys(analytics.peakHours).reduce((a, b) => 
      analytics.peakHours[a] > analytics.peakHours[b] ? a : b
    , '0');
    const peakDay = Object.keys(analytics.popularDays).reduce((a, b) => 
      analytics.popularDays[a] > analytics.popularDays[b] ? a : b
    , 'Monday');

    analytics.insights = {
      peakHour: `${peakHour}:00`,
      peakDay,
      mostPopularMethod: Object.keys(analytics.checkInMethods).reduce((a, b) => 
        analytics.checkInMethods[a] > analytics.checkInMethods[b] ? a : b
      , 'quick_checkin'),
      averageVisitsPerDay: Math.round(analytics.totalVisits / Math.max(1, analytics.dailyStats.length)),
      returnVisitorRate: analytics.uniqueVisitors > 0 ? 
        Math.round(((analytics.totalVisits - analytics.uniqueVisitors) / analytics.totalVisits) * 100) : 0
    };

    return ResponseUtil.success(res, {
      gym,
      period: { start: dateStart, end: dateEnd, period },
      analytics
    }, 'Gym attendance analytics retrieved successfully');

  } catch (error) {
    console.error('Error getting gym attendance analytics:', error);
    return ResponseUtil.error(res, 'Failed to retrieve gym attendance analytics', 500);
  }
};

/**
 * Get current gym occupancy and live statistics
 * Public endpoint for gym occupancy display
 */
const getGymOccupancy = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Verify gym exists
    const gym = await Gym.findByPk(gymId, {
      attributes: ['id', 'name', 'capacity', 'currentOccupancy']
    });

    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Get current active check-ins
    const activeCheckIns = await Attendance.findAll({
      where: {
        gymId,
        status: 'checked_in',
        checkOutTime: null
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName']
      }],
      order: [['checkInTime', 'DESC']]
    });

    // Calculate occupancy statistics
    const currentOccupancy = activeCheckIns.length;
    const occupancyPercentage = gym.capacity > 0 ? 
      Math.round((currentOccupancy / gym.capacity) * 100) : 0;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendances = await Attendance.findAll({
      where: {
        gymId,
        checkInTime: {
          [Op.between]: [today, tomorrow]
        }
      }
    });

    const todayStats = {
      totalVisits: todayAttendances.length,
      uniqueVisitors: new Set(todayAttendances.map(a => a.userEmail)).size,
      completedVisits: todayAttendances.filter(a => a.status === 'checked_out').length,
      peakOccupancy: Math.max(currentOccupancy, 0) // This could be enhanced with historical peak tracking
    };

    return ResponseUtil.success(res, {
      gym,
      occupancy: {
        current: currentOccupancy,
        capacity: gym.capacity,
        percentage: occupancyPercentage,
        available: Math.max(0, gym.capacity - currentOccupancy),
        status: occupancyPercentage >= 90 ? 'full' : 
                occupancyPercentage >= 70 ? 'busy' : 
                occupancyPercentage >= 40 ? 'moderate' : 'quiet'
      },
      activeCheckIns: activeCheckIns.map(a => ({
        id: a.id,
        user: a.user,
        checkInTime: a.checkInTime,
        duration: Math.floor((new Date() - new Date(a.checkInTime)) / 1000 / 60), // minutes
        method: a.checkInMethod
      })),
      todayStats
    }, 'Gym occupancy retrieved successfully');

  } catch (error) {
    console.error('Error getting gym occupancy:', error);
    return ResponseUtil.error(res, 'Failed to retrieve gym occupancy', 500);
  }
};

/**
 * Get attendance summary for multiple gyms (admin only)
 * Provides overview of all gym attendance
 */
const getMultiGymAttendanceSummary = async (req, res) => {
  try {
    const userType = req.user.type;

    // Only admins can view multi-gym summary
    if (userType !== '3') {
      return ResponseUtil.forbiddenError(res, 'Only administrators can view multi-gym attendance summary');
    }

    const { period = 'today' } = req.query;

    // Calculate date range
    let dateStart, dateEnd;
    const now = new Date();
    dateEnd = now;

    switch (period) {
      case 'today':
        dateStart = new Date(now);
        dateStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateStart = new Date(now);
        dateStart.setHours(0, 0, 0, 0);
    }

    // Get all gyms with their stats
    const gyms = await Gym.findAll({
      attributes: ['id', 'name', 'capacity', 'currentOccupancy', 'ownerId'],
      include: [{
        model: User,
        as: 'owner',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    const gymSummaries = await Promise.all(
      gyms.map(async (gym) => {
        // Get attendance for this gym in the period
        const attendances = await Attendance.findAll({
          where: {
            gymId: gym.id,
            checkInTime: {
              [Op.between]: [dateStart, dateEnd]
            }
          }
        });

        // Get current active check-ins
        const activeCheckIns = await Attendance.count({
          where: {
            gymId: gym.id,
            status: 'checked_in',
            checkOutTime: null
          }
        });

        const completedVisits = attendances.filter(a => a.status === 'checked_out');
        const totalDuration = completedVisits.reduce((sum, a) => sum + (a.duration || 0), 0);

        return {
          gym: {
            id: gym.id,
            name: gym.name,
            capacity: gym.capacity,
            owner: gym.owner
          },
          stats: {
            totalVisits: attendances.length,
            uniqueVisitors: new Set(attendances.map(a => a.userEmail)).size,
            activeCheckIns,
            completedVisits: completedVisits.length,
            averageDuration: completedVisits.length > 0 ? 
              Math.round(totalDuration / completedVisits.length) : 0,
            occupancyPercentage: gym.capacity > 0 ? 
              Math.round((activeCheckIns / gym.capacity) * 100) : 0
          }
        };
      })
    );

    // Calculate overall summary
    const overallSummary = {
      totalGyms: gyms.length,
      totalCapacity: gyms.reduce((sum, gym) => sum + (gym.capacity || 0), 0),
      totalActiveCheckIns: gymSummaries.reduce((sum, gs) => sum + gs.stats.activeCheckIns, 0),
      totalVisits: gymSummaries.reduce((sum, gs) => sum + gs.stats.totalVisits, 0),
      totalUniqueVisitors: new Set(
        gymSummaries.flatMap(gs => 
          // This is simplified - would need to query attendances directly for accurate unique count
          Array(gs.stats.uniqueVisitors).fill().map((_, i) => `${gs.gym.id}_user_${i}`)
        )
      ).size,
      averageOccupancyPercentage: gymSummaries.length > 0 ? 
        Math.round(gymSummaries.reduce((sum, gs) => sum + gs.stats.occupancyPercentage, 0) / gymSummaries.length) : 0
    };

    return ResponseUtil.success(res, {
      period: { start: dateStart, end: dateEnd, period },
      overallSummary,
      gymSummaries: gymSummaries.sort((a, b) => b.stats.totalVisits - a.stats.totalVisits)
    }, 'Multi-gym attendance summary retrieved successfully');

  } catch (error) {
    console.error('Error getting multi-gym attendance summary:', error);
    return ResponseUtil.error(res, 'Failed to retrieve multi-gym attendance summary', 500);
  }
};

/**
 * Export attendance data as CSV (gym owners and admins)
 */
const exportAttendanceData = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;
    const userEmail = req.user.email;
    const userType = req.user.type;

    // Verify gym exists and user has permission
    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      return ResponseUtil.notFoundError(res, 'Gym not found');
    }

    // Authorization check
    if (userType !== '3' && gym.ownerId !== userEmail) {
      return ResponseUtil.forbiddenError(res, 'You are not authorized to export attendance data for this gym');
    }

    const whereClause = { gymId };

    // Date range filter
    if (startDate || endDate) {
      whereClause.checkInTime = {};
      if (startDate) whereClause.checkInTime[Op.gte] = new Date(startDate);
      if (endDate) whereClause.checkInTime[Op.lte] = new Date(endDate);
    }

    const attendances = await Attendance.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }],
      order: [['checkInTime', 'DESC']]
    });

    // Format data for export
    const exportData = attendances.map(a => ({
      id: a.id,
      userEmail: a.userEmail,
      userName: `${a.user.firstName} ${a.user.lastName}`,
      checkInTime: a.checkInTime,
      checkOutTime: a.checkOutTime,
      duration: a.duration,
      method: a.checkInMethod,
      status: a.status,
      location: a.checkInLatitude && a.checkInLongitude ? 
        `${a.checkInLatitude}, ${a.checkInLongitude}` : null
    }));

    if (format === 'csv') {
      // Generate CSV format
      const csvHeader = 'ID,User Email,User Name,Check In Time,Check Out Time,Duration (minutes),Method,Status,Location\n';
      const csvData = exportData.map(row => 
        `${row.id},"${row.userEmail}","${row.userName}","${row.checkInTime}","${row.checkOutTime || ''}","${row.duration || ''}","${row.method}","${row.status}","${row.location || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${gym.name}-${Date.now()}.csv"`);
      return res.send(csvHeader + csvData);
    }

    // Return JSON format
    return ResponseUtil.success(res, {
      gym,
      totalRecords: exportData.length,
      dateRange: { startDate, endDate },
      data: exportData
    }, 'Attendance data exported successfully');

  } catch (error) {
    console.error('Error exporting attendance data:', error);
    return ResponseUtil.error(res, 'Failed to export attendance data', 500);
  }
};

module.exports = {
  getUserAttendanceHistory,
  getGymAttendanceAnalytics,
  getGymOccupancy,
  getMultiGymAttendanceSummary,
  exportAttendanceData
};
