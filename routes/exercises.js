const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

/**
 * Exercise Routes
 * 
 * Public routes (no authentication required):
 * - GET /exercises - Get all public exercises
 * - GET /exercises/:id - Get single exercise (if public)
 * - GET /exercises/categories - Get exercise categories
 * - GET /exercises/muscle-groups - Get muscle groups
 * - GET /exercises/equipment - Get equipment list
 * - GET /exercises/popular - Get popular exercises
 * - GET /exercises/category/:category - Get exercises by category
 * - GET /exercises/search - Search exercises
 * 
 * Private routes (authentication required):
 * - GET /exercises?includePrivate=true - Get exercises including gym-specific ones
 * 
 * Admin only routes:
 * - POST /exercises - Create exercise
 * - PUT /exercises/:id - Update exercise
 * - DELETE /exercises/:id - Delete exercise
 * - PATCH /exercises/:id/visibility - Toggle exercise visibility
 */

// ================================
// PUBLIC ROUTES (No authentication required)
// ================================

/**
 * @swagger
 * /api/exercises:
 *   get:
 *     summary: Get all exercises with filtering and pagination
 *     tags: [Exercises]
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
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty
 *       - in: query
 *         name: muscleGroup
 *         schema:
 *           type: string
 *         description: Filter by muscle group
 *       - in: query
 *         name: equipment
 *         schema:
 *           type: string
 *         description: Filter by equipment
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: gymId
 *         schema:
 *           type: integer
 *         description: Filter by gym ID
 *       - in: query
 *         name: includePrivate
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include private exercises (requires authentication)
 *     responses:
 *       200:
 *         description: List of exercises
 *       500:
 *         description: Server error
 */
router.get('/', exerciseController.getAllExercises);

/**
 * @swagger
 * /api/exercises/categories:
 *   get:
 *     summary: Get exercise categories with counts
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: List of categories
 *       500:
 *         description: Server error
 */
router.get('/categories', exerciseController.getCategories);

/**
 * @swagger
 * /api/exercises/muscle-groups:
 *   get:
 *     summary: Get available muscle groups
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: List of muscle groups
 *       500:
 *         description: Server error
 */
router.get('/muscle-groups', exerciseController.getMuscleGroups);

/**
 * @swagger
 * /api/exercises/equipment:
 *   get:
 *     summary: Get available equipment list
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: List of equipment
 *       500:
 *         description: Server error
 */
router.get('/equipment', exerciseController.getEquipmentList);

/**
 * @swagger
 * /api/exercises/popular:
 *   get:
 *     summary: Get popular exercises
 *     tags: [Exercises]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of popular exercises to return
 *     responses:
 *       200:
 *         description: List of popular exercises
 *       500:
 *         description: Server error
 */
router.get('/popular', exerciseController.getPopularExercises);

/**
 * @swagger
 * /api/exercises/search:
 *   get:
 *     summary: Search exercises
 *     tags: [Exercises]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Search term is required
 *       500:
 *         description: Server error
 */
router.get('/search', exerciseController.searchExercises);

/**
 * @swagger
 * /api/exercises/category/{category}:
 *   get:
 *     summary: Get exercises by category
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Exercise category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of exercises to return
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty
 *     responses:
 *       200:
 *         description: List of exercises in category
 *       500:
 *         description: Server error
 */
router.get('/category/:category', exerciseController.getExercisesByCategory);

/**
 * @swagger
 * /api/exercises/{id}:
 *   get:
 *     summary: Get single exercise by ID
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise details
 *       404:
 *         description: Exercise not found
 *       403:
 *         description: Access denied for private exercise
 *       500:
 *         description: Server error
 */
router.get('/:id', exerciseController.getExerciseById);

// ================================
// ADMIN ONLY ROUTES (Admin authentication required)
// ================================

/**
 * @swagger
 * /api/exercises:
 *   post:
 *     summary: Create new exercise (Admin only)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exerciseTitle
 *               - category
 *               - difficulty
 *             properties:
 *               exerciseTitle:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               instructions:
 *                 type: string
 *                 maxLength: 5000
 *               youtubeUrl:
 *                 type: string
 *                 format: url
 *               thumbnailUrl:
 *                 type: string
 *                 format: url
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 300
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               category:
 *                 type: string
 *                 enum: [strength, cardio, flexibility, balance, sports, yoga, pilates, crossfit, bodyweight, weightlifting, other]
 *               muscleGroups:
 *                 type: array
 *                 items:
 *                   type: string
 *               equipmentNeeded:
 *                 type: array
 *                 items:
 *                   type: string
 *               calories:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2000
 *               sets:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               reps:
 *                 type: string
 *                 maxLength: 50
 *               restTime:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 600
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *               gymId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Exercise created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Server error
 */
router.post('/', adminAuth, exerciseController.createExercise);

/**
 * @swagger
 * /api/exercises/{id}:
 *   put:
 *     summary: Update exercise (Admin only)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exercise ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exerciseTitle:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               instructions:
 *                 type: string
 *                 maxLength: 5000
 *               youtubeUrl:
 *                 type: string
 *                 format: url
 *               thumbnailUrl:
 *                 type: string
 *                 format: url
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 300
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               category:
 *                 type: string
 *                 enum: [strength, cardio, flexibility, balance, sports, yoga, pilates, crossfit, bodyweight, weightlifting, other]
 *               muscleGroups:
 *                 type: array
 *                 items:
 *                   type: string
 *               equipmentNeeded:
 *                 type: array
 *                 items:
 *                   type: string
 *               calories:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2000
 *               sets:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               reps:
 *                 type: string
 *                 maxLength: 50
 *               restTime:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 600
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *               gymId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Exercise updated successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied - Admin only
 *       404:
 *         description: Exercise not found
 *       500:
 *         description: Server error
 */
router.put('/:id', adminAuth, exerciseController.updateExercise);

/**
 * @swagger
 * /api/exercises/{id}:
 *   delete:
 *     summary: Delete exercise (Admin only)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise deleted successfully
 *       403:
 *         description: Access denied - Admin only
 *       404:
 *         description: Exercise not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', adminAuth, exerciseController.deleteExercise);

/**
 * @swagger
 * /api/exercises/{id}/visibility:
 *   patch:
 *     summary: Toggle exercise visibility (public/private) (Admin only)
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Exercise ID
 *     responses:
 *       200:
 *         description: Exercise visibility toggled successfully
 *       403:
 *         description: Access denied - Admin only
 *       404:
 *         description: Exercise not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/visibility', adminAuth, exerciseController.toggleExerciseVisibility);

module.exports = router;
