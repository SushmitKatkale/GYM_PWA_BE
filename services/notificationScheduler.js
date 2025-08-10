const cron = require('node-cron');
const { Notification } = require('../models');
const NotificationController = require('../controllers/notificationController');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
  }

  // Start the scheduler - runs every minute
  start() {
    if (this.isRunning) {
      console.log('Notification scheduler is already running');
      return;
    }

    console.log('Starting notification scheduler...');
    this.isRunning = true;

    // Run every minute to check for scheduled notifications
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        await this.processScheduledNotifications();
      } catch (error) {
        console.error('Error processing scheduled notifications:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    console.log('Notification scheduler started successfully');
  }

  // Stop the scheduler
  stop() {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.isRunning = false;
      console.log('Notification scheduler stopped');
    }
  }

  // Process notifications that are due to be sent
  async processScheduledNotifications() {
    try {
      // Get all notifications that are scheduled to be sent now or in the past
      const dueNotifications = await Notification.getScheduledNotifications();
      
      if (dueNotifications.length === 0) {
        return; // No notifications to process
      }

      console.log(`Processing ${dueNotifications.length} scheduled notifications`);

      for (const notification of dueNotifications) {
        try {
          console.log(`Processing scheduled notification ${notification.id}: "${notification.title}"`);

          let result;
          
          if (notification.recipientEmail) {
            // Send to specific user
            result = await NotificationController.sendNotificationToUser(notification, notification.recipientEmail);
          } else if (notification.recipientRole) {
            // Send to users with specific role
            result = await NotificationController.sendNotificationToRole(notification, notification.recipientRole);
          } else if (notification.isGlobal) {
            // Send to all users
            result = await NotificationController.sendGlobalNotification(notification);
          } else {
            console.warn(`Notification ${notification.id} has no valid recipients`);
            continue;
          }

          // Update the notification to mark it as processed
          await notification.update({
            deliveryStatus: {
              ...notification.deliveryStatus,
              scheduledProcessing: {
                timestamp: new Date().toISOString(),
                result: result,
                processed: true
              }
            }
          });

          console.log(`Scheduled notification ${notification.id} processed successfully`);

        } catch (notificationError) {
          console.error(`Error processing notification ${notification.id}:`, notificationError);
          
          // Mark notification as failed
          await notification.update({
            deliveryStatus: {
              ...notification.deliveryStatus,
              scheduledProcessing: {
                timestamp: new Date().toISOString(),
                error: notificationError.message,
                processed: true,
                failed: true
              }
            }
          });
        }
      }

    } catch (error) {
      console.error('Error in processScheduledNotifications:', error);
    }
  }

  // Manually trigger processing (for testing)
  async triggerProcessing() {
    console.log('Manually triggering scheduled notification processing...');
    await this.processScheduledNotifications();
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDates().toString() : null
    };
  }
}

module.exports = new NotificationScheduler();
