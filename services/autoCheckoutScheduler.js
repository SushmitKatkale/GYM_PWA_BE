const { Attendance, Gym, User } = require('../models');
const { Op } = require('sequelize');

class AutoCheckoutScheduler {
  constructor() {
    this.AUTO_LOGOUT_MINUTES = process.env.AUTO_CHECKOUT_MIN_MINUTES || 120; // Exactly 2 hours
    this.scheduledCheckouts = new Map(); // Track scheduled checkouts
  }

  /**
   * Schedule auto-checkout for a specific attendance record
   * @param {number} attendanceId - Attendance record ID
   * @param {Date} checkInTime - When the user checked in
   */
  scheduleCheckout(attendanceId, checkInTime) {
    try {
      // Calculate exact checkout time (120 minutes from check-in)
      const autoLogoutTime = new Date(checkInTime.getTime() + (this.AUTO_LOGOUT_MINUTES * 60 * 1000));
      const delay = autoLogoutTime.getTime() - Date.now();

      if (delay <= 0) {
        // If time has already passed, checkout immediately
        console.log(`Auto-checkout: Attendance ${attendanceId} exceeded 120 minutes, checking out immediately`);
        this.executeAutoCheckout(attendanceId);
        return;
      }

      console.log(`Auto-checkout scheduled for attendance ${attendanceId} in ${Math.round(delay / 1000 / 60)} minutes`);

      // Schedule the checkout using setTimeout
      const timeoutId = setTimeout(() => {
        this.executeAutoCheckout(attendanceId);
      }, delay);

      // Store the scheduled checkout
      this.scheduledCheckouts.set(attendanceId, {
        timeoutId,
        autoLogoutTime,
        attendanceId
      });

    } catch (error) {
      console.error(`Error scheduling auto-checkout for attendance ${attendanceId}:`, error);
    }
  }

  /**
   * Execute auto-checkout for a user
   * @param {number} attendanceId - Attendance record ID
   */
  async executeAutoCheckout(attendanceId) {
    try {
      console.log(`Executing auto-checkout for attendance ${attendanceId}`);

      // Find the attendance record with related data
      const attendance = await Attendance.findByPk(attendanceId, {
        include: [
          {
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!attendance) {
        console.log(`Attendance ${attendanceId} not found for auto-checkout`);
        return;
      }

      // Check if user is still checked in
      if (attendance.checkOutTime !== null) {
        console.log(`User already checked out for attendance ${attendanceId}`);
        this.cancelScheduledCheckout(attendanceId);
        return;
      }

      // Auto-checkout the user exactly at 120 minutes
      const checkOutTime = new Date();
      const duration = this.AUTO_LOGOUT_MINUTES; // Set to exactly 120 minutes

      await attendance.update({
        checkOutTime,
        durationMinutes: duration,
        updatedBy: 0
      });

      console.log(`Auto-checked out ${attendance.user.firstName} ${attendance.user.lastName} from ${attendance.gym.name} after exactly ${duration} minutes`);

      // Remove from scheduled checkouts
      this.scheduledCheckouts.delete(attendanceId);

    } catch (error) {
      console.error(`Error executing auto-checkout for attendance ${attendanceId}:`, error);
    }
  }

  /**
   * Cancel a scheduled checkout (when user manually checks out)
   * @param {number} attendanceId - Attendance record ID
   */
  cancelScheduledCheckout(attendanceId) {
    try {
      const scheduledCheckout = this.scheduledCheckouts.get(attendanceId);

      if (scheduledCheckout) {
        clearTimeout(scheduledCheckout.timeoutId);
        this.scheduledCheckouts.delete(attendanceId);
        console.log(`Cancelled auto-checkout for attendance ${attendanceId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error cancelling auto-checkout for attendance ${attendanceId}:`, error);
      return false;
    }
  }

  /**
   * Initialize scheduler - reschedule existing active check-ins
   */
  async initializeAutoLogout() {
    try {
      console.log('Initializing auto-logout scheduler...');

      // Find all current active check-ins
      const activeCheckIns = await Attendance.findAll({
        where: {
          checkOutTime: null
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          },
          {
            model: Gym,
            as: 'gym',
            attributes: ['name']
          }
        ]
      });

      if (activeCheckIns.length === 0) {
        console.log('No active check-ins found to schedule');
        return;
      }

      console.log(`Found ${activeCheckIns.length} active check-ins to reschedule`);

      // Schedule auto-checkout for each active check-in
      for (const attendance of activeCheckIns) {
        const minutesElapsed = Math.floor((Date.now() - attendance.checkInTime.getTime()) / 1000 / 60);
        
        if (minutesElapsed >= this.AUTO_LOGOUT_MINUTES) {
          // Already exceeded 120 minutes, checkout immediately
          console.log(`${attendance.user.firstName} ${attendance.user.lastName} exceeded 120 minutes (${minutesElapsed} min), auto-checking out`);
          await this.executeAutoCheckout(attendance.id);
        } else {
          // Schedule for future
          this.scheduleCheckout(attendance.id, attendance.checkInTime);
        }
      }

      console.log('Auto-logout scheduler initialized successfully');

    } catch (error) {
      console.error('Error initializing auto-logout scheduler:', error);
    }
  }

  /**
   * Get status of scheduled checkouts
   * @returns {Object} Scheduler status and pending checkouts
   */
  getStatus() {
    const pendingCheckouts = Array.from(this.scheduledCheckouts.values()).map(checkout => ({
      attendanceId: checkout.attendanceId,
      autoLogoutTime: checkout.autoLogoutTime,
      minutesRemaining: Math.max(0, Math.floor((checkout.autoLogoutTime.getTime() - Date.now()) / 1000 / 60))
    }));

    return {
      isActive: true,
      autoLogoutMinutes: this.AUTO_LOGOUT_MINUTES,
      pendingCheckoutsCount: pendingCheckouts.length,
      pendingCheckouts
    };
  }
}

// Create singleton instance
const autoCheckoutScheduler = new AutoCheckoutScheduler();

module.exports = autoCheckoutScheduler;
