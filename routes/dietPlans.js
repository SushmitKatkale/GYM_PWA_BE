const express = require('express');
const DietPlanController = require('../controllers/dietPlanController');
const { authenticate, authorize } = require('../middleware/auth');

const dietPlanRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DietPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Diet plan ID
 *         trainer_id:
 *           type: integer
 *           nullable: true
 *           description: Trainer ID who created the plan (nullable for user-created plans)
 *         user_id:
 *           type: integer
 *           description: User ID for whom the plan is created
 *         title:
 *           type: string
 *           description: Diet plan title
 *         description:
 *           type: string
 *           description: Diet plan description
 *         calories:
 *           type: integer
 *           description: Target daily calories
 *         protein_g:
 *           type: integer
 *           description: Target protein in grams
 *         carbs_g:
 *           type: integer
 *           description: Target carbohydrates in grams
 *         fats_g:
 *           type: integer
 *           description: Target fats in grams
 *         status:
 *           type: string
 *           enum: [active, archived]
 *           description: Diet plan status
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     DietPlanMeal:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         plan_id:
 *           type: integer
 *         meal_type:
 *           type: string
 *           enum: [breakfast, lunch, snack, dinner, other]
 *         food_item:
 *           type: string
 *           description: Name of the food item
 *         description:
 *           type: string
 *           description: Detailed meal description
 *         instructions:
 *           type: string
 *           description: Cooking/preparation instructions
 *         quantity:
 *           type: string
 *           description: Serving size
 *         calories:
 *           type: integer
 *           description: Calories per serving
 *         protein:
 *           type: number
 *           description: Protein in grams
 *         carbs:
 *           type: number
 *           description: Carbohydrates in grams
 *         fat:
 *           type: number
 *           description: Fat in grams
 *         fiber:
 *           type: number
 *           description: Fiber in grams
 *         sugar:
 *           type: number
 *           description: Sugar in grams
 *         sodium:
 *           type: number
 *           description: Sodium in milligrams
 *         image_url:
 *           type: string
 *           description: URL to meal image
 *         preferred_time:
 *           type: string
 *           format: time
 *           description: Preferred eating time
 *         is_mandatory:
 *           type: boolean
 *           description: Whether the meal is mandatory
 *         alternatives:
 *           type: string
 *           description: Alternative food options
 *         meal_description:
 *           type: string
 *           description: Legacy meal description (backward compatibility)
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     DietChangeRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         trainer_id:
 *           type: integer
 *           nullable: true
 *           description: Trainer ID (nullable for general requests)
 *         plan_id:
 *           type: integer
 *           nullable: true
 *         request_type:
 *           type: string
 *           enum: [general, meal_change, allergy, preference, nutrition_adjustment]
 *           description: Type of change request
 *         description:
 *           type: string
 *           description: Detailed request description
 *         urgency:
 *           type: string
 *           enum: [low, medium, high]
 *           description: Request urgency level
 *         request_text:
 *           type: string
 *           description: Legacy request text (backward compatibility)
 *         status:
 *           type: string
 *           enum: [pending, in_progress, approved, rejected, fulfilled]
 *         trainer_response:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         responded_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/diet-plans:
 *   post:
 *     tags: [Diet Plans]
 *     summary: Create a new diet plan (Trainer only)
 *     description: Create a comprehensive diet plan with meals for a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: Target user ID
 *               title:
 *                 type: string
 *                 description: Diet plan title
 *               description:
 *                 type: string
 *                 description: Diet plan description
 *               calories:
 *                 type: integer
 *                 description: Total daily calories
 *               protein_g:
 *                 type: integer
 *                 description: Daily protein in grams
 *               carbs_g:
 *                 type: integer
 *                 description: Daily carbohydrates in grams
 *               fats_g:
 *                 type: integer
 *                 description: Daily fats in grams
 *               meals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     meal_type:
 *                       type: string
 *                       enum: [breakfast, lunch, snack, dinner, other]
 *                     meal_description:
 *                       type: string
 *           example:
 *             user_id: 1
 *             title: "Weight Loss Diet Plan"
 *             description: "Balanced diet plan for healthy weight loss"
 *             calories: 1800
 *             protein_g: 120
 *             carbs_g: 200
 *             fats_g: 60
 *             meals:
 *               - meal_type: "breakfast"
 *                 meal_description: "Oatmeal with berries and nuts"
 *               - meal_type: "lunch"
 *                 meal_description: "Grilled chicken salad with vegetables"
 *     responses:
 *       201:
 *         description: Diet plan created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Only trainers can create diet plans
 *       404:
 *         description: Target user not found
 */
