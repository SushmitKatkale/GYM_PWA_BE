const webPush = require('web-push');
const { UserNotificationSettings, User, PushSubscription } = require('../models');
const mailService = require('./mailService');
require('dotenv').config();

class NotificationService {
  constructor() {
    // Configure web-push with VAPID keys
    webPush.setVapidDetails(
      `mailto:${process.env.EMAIL_USER}`,
      process.env.VAPID_PUBLIC_KEY || 'BN4jOQ1FqF5gHJwkYjW_VXqG8B8N2K4lQ7-mXYVm7bPJN8L9FHQ2R5mP0Xs8GHW_VYqF8L9N2K4lQ7-mXYVm7bP',
      process.env.VAPID_PRIVATE_KEY || 'your-private-key-here'
    );
  }

  // Send push notification to a user
  async sendPushNotification(userEmail, payload, options = {}) {
    try {
      console.log(`🔔 Attempting to send push notification to: ${userEmail}`);
      
      // Try to get user's notification settings (optional)
      let userSettings = null;
      try {
        userSettings = await UserNotificationSettings.findOne({
          where: { userEmail }
        });
      } catch (settingsError) {
        console.log(`⚠️ UserNotificationSettings not available, proceeding without settings check:`, settingsError.message);
      }

      // Only check settings if they exist and are disabled
      if (userSettings && userSettings.pushNotifications === false) {
        console.log(`❌ Push notifications explicitly disabled for user: ${userEmail}`);
        return { success: false, reason: 'Push notifications disabled' };
      }

      // Get all push subscriptions for the user
      const subscriptions = await PushSubscription.findAll({
        where: { userEmail, isActive: true }
      });

      console.log(`📱 Found ${subscriptions.length} active subscriptions for ${userEmail}`);
      
      if (subscriptions.length === 0) {
        console.log(`❌ No active push subscriptions found for user: ${userEmail}`);
        return { success: false, reason: 'No active subscriptions' };
      }

      const results = [];
      
      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey
            }
          };

