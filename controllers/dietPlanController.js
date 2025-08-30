const { 
  DietPlan, 
  DietPlanMeal, 
  DietChangeRequest, 
  DietPlanHistory,
  User, 
  UserProfile 
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

class DietPlanController {
  // Create a new diet plan (Trainer only)
  static async createDietPlan(req, res) {
    try {
      const trainerId = req.user.id;
      
      // Verify trainer role
      if (req.user.role !== 3) {
        return ResponseUtil.forbiddenError(res, 'Only trainers can create diet plans');
      }

      const { user_id, title, description, calories, protein_g, carbs_g, fats_g, meals = [] } = req.body;

      // Validate required fields
      if (!user_id || !title) {
        return ResponseUtil.validationError(res, 'user_id and title are required');
      }

      // Verify the target user exists
      const targetUser = await User.findByPk(user_id);
      if (!targetUser) {
        return ResponseUtil.notFoundError(res, 'Target user not found');
      }

      // Create diet plan with meals
      const dietPlan = await DietPlan.createPlan({
        trainer_id: trainerId,
        user_id,
        title,
        description,
        calories,
        protein_g,
        carbs_g,
        fats_g
      }, meals);

      return ResponseUtil.success(res, dietPlan, 'Diet plan created successfully', 201);
    } catch (error) {
      console.error('Create diet plan error:', error);
      return ResponseUtil.error(res, error.message || 'Failed to create diet plan');
    }
  }

  // Get all diet plans for a trainer
  static async getTrainerDietPlans(req, res) {
    try {
      const trainerId = req.user.id;
      const { page = 1, limit = 10, status, user_id } = req.query;

      if (req.user.role !== 3) {
        return ResponseUtil.forbiddenError(res, 'Only trainers can access this endpoint');
      }

      const options = { status };
      if (user_id) options.userId = user_id;

      const dietPlans = await DietPlan.findByTrainer(trainerId, {
        ...options,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            include: [{
              model: UserProfile,
              as: 'profile',
              attributes: ['height_cm', 'weight_kg', 'gender'],
              required: false
            }]
          }
        ]
      });

      const startIndex = (page - 1) * limit;
      const paginatedPlans = dietPlans.slice(startIndex, startIndex + parseInt(limit));

      return ResponseUtil.success(res, {
        dietPlans: paginatedPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(dietPlans.length / limit),
          total: dietPlans.length,
          limit: parseInt(limit)
        }
      }, 'Diet plans retrieved successfully');
    } catch (error) {
      console.error('Get trainer diet plans error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve diet plans');
    }
  }

  // Get user's diet plans
  static async getUserDietPlans(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status = 'active' } = req.query;

      const dietPlans = await DietPlan.findByUser(userId, {
        status,
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            include: [{
              model: UserProfile,
              as: 'profile',
              attributes: ['bio'],
              required: false
            }]
          }
        ]
      });

      const startIndex = (page - 1) * limit;
      const paginatedPlans = dietPlans.slice(startIndex, startIndex + parseInt(limit));

      return ResponseUtil.success(res, {
        dietPlans: paginatedPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(dietPlans.length / limit),
          total: dietPlans.length,
          limit: parseInt(limit)
        }
      }, 'User diet plans retrieved successfully');
    } catch (error) {
      console.error('Get user diet plans error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user diet plans');
    }
  }

  // Get diet plan by ID
  static async getDietPlanById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const dietPlan = await DietPlan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            include: [{
              model: UserProfile,
              as: 'profile',
              attributes: ['height_cm', 'weight_kg', 'gender'],
              required: false
            }]
          }
        ]
      });

      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check access permissions
      if (dietPlan.user_id !== userId && dietPlan.trainer_id !== userId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      // Get meals for this diet plan
      const meals = await dietPlan.getMeals();
      const dietPlanData = {
        ...dietPlan.toJSON(),
        meals
      };

      return ResponseUtil.success(res, dietPlanData, 'Diet plan retrieved successfully');
    } catch (error) {
      console.error('Get diet plan by ID error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve diet plan');
    }
  }

  // Update diet plan
  static async updateDietPlan(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;
      const { title, description, calories, protein_g, carbs_g, fats_g, status } = req.body;

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check if trainer owns this plan
      if (dietPlan.trainer_id !== trainerId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Only the trainer who created this plan can update it');
      }

      // Create history entry before updating
      await dietPlan.createHistoryEntry(trainerId);

      // Update the diet plan
      await dietPlan.update({
        title,
        description,
        calories,
        protein_g,
        carbs_g,
        fats_g,
        status
      });

      const updatedPlan = await DietPlan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      return ResponseUtil.success(res, updatedPlan, 'Diet plan updated successfully');
    } catch (error) {
      console.error('Update diet plan error:', error);
      return ResponseUtil.error(res, 'Failed to update diet plan');
    }
  }

  // Add meal to diet plan
  static async addMealToDietPlan(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;
      const { meal_type, meal_description } = req.body;

      if (!meal_type || !meal_description) {
        return ResponseUtil.validationError(res, 'meal_type and meal_description are required');
      }

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      if (dietPlan.trainer_id !== trainerId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const meal = await dietPlan.addMeal({ meal_type, meal_description });

      return ResponseUtil.success(res, meal, 'Meal added to diet plan successfully', 201);
    } catch (error) {
      console.error('Add meal error:', error);
      return ResponseUtil.error(res, 'Failed to add meal to diet plan');
    }
  }

  // Archive diet plan
  static async archiveDietPlan(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      if (dietPlan.trainer_id !== trainerId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      await dietPlan.archive();

      return ResponseUtil.success(res, null, 'Diet plan archived successfully');
    } catch (error) {
      console.error('Archive diet plan error:', error);
      return ResponseUtil.error(res, 'Failed to archive diet plan');
    }
  }

  // Create change request (User can request changes)
  static async createChangeRequest(req, res) {
    try {
      const userId = req.user.id;
      const { trainer_id, plan_id, request_text } = req.body;

      if (!trainer_id || !request_text) {
        return ResponseUtil.validationError(res, 'trainer_id and request_text are required');
      }

      const changeRequest = await DietChangeRequest.createRequest({
        user_id: userId,
        trainer_id,
        plan_id,
        request_text
      });

      return ResponseUtil.success(res, changeRequest, 'Change request created successfully', 201);
    } catch (error) {
      console.error('Create change request error:', error);
      return ResponseUtil.error(res, error.message || 'Failed to create change request');
    }
  }

  // Get change requests for trainer
  static async getTrainerChangeRequests(req, res) {
    try {
      const trainerId = req.user.id;
      const { status = 'pending', page = 1, limit = 10 } = req.query;

      if (req.user.role !== 3) {
        return ResponseUtil.forbiddenError(res, 'Only trainers can access this endpoint');
      }

      const changeRequests = await DietChangeRequest.findByTrainer(trainerId, {
        status,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: DietPlan,
            as: 'plan',
            attributes: ['id', 'title'],
            required: false
          }
        ]
      });

      const startIndex = (page - 1) * limit;
      const paginatedRequests = changeRequests.slice(startIndex, startIndex + parseInt(limit));

      return ResponseUtil.success(res, {
        changeRequests: paginatedRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(changeRequests.length / limit),
          total: changeRequests.length,
          limit: parseInt(limit)
        }
      }, 'Change requests retrieved successfully');
    } catch (error) {
      console.error('Get trainer change requests error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve change requests');
    }
  }

  // Respond to change request
  static async respondToChangeRequest(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;
      const { status, trainer_response } = req.body;

      if (!['approved', 'rejected', 'fulfilled'].includes(status)) {
        return ResponseUtil.validationError(res, 'Status must be approved, rejected, or fulfilled');
      }

      const changeRequest = await DietChangeRequest.findByPk(id);
      if (!changeRequest) {
        return ResponseUtil.notFoundError(res, 'Change request not found');
      }

      if (changeRequest.trainer_id !== trainerId) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      if (status === 'approved') {
        await changeRequest.approve(trainer_response);
      } else if (status === 'rejected') {
        await changeRequest.reject(trainer_response);
      } else if (status === 'fulfilled') {
        await changeRequest.fulfill(trainer_response);
      }

      return ResponseUtil.success(res, changeRequest, 'Change request updated successfully');
    } catch (error) {
      console.error('Respond to change request error:', error);
      return ResponseUtil.error(res, 'Failed to respond to change request');
    }
  }

  // Get trainer statistics
  static async getTrainerStats(req, res) {
    try {
      const trainerId = req.user.id;
      const { startDate, endDate } = req.query;

      if (req.user.role !== 3) {
        return ResponseUtil.forbiddenError(res, 'Only trainers can access this endpoint');
      }

      const options = {};
      if (startDate && endDate) {
        options.startDate = startDate;
        options.endDate = endDate;
      }

      const [planStats, requestStats] = await Promise.all([
        DietPlan.getTrainerPlanStats(trainerId, options),
        DietChangeRequest.getTrainerRequestStats(trainerId, options)
      ]);

      const stats = {
        plans: planStats,
        changeRequests: requestStats
      };

      return ResponseUtil.success(res, stats, 'Trainer statistics retrieved successfully');
    } catch (error) {
      console.error('Get trainer stats error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve trainer statistics');
    }
  }

  // Get diet plan history
  static async getDietPlanHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check access permissions
      if (dietPlan.user_id !== userId && dietPlan.trainer_id !== userId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const history = await DietPlanHistory.findByPlan(id, {
        include: [{
          model: User,
          as: 'changer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      return ResponseUtil.success(res, history, 'Diet plan history retrieved successfully');
    } catch (error) {
      console.error('Get diet plan history error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve diet plan history');
    }
  }
}

module.exports = DietPlanController;