dietPlanRouter.post('/', authenticate, authorize('1', '3', '4'), DietPlanController.createDietPlan);

/**
 * @swagger
 * /api/diet-plans/trainer:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get all diet plans for a trainer (Trainer/Admin only)
 *     description: Retrieve all diet plans created by the authenticated trainer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of plans per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived]
 *         description: Filter by plan status
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by specific user
 *     responses:
 *       200:
 *         description: Diet plans retrieved successfully
 *       403:
 *         description: Only trainers can access this endpoint
 */
dietPlanRouter.get('/trainer', authenticate, authorize('3', '4'), DietPlanController.getTrainerDietPlans);

/**
 * @swagger
 * /api/diet-plans/user:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get user's diet plans
 *     description: Retrieve all diet plans assigned to the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of plans per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived]
 *           default: active
 *         description: Filter by plan status
 *     responses:
 *       200:
 *         description: User diet plans retrieved successfully
 */
dietPlanRouter.get('/user', authenticate, DietPlanController.getUserDietPlans);

/**
 * @swagger
 * /api/diet-plans/change-requests:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get change requests for trainer (Trainer/Admin only)
 *     description: Retrieve all change requests for the authenticated trainer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, fulfilled]
 *           default: pending
 *         description: Filter by request status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of requests per page
 *     responses:
 *       200:
 *         description: Change requests retrieved successfully
 *       403:
 *         description: Only trainers can access this endpoint
 */
dietPlanRouter.get('/change-requests', authenticate, authorize('3', '4'), DietPlanController.getTrainerChangeRequests);

/**
 * @swagger
 * /api/diet-plans/change-requests:
 *   post:
 *     tags: [Diet Plans]
 *     summary: Create change request (User only)
 *     description: Create a request for changes to a diet plan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trainer_id
 *               - request_text
 *             properties:
 *               trainer_id:
 *                 type: integer
 *                 description: Trainer ID
 *               plan_id:
 *                 type: integer
 *                 description: Diet plan ID (optional)
 *               request_text:
 *                 type: string
 *                 description: Change request description
 *           example:
 *             trainer_id: 5
 *             plan_id: 1
 *             request_text: "Please add more protein options for breakfast"
 *     responses:
 *       201:
 *         description: Change request created successfully
 *       400:
 *         description: Validation error
 */
dietPlanRouter.post('/change-requests', authenticate, DietPlanController.createChangeRequest);

/**
 * @swagger
 * /api/diet-plans/trainer/stats:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get trainer statistics (Trainer/Admin only)
 *     description: Retrieve comprehensive statistics for trainer's diet plans and change requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Trainer statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: object
 *                   description: Diet plan statistics
 *                 changeRequests:
 *                   type: object
 *                   description: Change request statistics
 *       403:
 *         description: Only trainers can access this endpoint
 */
dietPlanRouter.get('/trainer/stats', authenticate, authorize('3', '4'), DietPlanController.getTrainerStats);

