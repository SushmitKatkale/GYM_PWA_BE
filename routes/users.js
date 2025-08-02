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
