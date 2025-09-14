const { 
  Plan, 
  DietPlan,
  User, 
  UserProfile 
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

class PlanController {
  // Create a new generic plan (Trainer only)
  static async createPlan(req, res) {
    try {
      const trainerId = req.user.id;
      
      // Verify trainer role
      if (req.user.role !== 3) {
        return ResponseUtil.forbiddenError(res, 'Only trainers can create plans');
      }

      const { user_id, type, title, description, diet_details } = req.body;

      // Validate required fields
      if (!user_id || !type || !title) {
        return ResponseUtil.validationError(res, 'user_id, type, and title are required');
      }

      if (!['diet', 'workout'].includes(type)) {
        return ResponseUtil.validationError(res, 'Type must be either "diet" or "workout"');
      }

      // Verify the target user exists
      const targetUser = await User.findByPk(user_id);
      if (!targetUser) {
        return ResponseUtil.notFoundError(res, 'Target user not found');
      }

      // Create the plan
      const planData = {
        trainer_id: trainerId,
        user_id,
        type,
        title,
        description,
        diet_details: type === 'diet' ? diet_details : null
      };

      const plan = await Plan.createPlan(planData);

      return ResponseUtil.success(res, plan, 'Plan created successfully', 201);
    } catch (error) {
      console.error('Create plan error:', error);
      return ResponseUtil.error(res, error.message || 'Failed to create plan');
    }
  }

  // Get all plans for a trainer
  static async getTrainerPlans(req, res) {
    try {
      const trainerId = req.user.id;
      const { page = 1, limit = 10, type, status, user_id } = req.query;

      if (req.user.role !== 3) {
        return ResponseUtil.forbiddenError(res, 'Only trainers can access this endpoint');
      }

      const options = {};
      if (type) options.type = type;
      if (status) options.status = status;
      if (user_id) options.userId = user_id;

      const plans = await Plan.findByTrainer(trainerId, {
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
      const paginatedPlans = plans.slice(startIndex, startIndex + parseInt(limit));

      return ResponseUtil.success(res, {
        plans: paginatedPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(plans.length / limit),
          total: plans.length,
          limit: parseInt(limit)
        }
      }, 'Trainer plans retrieved successfully');
    } catch (error) {
      console.error('Get trainer plans error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve trainer plans');
    }
  }

  // Get user's plans
  static async getUserPlans(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, type, status = 'active' } = req.query;

      const options = { status };
      if (type) options.type = type;

      const plans = await Plan.findByUser(userId, {
        ...options,
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
      const paginatedPlans = plans.slice(startIndex, startIndex + parseInt(limit));

      // For diet plans, include linked diet plan details
      const enrichedPlans = await Promise.all(
        paginatedPlans.map(async (plan) => {
          const planData = plan.toJSON();
          if (plan.type === 'diet') {
            const linkedDietPlan = await plan.getLinkedDietPlan();
            planData.dietPlanDetails = linkedDietPlan;
          }
          return planData;
        })
      );

      return ResponseUtil.success(res, {
        plans: enrichedPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(plans.length / limit),
          total: plans.length,
          limit: parseInt(limit)
        }
      }, 'User plans retrieved successfully');
    } catch (error) {
      console.error('Get user plans error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user plans');
    }
  }

  // Get plan by ID
  static async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const plan = await Plan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'trainer',
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

      if (!plan) {
        return ResponseUtil.notFoundError(res, 'Plan not found');
      }

      // Check access permissions
      if (plan.user_id !== userId && plan.trainer_id !== userId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      let planData = plan.toJSON();

      // If it's a diet plan, include linked diet plan details
      if (plan.type === 'diet') {
        const linkedDietPlan = await plan.getLinkedDietPlan();
        if (linkedDietPlan) {
          const meals = await linkedDietPlan.getMeals();
          planData.dietPlanDetails = {
            ...linkedDietPlan.toJSON(),
            meals
          };
        }
      }

      return ResponseUtil.success(res, planData, 'Plan retrieved successfully');
    } catch (error) {
      console.error('Get plan by ID error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve plan');
    }
  }

  // Update plan
  static async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;
      const { title, description, status } = req.body;

      const plan = await Plan.findByPk(id);
      if (!plan) {
        return ResponseUtil.notFoundError(res, 'Plan not found');
      }

      // Check if trainer owns this plan
      if (plan.trainer_id !== trainerId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Only the trainer who created this plan can update it');
      }

      // Update the plan
      await plan.update({
        title,
        description,
        status
      });

      const updatedPlan = await Plan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'trainer',
                      },
          {
            model: User,
            as: 'user',
                      }
        ]
      });

      return ResponseUtil.success(res, updatedPlan, 'Plan updated successfully');
    } catch (error) {
      console.error('Update plan error:', error);
      return ResponseUtil.error(res, 'Failed to update plan');
    }
  }

  // Archive plan
  static async archivePlan(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;

      const plan = await Plan.findByPk(id);
      if (!plan) {
        return ResponseUtil.notFoundError(res, 'Plan not found');
      }

      if (plan.trainer_id !== trainerId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      await plan.archive();

      return ResponseUtil.success(res, null, 'Plan archived successfully');
    } catch (error) {
      console.error('Archive plan error:', error);
      return ResponseUtil.error(res, 'Failed to archive plan');
    }
  }

  // Get plans by type
  static async getPlansByType(req, res) {
    try {
      const { type } = req.params;
      const { page = 1, limit = 10, status = 'active', trainer_id, user_id } = req.query;

      if (!['diet', 'workout'].includes(type)) {
        return ResponseUtil.validationError(res, 'Type must be either "diet" or "workout"');
      }

      const options = { status };
      if (trainer_id) options.trainerId = trainer_id;
      if (user_id) options.userId = user_id;

      const plans = await Plan.findByType(type, {
        ...options,
        include: [
          {
            model: User,
            as: 'trainer',
                      },
          {
            model: User,
            as: 'user',
                      }
        ]
      });

      const startIndex = (page - 1) * limit;
      const paginatedPlans = plans.slice(startIndex, startIndex + parseInt(limit));

      return ResponseUtil.success(res, {
        plans: paginatedPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(plans.length / limit),
          total: plans.length,
          limit: parseInt(limit)
        }
      }, `${type} plans retrieved successfully`);
    } catch (error) {
      console.error('Get plans by type error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve plans by type');
    }
  }

  // Get trainer statistics
  static async getTrainerPlanStats(req, res) {
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

      const stats = await Plan.getTrainerPlanStats(trainerId, options);

      return ResponseUtil.success(res, stats, 'Trainer plan statistics retrieved successfully');
    } catch (error) {
      console.error('Get trainer plan stats error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve trainer plan statistics');
    }
  }

  // Get user plan summary
  static async getUserPlanSummary(req, res) {
    try {
      const userId = req.user.id;
      const { status = 'active' } = req.query;

      const options = { status };
      const summary = await Plan.getUserPlanSummary(userId, options);

      return ResponseUtil.success(res, summary, 'User plan summary retrieved successfully');
    } catch (error) {
      console.error('Get user plan summary error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve user plan summary');
    }
  }

  // Get popular plan titles
  static async getPopularPlanTitles(req, res) {
    try {
      const { type } = req.params;
      const { limit = 10 } = req.query;

      if (!['diet', 'workout'].includes(type)) {
        return ResponseUtil.validationError(res, 'Type must be either "diet" or "workout"');
      }

      const popularTitles = await Plan.getPopularPlanTitles(type, parseInt(limit));

      return ResponseUtil.success(res, popularTitles, `Popular ${type} plan titles retrieved successfully`);
    } catch (error) {
      console.error('Get popular plan titles error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve popular plan titles');
    }
  }

  // Create linked diet plan (for diet plans)
  static async createLinkedDietPlan(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;
      const dietPlanData = req.body;

      const plan = await Plan.findByPk(id);
      if (!plan) {
        return ResponseUtil.notFoundError(res, 'Plan not found');
      }

      if (plan.type !== 'diet') {
        return ResponseUtil.validationError(res, 'Can only create diet plan details for diet plans');
      }

      if (plan.trainer_id !== trainerId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      // Check if linked diet plan already exists
      const existingDietPlan = await plan.getLinkedDietPlan();
      if (existingDietPlan) {
        return ResponseUtil.validationError(res, 'Linked diet plan already exists for this plan');
      }

      const linkedDietPlan = await plan.createLinkedDietPlan(dietPlanData);

      return ResponseUtil.success(res, linkedDietPlan, 'Linked diet plan created successfully', 201);
    } catch (error) {
      console.error('Create linked diet plan error:', error);
      return ResponseUtil.error(res, 'Failed to create linked diet plan');
    }
  }

  // Clone plan (create a copy for another user)
  static async clonePlan(req, res) {
    try {
      const { id } = req.params;
      const trainerId = req.user.id;
      const { user_id, title } = req.body;

      if (req.user.role !== 3) {
        return ResponseUtil.forbiddenError(res, 'Only trainers can clone plans');
      }

      if (!user_id) {
        return ResponseUtil.validationError(res, 'user_id is required');
      }

      const originalPlan = await Plan.findByPk(id);
      if (!originalPlan) {
        return ResponseUtil.notFoundError(res, 'Original plan not found');
      }

      // Verify trainer has access to the original plan
      if (originalPlan.trainer_id !== trainerId && req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      // Verify target user exists
      const targetUser = await User.findByPk(user_id);
      if (!targetUser) {
        return ResponseUtil.notFoundError(res, 'Target user not found');
      }

      // Create cloned plan
      const clonedPlanData = {
        trainer_id: trainerId,
        user_id,
        type: originalPlan.type,
        title: title || `${originalPlan.title} (Copy)`,
        description: originalPlan.description
      };

      const clonedPlan = await Plan.createPlan(clonedPlanData);

      // If it's a diet plan with linked details, clone those too
      if (originalPlan.type === 'diet') {
        const originalDietPlan = await originalPlan.getLinkedDietPlan();
        if (originalDietPlan) {
          await clonedPlan.createLinkedDietPlan({
            title: originalDietPlan.title,
            description: originalDietPlan.description,
            calories: originalDietPlan.calories,
            protein_g: originalDietPlan.protein_g,
            carbs_g: originalDietPlan.carbs_g,
            fats_g: originalDietPlan.fats_g
          });

          // Clone meals too
          const meals = await originalDietPlan.getMeals();
          if (meals.length > 0) {
            const newDietPlan = await clonedPlan.getLinkedDietPlan();
            const mealsData = meals.map(meal => ({
              meal_type: meal.meal_type,
              meal_description: meal.meal_description
            }));
            await newDietPlan.constructor.createMeals(newDietPlan.id, mealsData);
          }
        }
      }

      return ResponseUtil.success(res, clonedPlan, 'Plan cloned successfully', 201);
    } catch (error) {
      console.error('Clone plan error:', error);
      return ResponseUtil.error(res, 'Failed to clone plan');
    }
  }
}

module.exports = PlanController;