/**
 * @swagger
 * /api/diet-plans/{id}:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get diet plan by ID
 *     description: Retrieve a specific diet plan with all meals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *     responses:
 *       200:
 *         description: Diet plan retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.get('/:id', authenticate, DietPlanController.getDietPlanById);

/**
 * @swagger
 * /api/diet-plans/{id}:
 *   put:
 *     tags: [Diet Plans]
 *     summary: Update diet plan (Trainer/Admin only)
 *     description: Update an existing diet plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               calories:
 *                 type: integer
 *               protein_g:
 *                 type: integer
 *               carbs_g:
 *                 type: integer
 *               fats_g:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, archived]
 *           example:
 *             title: "Updated Weight Loss Diet Plan"
 *             description: "Modified plan with more variety"
 *             calories: 1900
 *             protein_g: 130
 *     responses:
 *       200:
 *         description: Diet plan updated successfully
 *       403:
 *         description: Only the trainer who created this plan can update it
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.put('/:id', authenticate, authorize('3', '4'), DietPlanController.updateDietPlan);

/**
 * @swagger
 * /api/diet-plans/{id}/meals:
 *   post:
 *     tags: [Diet Plans]
 *     summary: Add meal to diet plan (Trainer/Admin only)
 *     description: Add a new meal to an existing diet plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meal_type
 *               - meal_description
 *             properties:
 *               meal_type:
 *                 type: string
 *                 enum: [breakfast, lunch, snack, dinner, other]
 *               meal_description:
 *                 type: string
 *           example:
 *             meal_type: "snack"
 *             meal_description: "Greek yogurt with honey and almonds"
 *     responses:
 *       201:
 *         description: Meal added to diet plan successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.post('/:id/meals', authenticate, authorize('3', '4'), DietPlanController.addMealToDietPlan);

/**
 * @swagger
 * /api/diet-plans/{id}/archive:
 *   put:
 *     tags: [Diet Plans]
 *     summary: Archive diet plan (Trainer/Admin only)
 *     description: Archive a diet plan (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *     responses:
 *       200:
 *         description: Diet plan archived successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.put('/:id/archive', authenticate, authorize('3', '4'), DietPlanController.archiveDietPlan);

/**
 * @swagger
 * /api/diet-plans/change-requests/{id}/respond:
 *   put:
 *     tags: [Diet Plans]
 *     summary: Respond to change request (Trainer/Admin only)
 *     description: Approve, reject, or fulfill a change request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Change request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, fulfilled]
 *               trainer_response:
 *                 type: string
 *                 description: Trainer's response message
 *           example:
 *             status: "approved"
 *             trainer_response: "Great suggestion! I'll update your plan with more protein options."
 *     responses:
 *       200:
 *         description: Change request updated successfully
 *       400:
 *         description: Invalid status value
 *       403:
 *         description: Access denied
 *       404:
 *         description: Change request not found
 */
dietPlanRouter.put('/change-requests/:id/respond', authenticate, authorize('3', '4'), DietPlanController.respondToChangeRequest);

/**
 * @swagger
 * /api/diet-plans/{id}/history:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get diet plan history
 *     description: Retrieve the change history of a diet plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *     responses:
 *       200:
 *         description: Diet plan history retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.get('/:id/history', authenticate, DietPlanController.getDietPlanHistory);

// ======= NEW MEAL MANAGEMENT ENDPOINTS =======

/**
 * @swagger
 * /api/diet-plans/meals/{mealId}:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get specific meal by ID
 *     description: Retrieve detailed information about a specific meal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Meal ID
 *     responses:
 *       200:
 *         description: Meal retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Meal not found
 */
dietPlanRouter.get('/meals/:mealId', authenticate, DietPlanController.getMealById);

