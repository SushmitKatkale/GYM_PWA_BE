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
  // Create a new diet plan (Trainer or User for self)
  static async createDietPlan(req, res) {
    try {
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      
      const { user_id, trainer_id, title, description, calories, protein_g, carbs_g, fats_g, meals = [] } = req.body;

      // Validate required fields
      if (!title) {
        return ResponseUtil.validationError(res, 'title is required');
      }

      let targetUserId = user_id;
      let assignedTrainerId = trainer_id;

      // Role-based logic
      if (currentUserRole === 3) {
        // Trainer creating plan - must specify user_id
        if (!user_id) {
          return ResponseUtil.validationError(res, 'user_id is required when trainer creates plan');
        }
        assignedTrainerId = currentUserId; // Trainer is creating the plan
      } else if (currentUserRole === 1) {
        // User creating their own plan
        targetUserId = currentUserId; // User can only create for themselves
        assignedTrainerId = trainer_id || null; // Optional trainer assignment
      } else if (currentUserRole === 4) {
        // Admin can create for anyone with any trainer
        if (!user_id) {
          return ResponseUtil.validationError(res, 'user_id is required when admin creates plan');
        }
      } else {
        return ResponseUtil.forbiddenError(res, 'Insufficient permissions to create diet plans');
      }

      // Verify the target user exists
      const targetUser = await User.findByPk(targetUserId);
      if (!targetUser) {
        return ResponseUtil.notFoundError(res, 'Target user not found');
      }

      // Create diet plan with meals
      const dietPlan = await DietPlan.createPlan({
        trainer_id: assignedTrainerId,
        user_id: targetUserId,
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
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      const { title, description, calories, protein_g, carbs_g, fats_g, status } = req.body;

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check permissions: trainer who created it, user who owns it, or admin
      const canUpdate = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canUpdate) {
        return ResponseUtil.forbiddenError(res, 'Access denied: insufficient permissions to update this plan');
      }

      // Create history entry before updating
      await dietPlan.createHistoryEntry(currentUserId);

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
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false // Handle plans without trainers
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
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      const {
        meal_type,
        meal_description,
        food_item,
        description,
        instructions,
        quantity,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
        image_url,
        preferred_time,
        is_mandatory,
        alternatives
      } = req.body;

      if (!meal_type) {
        return ResponseUtil.validationError(res, 'meal_type is required');
      }

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check permissions: trainer who created it, user who owns it, or admin
      const canAddMeal = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canAddMeal) {
        return ResponseUtil.forbiddenError(res, 'Access denied: insufficient permissions to add meals to this plan');
      }

      const mealData = {
        meal_type,
        meal_description,
        food_item,
        description,
        instructions,
        quantity,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
        image_url,
        preferred_time,
        is_mandatory,
        alternatives
      };

      const meal = await dietPlan.addMeal(mealData);

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
      const {
        trainer_id,
        plan_id,
        request_type,
        description,
        urgency,
        request_text // for backward compatibility
      } = req.body;

      // Validate required fields
      if (!description && !request_text) {
        return ResponseUtil.validationError(res, 'description is required');
      }

      const changeRequest = await DietChangeRequest.createRequest({
        user_id: userId,
        trainer_id: trainer_id || null,
        plan_id: plan_id || null,
        request_type: request_type || 'general',
        description: description || request_text, // Use description or fallback to request_text
        urgency: urgency || 'medium',
        request_text: request_text // Keep for backward compatibility
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
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      const { status, trainer_response } = req.body;

      if (!['in_progress', 'approved', 'rejected', 'fulfilled'].includes(status)) {
        return ResponseUtil.validationError(res, 'Status must be in_progress, approved, rejected, or fulfilled');
      }

      const changeRequest = await DietChangeRequest.findByPk(id);
      if (!changeRequest) {
        return ResponseUtil.notFoundError(res, 'Change request not found');
      }

      // Check permissions: assigned trainer or admin
      const canRespond = 
        (changeRequest.trainer_id === currentUserId) || // Assigned trainer
        (currentUserRole === 4); // Admin

      if (!canRespond) {
        return ResponseUtil.forbiddenError(res, 'Access denied: insufficient permissions to respond to this request');
      }

      if (status === 'in_progress') {
        await changeRequest.setInProgress(trainer_response);
      } else if (status === 'approved') {
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

  // ======= MEAL MANAGEMENT ENDPOINTS =======

  // Get specific meal by ID
  static async getMealById(req, res) {
    try {
      const { mealId } = req.params;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      const meal = await DietPlanMeal.findByPk(mealId);
      if (!meal) {
        return ResponseUtil.notFoundError(res, 'Meal not found');
      }

      const dietPlan = await meal.getDietPlan();
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Associated diet plan not found');
      }

      // Check permissions
      const canView = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canView) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      return ResponseUtil.success(res, meal, 'Meal retrieved successfully');
    } catch (error) {
      console.error('Get meal by ID error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve meal');
    }
  }

  // Update specific meal
  static async updateMeal(req, res) {
    try {
      const { mealId } = req.params;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      const mealData = req.body;

      const meal = await DietPlanMeal.findByPk(mealId);
      if (!meal) {
        return ResponseUtil.notFoundError(res, 'Meal not found');
      }

      const dietPlan = await meal.getDietPlan();
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Associated diet plan not found');
      }

      // Check permissions
      const canUpdate = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canUpdate) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const updatedMeal = await meal.updateMeal(mealData);

      return ResponseUtil.success(res, updatedMeal, 'Meal updated successfully');
    } catch (error) {
      console.error('Update meal error:', error);
      return ResponseUtil.error(res, 'Failed to update meal');
    }
  }

  // Delete specific meal
  static async deleteMeal(req, res) {
    try {
      const { mealId } = req.params;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      const meal = await DietPlanMeal.findByPk(mealId);
      if (!meal) {
        return ResponseUtil.notFoundError(res, 'Meal not found');
      }

      const dietPlan = await meal.getDietPlan();
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Associated diet plan not found');
      }

      // Check permissions
      const canDelete = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canDelete) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      await meal.removeMeal(); // Soft delete

      return ResponseUtil.success(res, null, 'Meal deleted successfully');
    } catch (error) {
      console.error('Delete meal error:', error);
      return ResponseUtil.error(res, 'Failed to delete meal');
    }
  }

  // ======= ENHANCED MEAL MANAGEMENT ENDPOINTS =======

  // Get all meals for a diet plan with filtering
  static async getDietPlanMeals(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      const { meal_type, is_mandatory, page = 1, limit = 20 } = req.query;

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check permissions
      const canView = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canView) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const whereClause = { plan_id: id, record_status: 1 };
      if (meal_type) whereClause.meal_type = meal_type;
      if (is_mandatory !== undefined) whereClause.is_mandatory = is_mandatory === 'true';

      const meals = await DietPlanMeal.findAll({
        where: whereClause,
        order: [['created_at', 'ASC']]
      });

      const startIndex = (page - 1) * limit;
      const paginatedMeals = meals.slice(startIndex, startIndex + parseInt(limit));

      return ResponseUtil.success(res, {
        meals: paginatedMeals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(meals.length / limit),
          total: meals.length,
          limit: parseInt(limit)
        }
      }, 'Diet plan meals retrieved successfully');
    } catch (error) {
      console.error('Get diet plan meals error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve meals');
    }
  }

  // Create a new meal for a diet plan (enhanced version)
  static async createMeal(req, res) {
    try {
      const { id } = req.params; // diet plan id
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      const mealData = req.body;

      const { meal_type } = mealData;
      if (!meal_type) {
        return ResponseUtil.validationError(res, 'meal_type is required');
      }

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check permissions
      const canCreateMeal = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canCreateMeal) {
        return ResponseUtil.forbiddenError(res, 'Access denied: insufficient permissions to create meals for this plan');
      }

      const meal = await dietPlan.addMeal(mealData);

      return ResponseUtil.success(res, meal, 'Meal created successfully', 201);
    } catch (error) {
      console.error('Create meal error:', error);
      return ResponseUtil.error(res, 'Failed to create meal');
    }
  }

  // Get nutrition analysis for a diet plan
  static async getDietPlanNutrition(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      const dietPlan = await DietPlan.findByPk(id);
      if (!dietPlan) {
        return ResponseUtil.notFoundError(res, 'Diet plan not found');
      }

      // Check permissions
      const canView = 
        (dietPlan.trainer_id === currentUserId) || // Trainer who created it
        (dietPlan.user_id === currentUserId) || // User who owns it
        (currentUserRole === 4); // Admin

      if (!canView) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const meals = await DietPlanMeal.findAll({
        where: { plan_id: id, record_status: 1 }
      });

      // Calculate nutrition totals
      const nutrition = {
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_fiber: 0,
        total_sugar: 0,
        total_sodium: 0,
        meal_count: meals.length,
        by_meal_type: {}
      };

      meals.forEach(meal => {
        nutrition.total_calories += meal.calories || 0;
        nutrition.total_protein += meal.protein || 0;
        nutrition.total_carbs += meal.carbs || 0;
        nutrition.total_fat += meal.fat || 0;
        nutrition.total_fiber += meal.fiber || 0;
        nutrition.total_sugar += meal.sugar || 0;
        nutrition.total_sodium += meal.sodium || 0;

        if (!nutrition.by_meal_type[meal.meal_type]) {
          nutrition.by_meal_type[meal.meal_type] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            count: 0
          };
        }

        nutrition.by_meal_type[meal.meal_type].calories += meal.calories || 0;
        nutrition.by_meal_type[meal.meal_type].protein += meal.protein || 0;
        nutrition.by_meal_type[meal.meal_type].carbs += meal.carbs || 0;
        nutrition.by_meal_type[meal.meal_type].fat += meal.fat || 0;
        nutrition.by_meal_type[meal.meal_type].fiber += meal.fiber || 0;
        nutrition.by_meal_type[meal.meal_type].sugar += meal.sugar || 0;
        nutrition.by_meal_type[meal.meal_type].sodium += meal.sodium || 0;
        nutrition.by_meal_type[meal.meal_type].count += 1;
      });

      // Compare with diet plan targets if they exist
      const comparison = {};
      if (dietPlan.calories) {
        comparison.calories_diff = nutrition.total_calories - dietPlan.calories;
        comparison.calories_percentage = ((nutrition.total_calories / dietPlan.calories) * 100).toFixed(1);
      }
      if (dietPlan.protein_g) {
        comparison.protein_diff = nutrition.total_protein - dietPlan.protein_g;
        comparison.protein_percentage = ((nutrition.total_protein / dietPlan.protein_g) * 100).toFixed(1);
      }
      if (dietPlan.carbs_g) {
        comparison.carbs_diff = nutrition.total_carbs - dietPlan.carbs_g;
        comparison.carbs_percentage = ((nutrition.total_carbs / dietPlan.carbs_g) * 100).toFixed(1);
      }
      if (dietPlan.fats_g) {
        comparison.fat_diff = nutrition.total_fat - dietPlan.fats_g;
        comparison.fat_percentage = ((nutrition.total_fat / dietPlan.fats_g) * 100).toFixed(1);
      }

      const nutritionAnalysis = {
        ...nutrition,
        target_comparison: comparison,
        plan_targets: {
          calories: dietPlan.calories,
          protein_g: dietPlan.protein_g,
          carbs_g: dietPlan.carbs_g,
          fats_g: dietPlan.fats_g
        }
      };

      return ResponseUtil.success(res, nutritionAnalysis, 'Nutrition analysis retrieved successfully');
    } catch (error) {
      console.error('Get nutrition analysis error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve nutrition analysis');
    }
  }

  // ======= ENHANCED CHANGE REQUEST FILTERING =======

  // Get enhanced change requests with all filtering options
  static async getEnhancedChangeRequests(req, res) {
    try {
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      const {
        status,
        request_type,
        urgency,
        trainer_id,
        user_id,
        plan_id,
        page = 1,
        limit = 10
      } = req.query;

      // Build where clause based on role and filters
      const whereClause = { record_status: 1 };

      // Role-based filtering
      if (currentUserRole === 1) {
        // Users can only see their own requests
        whereClause.user_id = currentUserId;
      } else if (currentUserRole === 3) {
        // Trainers can see requests assigned to them or general requests
        whereClause[Op.or] = [
          { trainer_id: currentUserId },
          { trainer_id: null } // General requests
        ];
      }
      // Admins can see all requests (no additional filtering)

      // Apply filters
      if (status) whereClause.status = status;
      if (request_type) whereClause.request_type = request_type;
      if (urgency) whereClause.urgency = urgency;
      if (trainer_id && currentUserRole === 4) whereClause.trainer_id = trainer_id; // Only admins can filter by trainer
      if (user_id && (currentUserRole === 3 || currentUserRole === 4)) whereClause.user_id = user_id;
      if (plan_id) whereClause.plan_id = plan_id;

      const changeRequests = await DietChangeRequest.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: true
          },
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          },
          {
            model: DietPlan,
            as: 'plan',
            attributes: ['id', 'title'],
            required: false
          }
        ],
        order: [
          ['urgency', 'DESC'], // High urgency first
          ['created_at', 'DESC']
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
      }, 'Enhanced change requests retrieved successfully');
    } catch (error) {
      console.error('Get enhanced change requests error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve change requests');
    }
  }

  // Get user's change requests
  static async getUserChangeRequests(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status, request_type, urgency } = req.query;

      const options = {};
      if (status) options.status = status;
      if (request_type) options.request_type = request_type;
      if (urgency) options.urgency = urgency;

      const changeRequests = await DietChangeRequest.findByUser(userId, {
        ...options,
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
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
      }, 'User change requests retrieved successfully');
    } catch (error) {
      console.error('Get user change requests error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve change requests');
    }
  }
}

module.exports = DietPlanController;