          const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge || '/icons/icon-72x72.png',
            image: payload.image,
            data: {
              url: payload.url || '/',
              timestamp: Date.now(),
              ...payload.data
            },
            actions: payload.actions || [],
            requireInteraction: payload.requireInteraction || false,
            silent: payload.silent || false,
            vibrate: payload.vibrate || [100, 50, 100],
            tag: payload.tag || 'gym-notification',
            renotify: payload.renotify || true
          });

          const response = await webPush.sendNotification(
            pushSubscription, 
            notificationPayload,
            {
              TTL: options.ttl || 86400, // 24 hours
              urgency: options.urgency || 'normal', // low, normal, high
              topic: options.topic
            }
          );

          results.push({ 
            subscriptionId: subscription.id, 
            success: true, 
            response 
          });

          console.log(`Push notification sent successfully to subscription ${subscription.id}`);
        } catch (error) {
          console.error(`Failed to send push notification to subscription ${subscription.id}:`, error);
          
          // If subscription is invalid (410 error), mark as inactive
          if (error.statusCode === 410) {
            await subscription.update({ isActive: false });
          }
          
          results.push({ 
            subscriptionId: subscription.id, 
            success: false, 
            error: error.message 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        totalSubscriptions: subscriptions.length,
        successCount,
        results
      };

    } catch (error) {
      console.error('Error in sendPushNotification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email notification
  async sendEmailNotification(userEmail, subject, content, options = {}) {
    try {
      // Get user's notification settings
      const userSettings = await UserNotificationSettings.findOne({
        where: { userEmail }
      });

      // Check if user has email notifications enabled
      if (!userSettings || !userSettings.emailNotifications) {
        console.log(`Email notifications disabled for user: ${userEmail}`);
        return { success: false, reason: 'Email notifications disabled' };
      }

      // Check notification type specific settings
      if (options.type === 'promotional' && !userSettings.promotionalEmails) {
        console.log(`Promotional emails disabled for user: ${userEmail}`);
        return { success: false, reason: 'Promotional emails disabled' };
      }

      const result = await mailService.sendHtmlMail({
        to: userEmail,
        subject,
        text: content.text || content,
        html: content.html || content,
        attachments: options.attachments || []
      });

      return result;
    } catch (error) {
      console.error('Error in sendEmailNotification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification (placeholder - integrate with SMS provider like Twilio)
  async sendSMSNotification(userEmail, message, options = {}) {
    try {
      // Get user's notification settings and phone number
      const user = await User.findOne({
        where: { email: userEmail },
        include: [{
          model: UserNotificationSettings,
          as: 'notificationSettings'
        }]
      });

      if (!user) {
        return { success: false, reason: 'User not found' };
      }

      if (!user.phoneNumber) {
        return { success: false, reason: 'Phone number not available' };
      }

      // Check if user has SMS notifications enabled
      if (!user.notificationSettings || !user.notificationSettings.smsNotifications) {
        console.log(`SMS notifications disabled for user: ${userEmail}`);
        return { success: false, reason: 'SMS notifications disabled' };
      }

      // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
      console.log(`SMS would be sent to ${user.phoneNumber}: ${message}`);
      
      // Mock response for now
      return {
        success: true,
        phoneNumber: user.phoneNumber,
        message: 'SMS sent successfully (mock)'
      };

    } catch (error) {
      console.error('Error in sendSMSNotification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send multi-channel notification (email + push + SMS)
  async sendMultiChannelNotification(userEmail, notification, options = {}) {
    try {
      const results = {
        email: null,
        push: null,
        sms: null
      };

      const user = await User.findOne({
        where: { email: userEmail },
        include: [{
          model: UserNotificationSettings,
          as: 'notificationSettings'
        }]
      });

      if (!user) {
        throw new Error('User not found');
      }

      const settings = user.notificationSettings;
      
      // Send email notification
      if (settings?.emailNotifications && notification.email) {
        results.email = await this.sendEmailNotification(
          userEmail, 
          notification.email.subject,
          notification.email.content,
          { type: options.type, attachments: notification.email.attachments }
        );
      }

      // Send push notification
      if (settings?.pushNotifications && notification.push) {
        results.push = await this.sendPushNotification(
          userEmail,
          notification.push,
          options.pushOptions || {}
        );
      }

      // Send SMS notification
      if (settings?.smsNotifications && notification.sms) {
        results.sms = await this.sendSMSNotification(
          userEmail,
          notification.sms.message,
          options.smsOptions || {}
        );
      }

      return {
        success: true,
        userEmail,
        results
      };

    } catch (error) {
      console.error('Error in sendMultiChannelNotification:', error);
      return { success: false, error: error.message };
    }
  }

  // Predefined notification templates
  async sendSubscriptionExpiry(userEmail, subscriptionData) {
    const notification = {
      email: {
        subject: `${subscriptionData.gymName} - Subscription Expiring Soon`,
        content: {
          html: this.generateSubscriptionExpiryHTML(subscriptionData),
          text: `Your subscription at ${subscriptionData.gymName} expires on ${subscriptionData.expiryDate}. Please renew to continue accessing the gym.`
        }
      },
      push: {
        title: 'Subscription Expiring',
        body: `Your ${subscriptionData.gymName} subscription expires in ${subscriptionData.daysLeft} days`,
        icon: '/icons/icon-192x192.png',
        url: '/my-subscriptions',
        tag: 'subscription-expiry',
        requireInteraction: true
      },
      sms: {
        message: `${subscriptionData.gymName}: Your subscription expires in ${subscriptionData.daysLeft} days. Renew now to avoid interruption.`
      }
    };

    return await this.sendMultiChannelNotification(userEmail, notification, { type: 'subscription' });
  }

  async sendClassReminder(userEmail, classData) {
    const notification = {
      email: {
        subject: `Upcoming Class: ${classData.className}`,
        content: {
          html: this.generateClassReminderHTML(classData),
          text: `Reminder: You have ${classData.className} scheduled for ${classData.startTime} at ${classData.gymName}.`
        }
      },
      push: {
        title: 'Class Reminder',
        body: `${classData.className} starts in ${classData.minutesUntil} minutes at ${classData.gymName}`,
        icon: '/icons/icon-192x192.png',
        url: '/calendar',
        tag: 'class-reminder',
        actions: [
          { action: 'check-in', title: 'Check In' },
          { action: 'cancel', title: 'Cancel' }
        ]
      },
      sms: {
        message: `Class reminder: ${classData.className} at ${classData.gymName} starts at ${classData.startTime}`
      }
    };

    return await this.sendMultiChannelNotification(userEmail, notification, { type: 'class' });
  }

  async sendWorkoutReminder(userEmail, workoutData) {
    const notification = {
      push: {
        title: 'Workout Reminder',
        body: workoutData.customMessage || "Don't forget your workout today! Stay consistent with your fitness goals.",
        icon: '/icons/icon-192x192.png',
        url: '/dashboard',
        tag: 'workout-reminder',
        silent: workoutData.silent || false
      }
    };

    return await this.sendMultiChannelNotification(userEmail, notification, { type: 'workout' });
  }

  async sendPromotionalNotification(userEmail, promoData) {
    const notification = {
      email: {
        subject: promoData.subject,
        content: {
          html: this.generatePromotionalHTML(promoData),
          text: promoData.text
        }
      },
      push: {
        title: promoData.title,
        body: promoData.body,
        icon: '/icons/icon-192x192.png',
        image: promoData.image,
        url: promoData.url || '/discover',
        tag: 'promotion'
      }
    };

    return await this.sendMultiChannelNotification(userEmail, notification, { type: 'promotional' });
  }

  // HTML template generators
  generateSubscriptionExpiryHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Expiring</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Subscription Expiring Soon</h1>
          </div>
          <div class="content">
            <div class="warning">
              <strong>Important:</strong> Your subscription is expiring soon!
            </div>
            <p>Dear valued member,</p>
            <p>Your subscription at <strong>${data.gymName}</strong> will expire on <strong>${data.expiryDate}</strong> (${data.daysLeft} days from now).</p>
            <p><strong>Subscription Details:</strong></p>
            <ul>
              <li>Gym: ${data.gymName}</li>
              <li>Plan: ${data.planName}</li>
              <li>Expiry Date: ${data.expiryDate}</li>
              <li>Days Remaining: ${data.daysLeft}</li>
            </ul>
            <p>To avoid any interruption in your gym access, please renew your subscription before the expiry date.</p>
            <a href="${data.renewalUrl || '#'}" class="button">Renew Subscription</a>
            <p>If you have any questions, please contact our support team.</p>
            <p>Thank you for choosing ${data.gymName}!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateClassReminderHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Class Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .class-info { background: #f0f7ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏋️ Class Reminder</h1>
          </div>
          <div class="content">
            <p>Hi there!</p>
            <p>This is a friendly reminder about your upcoming class:</p>
            <div class="class-info">
              <h3>${data.className}</h3>
              <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>Location:</strong> ${data.gymName}</p>
              <p><strong>Instructor:</strong> ${data.instructor}</p>
              <p><strong>Duration:</strong> ${data.duration}</p>
            </div>
            <p>Please arrive 10-15 minutes early to prepare for the class.</p>
            <p>See you there!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePromotionalHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .cta-button { display: inline-block; background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
          .promo-banner { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ${data.title}</h1>
          </div>
          <div class="content">
            ${data.bannerText ? `<div class="promo-banner"><strong>${data.bannerText}</strong></div>` : ''}
            <div>${data.htmlContent}</div>
            ${data.ctaUrl ? `<a href="${data.ctaUrl}" class="cta-button">${data.ctaText || 'Learn More'}</a>` : ''}
            <p><small>This promotional offer is valid until ${data.validUntil || 'further notice'}.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Bulk notification methods
  async sendBulkNotification(userEmails, notification, options = {}) {
    const results = [];
    
    for (const email of userEmails) {
      try {
        const result = await this.sendMultiChannelNotification(email, notification, options);
        results.push({ email, ...result });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    return {
      total: userEmails.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // Send global notification to all active users with batching
  async sendGlobalNotificationBulk(notificationData, options = {}) {
    try {
      const { User } = require('../models');
      const batchSize = options.batchSize || 10;
      const delay = options.delay || 100; // ms delay between batches
      
      // Get all active users
      const users = await User.findAll({
        where: {
          isActive: true // Adjust this condition based on your User model
        },
        attributes: ['email'],
        limit: options.maxUsers || 1000
      });

      console.log(`Preparing to send global notification to ${users.length} users`);

      const userEmails = users.map(u => u.email);
      const results = {
        total: userEmails.length,
        successful: 0,
        failed: 0,
        batches: [],
        startTime: new Date(),
        endTime: null
      };

      // Process in batches
      for (let i = 0; i < userEmails.length; i += batchSize) {
        const batch = userEmails.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(userEmails.length / batchSize);
        
        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`);

        try {
          const batchResults = await Promise.allSettled(
            batch.map(email => this.sendMultiChannelNotification(email, notificationData, options))
          );

          const batchSummary = {
            batchNumber,
            users: batch,
            successful: 0,
            failed: 0,
            results: []
          };

          batchResults.forEach((result, index) => {
            const userEmail = batch[index];
            if (result.status === 'fulfilled' && result.value.success) {
              batchSummary.successful++;
              results.successful++;
              batchSummary.results.push({
                email: userEmail,
                success: true,
                results: result.value.results
              });
            } else {
              batchSummary.failed++;
              results.failed++;
              const error = result.status === 'rejected' ? result.reason.message : result.value?.error || 'Unknown error';
              batchSummary.results.push({
                email: userEmail,
                success: false,
                error
              });
            }
          });

          results.batches.push(batchSummary);
          console.log(`Batch ${batchNumber} completed: ${batchSummary.successful} successful, ${batchSummary.failed} failed`);

          // Add delay between batches
          if (i + batchSize < userEmails.length && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError);
          // Mark all users in this batch as failed
          batch.forEach(email => {
            results.failed++;
          });
        }
      }

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;

      console.log(`Global notification completed in ${results.duration}ms. Success: ${results.successful}/${results.total}`);

      return results;

    } catch (error) {
      console.error('Error in sendGlobalNotificationBulk:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
