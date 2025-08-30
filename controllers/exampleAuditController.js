const { AuditHelper } = require('../utils/auditHelper');
const { Amenity, Feature, Gym, GymAmenity, GymFeature } = require('../models/index_simplified');

/**
 * Example Controller demonstrating audit trail usage
 * This shows different ways to use the global audit functionality
 */
class ExampleAuditController {
  
  /**
   * Method 1: Using AuditHelper.withUser()
   */
  static async createAmenityMethod1(req, res) {
    try {
      const { name, description } = req.body;
      const userId = req.user.id; // From JWT middleware
      
      const amenity = await Amenity.create(
        { name, description },
        AuditHelper.withUser(userId) // Automatically sets created_by and updated_by
      );
      
      res.status(201).json({
        success: true,
        data: amenity,
        message: 'Amenity created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Method 2: Using AuditHelper.fromRequest()
   */
  static async createFeatureMethod2(req, res) {
    try {
      const { name, description } = req.body;
      
      const feature = await Feature.create(
        { name, description },
        AuditHelper.fromRequest(req) // Automatically extracts user from request
      );
      
      res.status(201).json({
        success: true,
        data: feature,
        message: 'Feature created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Method 3: Using middleware helper (req.auditOptions)
   * Requires auditMiddleware to be used in app.js
   */
  static async updateGymMethod3(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      await Gym.update(
        updateData,
        { 
          where: { id },
          ...req.auditOptions() // Uses middleware helper
        }
      );
      
      const updatedGym = await Gym.findByPk(id);
      
      res.json({
        success: true,
        data: updatedGym,
        message: 'Gym updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Method 4: Using scoped model operations
   */
  static async bulkCreateAmenitiesMethod4(req, res) {
    try {
      const { amenities } = req.body; // Array of amenity objects
      const userId = req.user.id;
      
      const scopedAmenity = AuditHelper.scopeModel(Amenity, userId);
      
      const createdAmenities = await scopedAmenity.bulkCreate(amenities);
      
      res.status(201).json({
        success: true,
        data: createdAmenities,
        message: 'Amenities created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Method 5: Soft delete with audit trail
   */
  static async deleteAmenityMethod5(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const amenity = await Amenity.findByPk(id);
      if (!amenity) {
        return res.status(404).json({
          success: false,
          message: 'Amenity not found'
        });
      }
      
      // This will soft delete and set updated_by
      await amenity.destroy({ userId });
      
      res.json({
        success: true,
        message: 'Amenity deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Method 6: Working with associations and audit trail
   */
  static async addAmenityToGym(req, res) {
    try {
      const { gymId, amenityId } = req.body;
      const userId = req.user.id;
      
      const gymAmenity = await GymAmenity.create(
        { gymId, amenityId },
        AuditHelper.withUser(userId)
      );
      
      res.status(201).json({
        success: true,
        data: gymAmenity,
        message: 'Amenity added to gym successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Method 7: Query with creator/updater information
   */
  static async getAmenitiesWithAuditInfo(req, res) {
    try {
      const { sequelize } = require('../config/database');
      
      const amenities = await Amenity.findAll({
        attributes: [
          'id', 
          'name', 
          'description',
          'created_at',
          'updated_at',
          'record_status',
          // Include creator and updater info using subqueries or joins
          [
            sequelize.literal(`(
              SELECT CONCAT(users.username, ' (', users.email, ')') 
              FROM users 
              WHERE users.id = Amenity.created_by
            )`),
            'created_by_info'
          ],
          [
            sequelize.literal(`(
              SELECT CONCAT(users.username, ' (', users.email, ')') 
              FROM users 
              WHERE users.id = Amenity.updated_by
            )`),
            'updated_by_info'
          ]
        ]
      });
      
      res.json({
        success: true,
        data: amenities,
        message: 'Amenities retrieved with audit info'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = ExampleAuditController;
