const { User } = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

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
        sortBy = 'createTimestamp',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      // Add filters
      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      if (type) {
        whereClause.type = type;
      }

      if (activeStatus) {
        whereClause.activeStatus = activeStatus;
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

      return ResponseUtil.paginated(
        res,
        users,
        result.count,
        parseInt(page),
        parseInt(limit),
        'Users retrieved successfully'
      );
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
}

module.exports = UserController;