/**
 * @swagger
 * /api/diet-plans/meals/{mealId}:
 *   put:
 *     tags: [Diet Plans]
 *     summary: Update specific meal
 *     description: Update a meal with enhanced nutrition information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Meal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meal_type:
 *                 type: string
 *                 enum: [breakfast, lunch, snack, dinner, other]
 *               food_item:
 *                 type: string
 *                 description: Name of the food item
 *               description:
 *                 type: string
 *                 description: Detailed meal description
 *               instructions:
 *                 type: string
 *                 description: Cooking/preparation instructions
 *               quantity:
 *                 type: string
 *                 description: Serving size
 *               calories:
 *                 type: integer
 *                 description: Calories per serving
 *               protein:
 *                 type: number
 *                 description: Protein in grams
 *               carbs:
 *                 type: number
 *                 description: Carbohydrates in grams
 *               fat:
 *                 type: number
 *                 description: Fat in grams
 *               fiber:
 *                 type: number
 *                 description: Fiber in grams
 *               sugar:
 *                 type: number
 *                 description: Sugar in grams
 *               sodium:
 *                 type: number
 *                 description: Sodium in milligrams
 *               image_url:
 *                 type: string
 *                 description: URL to meal image
 *               preferred_time:
 *                 type: string
 *                 format: time
 *                 description: Preferred eating time
 *               is_mandatory:
 *                 type: boolean
 *                 description: Whether the meal is mandatory
 *               alternatives:
 *                 type: string
 *                 description: Alternative food options
 *           example:
 *             food_item: "Grilled Chicken Breast"
 *             description: "Lean protein with mixed vegetables"
 *             instructions: "Grill for 6-8 minutes each side"
 *             quantity: "150g chicken + 200g vegetables"
 *             calories: 320
 *             protein: 45.5
 *             carbs: 12.0
 *             fat: 8.2
 *             fiber: 4.5
 *             preferred_time: "12:00"
 *             is_mandatory: true
 *     responses:
 *       200:
 *         description: Meal updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Meal not found
 */
dietPlanRouter.put('/meals/:mealId', authenticate, DietPlanController.updateMeal);

/**
 * @swagger
 * /api/diet-plans/meals/{mealId}:
 *   delete:
 *     tags: [Diet Plans]
 *     summary: Delete specific meal
 *     description: Remove a meal from a diet plan (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Meal ID
 *     responses:
 *       200:
 *         description: Meal deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Meal not found
 */
dietPlanRouter.delete('/meals/:mealId', authenticate, DietPlanController.deleteMeal);

/**
 * @swagger
 * /api/diet-plans/user/change-requests:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get user's change requests
 *     description: Retrieve change requests created by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of requests per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, approved, rejected, fulfilled]
 *         description: Filter by request status
 *       - in: query
 *         name: request_type
 *         schema:
 *           type: string
 *           enum: [general, meal_change, allergy, preference, nutrition_adjustment]
 *         description: Filter by request type
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by urgency level
 *     responses:
 *       200:
 *         description: User change requests retrieved successfully
 */
dietPlanRouter.get('/user/change-requests', authenticate, DietPlanController.getUserChangeRequests);

// ======= NEW ENHANCED ENDPOINTS =======

