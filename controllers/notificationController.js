const { Notification, PushSubscription, User } = require('../models');
const notificationService = require('../services/notificationService');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');

class NotificationController {
  // Get notifications for current user
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user.id; // Use user ID as primary identifier
      const userEmail = req.user.email; // Keep for backward compatibility
      const { 
        page = 1, 
        limit = 20, 
        type, 
        category, 
        onlyUnread = false 
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const notifications = await Notification.findForUser(userId, userEmail, {
        limit: parseInt(limit),
        offset,
        type,
        category,
        onlyUnread: onlyUnread === 'true'
      });

      const totalCount = await Notification.count({
        where: {
          [Op.or]: [
            { recipient_id: userId }, // Use user ID
            { recipientEmail: userEmail }, // Keep for backward compatibility
            { isGlobal: true }
          ],
          ...(type && { type }),
          ...(category && { category }),
          ...(onlyUnread === 'true' && { isRead: false }),
          expiresAt: {
            [Op.or]: [
              { [Op.gt]: new Date() },
              { [Op.is]: null }
            ]
          }
        }
      });

      const unreadCount = await Notification.getUnreadCount(userId, userEmail);

      return ResponseUtil.success(res, {
        notifications: notifications.map(n => n.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          total: totalCount,
          limit: parseInt(limit),
          unreadCount
        }
      }, 'Notifications retrieved successfully');

    } catch (error) {
      console.error('Get user notifications error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve notifications');
    }
  }

  // Get unread notification count
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id; // Use user ID as primary identifier
      const userEmail = req.user.email; // Keep for backward compatibility
      const unreadCount = await Notification.getUnreadCount(userId, userEmail);

      return ResponseUtil.success(res, { unreadCount }, 'Unread count retrieved successfully');
    } catch (error) {
      console.error('Get unread count error:', error);
      return ResponseUtil.error(res, 'Failed to get unread count');
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id; // Use user ID as primary identifier
      const userEmail = req.user.email; // Keep for backward compatibility

      const notification = await Notification.findOne({
        where: {
          id: notificationId,
          [Op.or]: [
            { recipient_id: userId }, // Use user ID
            { recipientEmail: userEmail }, // Keep for backward compatibility
            { isGlobal: true }
          ]
        }
      });

      if (!notification) {
        return ResponseUtil.notFoundError(res, 'Notification not found');
      }

      if (!notification.isRead) {
        await notification.markAsRead();
      }

      return ResponseUtil.success(res, notification.toJSON(), 'Notification marked as read');
    } catch (error) {
      console.error('Mark as read error:', error);
      return ResponseUtil.error(res, 'Failed to mark notification as read');
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id; // Use user ID as primary identifier
      const userEmail = req.user.email; // Keep for backward compatibility
      const [updatedCount] = await Notification.markAllAsReadForUser(userId, userEmail);

      return ResponseUtil.success(res, { 
        updatedCount 
      }, `${updatedCount} notifications marked as read`);
    } catch (error) {
      console.error('Mark all as read error:', error);
      return ResponseUtil.error(res, 'Failed to mark all notifications as read');
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id; // Use user ID as primary identifier
      const userEmail = req.user.email; // Keep for backward compatibility

      const notification = await Notification.findOne({
        where: {
          id: notificationId,
          [Op.or]: [
            { recipient_id: userId }, // Use user ID
            { recipientEmail: userEmail }, // Keep for backward compatibility
            { isGlobal: true }
          ]
        }
      });

      if (!notification) {
        return ResponseUtil.notFoundError(res, 'Notification not found');
      }

      await notification.destroy();

      return ResponseUtil.success(res, null, 'Notification deleted successfully');
    } catch (error) {
      console.error('Delete notification error:', error);
      return ResponseUtil.error(res, 'Failed to delete notification');
    }
  }

  // Register push subscription
  static async registerPushSubscription(req, res) {
    try {
      const userId = req.user.id; // Use user ID as primary identifier
      const userEmail = req.user.email; // Keep for backward compatibility
      const { subscription, deviceInfo } = req.body;

      if (!subscription || !subscription.endpoint) {
        return ResponseUtil.validationError(res, 'Invalid subscription data');
      }

      // Check if subscription already exists (support both user_id and userEmail)
      const existing = await PushSubscription.findOne({
        where: {
          [Op.or]: [
            { user_id: userId },
            { userEmail: userEmail }
          ],
          endpoint: subscription.endpoint
        }
      });

      if (existing) {
        // Update existing subscription
        await existing.update({
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          isActive: true,
          lastUsed: new Date(),
          userAgent: deviceInfo?.userAgent,
          subscriptionData: subscription
        });

        return ResponseUtil.success(res, existing.toJSON(), 'Push subscription updated successfully');
      }

      // Generate unique ID for subscription
      const generateId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Create new subscription
      const newSubscription = await PushSubscription.create({
        id: generateId(),
        user_id: userId, // Use user ID
        userEmail, // Keep for backward compatibility
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent: deviceInfo?.userAgent,
        subscriptionData: subscription
      });

      return ResponseUtil.success(res, newSubscription.toJSON(), 'Push subscription registered successfully', 201);
    } catch (error) {
      console.error('Register push subscription error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        sql: error.sql || 'N/A'
      });
      return ResponseUtil.error(res, 'Failed to register push subscription');
    }
  }

  // Unregister push subscription
  static async unregisterPushSubscription(req, res) {
    try {
      const userEmail = req.user.email;
      const { endpoint } = req.body;

      if (!endpoint) {
        return ResponseUtil.validationError(res, 'Endpoint is required');
      }

      const subscription = await PushSubscription.findOne({
        where: {
          userEmail,
          endpoint
        }
      });

      if (!subscription) {
        return ResponseUtil.notFoundError(res, 'Subscription not found');
      }

      await subscription.update({ isActive: false });

      return ResponseUtil.success(res, null, 'Push subscription unregistered successfully');
    } catch (error) {
      console.error('Unregister push subscription error:', error);
      return ResponseUtil.error(res, 'Failed to unregister push subscription');
    }
  }

  // Get user's push subscriptions
  static async getUserSubscriptions(req, res) {
    try {
      const userEmail = req.user.email;
      
      const subscriptions = await PushSubscription.findActiveByUser(userEmail);

      return ResponseUtil.success(res, {
        subscriptions: subscriptions.map(s => ({
          id: s.id,
          deviceType: s.deviceType,
          platform: s.platform,
          lastUsed: s.lastUsed,
          created_at: s.created_at // Updated field name
        }))
      }, 'Push subscriptions retrieved successfully');
    } catch (error) {
      console.error('Get user subscriptions error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve push subscriptions');
    }
  }

  // Send test notification (for testing purposes)
  static async sendTestNotification(req, res) {
    try {
      const userEmail = req.user.email;
      const { 
        title = 'Test Notification', 
        message = 'This is a test notification from your Gym PWA!',
        type = 'info'
      } = req.body;

      // Create notification in database
      const notification = await Notification.create({
        id: NotificationController.generateNotificationId(),
        title,
        message,
        type,
        category: 'system',
        recipientEmail: userEmail,
        deliveryChannels: ['push'],
        data: { test: true }
      });

      // Send push notification
      const pushResult = await notificationService.sendPushNotification(userEmail, {
        title,
        body: message,
        icon: '/icons/icon-192x192.png',
        tag: 'test-notification',
        data: { notificationId: notification.id }
      });

      // Update delivery status
      await notification.updateDeliveryStatus('push', pushResult.success ? 'sent' : 'failed');

      return ResponseUtil.success(res, {
        notification: notification.toJSON(),
        pushResult
      }, 'Test notification sent successfully');

    } catch (error) {
      console.error('Send test notification error:', error);
      return ResponseUtil.error(res, 'Failed to send test notification');
    }
  }

  // Generate a unique string ID
  static generateNotificationId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }

  // Admin: Create notification
  static async createNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtil.validationError(res, errors.array());
      }

      const senderEmail = req.user.email;
      const {
        title,
        message,
        type = 'info',
        category,
        priority = 'normal',
        recipientEmail,
        recipientRole,
        isGlobal = false,
        gymId,
        actionUrl,
        actionText,
        deliveryChannels = ['push'],
        scheduledFor,
        expiresAt,
        data
      } = req.body;

      const notification = await Notification.create({
        id: NotificationController.generateNotificationId(),
        title,
        message,
        type,
        category,
        priority,
        recipientEmail,
        recipientRole,
        senderEmail,
        isGlobal,
        gymId,
        actionUrl,
        actionText,
        deliveryChannels,
        scheduledFor,
        expiresAt,
        data
      });

      // If not scheduled, send immediately
      if (!scheduledFor) {
        if (recipientEmail) {
          // Send to specific user
          await NotificationController.sendNotificationToUser(notification, recipientEmail);
        } else if (recipientRole) {
          // Send to users with specific role
          await NotificationController.sendNotificationToRole(notification, recipientRole);
        } else if (isGlobal) {
          // Send to all users
          await NotificationController.sendGlobalNotification(notification);
        }
      }

      return ResponseUtil.success(res, notification.toJSON(), 'Notification created successfully', 201);
    } catch (error) {
      console.error('Create notification error:', error);
      return ResponseUtil.error(res, 'Failed to create notification');
    }
  }

  // Admin: Get all notifications
  static async getAllNotifications(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        type, 
        category, 
        recipientEmail,
        isGlobal 
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (type) where.type = type;
      if (category) where.category = category;
      if (recipientEmail) where.recipientEmail = recipientEmail;
      if (isGlobal !== undefined) where.isGlobal = isGlobal === 'true';

      const { count, rows: notifications } = await Notification.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'recipient',
            attributes: ['email', 'firstName', 'lastName'],
            required: false
          },
          {
            model: User,
            as: 'sender',
            attributes: ['email', 'firstName', 'lastName'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']], // Updated field name
        limit: parseInt(limit),
        offset
      });

      return ResponseUtil.success(res, {
        notifications: notifications.map(n => n.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          total: count,
          limit: parseInt(limit)
        }
      }, 'All notifications retrieved successfully');

    } catch (error) {
      console.error('Get all notifications error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve notifications');
    }
  }

  // Admin: Send bulk notification
  static async sendBulkNotification(req, res) {
    try {
      const senderEmail = req.user.email;
      const {
        title,
        message,
        type = 'info',
        category,
        priority = 'normal',
        userEmails,
        role,
        gymId,
        deliveryChannels = ['push', 'email'],
        data
      } = req.body;

      if (!userEmails && !role) {
        return ResponseUtil.validationError(res, 'Either userEmails or role must be specified');
      }

      const results = [];
      let targetUsers = [];

      if (userEmails && userEmails.length > 0) {
        targetUsers = userEmails;
      } else if (role) {
        const users = await User.findAll({
          where: { role: role }, // Updated field name to use role
          attributes: ['email']
        });
        targetUsers = users.map(u => u.email);
      }

      for (const userEmail of targetUsers) {
        try {
          const notification = await Notification.create({
            id: NotificationController.generateNotificationId(),
            title,
            message,
            type,
            category,
            priority,
            recipientEmail: userEmail,
            senderEmail,
            gymId,
            deliveryChannels,
            data
          });

          // Send notification
          const sendResult = await NotificationController.sendNotificationToUser(notification, userEmail);
          results.push({
            userEmail,
            notificationId: notification.id,
            success: true,
            ...sendResult
          });

        } catch (error) {
          results.push({
            userEmail,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return ResponseUtil.success(res, {
        totalSent: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }, `Bulk notification sent to ${successCount} users successfully`);

    } catch (error) {
      console.error('Send bulk notification error:', error);
      return ResponseUtil.error(res, 'Failed to send bulk notification');
    }
  }

  // Helper method to send notification to specific user
  static async sendNotificationToUser(notification, userEmail) {
    const channels = notification.deliveryChannels || ['push'];
    const results = {};

    try {
      if (channels.includes('push')) {
        results.push = await notificationService.sendPushNotification(userEmail, {
          title: notification.title,
          body: notification.message,
          icon: notification.iconUrl || '/icons/icon-192x192.png',
          image: notification.imageUrl,
          url: notification.actionUrl,
          tag: notification.category || 'notification',
          data: {
            notificationId: notification.id,
            ...notification.data
          }
        });
      }

      if (channels.includes('email')) {
        results.email = await notificationService.sendEmailNotification(
          userEmail,
          notification.title,
          notification.message
        );
      }

      if (channels.includes('sms')) {
        results.sms = await notificationService.sendSMSNotification(
          userEmail,
          `${notification.title}: ${notification.message}`
        );
      }

      // Update delivery status
      await notification.update({ deliveryStatus: results });

      return { success: true, results };
    } catch (error) {
      console.error('Send notification to user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper method to send notification to role
  static async sendNotificationToRole(notification, role) {
    const users = await User.findAll({
      where: { role: role }, // Updated field name to use role
      attributes: ['email']
    });

    const results = [];
    for (const user of users) {
      const result = await NotificationController.sendNotificationToUser(notification, user.email);
      results.push({ userEmail: user.email, ...result });
    }

    return results;
  }

  // Helper method to send global notification
  static async sendGlobalNotification(notification) {
    try {
      // Get all active users for global notifications
      // Adjust this query based on your actual User model structure
      const whereConditions = {};
      
      // Add conditions based on what fields exist in your User model
      // Uncomment and modify as needed:
      // whereConditions.isActive = true;
      // whereConditions.emailVerified = true;
      // whereConditions.type = { [Op.in]: ['1', '2'] }; // Exclude admins if needed
      
      const users = await User.findAll({
        where: whereConditions,
        attributes: ['email'],
        limit: 1000 // Prevent sending to too many users at once
      });

      console.log(`Sending global notification to ${users.length} users`);

      const channels = notification.deliveryChannels || ['push'];
      const results = {
        total: users.length,
        successful: 0,
        failed: 0,
        results: []
      };

      // In production, this should be handled by a job queue (like Bull, Agenda, etc.)
      // For now, we'll process in batches to avoid overwhelming the system
      const batchSize = 10;
      const userEmails = users.map(u => u.email);
      
      for (let i = 0; i < userEmails.length; i += batchSize) {
        const batch = userEmails.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (userEmail) => {
          try {
            const channelResults = {};

            // Send push notification
            if (channels.includes('push')) {
              channelResults.push = await notificationService.sendPushNotification(userEmail, {
                title: notification.title,
                body: notification.message,
                icon: notification.iconUrl || '/icons/icon-192x192.png',
                image: notification.imageUrl,
                url: notification.actionUrl,
                tag: notification.category || 'global-notification',
                data: {
                  notificationId: notification.id,
                  ...notification.data
                }
              });
            }

            // Send email notification
            if (channels.includes('email')) {
              channelResults.email = await notificationService.sendEmailNotification(
                userEmail,
                notification.title,
                notification.message,
                { type: notification.category }
              );
            }

            // Send SMS notification
            if (channels.includes('sms')) {
              channelResults.sms = await notificationService.sendSMSNotification(
                userEmail,
                `${notification.title}: ${notification.message}`
              );
            }

            results.successful++;
            return { userEmail, success: true, results: channelResults };
            
          } catch (error) {
            console.error(`Failed to send global notification to ${userEmail}:`, error);
            results.failed++;
            return { userEmail, success: false, error: error.message };
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        results.results.push(...batchResults.map(r => r.value || r.reason));

        // Add small delay between batches to prevent overwhelming external services
        if (i + batchSize < userEmails.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Update notification delivery status
      await notification.update({
        deliveryStatus: {
          globalDelivery: {
            timestamp: new Date().toISOString(),
            totalUsers: results.total,
            successful: results.successful,
            failed: results.failed,
            channels
          }
        }
      });

      console.log(`Global notification completed. Success: ${results.successful}, Failed: ${results.failed}`);

      return {
        success: true,
        message: `Global notification sent to ${results.successful}/${results.total} users`,
        details: results
      };
      
    } catch (error) {
      console.error('Error in sendGlobalNotification:', error);
      
      // Update notification with error status
      await notification.update({
        deliveryStatus: {
          globalDelivery: {
            timestamp: new Date().toISOString(),
            error: error.message,
            success: false
          }
        }
      });

      return { 
        success: false, 
        error: error.message,
        message: 'Failed to send global notification'
      };
    }
  }

  // Clean up expired notifications
  static async cleanupExpiredNotifications(req, res) {
    try {
      const deletedCount = await Notification.cleanupExpiredNotifications();
      const inactiveSubscriptionsCount = await PushSubscription.cleanupInactiveSubscriptions();

      return ResponseUtil.success(res, {
        deletedNotifications: deletedCount,
        deletedSubscriptions: inactiveSubscriptionsCount
      }, 'Cleanup completed successfully');
    } catch (error) {
      console.error('Cleanup expired notifications error:', error);
      return ResponseUtil.error(res, 'Failed to cleanup expired notifications');
    }
  }

  // Admin: Get scheduled notification processing status
  static async getSchedulerStatus(req, res) {
    try {
      const notificationScheduler = require('../services/notificationScheduler');
      const status = notificationScheduler.getStatus();
      
      return ResponseUtil.success(res, status, 'Scheduler status retrieved successfully');
    } catch (error) {
      console.error('Get scheduler status error:', error);
      return ResponseUtil.error(res, 'Failed to get scheduler status');
    }
  }

  // Admin: Manually trigger scheduled notification processing
  static async triggerScheduledProcessing(req, res) {
    try {
      const notificationScheduler = require('../services/notificationScheduler');
      await notificationScheduler.triggerProcessing();
      
      return ResponseUtil.success(res, null, 'Scheduled notification processing triggered successfully');
    } catch (error) {
      console.error('Trigger scheduled processing error:', error);
      return ResponseUtil.error(res, 'Failed to trigger scheduled processing');
    }
  }
}

// Validation middleware
const createNotificationValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['info', 'success', 'warning', 'error', 'promotion', 'reminder']).withMessage('Invalid notification type'),
  body('category').optional().isIn(['subscription', 'class', 'workout', 'payment', 'system', 'promotion', 'reminder', 'security']).withMessage('Invalid category'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('recipientEmail').optional().isEmail().withMessage('Invalid recipient email'),
  body('recipientRole').optional().isIn(['1', '2', '3']).withMessage('Invalid recipient role'),
  body('deliveryChannels').optional().isArray().withMessage('Delivery channels must be an array'),
  body('scheduledFor').optional().isISO8601().withMessage('Invalid scheduled date'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date')
];

NotificationController.createNotificationValidation = createNotificationValidation;

module.exports = NotificationController;
