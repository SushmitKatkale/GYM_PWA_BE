const express = require('express');
const { 
  createUserSchema, 
  updateUserSchema, 
  changePasswordSchema, 
  toggleStatusSchema, 
  queryParamsSchema, 
  validate, 
  validateQuery 
} = require('../validation/userValidation');
const UserController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const profileImageUpload = require('../config/profileImageMulter');

const userRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserNew:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - username
 *         - email
 *         - password
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's first name
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's last name
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           pattern: '^[a-zA-Z0-9]+$'
 *           description: Unique username (alphanumeric only)
 *         email:
 *           type: string
 *           format: email
 *           description: Unique email address
 *         password:
 *           type: string
 *           minLength: 8
 *           maxLength: 100
 *           description: Password with special characters
 *         phoneNumber:
 *           type: string
 *           pattern: '^[+]?[0-9\s\-\(\)]+$'
 *           description: Phone number
 *         type:
 *           type: string
 *           enum: ['1', '2', '3']
 *           description: '1-user, 2-owner, 3-admin'
 *           default: '1'
 *         activeStatus:
 *           type: string
 *           enum: ['0', '1']
 *           description: '0-inactive, 1-active'
 *           default: '1'
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique 7-8 character alphanumeric ID
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         type:
 *           type: string
 *         activeStatus:
 *           type: string
 *         createTimestamp:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: string
 *         updateTimestamp:
 *           type: string
 *           format: date-time
 *         updatedBy:
 *           type: string
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [User Management]
 *     summary: Create a new user (Admin only)
 *     description: Create a new user with auto-generated unique ID
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserNew'
 *           example:
 *             firstName: 'John'
 *             lastName: 'Doe'
 *             username: 'johndoe'
 *             email: 'john@example.com'
 *             password: 'SecurePass123!'
 *             phoneNumber: '+1234567890'
 *             type: '1'
 *             activeStatus: '1'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already exists
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
userRouter.post('/', validate(createUserSchema), authenticate, authorize('3'), UserController.createUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [User Management]
 *     summary: Get all users with filtering and pagination (Admin only)
 *     description: Retrieve all users with advanced filtering, search, and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in firstName, lastName, username, email
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ['1', '2', '3']
 *         description: Filter by user type
 *       - in: query
 *         name: activeStatus
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: ['createTimestamp', 'updateTimestamp', 'firstName', 'lastName', 'username', 'email']
 *           default: 'createTimestamp'
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: ['ASC', 'DESC']
 *           default: 'DESC'
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully with pagination
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
userRouter.get('/', validateQuery(queryParamsSchema), authenticate, authorize('3'), UserController.getAllUsers);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [User Management]
 *     summary: Get current user profile
 *     description: Retrieve the profile information of the currently authenticated user based on JWT token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/UserResponse'
 *                         - type: object
 *                           properties:
 *                             role:
 *                               type: object
 *                               properties:
 *                                 value:
 *                                   type: string
 *                                   description: User type value (1, 2, or 3)
 *                                 name:
 *                                   type: string
 *                                   description: Human readable role name
 *                                 permissions:
 *                                   type: object
 *                                   properties:
 *                                     canManageUsers:
 *                                       type: boolean
 *                                     canManageGyms:
 *                                       type: boolean
 *                                     canBookSlots:
 *                                       type: boolean
 *                                     isAdmin:
 *                                       type: boolean
 *                                     isOwner:
 *                                       type: boolean
 *                                     isUser:
 *                                       type: boolean
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User profile not found
 */
userRouter.get('/profile', authenticate, UserController.getUserProfile);

// Profile settings management
userRouter.get('/profile/settings', authenticate, UserController.getCompleteProfile);
userRouter.put('/profile/settings', authenticate, UserController.updateUserProfile);

// Notification settings management
userRouter.get('/profile/settings/notifications', authenticate, UserController.getCompleteProfile);
userRouter.put('/profile/settings/notifications', authenticate, UserController.updateNotificationSettings);

// Privacy settings management
userRouter.get('/profile/settings/privacy', authenticate, UserController.getCompleteProfile);
userRouter.put('/profile/settings/privacy', authenticate, UserController.updatePrivacySettings);

// App preferences management
userRouter.get('/profile/settings/preferences', authenticate, UserController.getCompleteProfile);
userRouter.put('/profile/settings/preferences', authenticate, UserController.updateAppPreferences);

// Fitness goals management
userRouter.get('/profile/fitness-goals', authenticate, UserController.getFitnessGoals);
userRouter.put('/profile/fitness-goals', authenticate, UserController.updateUserFitnessGoals);

// Emergency contacts management
userRouter.post('/profile/emergency-contacts', authenticate, UserController.addEmergencyContact);
userRouter.put('/profile/emergency-contacts/:contactId', authenticate, UserController.updateEmergencyContact);
userRouter.delete('/profile/emergency-contacts/:contactId', authenticate, UserController.deleteEmergencyContact);

// Profile image management
/**
 * @swagger
 * /api/users/profile/image:
 *   post:
 *     tags: [User Profile]
 *     summary: Upload profile image
 *     description: Upload a profile image for the current user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (jpeg, jpg, png, gif, webp)
 *             required:
 *               - image
 *     responses:
 *       201:
 *         description: Profile image uploaded successfully
 *       400:
 *         description: Invalid file or missing image
 *       401:
 *         description: Authentication required
 */
userRouter.post('/profile/image', authenticate, profileImageUpload.single('image'), UserController.uploadProfileImage);

/**
 * @swagger
 * /api/users/profile/image/url:
 *   get:
 *     tags: [User Profile]
 *     summary: Get current user's profile image URL
 *     description: Retrieve the URL of the current user's active profile image
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image URL retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageUrl:
 *                   type: string
 *                   description: Direct URL to access the profile image
 *       404:
 *         description: Profile image not found
 *       401:
 *         description: Authentication required
 */
userRouter.get('/profile/image/url', authenticate, UserController.getProfileImageUrl);

/**
 * /api/users/profile/image/file/{imageId}:
 *   get:
 *     tags: [User Profile]
 *     summary: Serve profile image file
 *     description: Serve the actual profile image file (public access for img tags)
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile image ID
 *     responses:
 *       200:
 *         description: Profile image file served successfully
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Profile image not found
 */
userRouter.get('/profile/image/file/:imageId', UserController.getProfileImageFile);

/**
 * @swagger
 * /api/users/profile/image/{imageId}:
 *   delete:
 *     tags: [User Profile]
 *     summary: Delete profile image
 *     description: Delete a specific profile image by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile image ID
 *     responses:
 *       200:
 *         description: Profile image deleted successfully
 *       404:
 *         description: Profile image not found
 *       401:
 *         description: Authentication required
 */
userRouter.delete('/profile/image/:imageId', authenticate, UserController.deleteProfileImage);

// Push subscription management (PWA)
userRouter.post('/push-subscription', authenticate, (req, res) => {
  // Basic push subscription endpoint for PWA
  // In a real app, you'd save the subscription to database
  console.log('Push subscription received:', req.body);
  res.json({ success: true, message: 'Push subscription saved' });
});

/**
 * @swagger
 * /api/users/{email}:
 *   get:
 *     tags: [User Management]
 *     summary: Get user by email (Admin only)
 *     description: Retrieve a specific user by their email address (primary key)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
userRouter.get('/:email', authenticate, authorize('3'), UserController.getUserByEmail);

/**
 * @swagger
 * /api/users/{email}:
 *   put:
 *     tags: [User Management]
 *     summary: Update user (Admin only)
 *     description: Update an existing user's information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ['1', '2', '3']
 *               activeStatus:
 *                 type: string
 *                 enum: ['0', '1']
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       409:
 *         description: Username or email already exists
 */
userRouter.put('/:email', validate(updateUserSchema), authenticate, authorize('3'), UserController.updateUser);

/**
 * @swagger
 * /api/users/{email}:
 *   delete:
 *     tags: [User Management]
 *     summary: Delete user - soft delete (Admin only)
 *     description: Soft delete a user by setting activeStatus to 0
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     responses:
 *       200:
 *         description: User deleted successfully (soft delete)
 *       404:
 *         description: User not found
 */
userRouter.delete('/:email', authenticate, authorize('3'), UserController.deleteUser);

/**
 * @swagger
 * /api/users/hard/{email}:
 *   delete:
 *     tags: [User Management]
 *     summary: Permanently delete user (Admin only)
 *     description: Permanently remove user from database
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     responses:
 *       200:
 *         description: User permanently deleted
 *       404:
 *         description: User not found
 */
userRouter.delete('/hard/:email', authenticate, authorize('3'), UserController.hardDeleteUser);

/**
 * @swagger
 * /api/users/toggle/{email}:
 *   put:
 *     tags: [User Management]
 *     summary: Toggle user active status (Admin only)
 *     description: Activate or deactivate a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activeStatus
 *             properties:
 *               activeStatus:
 *                 type: string
 *                 enum: ['0', '1']
 *                 description: '0-inactive, 1-active'
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 */
userRouter.put('/toggle/:email', validate(toggleStatusSchema), authenticate, authorize('3'), UserController.toggleUserStatus);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     tags: [User Management]
 *     summary: Get user statistics (Admin only)
 *     description: Get comprehensive user statistics for dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         activeUsers:
 *                           type: integer
 *                         inactiveUsers:
 *                           type: integer
 *                         verifiedUsers:
 *                           type: integer
 *                         unverifiedUsers:
 *                           type: integer
 *                         regularUsers:
 *                           type: integer
 *                         gymOwners:
 *                           type: integer
 *                         admins:
 *                           type: integer
 *                         newUsersThisMonth:
 *                           type: integer
 */
userRouter.get('/stats', authenticate, authorize('3'), UserController.getUserStats);

/**
 * @swagger
 * /api/users/{email}/verify:
 *   put:
 *     tags: [User Management]
 *     summary: Verify user account (Admin only)
 *     description: Mark user account as verified
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     responses:
 *       200:
 *         description: User verified successfully
 *       404:
 *         description: User not found
 */
userRouter.put('/:email/verify', authenticate, authorize('3'), UserController.verifyUser);

/**
 * @swagger
 * /api/users/{email}/unverify:
 *   put:
 *     tags: [User Management]
 *     summary: Unverify user account (Admin only)
 *     description: Remove verification from user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     responses:
 *       200:
 *         description: User unverified successfully
 *       404:
 *         description: User not found
 */
userRouter.put('/:email/unverify', authenticate, authorize('3'), UserController.unverifyUser);

/**
 * @swagger
 * /api/users/{email}/activity:
 *   get:
 *     tags: [User Management]
 *     summary: Get user activity data (Admin only)
 *     description: Get user login history and activity statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to retrieve activity for
 *     responses:
 *       200:
 *         description: User activity retrieved successfully
 *       404:
 *         description: User not found
 */
userRouter.get('/:email/activity', authenticate, authorize('3'), UserController.getUserActivity);

/**
 * @swagger
 * /api/users/{email}/reset-password:
 *   post:
 *     tags: [User Management]
 *     summary: Reset user password (Admin only)
 *     description: Generate and send temporary password to user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: Optional new password, if not provided a temporary one is generated
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         temporaryPassword:
 *                           type: string
 *       404:
 *         description: User not found
 */
userRouter.post('/:email/reset-password', authenticate, authorize('3'), UserController.resetUserPassword);

/**
 * @swagger
 * /api/users/bulk-update:
 *   patch:
 *     tags: [User Management]
 *     summary: Bulk update users (Admin only)
 *     description: Update multiple users at once
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userEmails
 *               - updates
 *             properties:
 *               userEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               updates:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: ['1', '2', '3']
 *                   activeStatus:
 *                     type: string
 *                     enum: ['0', '1']
 *                   isVerified:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Bulk update completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         updated:
 *                           type: integer
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 */
userRouter.patch('/bulk-update', authenticate, authorize('3'), UserController.bulkUpdateUsers);

/**
 * @swagger
 * /api/users/export:
 *   get:
 *     tags: [User Management]
 *     summary: Export users to file (Admin only)
 *     description: Export filtered users to CSV or Excel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: ['csv', 'xlsx']
 *           default: 'csv'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ['1', '2', '3']
 *       - in: query
 *         name: activeStatus
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *     responses:
 *       200:
 *         description: Export file generated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         downloadUrl:
 *                           type: string
 */
userRouter.get('/export', authenticate, authorize('3'), UserController.exportUsers);

/**
 * @swagger
 * /api/users/notify:
 *   post:
 *     tags: [User Management]
 *     summary: Send notification to users (Admin only)
 *     description: Send notification to multiple users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userEmails
 *               - title
 *               - message
 *               - type
 *             properties:
 *               userEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ['info', 'warning', 'success', 'error']
 *               actionUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notifications sent
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sent:
 *                           type: integer
 *                         failed:
 *                           type: integer
 */
userRouter.post('/notify', authenticate, authorize('3'), UserController.sendNotificationToUsers);

/**
 * @swagger
 * /api/users/type/{type}:
 *   get:
 *     tags: [User Management]
 *     summary: Get users by type (Admin only)
 *     description: Retrieve users filtered by type (1-user, 2-owner, 3-admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['1', '2', '3']
 *         description: User type (1-user, 2-owner, 3-admin)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       400:
 *         description: Invalid user type
 */
userRouter.get('/type/:type', validateQuery(queryParamsSchema), authenticate, authorize('3'), UserController.getUsersByType);

/**
 * @swagger
 * /api/users/change-password/{email}:
 *   put:
 *     tags: [User Management]
 *     summary: Change user password
 *     description: Change password for a specific user (Admin or own account)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password with special characters
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 *       404:
 *         description: User not found
 */
userRouter.put('/change-password/:email', validate(changePasswordSchema), authenticate, UserController.changePassword);

module.exports = userRouter;