/**
 * @swagger
 * /api/diet-plans/{id}/meals:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get all meals for a diet plan with filtering
 *     description: Retrieve all meals for a specific diet plan with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *       - in: query
 *         name: meal_type
 *         schema:
 *           type: string
 *           enum: [breakfast, lunch, snack, dinner, other]
 *         description: Filter by meal type
 *       - in: query
 *         name: is_mandatory
 *         schema:
 *           type: boolean
 *         description: Filter by mandatory status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of meals per page
 *     responses:
 *       200:
 *         description: Diet plan meals retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.get('/:id/meals', authenticate, DietPlanController.getDietPlanMeals);

/**
 * @swagger
 * /api/diet-plans/{id}/meals/create:
 *   post:
 *     tags: [Diet Plans]
 *     summary: Create a new meal for a diet plan (Enhanced)
 *     description: Create a detailed meal with full nutrition information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meal_type
 *             properties:
 *               meal_type:
 *                 type: string
 *                 enum: [breakfast, lunch, snack, dinner, other]
 *               food_item:
 *                 type: string
 *                 description: Name of the food item
 *               description:
 *                 type: string
 *                 description: Detailed meal description
 *               instructions:
 *                 type: string
 *                 description: Cooking/preparation instructions
 *               quantity:
 *                 type: string
 *                 description: Serving size
 *               calories:
 *                 type: integer
 *                 description: Calories per serving
 *               protein:
 *                 type: number
 *                 description: Protein in grams
 *               carbs:
 *                 type: number
 *                 description: Carbohydrates in grams
 *               fat:
 *                 type: number
 *                 description: Fat in grams
 *               fiber:
 *                 type: number
 *                 description: Fiber in grams
 *               sugar:
 *                 type: number
 *                 description: Sugar in grams
 *               sodium:
 *                 type: number
 *                 description: Sodium in milligrams
 *               image_url:
 *                 type: string
 *                 description: URL to meal image
 *               preferred_time:
 *                 type: string
 *                 format: time
 *                 description: Preferred eating time
 *               is_mandatory:
 *                 type: boolean
 *                 description: Whether the meal is mandatory
 *               alternatives:
 *                 type: string
 *                 description: Alternative food options
 *               meal_description:
 *                 type: string
 *                 description: Legacy meal description (for backward compatibility)
 *           example:
 *             meal_type: "breakfast"
 *             food_item: "Greek Yogurt Bowl"
 *             description: "High-protein breakfast with fresh berries"
 *             instructions: "Mix yogurt with berries and nuts"
 *             quantity: "200g yogurt + 50g berries + 30g nuts"
 *             calories: 280
 *             protein: 18.5
 *             carbs: 22.0
 *             fat: 12.0
 *             fiber: 6.0
 *             sugar: 15.0
 *             sodium: 85
 *             preferred_time: "07:30"
 *             is_mandatory: true
 *             alternatives: "Can substitute with oatmeal or smoothie"
 *     responses:
 *       201:
 *         description: Meal created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.post('/:id/meals/create', authenticate, DietPlanController.createMeal);

/**
 * @swagger
 * /api/diet-plans/{id}/nutrition:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get nutrition analysis for a diet plan
 *     description: Calculate and return comprehensive nutrition analysis based on all meals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diet plan ID
 *     responses:
 *       200:
 *         description: Nutrition analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_calories:
 *                   type: number
 *                   description: Total daily calories
 *                 total_protein:
 *                   type: number
 *                   description: Total daily protein in grams
 *                 total_carbs:
 *                   type: number
 *                   description: Total daily carbohydrates in grams
 *                 total_fat:
 *                   type: number
 *                   description: Total daily fat in grams
 *                 total_fiber:
 *                   type: number
 *                   description: Total daily fiber in grams
 *                 total_sugar:
 *                   type: number
 *                   description: Total daily sugar in grams
 *                 total_sodium:
 *                   type: number
 *                   description: Total daily sodium in milligrams
 *                 meal_count:
 *                   type: integer
 *                   description: Total number of meals
 *                 by_meal_type:
 *                   type: object
 *                   description: Nutrition breakdown by meal type
 *                 target_comparison:
 *                   type: object
 *                   description: Comparison with diet plan targets
 *                 plan_targets:
 *                   type: object
 *                   description: Original diet plan targets
 *       403:
 *         description: Access denied
 *       404:
 *         description: Diet plan not found
 */
dietPlanRouter.get('/:id/nutrition', authenticate, DietPlanController.getDietPlanNutrition);

/**
 * @swagger
 * /api/diet-plans/change-requests/enhanced:
 *   get:
 *     tags: [Diet Plans]
 *     summary: Get enhanced change requests with comprehensive filtering
 *     description: Retrieve change requests with role-based filtering and advanced options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, approved, rejected, fulfilled]
 *         description: Filter by request status
 *       - in: query
 *         name: request_type
 *         schema:
 *           type: string
 *           enum: [general, meal_change, allergy, preference, nutrition_adjustment]
 *         description: Filter by request type
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by urgency level
 *       - in: query
 *         name: trainer_id
 *         schema:
 *           type: integer
 *         description: Filter by trainer ID (Admin only)
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID (Trainer/Admin only)
 *       - in: query
 *         name: plan_id
 *         schema:
 *           type: integer
 *         description: Filter by plan ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of requests per page
 *     responses:
 *       200:
 *         description: Enhanced change requests retrieved successfully
 */
dietPlanRouter.get('/change-requests/enhanced', authenticate, DietPlanController.getEnhancedChangeRequests);

module.exports = dietPlanRouter;
