const { Gym, User } = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

class OwnerGymController {
  /**
   * Get owner's gym (single gym model)
   */
  static async getOwnerGym(req, res) {
    try {
      const ownerId = req.user.id;
      
      const ownerGym = await Gym.findOne({
        where: { 
          ownerId: ownerId,
          recordStatus: 1 
        },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!ownerGym) {
        return ResponseUtil.notFoundError(res, 'No gym found for this owner');
      }

      const gymData = {
        id: ownerGym.id,
        name: ownerGym.name,
        address: ownerGym.address,
        city: ownerGym.city || 'Unknown',
        state: ownerGym.state || 'Unknown',
        zip: ownerGym.zipCode || '',
        latitude: ownerGym.latitude,
        longitude: ownerGym.longitude,
        capacity: ownerGym.capacity || 100,
        currentOccupancy: ownerGym.currentOccupancy || 0,
        occupancyRate: ownerGym.capacity > 0 ? Math.round((ownerGym.currentOccupancy || 0) / ownerGym.capacity * 100) : 0,
        rating: parseFloat(ownerGym.rating || 0),
        status: ownerGym.recordStatus === 1 ? 'active' : 'inactive',
        phone: ownerGym.phone || '',
        email: ownerGym.email || '',
        operatingHours: {
          open: ownerGym.openTime || '06:00',
          close: ownerGym.closeTime || '22:00'
        },
        createdAt: ownerGym.createdAt,
        updatedAt: ownerGym.updatedAt,
        owner: ownerGym.owner ? {
          id: ownerGym.owner.id,
          name: `${ownerGym.owner.firstName} ${ownerGym.owner.lastName}`,
          email: ownerGym.owner.email
        } : null
      };

      return ResponseUtil.success(res, gymData, 'Gym retrieved successfully');
    } catch (error) {
      console.error('Get owner gym error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve gym information');
    }
  }

  /**
   * Update owner's gym
   */
  static async updateOwnerGym(req, res) {
    try {
      const ownerId = req.user.id;
      const {
        name,
        address,
        city,
        state,
        zipCode,
        phone,
        email,
        capacity,
        openTime,
        closeTime,
        latitude,
        longitude
      } = req.body;

      const ownerGym = await Gym.findOne({
        where: { 
          ownerId: ownerId,
          recordStatus: 1 
        }
      });

      if (!ownerGym) {
        return ResponseUtil.notFoundError(res, 'No gym found for this owner');
      }

      // Update gym data
      const updateData = {};
      if (name) updateData.name = name;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (zipCode) updateData.zipCode = zipCode;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;
      if (capacity) updateData.capacity = parseInt(capacity);
      if (openTime) updateData.openTime = openTime;
      if (closeTime) updateData.closeTime = closeTime;
      if (latitude) updateData.latitude = parseFloat(latitude);
      if (longitude) updateData.longitude = parseFloat(longitude);

      await ownerGym.update(updateData);

      return ResponseUtil.success(res, null, 'Gym updated successfully');
    } catch (error) {
      console.error('Update owner gym error:', error);
      return ResponseUtil.error(res, 'Failed to update gym information');
    }
  }

  /**
   * Get gym statistics for owner
   */
  static async getGymStats(req, res) {
    try {
      const ownerId = req.user.id;
      
      const ownerGym = await Gym.findOne({
        where: { 
          ownerId: ownerId,
          recordStatus: 1 
        }
      });

      if (!ownerGym) {
        return ResponseUtil.notFoundError(res, 'No gym found for this owner');
      }

      // Get basic stats (can be expanded with more complex queries)
      const stats = {
        totalMembers: 0, // Would query user_subscriptions
        activeMembers: 0, // Would query active subscriptions
        todayCheckIns: 0, // Would query attendances for today
        currentOccupancy: ownerGym.currentOccupancy || 0,
        capacity: ownerGym.capacity || 100,
        occupancyRate: ownerGym.capacity > 0 ? Math.round((ownerGym.currentOccupancy || 0) / ownerGym.capacity * 100) : 0
      };

      return ResponseUtil.success(res, stats, 'Gym statistics retrieved successfully');
    } catch (error) {
      console.error('Get gym stats error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve gym statistics');
    }
  }
}

module.exports = OwnerGymController;