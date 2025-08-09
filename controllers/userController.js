const { 
  User, 
  UserProfile, 
  EmergencyContact, 
  UserNotificationSettings, 
  UserPrivacySettings, 
  UserAppPreferences, 
  FitnessGoal, 
  UserFitnessGoal,
  ProfileImage,
  createDefaultUserSettings 
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
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        return ResponseUtil.conflictError(res, `${field} already exists`);
      }
      if (error.name === 'SequelizeValidationError') {
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
        activeStatus,
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
        sortBy = 'createTimestamp',
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
        whereClause.type = type;
      }

      if (activeStatus) {
        whereClause.activeStatus = activeStatus;
      }

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
        whereClause.createTimestamp = {
          ...whereClause.createTimestamp,
          [Op.gte]: new Date(createdAfter)
        };
      }

      if (createdBefore) {
        whereClause.createTimestamp = {
          ...whereClause.createTimestamp,
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

      const result = await User.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        attributes: { exclude: ['password'] },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username'],
            required: false,
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'firstName', 'lastName', 'username'],
            required: false,
          }
        ]
      });

      const users = result.rows.map(user => user.toJSON());

      // Calculate stats
      const totalUsersCount = await User.count();
      const activeUsersCount = await User.count({ where: { activeStatus: '1' } });
      const verifiedUsersCount = await User.count({ where: { isVerified: true } });
      
      // Get current month's start date
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newUsersThisMonth = await User.count({
        where: {
          createTimestamp: {
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
        regularUsers: await User.count({ where: { type: '1' } }),
        gymOwners: await User.count({ where: { type: '2' } }),
        admins: await User.count({ where: { type: '3' } }),
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

  // Get user by email (now primary key)
  static async getUserByEmail(req, res) {
    try {
      const { email } = req.params;

      const user = await User.findByPk(email, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username'],
            required: false,
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'firstName', 'lastName', 'username'],
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

      const user = await User.findByPk(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update(updateData);
      const updatedUser = await User.findByPk(email, {
        attributes: { exclude: ['password'] }
      });

      return ResponseUtil.success(res, updatedUser.toJSON(), 'User updated successfully');
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        return ResponseUtil.conflictError(res, `${field} already exists`);
      }
      if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(err => err.message);
        return ResponseUtil.validationError(res, errors);
      }
      return ResponseUtil.error(res, 'Failed to update user');
    }
  }

  // Delete user (soft delete by setting activeStatus to 0)
  static async deleteUser(req, res) {
    try {
      const { email } = req.params;

      const user = await User.findByPk(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        activeStatus: '0',
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

      const user = await User.findByPk(email);
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
      const { email } = req.params;
      const { activeStatus } = req.body;

      const user = await User.findByPk(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        activeStatus,
        updatedBy: req.user ? req.user.id : null,
      });

      const updatedUser = await User.findByPk(email, {
        attributes: { exclude: ['password'] }
      });

      return ResponseUtil.success(
        res,
        updatedUser.toJSON(),
        `User ${activeStatus === '1' ? 'activated' : 'deactivated'} successfully`
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

      if (!['1', '2', '3'].includes(type)) {
        return ResponseUtil.error(res, 'Invalid user type', 400);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await User.findAndCountAll({
        where: { type, activeStatus: '1' },
        limit: parseInt(limit),
        offset,
        order: [['createTimestamp', 'DESC']],
        attributes: { exclude: ['password'] }
      });

      const users = result.rows.map(user => user.toJSON());

      return ResponseUtil.paginated(
        res,
        users,
        result.count,
        parseInt(page),
        parseInt(limit),
        `${type === '1' ? 'Users' : type === '2' ? 'Owners' : 'Admins'} retrieved successfully`
      );
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve users by type');
    }
  }

  // Get current user profile (from JWT token)
  static async getUserProfile(req, res) {
    try {
      const userEmail = req.user.email;

      const user = await User.findByPk(userEmail, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username'],
            required: false,
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'firstName', 'lastName', 'username'],
            required: false,
          }
        ]
      });

      if (!user) {
        return ResponseUtil.notFoundError(res, 'User profile not found');
      }

      // Add role information for better frontend handling
      const userProfile = {
        ...user.toJSON(),
        role: {
          value: user.type,
          name: user.type === '1' ? 'User' : user.type === '2' ? 'Owner' : 'Admin',
          permissions: {
            canManageUsers: user.type === '3',
            canManageGyms: user.type === '2' || user.type === '3',
            canBookSlots: true,
            isAdmin: user.type === '3',
            isOwner: user.type === '2',
            isUser: user.type === '1'
          }
        }
      };

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

      const user = await User.findByPk(email);
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
            model: UserNotificationSettings,
            as: 'notificationSettings',
            required: false
          },
          {
            model: UserPrivacySettings,
            as: 'privacySettings',
            required: false
          },
          {
            model: UserAppPreferences,
            as: 'appPreferences',
            required: false
          },
          {
            model: FitnessGoal,
            as: 'fitnessGoals',
            through: { attributes: ['priority', 'targetDate'] },
            required: false
          },
          {
            model: ProfileImage,
            as: 'currentProfileImage',
            required: false
          }
        ]
      });

      if (!user) {
        return ResponseUtil.notFoundError(res, 'User profile not found');
      }

      // Ensure default settings exist if not found
      if (!user.notificationSettings || !user.privacySettings || !user.appPreferences) {
        await createDefaultUserSettings(userEmail);
        // Re-fetch the user with settings
        const updatedUser = await User.findByPk(userEmail, {
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
              model: UserNotificationSettings,
              as: 'notificationSettings',
              required: false
            },
            {
              model: UserPrivacySettings,
              as: 'privacySettings',
              required: false
            },
            {
              model: UserAppPreferences,
              as: 'appPreferences',
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
        return ResponseUtil.success(res, updatedUser.toJSON(), 'Complete profile retrieved successfully');
      }

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
        if (dateOfBirth === '' || dateOfBirth === null) {
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
      const userEmail = req.user.email;
      const settings = req.body;

      const [notificationSettings, created] = await UserNotificationSettings.findOrCreate({
        where: { userEmail },
        defaults: { ...settings, userEmail }
      });

      if (!created) {
        await notificationSettings.update(settings);
      }

      return ResponseUtil.success(res, notificationSettings.toJSON(), 'Notification settings updated successfully');
    } catch (error) {
      console.error('Update notification settings error:', error);
      return ResponseUtil.error(res, 'Failed to update notification settings');
    }
  }

  // Update privacy settings
  static async updatePrivacySettings(req, res) {
    try {
      const userEmail = req.user.email;
      const settings = req.body;

      const [privacySettings, created] = await UserPrivacySettings.findOrCreate({
        where: { userEmail },
        defaults: { ...settings, userEmail }
      });

      if (!created) {
        await privacySettings.update(settings);
      }

      return ResponseUtil.success(res, privacySettings.toJSON(), 'Privacy settings updated successfully');
    } catch (error) {
      console.error('Update privacy settings error:', error);
      return ResponseUtil.error(res, 'Failed to update privacy settings');
    }
  }

  // Update app preferences
  static async updateAppPreferences(req, res) {
    try {
      const userEmail = req.user.email;
      const preferences = req.body;

      const [appPreferences, created] = await UserAppPreferences.findOrCreate({
        where: { userEmail },
        defaults: { ...preferences, userEmail }
      });

      if (!created) {
        await appPreferences.update(preferences);
      }

      return ResponseUtil.success(res, appPreferences.toJSON(), 'App preferences updated successfully');
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

      // Generate unique ID manually as a safety measure
      const generateUniqueId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      let imageId;
      let isUnique = false;
      while (!isUnique) {
        imageId = generateUniqueId();
        const existing = await ProfileImage.findOne({ where: { id: imageId } });
        if (!existing) {
          isUnique = true;
        }
      }

      const imagePath = imageFile.path;

      const profileImage = await ProfileImage.create({
        id: imageId,
        userId,
        originalName: imageFile.originalname,
        filename: imageFile.filename,
        filePath: imagePath,
        mimeType: imageFile.mimetype,
        fileSize: imageFile.size,
        isActive: true,
        uploadSource: 'web',
        createdBy: userId
      });

      return ResponseUtil.success(res, profileImage.toJSON(), 'Profile image uploaded successfully', 201);
    } catch (error) {
      console.error('Upload profile image error:', error);
      return ResponseUtil.error(res, 'Failed to upload profile image');
    }
  }

  // Get profile image URL
  static async getProfileImageUrl(req, res) {
    try {
      const userId = req.user.id;

      const profileImage = await ProfileImage.findOne({
        where: { userId, isActive: true }
      });

      if (!profileImage) {
        return ResponseUtil.notFoundError(res, 'Profile image not found');
      }

      // Return the image URL that can be accessed directly
      const imageUrl = `${req.protocol}://${req.get('host')}/api/users/profile/image/file/${profileImage.id}`;
      
      return ResponseUtil.success(res, { imageUrl }, 'Profile image URL retrieved successfully');
    } catch (error) {
      console.error('Get profile image URL error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve profile image URL');
    }
  }

  // Serve profile image file
  static async getProfileImageFile(req, res) {
    try {
      const { imageId } = req.params;

      const profileImage = await ProfileImage.findOne({
        where: { id: imageId, isActive: true }
      });

      if (!profileImage) {
        return res.status(404).send('Profile image not found');
      }

      // Check if file exists
      if (!fs.existsSync(profileImage.filePath)) {
        return res.status(404).send('Image file not found');
      }

      // Set appropriate headers
      res.setHeader('Content-Type', profileImage.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      return res.sendFile(path.resolve(profileImage.filePath));
    } catch (error) {
      console.error('Get profile image file error:', error);
      return res.status(500).send('Failed to retrieve profile image file');
    }
  }

  // Delete profile image
  static async deleteProfileImage(req, res) {
    try {
      const userId = req.user.id;
      const { imageId } = req.params;

      const profileImage = await ProfileImage.findOne({
        where: { id: imageId, userId }
      });

      if (!profileImage) {
        return ResponseUtil.notFoundError(res, 'Profile image not found');
      }

      await profileImage.destroy();

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
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN activeStatus = '1' THEN 1 ELSE 0 END")), 'activeUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN activeStatus = '0' THEN 1 ELSE 0 END")), 'inactiveUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN isVerified = 1 THEN 1 ELSE 0 END")), 'verifiedUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN isVerified = 0 THEN 1 ELSE 0 END")), 'unverifiedUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN type = '1' THEN 1 ELSE 0 END")), 'regularUsers'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN type = '2' THEN 1 ELSE 0 END")), 'gymOwners'],
          [User.sequelize.fn('SUM', User.sequelize.literal("CASE WHEN type = '3' THEN 1 ELSE 0 END")), 'admins']
        ],
        raw: true
      });

      // Get new users this month
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const newUsersThisMonth = await User.count({
        where: {
          createTimestamp: {
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
      const { email } = req.params;

      const user = await User.findByPk(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        isVerified: true,
        updatedBy: req.user ? req.user.id : null
      });

      const updatedUser = await User.findByPk(email, {
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
      const { email } = req.params;

      const user = await User.findByPk(email);
      if (!user) {
        return ResponseUtil.notFoundError(res, 'User not found');
      }

      await user.update({
        isVerified: false,
        updatedBy: req.user ? req.user.id : null
      });

      const updatedUser = await User.findByPk(email, {
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

      const user = await User.findByPk(email);
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
        lastLogin: user.updateTimestamp || user.createTimestamp,
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

      const user = await User.findByPk(email);
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

      if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
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
      const { format = 'csv', type, activeStatus, isVerified } = req.query;
      
      const whereClause = {};
      if (type) whereClause.type = type;
      if (activeStatus) whereClause.activeStatus = activeStatus;
      if (isVerified !== undefined) whereClause.isVerified = isVerified === 'true';

      const users = await User.findAll({
        where: whereClause,
        attributes: { exclude: ['password'] },
        order: [['createTimestamp', 'DESC']]
      });

      if (format === 'csv') {
        // Generate CSV content
        const csvHeader = 'ID,First Name,Last Name,Username,Email,Phone Number,Type,Active Status,Is Verified,Created Date,Last Login\n';
        
        const csvRows = users.map(user => {
          const userData = user.toJSON();
          const userType = userData.type === '1' ? 'User' : userData.type === '2' ? 'Owner' : 'Admin';
          const activeStatus = userData.activeStatus === '1' ? 'Active' : 'Inactive';
          const isVerified = userData.isVerified ? 'Yes' : 'No';
          const createdDate = new Date(userData.createTimestamp).toLocaleDateString();
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
            escapeCSV(activeStatus),
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

  // Send notification to users
  static async sendNotificationToUsers(req, res) {
    try {
      const { userEmails, title, message, type, actionUrl } = req.body;

      if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
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
