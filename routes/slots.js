const express = require('express');
const { body, query, param } = require('express-validator');
const {
  createGymSlot,
  getGymSlots,
  bookSlot,
  cancelBooking,
  checkInSlot,
  checkOutSlot,
  getUserBookings,
  getSlotAvailability
} = require('../controllers/slotController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const createGymSlotValidation = [
  body('gymId')
    .isInt({ min: 1 })
    .withMessage('Valid gym ID is required'),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format')
    .custom((endTime, { req }) => {
      if (endTime <= req.body.startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('capacity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Capacity must be between 1 and 1000'),
  body('daysOfWeek')
    .isArray({ min: 1, max: 7 })
    .withMessage('Days of week must be an array with 1-7 elements')
    .custom((days) => {
      const validDays = [0, 1, 2, 3, 4, 5, 6]; // 0=Sunday, 6=Saturday
      const uniqueDays = [...new Set(days)];
      if (uniqueDays.length !== days.length) {
        throw new Error('Duplicate days not allowed');
      }
      if (!days.every(day => validDays.includes(day))) {
        throw new Error('Days must be numbers 0-6 (0=Sunday, 6=Saturday)');
      }
      return true;
    }),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const bookSlotValidation = [
  body('gymSlotId')
    .isInt({ min: 1 })
    .withMessage('Valid gym slot ID is required'),
  body('bookingDate')
    .isISO8601()
    .withMessage('Valid booking date is required (YYYY-MM-DD format)')
    .custom((date) => {
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      bookingDate.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        throw new Error('Cannot book slots for past dates');
      }
      
      // Allow booking up to 30 days in advance
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + 30);
      if (bookingDate > maxFutureDate) {
        throw new Error('Cannot book slots more than 30 days in advance');
      }
      
      return true;
    }),
  body('bookingType')
    .optional()
    .isIn(['regular', 'one_time_change', 'temporary'])
    .withMessage('Booking type must be regular, one_time_change, or temporary')
];

const cancelBookingValidation = [
  param('bookingId')
    .isInt({ min: 1 })
    .withMessage('Valid booking ID is required'),
  body('cancellationReason')
    .optional()
    .isLength({ min: 3, max: 500 })
    .withMessage('Cancellation reason must be 3-500 characters if provided')
];

const availabilityValidation = [
  query('gymSlotId')
    .isInt({ min: 1 })
    .withMessage('Valid gym slot ID is required'),
  query('date')
    .isISO8601()
    .withMessage('Valid date is required (YYYY-MM-DD format)')
];

/**
 * @swagger
 * /api/slots:
 *   post:
 *     summary: Create a new gym slot
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGymSlot'
 *     responses:
 *       201:
 *         description: Gym slot created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       409:
 *         description: Slot time overlaps with existing slot
 */
router.post('/', 
  authenticate, 
  authorize(['admin']), 
  createGymSlotValidation, 
  createGymSlot
);

/**
 * @swagger
 * /api/slots:
 *   get:
 *     summary: Get gym slots with filtering
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gymId
 *         schema:
 *           type: integer
 *         description: Filter by gym ID
 *       - in: query
 *         name: dayOfWeek
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: Filter by day of week (0=Sunday, 6=Saturday)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by slot status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of gym slots
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GymSlot'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationResponse'
 */
router.get('/', authenticate, getGymSlots);

/**
 * @swagger
 * /api/slots/book:
 *   post:
 *     summary: Book a gym slot
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookSlot'
 *     responses:
 *       201:
 *         description: Slot booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No active subscription
 *       404:
 *         description: Slot not found
 *       409:
 *         description: Slot full or already booked for this date
 */
router.post('/book', authenticate, bookSlotValidation, bookSlot);

/**
 * @swagger
 * /api/slots/bookings/{bookingId}/cancel:
 *   put:
 *     summary: Cancel a slot booking
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID to cancel
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Cannot cancel (too close to slot time)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.put('/bookings/:bookingId/cancel', 
  authenticate, 
  cancelBookingValidation, 
  cancelBooking
);

/**
 * @swagger
 * /api/slots/bookings/{bookingId}/checkin:
 *   put:
 *     summary: Check in to a booked slot
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID to check in
 *     responses:
 *       200:
 *         description: Checked in successfully
 *       400:
 *         description: Check-in not allowed (outside time window)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Valid booking not found for today
 */
router.put('/bookings/:bookingId/checkin', authenticate, checkInSlot);

/**
 * @swagger
 * /api/slots/bookings/{bookingId}/checkout:
 *   put:
 *     summary: Check out from a slot
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID to check out
 *     responses:
 *       200:
 *         description: Checked out successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Active checked-in booking not found
 */
router.put('/bookings/:bookingId/checkout', authenticate, checkOutSlot);

/**
 * @swagger
 * /api/slots/bookings:
 *   get:
 *     summary: Get user's slot bookings
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, completed, no_show, checked_in]
 *         description: Filter by booking status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings until this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of user bookings
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserSlotBooking'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationResponse'
 */
router.get('/bookings', authenticate, getUserBookings);

/**
 * @swagger
 * /api/slots/availability:
 *   get:
 *     summary: Get slot availability for a specific date
 *     tags: [Gym Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gymSlotId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gym slot ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Slot availability information
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SlotAvailability'
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Gym slot not found
 */
router.get('/availability', 
  authenticate, 
  availabilityValidation, 
  getSlotAvailability
);

module.exports = router;
