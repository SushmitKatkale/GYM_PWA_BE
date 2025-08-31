const {
  User,
  UserProfile,
  EmergencyContact,
  FitnessGoal,
  UserFitnessGoal,
  Media
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

class UserController {
  // Create a new user
  static async createUser(req, res) {
    try {
      const userData = {
        ...req.body,
        createdBy: req.user ? req.user.id : null,
        updatedBy: req.user ? req.user.id : null,
      };

      const user = await User.create(userData);
      return ResponseUtil.success(res, user.toJSON(), 'User created successfully', 201);
    } catch (error) {
      if (error.name == 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        return ResponseUtil.conflictError(res, `${field} already exists`);
      }
      if (error.name == 'SequelizeValidationError') {
        const errors = error.errors.map(err => err.message);
        return ResponseUtil.validationError(res, errors);
      }
      return ResponseUtil.error(res, 'Failed to create user');
    }
  }

  // Get all users with pagination and filtering
  static async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        recordStatus,
        email,
        firstName,
        lastName,
        username,
        phoneNumber,
        isVerified,
        createdAfter,
        createdBefore,
        lastLoginAfter,
        lastLoginBefore,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Add global search filter
      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      // Add individual field filters
      if (type) {
        whereClause.role = type; // Map old 'type' param to new 'role' field
      }

      // Only filter by recordStatus if explicitly provided
      if (recordStatus !== undefined && recordStatus !== null && recordStatus !== '') {
        whereClause.recordStatus = recordStatus == '1' ? 1 : 0; // Use model field name
      }
      // If no recordStatus filter is provided, include both active and inactive users

      if (email) {
        whereClause.email = { [Op.like]: `%${email}%` };
      }

      if (firstName) {
        whereClause.firstName = { [Op.like]: `%${firstName}%` };
      }

      if (lastName) {
        whereClause.lastName = { [Op.like]: `%${lastName}%` };
      }

      if (username) {
        whereClause.username = { [Op.like]: `%${username}%` };
      }

      if (phoneNumber) {
        whereClause.phoneNumber = { [Op.like]: `%${phoneNumber}%` };
      }

      if (isVerified !== undefined) {
        whereClause.isVerified = isVerified;
      }

      // Add date filters
      if (createdAfter) {
        whereClause.created_at = {
          ...whereClause.created_at,
          [Op.gte]: new Date(createdAfter)
        };
      }

      if (createdBefore) {
        whereClause.created_at = {
          ...whereClause.created_at,
          [Op.lte]: new Date(createdBefore)
        };
      }

      if (lastLoginAfter) {
        whereClause.lastLoginAt = {
          ...whereClause.lastLoginAt,
          [Op.gte]: new Date(lastLoginAfter)
        };
      }

      if (lastLoginBefore) {
        whereClause.lastLoginAt = {
          ...whereClause.lastLoginAt,
          [Op.lte]: new Date(lastLoginBefore)
        };
      }

      // Remove this line as it overrides the recordStatus filter above
      // whereClause.recordStatus = [0, 1];

      const result = await User.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        attributes: { exclude: ['password'] }
      });

      const users = result.rows.map(user => user.toJSON());

      // Calculate stats with updated field names
      const totalUsersCount = await User.count();
      const activeUsersCount = await User.count({ where: { recordStatus: 1 } });
      const verifiedUsersCount = totalUsersCount;

      // Get current month's start date
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newUsersThisMonth = await User.count({
        where: {
          created_at: {
            [Op.gte]: startOfMonth
          }
        }
      });

      const stats = {
        totalUsers: totalUsersCount,
        activeUsers: activeUsersCount,
        inactiveUsers: totalUsersCount - activeUsersCount,
        verifiedUsers: verifiedUsersCount,
        unverifiedUsers: totalUsersCount - verifiedUsersCount,
        members: await User.count({ where: { role: 1 } }), // Updated role mapping
        gymOwners: await User.count({ where: { role: 2 } }),
        trainers: await User.count({ where: { role: 3 } }),
        admins: await User.count({ where: { role: 4 } }),
        newUsersThisMonth
      };

      const totalPages = Math.ceil(result.count / parseInt(limit));

      return ResponseUtil.success(res, {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total: result.count,
          limit: parseInt(limit)
        },
        stats
      }, 'Users retrieved successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve users');
    }
  }

  // Get user by ID (now primary key)
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email'],
            required: false,
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'username', 'email'],
            required: false,
          }
        ]
      });

      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      return ResponseUtil.success(res, user.toJSON(), 'User retrieved successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve user');
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const { email } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.user ? req.user.id : null,
      };

      const user = await User.findByEmail(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update(updateData);
      const updatedUser = await User.findByEmail(email, {
        attributes: { exclude: ['password'] }
      });

      return ResponseUtil.success(res, updatedUser.toJSON(), 'User updated successfully');
    } catch (error) {
      if (error.name == 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        return ResponseUtil.conflictError(res, `${field} already exists`);
      }
      if (error.name == 'SequelizeValidationError') {
        const errors = error.errors.map(err => err.message);
        return ResponseUtil.validationError(res, errors);
      }
      return ResponseUtil.error(res, 'Failed to update user');
    }
  }

  // Delete user (soft delete by setting recordStatus to 0)
  static async deleteUser(req, res) {
    try {
      const { email } = req.params;

      const user = await User.findByEmail(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        recordStatus: '0',
        updatedBy: req.user ? req.user.id : null,
      });

      return ResponseUtil.success(res, null, 'User deleted successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to delete user');
    }
  }

  // Hard delete user (permanent deletion)
  static async hardDeleteUser(req, res) {
    try {
      const { email } = req.params;

      const user = await User.findByEmail(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.destroy();
      return ResponseUtil.success(res, null, 'User permanently deleted');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to permanently delete user');
    }
  }

  // Activate/Deactivate user
  static async toggleUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { recordStatus } = req.body;

      const user = await User.findOne({
        where: {
          id: parseInt(userId),   // ✅ fixed parseInt
          recordStatus: [1, 0]    // ✅ allows both active & inactive
        }
      });

      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        recordStatus,
        updatedBy: req.user ? req.user.id : null,
      });

      const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      return ResponseUtil.success(
        res,
        updatedUser.toJSON(),
        `User ${recordStatus == 1 ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to update user status');
    }
  }

  // Get users by type
  static async getUsersByType(req, res) {
    try {
      const { type } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!['1', '2', '3', '4'].includes(type)) {
        return ResponseUtil.error(res, 'Invalid user type', 400);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await User.findAndCountAll({
        where: { role: type }, // Use 'role' field instead of 'type'
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password'] }
      });

      const users = result.rows.map(user => user.toJSON());

      const typeNames = {
        '1': 'Members',
        '2': 'Gym Owners', 
        '3': 'Trainers',
        '4': 'Admins'
      };

      return ResponseUtil.success(res, {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(result.count / parseInt(limit)),
          total: result.count,
          limit: parseInt(limit)
        }
      }, `${typeNames[type]} retrieved successfully`);
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve users by type');
    }
  }

  // Get current user profile (from JWT token)
  static async getUserProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return ResponseUtil.notFoundError(res, 'User profile not found');
      }

      const media = await Media.findByEntity('user_profile', userId, { mediaType: 'image', limit: 1, order: 'DESC' });

      // Add role information for better frontend handling
      const userProfile = {
        ...user.toJSON(),
        role: {
          value: user.role,
          name: user.role == 1 ? 'User' : user.role == 2 ? 'Owner' : 'Admin',
          permissions: {
            canManageUsers: user.role == 3,
            canManageGyms: user.role == 2 || user.role == 3,
            canBookSlots: true,
            isAdmin: user.role == 3,
            isOwner: user.role == 2,
            isUser: user.role == 1
          }
        }
      };

      if (media && media.length > 0) {
        userProfile.profileImage = media?.[0]?.url;
      }

      return ResponseUtil.success(res, userProfile, 'User profile retrieved successfully');
    } catch (error) {
      console.error('Get user profile error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user profile');
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { email } = req.params;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      // Verify current password
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        return ResponseUtil.authError(res, 'Current password is incorrect');
      }

      // Update password
      await user.update({
        password: newPassword,
        updatedBy: req.user ? req.user.id : null,
      });

      return ResponseUtil.success(res, null, 'Password changed successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to change password');
    }
  }

  // Get complete user profile with all settings
  static async getCompleteProfile(req, res) {
    try {
      const userEmail = req.user.email;

      const user = await User.findByPk(userEmail, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: UserProfile,
            as: 'profile',
            required: false
          },
          {
            model: EmergencyContact,
            as: 'emergencyContacts',
            required: false
          },
          {
            model: FitnessGoal,
            as: 'fitnessGoals',
            through: { attributes: ['priority', 'targetDate'] },
            required: false
          }
        ]
      });

      if (!user) {
        return ResponseUtil.notFoundError(res, 'User profile not found');
      }

      // Return user with available data

      return ResponseUtil.success(res, user.toJSON(), 'Complete profile retrieved successfully');
    } catch (error) {
      console.error('Get complete profile error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve complete profile');
    }
  }

  // Update user profile extended data
  static async updateUserProfile(req, res) {
    try {
      const userEmail = req.user.email;
      const { firstName, lastName, phoneNumber, dateOfBirth, gender, height, weight, ...extendedProfileData } = req.body;

      // Update basic user information in User table
      const user = await User.findByPk(userEmail);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      // Update basic user fields
      const userUpdateData = {};
      if (firstName !== undefined) userUpdateData.firstName = firstName;
      if (lastName !== undefined) userUpdateData.lastName = lastName;
      if (phoneNumber !== undefined) userUpdateData.phoneNumber = phoneNumber;

      if (Object.keys(userUpdateData).length > 0) {
        await user.update(userUpdateData);
      }

      // Update extended profile data in UserProfile table
      const profileData = {};

      // Validate and sanitize dateOfBirth
      if (dateOfBirth !== undefined) {
        if (dateOfBirth == '' || dateOfBirth == null) {
          profileData.dateOfBirth = null;
        } else {
          const parsedDate = new Date(dateOfBirth);
          if (!isNaN(parsedDate.getTime()) && dateOfBirth !== 'Invalid date') {
            profileData.dateOfBirth = dateOfBirth;
          } else {
            profileData.dateOfBirth = null;
          }
        }
      }

      if (gender !== undefined) profileData.gender = gender || null;
      if (height !== undefined) profileData.height = height || null;
      if (weight !== undefined) profileData.weight = weight || null;

      // Add any other extended profile fields
      Object.assign(profileData, extendedProfileData);

      if (Object.keys(profileData).length > 0) {
        const [profile, created] = await UserProfile.findOrCreate({
          where: { userEmail },
          defaults: { ...profileData, userEmail }
        });

        if (!created) {
          await profile.update(profileData);
        }
      }

      // Return updated user with profile
      const updatedUser = await User.findByPk(userEmail, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: UserProfile,
            as: 'profile',
            required: false
          }
        ]
      });

      return ResponseUtil.success(res, updatedUser.toJSON(), 'Profile updated successfully');
    } catch (error) {
      console.error('Update user profile error:', error);
      return ResponseUtil.error(res, 'Failed to update profile');
    }
  }

  // Update notification settings
  static async updateNotificationSettings(req, res) {
    try {
      return ResponseUtil.success(res, {}, 'Notification settings updated successfully');
    } catch (error) {
      console.error('Update notification settings error:', error);
      return ResponseUtil.error(res, 'Failed to update notification settings');
    }
  }

  // Update privacy settings
  static async updatePrivacySettings(req, res) {
    try {
      return ResponseUtil.success(res, {}, 'Privacy settings updated successfully');
    } catch (error) {
      console.error('Update privacy settings error:', error);
      return ResponseUtil.error(res, 'Failed to update privacy settings');
    }
  }

  // Update app preferences
  static async updateAppPreferences(req, res) {
    try {
      return ResponseUtil.success(res, {}, 'App preferences updated successfully');
    } catch (error) {
      console.error('Update app preferences error:', error);
      return ResponseUtil.error(res, 'Failed to update app preferences');
    }
  }

  // Get all fitness goals
  static async getFitnessGoals(req, res) {
    try {
      const goals = await FitnessGoal.findAll({
        order: [['goalName', 'ASC']]
      });

      return ResponseUtil.success(res, goals, 'Fitness goals retrieved successfully');
    } catch (error) {
      console.error('Get fitness goals error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve fitness goals');
    }
  }

  // Update user fitness goals
  static async updateUserFitnessGoals(req, res) {
    try {
      const userEmail = req.user.email;
      const { goalIds } = req.body; // Array of { goalId, priority, targetDate }

      // Remove existing goals
      await UserFitnessGoal.destroy({
        where: { userEmail }
      });

      // Add new goals
      if (goalIds && goalIds.length > 0) {
        const userGoals = goalIds.map(goal => ({
          userEmail,
          goalId: goal.goalId,
          priority: goal.priority || 1,
          targetDate: goal.targetDate || null
        }));

        await UserFitnessGoal.bulkCreate(userGoals);
      }

      // Fetch updated goals
      const updatedGoals = await User.findByPk(userEmail, {
        include: [
          {
            model: FitnessGoal,
            as: 'fitnessGoals',
            through: { attributes: ['priority', 'targetDate'] }
          }
        ]
      });

      return ResponseUtil.success(res, updatedGoals.fitnessGoals, 'Fitness goals updated successfully');
    } catch (error) {
      console.error('Update user fitness goals error:', error);
      return ResponseUtil.error(res, 'Failed to update fitness goals');
    }
  }

  // Emergency contacts CRUD
  static async addEmergencyContact(req, res) {
    try {
      const userEmail = req.user.email;
      const contactData = { ...req.body, userEmail };

      const contact = await EmergencyContact.create(contactData);
      return ResponseUtil.success(res, contact.toJSON(), 'Emergency contact added successfully', 201);
    } catch (error) {
      console.error('Add emergency contact error:', error);
      return ResponseUtil.error(res, 'Failed to add emergency contact');
    }
  }

  static async updateEmergencyContact(req, res) {
    try {
      const userEmail = req.user.email;
      const { contactId } = req.params;
      const updateData = req.body;

      const contact = await EmergencyContact.findOne({
        where: { id: contactId, userEmail }
      });

      if (!contact) {
        return ResponseUtil.notFoundError(res, 'Emergency contact not found');
      }

      await contact.update(updateData);
      return ResponseUtil.success(res, contact.toJSON(), 'Emergency contact updated successfully');
    } catch (error) {
      console.error('Update emergency contact error:', error);
      return ResponseUtil.error(res, 'Failed to update emergency contact');
    }
  }

  static async deleteEmergencyContact(req, res) {
    try {
      const userEmail = req.user.email;
      const { contactId } = req.params;

      const contact = await EmergencyContact.findOne({
        where: { id: contactId, userEmail }
      });

      if (!contact) {
        return ResponseUtil.notFoundError(res, 'Emergency contact not found');
      }

      await contact.destroy();
      return ResponseUtil.success(res, null, 'Emergency contact deleted successfully');
    } catch (error) {
      console.error('Delete emergency contact error:', error);
      return ResponseUtil.error(res, 'Failed to delete emergency contact');
    }
  }

  // Upload profile image
  static async uploadProfileImage(req, res) {
    try {
      const userId = req.user.id;
      const imageFile = req.file;

      if (!imageFile) {
        return ResponseUtil.validationError(res, 'Image file is required');
      }

      let deletedMedia = await Media.deleteByEntity('user_profile', userId);

      const imagePath = imageFile.path;

      let mediaBody = {
        entityType: 'user_profile',
        entityId: userId,
        mediaType: 'image',
        location: imagePath,
        url: `${req.protocol}://${req.get('host')}/api/users/profile/image/file/${userId}`,
        altText: `${req.user.username}`,
        createdBy: userId,
        mimeType: imageFile.mimetype
      };

      let media = await Media.createMedia(mediaBody);

      return ResponseUtil.success(res, media.toJSON(), 'Profile image uploaded successfully', 201);
    } catch (error) {
      console.error('Upload profile image error:', error);
      return ResponseUtil.error(res, 'Failed to upload profile image');
    }
  }

  // Get profile image URL
  static async getProfileImageUrl(req, res) {
    try {
      const userId = req.user.id;

      const profileImage = await Media.findOne({
        where: { entity_type: "user_profile", entity_id: userId, record_status: 1, media_type: 'image' }
      });

      if (!profileImage) {
        return ResponseUtil.notFoundError(res, 'Profile image not found');
      }

      return ResponseUtil.success(res, { imageUrl: profileImage.url }, 'Profile image URL retrieved successfully');
    } catch (error) {
      console.error('Get profile image URL error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve profile image URL');
    }
  }

  // Serve profile image file
  static async getProfileImageFile(req, res) {
    try {
      const { userId } = req.params;

      const profileImage = await Media.findOne({
        where: { entity_type: "user_profile", entity_id: userId, record_status: 1, media_type: 'image' }
      });

      if (!profileImage) {
        return res.status(404).send('Profile image not found');
      }

      // Check if file exists
      if (!fs.existsSync(profileImage.location)) {
        return res.status(404).send('Image file not found');
      }

      // Set appropriate headers
      res.setHeader('Content-Type', profileImage.mime_type);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      return res.sendFile(path.resolve(profileImage.location));
    } catch (error) {
      console.error('Get profile image file error:', error);
      return res.status(500).send('Failed to retrieve profile image file');
    }
  }

  // Delete profile image
  static async deleteProfileImage(req, res) {
    try {
      const userId = req.user.id;

      await Media.deleteByEntity('user_profile', userId);

      return ResponseUtil.success(res, null, 'Profile image deleted successfully');
    } catch (error) {
      console.error('Delete profile image error:', error);
      return ResponseUtil.error(res, 'Failed to delete profile image');
    }
  }

  // Get user statistics
  static async getUserStats(req, res) {
    try {
      const stats = await User.findAll({
        attributes: [
          [User.sequelize.fn('COUNT', User.sequelize.col('*')), 'totalUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN recordStatus = 1 THEN 1 ELSE 0 END")), 'activeUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN recordStatus = 0 THEN 1 ELSE 0 END")), 'inactiveUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN role = 1 THEN 1 ELSE 0 END")), 'regularUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN role = 2 THEN 1 ELSE 0 END")), 'gymOwners'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN role = 3 THEN 1 ELSE 0 END")), 'admins']
        ],
        raw: true
      });

      // Get new users this month
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      const newUsersThisMonth = await User.count({
        where: {
          createdAt: {
            [Op.gte]: firstDayOfMonth
          }
        }
      });

      const result = {
        ...stats[0],
        newUsersThisMonth,
        avgLoginFrequency: 0 // Placeholder - would need login tracking table
      };

      return ResponseUtil.success(res, result, 'User statistics retrieved successfully');
    } catch (error) {
      console.error('Get user stats error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user statistics');
    }
  }

  // Verify user
  static async verifyUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        isVerified: true,
        updatedBy: req.user ? req.user.id : null
      });

      const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      return ResponseUtil.success(res, updatedUser.toJSON(), 'User verified successfully');
    } catch (error) {
      console.error('Verify user error:', error);
      return ResponseUtil.error(res, 'Failed to verify user');
    }
  }

  // Unverify user
  static async unverifyUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        isVerified: false,
        updatedBy: req.user ? req.user.id : null
      });

      const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      return ResponseUtil.success(res, updatedUser.toJSON(), 'User unverified successfully');
    } catch (error) {
      console.error('Unverify user error:', error);
      return ResponseUtil.error(res, 'Failed to unverify user');
    }
  }

  // Get user activity
  static async getUserActivity(req, res) {
    try {
      const { email } = req.params;
      const { days = 30 } = req.query;

      const user = await User.findByEmail(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      // Mock activity data since we don't have login tracking yet
      const loginHistory = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Generate mock login history
      for (let i = 0; i < parseInt(days); i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        loginHistory.push({
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 5) // Random login count for demo
        });
      }

      const activitySummary = {
        totalLogins: loginHistory.reduce((sum, day) => sum + day.count, 0),
        lastLogin: user.updatedAt || user.createdAt,
        avgSessionDuration: 45, // Mock data
        deviceTypes: {
          desktop: Math.floor(Math.random() * 20),
          mobile: Math.floor(Math.random() * 15),
          tablet: Math.floor(Math.random() * 5)
        }
      };

      return ResponseUtil.success(res, {
        loginHistory,
        activitySummary
      }, 'User activity retrieved successfully');
    } catch (error) {
      console.error('Get user activity error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user activity');
    }
  }

  // Reset user password
  static async resetUserPassword(req, res) {
    try {
      const { email } = req.params;
      const { newPassword } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      // Generate temporary password if not provided
      const tempPassword = newPassword || Math.random().toString(36).slice(-8) + '!A1';

      await user.update({
        password: tempPassword, // Will be hashed by the model
        updatedBy: req.user ? req.user.id : null
      });

      return ResponseUtil.success(res, {
        temporaryPassword: tempPassword
      }, 'Password reset successfully');
    } catch (error) {
      console.error('Reset user password error:', error);
      return ResponseUtil.error(res, 'Failed to reset password');
    }
  }

  // Bulk update users
  static async bulkUpdateUsers(req, res) {
    try {
      const { userEmails, updates } = req.body;

      if (!userEmails || !Array.isArray(userEmails) || userEmails.length == 0) {
        return ResponseUtil.validationError(res, 'userEmails array is required');
      }

      const updateData = {
        ...updates,
        updatedBy: req.user ? req.user.id : null
      };

      const [updatedCount] = await User.update(updateData, {
        where: {
          email: {
            [Op.in]: userEmails
          }
        }
      });

      return ResponseUtil.success(res, {
        updated: updatedCount,
        errors: []
      }, `${updatedCount} users updated successfully`);
    } catch (error) {
      console.error('Bulk update users error:', error);
      return ResponseUtil.error(res, 'Failed to update users');
    }
  }

  // Export users
  static async exportUsers(req, res) {
    try {
      const { format = 'csv', type, recordStatus, isVerified } = req.query;

      const whereClause = {};
      if (type) whereClause.role = type; // Use 'role' field instead of 'type'
      // Only filter by recordStatus if explicitly provided
      if (recordStatus !== undefined && recordStatus !== null && recordStatus !== '') {
        whereClause.record_status = recordStatus == '1' ? 1 : 0; // Convert to proper record_status
      }
      // If no recordStatus filter is provided, include both active and inactive users
      if (isVerified !== undefined) whereClause.isVerified = isVerified == 'true';

      const users = await User.findAll({
        where: whereClause,
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']]
      });

      if (format == 'csv') {
        // Generate CSV content
        const csvHeader = 'ID,First Name,Last Name,Username,Email,Phone Number,Type,Active Status,Is Verified,Created Date,Last Login\n';

        const csvRows = users.map(user => {
          const userData = user.toJSON();
          const userType = userData.type == '1' ? 'User' : userData.type == '2' ? 'Owner' : 'Admin';
          const recordStatus = userData.recordStatus == '1' ? 'Active' : 'Inactive';
          const isVerified = userData.isVerified ? 'Yes' : 'No';
          const createdDate = new Date(userData.createdAt).toLocaleDateString();
          const lastLogin = userData.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleDateString() : 'Never';

          // Escape commas and quotes in data
          const escapeCSV = (str) => {
            if (str == null) return '';
            const stringVal = String(str);
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
              return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
          };

          return [
            escapeCSV(userData.id),
            escapeCSV(userData.firstName),
            escapeCSV(userData.lastName),
            escapeCSV(userData.username),
            escapeCSV(userData.email),
            escapeCSV(userData.phoneNumber || ''),
            escapeCSV(userType),
            escapeCSV(recordStatus),
            escapeCSV(isVerified),
            escapeCSV(createdDate),
            escapeCSV(lastLogin)
          ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="users_export_${Date.now()}.csv"`);
        res.setHeader('Cache-Control', 'no-cache');

        return res.send(csvContent);
      } else {
        // For other formats, return error for now
        return ResponseUtil.error(res, 'Only CSV format is currently supported', 400);
      }
    } catch (error) {
      console.error('Export users error:', error);
      return ResponseUtil.error(res, 'Failed to export users');
    }
  }

  // Get user by email (Admin only)
  static async getUserByEmail(req, res) {
    try {
      const { email } = req.params;

      const user = await User.findOne({
        where: { email },
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      return ResponseUtil.success(res, user.toJSON(), 'User retrieved successfully');
    } catch (error) {
      console.error('Get user by email error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user');
    }
  }

  // Send notification to users
  static async sendNotificationToUsers(req, res) {
    try {
      const { userEmails, title, message, type, actionUrl } = req.body;

      if (!userEmails || !Array.isArray(userEmails) || userEmails.length == 0) {
        return ResponseUtil.validationError(res, 'userEmails array is required');
      }

      if (!title || !message) {
        return ResponseUtil.validationError(res, 'Title and message are required');
      }

      // Mock notification sending
      // In production, you would integrate with email service, push notifications, etc.
      const sent = userEmails.length;
      const failed = 0;

      return ResponseUtil.success(res, {
        sent,
        failed
      }, `Notification sent to ${sent} users successfully`);
    } catch (error) {
      console.error('Send notification error:', error);
      return ResponseUtil.error(res, 'Failed to send notifications');
    }
  }
}

module.exports = UserController;
