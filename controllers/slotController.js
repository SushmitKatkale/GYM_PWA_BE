const { 
  GymSlot, 
  SlotAvailability, 
  UserSlotBooking, 
  SlotChangeHistory, 
  SlotWaitlist,
  Gym,
  UserSubscription,
  sequelize 
} = require('../models');
const { Op, Transaction } = require('sequelize');
const { validationResult } = require('express-validator');

// Create gym slot
const createGymSlot = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { gymId, startTime, endTime, capacity, daysOfWeek, isActive = true } = req.body;
    const createdBy = req.user.id; // Updated to use user ID

    // Check if gym exists
    const gym = await Gym.findByPk(gymId, { transaction });
    if (!gym) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Gym not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check for overlapping slots
    const overlappingSlot = await GymSlot.findOne({
      where: {
        gymId,
        status: 'active',
        [Op.or]: [
          {
            startTime: { [Op.between]: [startTime, endTime] }
          },
          {
            endTime: { [Op.between]: [startTime, endTime] }
          },
          {
            [Op.and]: [
              { startTime: { [Op.lte]: startTime } },
              { endTime: { [Op.gte]: endTime } }
            ]
          }
        ],
        daysOfWeek: {
          [Op.overlap]: daysOfWeek
        }
      },
      transaction
    });

    if (overlappingSlot) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Slot time overlaps with existing slot',
        timestamp: new Date().toISOString()
      });
    }

    const gymSlot = await GymSlot.create({
      gymId,
      startTime,
      endTime,
      capacity,
      daysOfWeek,
      status: isActive ? 'active' : 'inactive',
      createdBy,
      updatedBy: createdBy
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Gym slot created successfully',
      data: gymSlot,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create gym slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get gym slots
const getGymSlots = async (req, res) => {
  try {
    const { gymId, dayOfWeek, status = 'active' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = { status };
    if (gymId) whereClause.gymId = gymId;
    if (dayOfWeek) {
      whereClause.daysOfWeek = {
        [Op.contains]: [parseInt(dayOfWeek)]
      };
    }

    const { count, rows } = await GymSlot.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Gym,
          attributes: ['id', 'name', 'address']
        }
      ],
      limit,
      offset,
      order: [['startTime', 'ASC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get gym slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Book slot with concurrency handling
const bookSlot = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { gymSlotId, bookingDate, bookingType = 'regular' } = req.body;
    const userEmail = req.user.email; // Keep for backward compatibility
    const userId = req.user.id; // Use user ID as primary identifier

    // Get user's active subscription (support both user_id and userEmail)
    const userSubscription = await UserSubscription.findOne({
      where: {
        [Op.or]: [
          { user_id: userId },
          { userEmail: userEmail }
        ],
        record_status: 1, // Updated field name
        validFrom: { [Op.lte]: new Date() },
        validTo: { [Op.gte]: new Date() }
      },
      transaction
    });

    if (!userSubscription) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No active subscription found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if slot exists and is active
    const gymSlot = await GymSlot.findOne({
      where: { id: gymSlotId, status: 'active' },
      transaction
    });

    if (!gymSlot) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Gym slot not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user already has a booking for this date (support both user_id and userEmail)
    const existingBooking = await UserSlotBooking.findOne({
      where: {
        [Op.or]: [
          { user_id: userId },
          { userEmail: userEmail }
        ],
        bookingDate,
        bookingStatus: { [Op.in]: ['active', 'checked_in'] }
      },
      transaction
    });

    if (existingBooking) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'You already have a booking for this date',
        timestamp: new Date().toISOString()
      });
    }

    // Get or create slot availability for the date
    const [slotAvailability] = await SlotAvailability.findOrCreate({
      where: {
        gymSlotId,
        availabilityDate: bookingDate
      },
      defaults: {
        availableCapacity: gymSlot.capacity,
        bookedCount: 0
      },
      transaction
    });

    // Check availability with row-level locking
    const lockedAvailability = await SlotAvailability.findOne({
      where: { id: slotAvailability.id },
      lock: Transaction.LOCK.UPDATE,
      transaction
    });

    if (lockedAvailability.availableCapacity <= 0) {
      // Add to waitlist if slot is full
      const existingWaitlist = await SlotWaitlist.findOne({
        where: {
          userEmail,
          gymSlotId,
          requestedDate: bookingDate,
          status: 'waiting'
        },
        transaction
      });

      if (!existingWaitlist) {
        await SlotWaitlist.create({
          user_id: userId, // Use user ID
          userEmail, // Keep for backward compatibility
          gymSlotId,
          requestedDate: bookingDate,
          priorityScore: 1,
          status: 'waiting'
        }, { transaction });
      }

      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Slot is full. Added to waitlist.',
        timestamp: new Date().toISOString()
      });
    }

    // Create booking
    const booking = await UserSlotBooking.create({
      user_id: userId, // Use user ID
      userEmail, // Keep for backward compatibility
      userSubscriptionId: userSubscription.id,
      gymSlotId,
      bookingDate,
      bookingStatus: 'active',
      bookingType
    }, { transaction });

    // Update slot availability
    await lockedAvailability.update({
      availableCapacity: lockedAvailability.availableCapacity - 1,
      bookedCount: lockedAvailability.bookedCount + 1
    }, { transaction });

    // Record in change history if it's not the initial selection
    if (bookingType !== 'regular') {
      await SlotChangeHistory.create({
        user_id: userId, // Use user ID
        userEmail, // Keep for backward compatibility
        userSubscriptionId: userSubscription.id,
        newGymSlotId: gymSlotId,
        changeDate: new Date(),
        changeReason: 'Slot booking',
        changeType: bookingType === 'one_time_change' ? 'temporary_change' : 'permanent_change',
        effectiveFromDate: bookingDate,
        effectiveToDate: bookingDate,
        requestedBy: userId, // Use user ID
        approvalStatus: 'approved'
      }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Slot booked successfully',
      data: booking,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Book slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  
  try {
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;
    const userEmail = req.user.email;
    const userId = req.user.id; // Add user ID support

    // Find booking with lock (support both user_id and userEmail)
    const booking = await UserSlotBooking.findOne({
      where: {
        id: bookingId,
        [Op.or]: [
          { user_id: userId },
          { userEmail: userEmail }
        ],
        bookingStatus: { [Op.in]: ['active'] }
      },
      lock: Transaction.LOCK.UPDATE,
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found or cannot be cancelled',
        timestamp: new Date().toISOString()
      });
    }

    // Check if booking can be cancelled (e.g., not too close to the slot time)
    const bookingDateTime = new Date(`${booking.bookingDate}T${booking.GymSlot?.startTime || '00:00:00'}`);
    const now = new Date();
    const timeDiff = bookingDateTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) { // Cannot cancel within 2 hours
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking within 2 hours of slot time',
        timestamp: new Date().toISOString()
      });
    }

    // Update booking status
    await booking.update({
      bookingStatus: 'cancelled',
      cancellationReason,
      cancellationTime: new Date()
    }, { transaction });

    // Update slot availability
    const slotAvailability = await SlotAvailability.findOne({
      where: {
        gymSlotId: booking.gymSlotId,
        availabilityDate: booking.bookingDate
      },
      lock: Transaction.LOCK.UPDATE,
      transaction
    });

    if (slotAvailability) {
      await slotAvailability.update({
        availableCapacity: slotAvailability.availableCapacity + 1,
        bookedCount: slotAvailability.bookedCount - 1
      }, { transaction });

      // Check waitlist for this slot
      const waitlistEntry = await SlotWaitlist.findOne({
        where: {
          gymSlotId: booking.gymSlotId,
          requestedDate: booking.bookingDate,
          status: 'waiting'
        },
        order: [['priorityScore', 'DESC'], ['createdAt', 'ASC']],
        transaction
      });

      if (waitlistEntry) {
        // Auto-book for waitlisted user (support both user_id and userEmail)
        const waitlistUserSubscription = await UserSubscription.findOne({
          where: {
            [Op.or]: [
              { user_id: waitlistEntry.user_id },
              { userEmail: waitlistEntry.userEmail }
            ],
            record_status: 1, // Updated field name
            validFrom: { [Op.lte]: new Date() },
            validTo: { [Op.gte]: new Date() }
          },
          transaction
        });

        if (waitlistUserSubscription) {
          await UserSlotBooking.create({
            user_id: waitlistEntry.user_id, // Use user ID
            userEmail: waitlistEntry.userEmail, // Keep for backward compatibility
            userSubscriptionId: waitlistUserSubscription.id,
            gymSlotId: booking.gymSlotId,
            bookingDate: booking.bookingDate,
            bookingStatus: 'active',
            bookingType: 'regular'
          }, { transaction });

          await waitlistEntry.update({
            status: 'fulfilled'
          }, { transaction });

          // Keep availability as it was (waitlist user took the spot)
          await slotAvailability.update({
            availableCapacity: slotAvailability.availableCapacity - 1,
            bookedCount: slotAvailability.bookedCount + 1
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Check-in to slot
const checkInSlot = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  
  try {
    const { bookingId } = req.params;
    const userEmail = req.user.email;
    const userId = req.user.id; // Add user ID support

    const booking = await UserSlotBooking.findOne({
      where: {
        id: bookingId,
        [Op.or]: [
          { user_id: userId },
          { userEmail: userEmail }
        ],
        bookingStatus: 'active',
        bookingDate: new Date().toISOString().split('T')[0] // Today's date
      },
      include: [{ model: GymSlot }],
      lock: Transaction.LOCK.UPDATE,
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Valid booking not found for today',
        timestamp: new Date().toISOString()
      });
    }

    // Check if within check-in time window
    const now = new Date();
    const slotStart = new Date(`${booking.bookingDate}T${booking.GymSlot.startTime}`);
    const checkInWindow = 30 * 60 * 1000; // 30 minutes before slot start

    if (now < (slotStart - checkInWindow)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Check-in not allowed yet. Please check-in within 30 minutes of slot start.',
        timestamp: new Date().toISOString()
      });
    }

    await booking.update({
      bookingStatus: 'checked_in',
      checkinTime: now
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Checked in successfully',
      data: { checkinTime: now },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Check-out from slot
const checkOutSlot = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { bookingId } = req.params;
    const userEmail = req.user.email;
    const userId = req.user.id; // Add user ID support

    const booking = await UserSlotBooking.findOne({
      where: {
        id: bookingId,
        [Op.or]: [
          { user_id: userId },
          { userEmail: userEmail }
        ],
        bookingStatus: 'checked_in'
      },
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Active checked-in booking not found',
        timestamp: new Date().toISOString()
      });
    }

    await booking.update({
      bookingStatus: 'completed',
      checkoutTime: new Date()
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Checked out successfully',
      data: { checkoutTime: new Date() },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get user bookings
const getUserBookings = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userId = req.user.id; // Add user ID support
    const { status, startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Support both user_id and userEmail for backward compatibility
    const whereClause = {
      [Op.or]: [
        { user_id: userId },
        { userEmail: userEmail }
      ]
    };
    if (status) whereClause.bookingStatus = status;
    if (startDate && endDate) {
      whereClause.bookingDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const { count, rows } = await UserSlotBooking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: GymSlot,
          include: [{ model: Gym, attributes: ['id', 'name', 'address'] }]
        }
      ],
      limit,
      offset,
      order: [['bookingDate', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get slot availability
const getSlotAvailability = async (req, res) => {
  try {
    const { gymSlotId, date } = req.query;

    if (!gymSlotId || !date) {
      return res.status(400).json({
        success: false,
        message: 'gymSlotId and date are required',
        timestamp: new Date().toISOString()
      });
    }

    const gymSlot = await GymSlot.findByPk(gymSlotId, {
      include: [{ model: Gym, attributes: ['id', 'name'] }]
    });

    if (!gymSlot) {
      return res.status(404).json({
        success: false,
        message: 'Gym slot not found',
        timestamp: new Date().toISOString()
      });
    }

    const availability = await SlotAvailability.findOne({
      where: {
        gymSlotId,
        availabilityDate: date
      }
    });

    const availabilityData = availability || {
      availableCapacity: gymSlot.capacity,
      bookedCount: 0,
      gymSlotId,
      availabilityDate: date
    };

    res.json({
      success: true,
      data: {
        ...availabilityData,
        gymSlot: {
          id: gymSlot.id,
          startTime: gymSlot.startTime,
          endTime: gymSlot.endTime,
          capacity: gymSlot.capacity,
          gym: gymSlot.Gym
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get slot availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Update gym slot
const updateGymSlot = async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  
  try {
    const { id } = req.params;
    const { startTime, endTime, capacity, daysOfWeek, isActive } = req.body;
    const updatedBy = req.user.id; // Updated to use user ID

    // Find the slot
    const gymSlot = await GymSlot.findByPk(id, { transaction });
    if (!gymSlot) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Gym slot not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check for overlapping slots (excluding current slot)
    if (startTime && endTime && daysOfWeek) {
      const overlappingSlot = await GymSlot.findOne({
        where: {
          gymId: gymSlot.gymId,
          id: { [Op.ne]: id }, // Exclude current slot
          status: 'active',
          [Op.or]: [
            {
              startTime: { [Op.between]: [startTime, endTime] }
            },
            {
              endTime: { [Op.between]: [startTime, endTime] }
            },
            {
              [Op.and]: [
                { startTime: { [Op.lte]: startTime } },
                { endTime: { [Op.gte]: endTime } }
              ]
            }
          ],
          daysOfWeek: {
            [Op.overlap]: daysOfWeek
          }
        },
        transaction
      });

      if (overlappingSlot) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Updated slot time overlaps with existing slot',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Update the slot
    const updateData = { updatedBy };
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;
    if (isActive !== undefined) updateData.status = isActive ? 'active' : 'inactive';

    await gymSlot.update(updateData, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Gym slot updated successfully',
      data: gymSlot,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update gym slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Delete (deactivate) gym slot
const deleteGymSlot = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const updatedBy = req.user.id; // Updated to use user ID

    // Find the slot
    const gymSlot = await GymSlot.findByPk(id, { transaction });
    if (!gymSlot) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Gym slot not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if there are any future active bookings
    const futureBookings = await UserSlotBooking.count({
      where: {
        gymSlotId: id,
        bookingDate: { [Op.gte]: new Date().toISOString().split('T')[0] },
        bookingStatus: { [Op.in]: ['active', 'checked_in'] }
      },
      transaction
    });

    if (futureBookings > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot delete slot. There are ${futureBookings} future active bookings.`,
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete by setting status to inactive
    await gymSlot.update({
      status: 'inactive',
      updatedBy
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Gym slot deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Delete gym slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  createGymSlot,
  getGymSlots,
  updateGymSlot,
  deleteGymSlot,
  bookSlot,
  cancelBooking,
  checkInSlot,
  checkOutSlot,
  getUserBookings,
  getSlotAvailability
};
