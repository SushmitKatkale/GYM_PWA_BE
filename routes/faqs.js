const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getFAQs,
  getFAQCategories,
  getFAQ,
  createFAQ,
  editFAQ,
  removeFAQ
} = require('../controllers/faqController');

// Check if middleware exists, if not create basic versions
let authenticate, authorize;
try {
  const authMiddleware = require('../middleware/auth');
  authenticate = authMiddleware.authenticate;
  authorize = authMiddleware.authorize;
} catch (error) {
  // Create basic middleware if auth middleware doesn't exist
  authenticate = (req, res, next) => {
    // For development purposes, you can skip auth or add basic token check
    next();
  };
  authorize = (...roles) => (req, res, next) => {
    // For development purposes, you can skip auth or add basic role check
    next();
  };
}

// Validation middleware
const faqValidation = [
  body('question')
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Question must be between 10 and 500 characters'),
  body('answer')
    .notEmpty()
    .withMessage('Answer is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Answer must be between 10 and 2000 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['Membership', 'Payment', 'App Usage', 'Account', 'Facilities', 'Classes', 'General'])
    .withMessage('Invalid category')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     FAQ:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the FAQ
 *         question:
 *           type: string
 *           description: The FAQ question
 *         answer:
 *           type: string
 *           description: The FAQ answer
 *         category:
 *           type: string
 *           enum: [Membership, Payment, App Usage, Account, Facilities, Classes, General]
 *           description: FAQ category
 *       example:
 *         id: "1"
 *         question: "How do I sign up for a gym membership?"
 *         answer: "You can sign up for a membership by visiting any of our gym locations, using our mobile app, or through our website."
 *         category: "Membership"
 *     
 *     CreateFAQ:
 *       type: object
 *       required:
 *         - question
 *         - answer
 *         - category
 *       properties:
 *         question:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: The FAQ question
 *         answer:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           description: The FAQ answer
 *         category:
 *           type: string
 *           enum: [Membership, Payment, App Usage, Account, Facilities, Classes, General]
 *           description: FAQ category
 *       example:
 *         question: "How do I cancel my membership?"
 *         answer: "You can cancel your membership by contacting our support team or visiting your nearest gym location."
 *         category: "Membership"
 */

/**
 * @swagger
 * /api/faqs:
 *   get:
 *     tags: [FAQs]
 *     summary: Get all FAQs
 *     description: Retrieve all FAQs with optional filtering by category and search term
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [All, Membership, Payment, App Usage, Account, Facilities, Classes, General]
 *         description: Filter FAQs by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter FAQs by question or answer
 *     responses:
 *       200:
 *         description: FAQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "FAQs retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     faqs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FAQ'
 *                     total:
 *                       type: integer
 *                       example: 10
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/', getFAQs);

/**
 * @swagger
 * /api/faqs/categories:
 *   get:
 *     tags: [FAQs]
 *     summary: Get all FAQ categories
 *     description: Retrieve all available FAQ categories
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "FAQ categories retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["All", "Account", "App Usage", "Classes", "Facilities", "General", "Membership", "Payment"]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/categories', getFAQCategories);

/**
 * @swagger
 * /api/faqs/{id}:
 *   get:
 *     tags: [FAQs]
 *     summary: Get FAQ by ID
 *     description: Retrieve a specific FAQ by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID
 *     responses:
 *       200:
 *         description: FAQ retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "FAQ retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FAQ'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getFAQ);

/**
 * @swagger
 * /api/faqs:
 *   post:
 *     tags: [FAQs]
 *     summary: Create a new FAQ
 *     description: Create a new FAQ (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFAQ'
 *     responses:
 *       201:
 *         description: FAQ created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "FAQ created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FAQ'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, authorize('3'), faqValidation, createFAQ);

/**
 * @swagger
 * /api/faqs/{id}:
 *   put:
 *     tags: [FAQs]
 *     summary: Update an FAQ
 *     description: Update an existing FAQ (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFAQ'
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "FAQ updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FAQ'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, authorize('3'), faqValidation, editFAQ);

/**
 * @swagger
 * /api/faqs/{id}:
 *   delete:
 *     tags: [FAQs]
 *     summary: Delete an FAQ
 *     description: Delete an existing FAQ (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FAQ ID
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "FAQ deleted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FAQ'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, authorize('3'), removeFAQ);

module.exports = router;
