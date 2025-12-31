const { GymTrainer, Gym, User, sequelize } = require('../models');
const mailService = require('../services/mailService');
const { validateEmail } = require('../utils/validation');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class OwnerTrainerController {
  // Send trainer invitation
  static async inviteTrainer(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { email } = req.body;
      const ownerId = req.user.id;

      // Validate email format
      if (!validateEmail(email)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: {
          ownerId: ownerId,
          record_status: 1
        },
        transaction
      });

      if (!ownerGym) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'No gym found for this owner'
        });
      }

      // Check if user with this email already exists
      let existingUser = await User.findOne({
        where: { email: email },
        transaction
      });

      let trainerUser;
      let tempPassword = null;

      if (existingUser) {
        // User exists - check if it's a trainer or can be converted
        if (existingUser.role !== 4) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'User with this email exists but is not a trainer. Please contact support to convert the account.'
          });
        }
        trainerUser = existingUser;
        
        // Check if trainer is already assigned to this gym
        const existingAssignment = await GymTrainer.findOne({
          where: {
            gym_id: ownerGym.id,
            trainer_id: existingUser.id,
            status: ['active', 'pending'],
            record_status: 1
          },
          transaction
        });

        if (existingAssignment) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: existingAssignment.status === 'active' 
              ? 'Trainer is already assigned to your gym'
              : 'An invitation is already pending for this trainer'
          });
        }
      } else {
        // User doesn't exist - create a new trainer account
        tempPassword = crypto.randomBytes(8).toString('hex'); // Generate 16-character temp password
        
        try {
          trainerUser = await User.create({
            firstName: 'Trainer', // Default name, can be updated later
            lastName: email.split('@')[0], // Use part of email as last name
            email: email,
            username: email, // Use email as username initially
            password: tempPassword,
            role: 4, // Trainer role
            recordStatus: 1,
            createdBy: ownerId
          }, { transaction });
          
          console.log('Created new trainer user:', trainerUser.id, 'with temp password');
        } catch (createError) {
          console.error('Error creating trainer user:', createError);
          await transaction.rollback();
          return res.status(500).json({
            success: false,
            message: 'Failed to create trainer account. Please try again.'
          });
        }
      }

      // Create invitation with trainer user ID (remove email field since it's in User table)
      const invitation = await GymTrainer.create({
        gym_id: ownerGym.id,
        trainer_id: trainerUser.id, // Now we have a trainer user ID
        status: 'pending', // Always pending until accepted
        invitation_token: crypto.randomBytes(32).toString('hex'),
        invited_by: ownerId,
        invited_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        record_status: 1
      }, { transaction });

      // Get owner details for email
      const owner = await User.findByPk(ownerId, {
        attributes: ['firstName', 'lastName', 'email'],
        transaction
      });

      // Send invitation email
      const emailSent = await mailService.sendHtmlMail({
        to: email,
        subject: `Invitation to join ${ownerGym.name} as a Diet Plan Trainer`,
        text: `You've been invited to join ${ownerGym.name} as a Diet Plan Trainer. Please check your email for details.`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">🎯 Trainer Invitation</h2>
            <p>Hi there!</p>
            <p><strong>${owner.firstName} ${owner.lastName}</strong> has invited you to join <strong>${ownerGym.name}</strong> as a Diet Plan Trainer.</p>
            
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c5aa0; margin-top: 0;">🏋️ Gym Details:</h3>
              <ul style="margin: 10px 0;">
                <li><strong>Name:</strong> ${ownerGym.name}</li>
                <li><strong>Address:</strong> ${ownerGym.address}</li>
                <li><strong>Location:</strong> ${ownerGym.city}, ${ownerGym.state}</li>
              </ul>
            </div>
            
            ${tempPassword ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">🔐 Account Created</h3>
              <p>We've created a trainer account for you:</p>
              <ul>
                <li><strong>Email/Username:</strong> ${email}</li>
                <li><strong>Temporary Password:</strong> <code style="background-color: #f8f9fa; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></li>
              </ul>
              <p style="font-size: 14px; color: #856404;">⚠️ <strong>Important:</strong> Please change your password after logging in for the first time.</p>
            </div>
            ` : `
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin-top: 0;">👋 Welcome Back</h3>
              <p>You already have an account with us. You can log in with your existing credentials.</p>
            </div>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 15px;"><strong>This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}</strong></p>
              <a href="${process.env.SERVER_URL || 'http://localhost:8080'}/api/trainers/accept-invitation?token=${invitation.invitation_token}" 
                 style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">✅ Accept Invitation</a>
            </div>
            
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h4 style="color: #495057; margin-top: 0;">What happens next?</h4>
              <ul style="color: #6c757d; margin: 10px 0;">
                <li>Click "Accept Invitation" above</li>
                <li>${tempPassword ? 'Log in with the temporary credentials provided' : 'Log in with your existing account credentials'}</li>
                <li>Complete your trainer profile setup</li>
                <li>Start creating diet plans for gym members</li>
                ${tempPassword ? '<li><strong>Remember to change your password immediately!</strong></li>' : ''}
              </ul>
            </div>
            
            <p style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px;">
              If you have any questions, please contact ${owner.firstName} at ${owner.email}
            </p>
          </div>
        </div>
        `
      });

      if (!emailSent.success) {
        // If email fails, rollback transaction
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: 'Failed to send invitation email. Please try again.'
        });
      }

      // Commit transaction if everything is successful
      await transaction.commit();

      res.status(201).json({
        success: true,
        message: tempPassword 
          ? 'Trainer account created and invitation sent successfully'
          : 'Trainer invitation sent successfully',
        data: {
          id: invitation.id,
          email: trainerUser.email, // Get email from User table instead
          status: invitation.status,
          invited_at: invitation.invited_at,
          expires_at: invitation.expires_at,
          accountCreated: !!tempPassword,
          trainerId: trainerUser.id
        }
      });

    } catch (error) {
      console.error('Error inviting trainer:', error);
      // Rollback transaction if still active
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to invite trainer'
      });
    }
  }

  // Get all trainers for owner's gym
  static async getGymTrainers(req, res) {
    try {
      const ownerId = req.user.id;
      const { status } = req.query;

      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: {
          ownerId: ownerId,
          record_status: 1
        }
      });

      if (!ownerGym) {
        return res.status(404).json({
          success: false,
          message: 'No gym found for this owner'
        });
      }

      // Build query conditions
      const whereCondition = {
        gym_id: ownerGym.id,
        record_status: 1
      };

      if (status) {
        whereCondition.status = status;
      }

      // Get all trainers/invitations for this gym
      const trainers = await GymTrainer.findAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            required: false
          },
          {
            model: User,
            as: 'inviter',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Format response data
      const formattedTrainers = trainers.map(gymTrainer => ({
        id: gymTrainer.id,
        email: gymTrainer.trainer?.email || 'Unknown', // Get email from trainer User record
        status: gymTrainer.status,
        invited_at: gymTrainer.invited_at,
        joined_at: gymTrainer.joined_at,
        expires_at: gymTrainer.expires_at,
        canAccept: gymTrainer.canAccept(),
        isExpired: gymTrainer.isExpired(),
        trainer: gymTrainer.trainer ? {
          id: gymTrainer.trainer.id,
          name: `${gymTrainer.trainer.firstName} ${gymTrainer.trainer.lastName}`,
          email: gymTrainer.trainer.email,
          phone: gymTrainer.trainer.phone
        } : null,
        inviter: {
          name: `${gymTrainer.inviter.firstName} ${gymTrainer.inviter.lastName}`
        }
      }));

      // Group by status for easy frontend handling
      const groupedTrainers = {
        active: formattedTrainers.filter(t => t.status === 'active'),
        pending: formattedTrainers.filter(t => t.status === 'pending'),
        inactive: formattedTrainers.filter(t => t.status === 'inactive'),
        declined: formattedTrainers.filter(t => t.status === 'declined')
      };

      res.json({
        success: true,
        data: {
          gym: {
            id: ownerGym.id,
            name: ownerGym.name
          },
          trainers: formattedTrainers,
          grouped: groupedTrainers,
          counts: {
            total: formattedTrainers.length,
            active: groupedTrainers.active.length,
            pending: groupedTrainers.pending.length,
            inactive: groupedTrainers.inactive.length,
            declined: groupedTrainers.declined.length
          }
        }
      });

    } catch (error) {
      console.error('Error fetching gym trainers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trainers'
      });
    }
  }

  // Update trainer status (activate/deactivate)
  static async updateTrainerStatus(req, res) {
    try {
      const { trainerId } = req.params;
      const { status } = req.body;
      const ownerId = req.user.id;

      // Validate status
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be active or inactive'
        });
      }

      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: {
          ownerId: ownerId,
          record_status: 1
        }
      });

      if (!ownerGym) {
        return res.status(404).json({
          success: false,
          message: 'No gym found for this owner'
        });
      }

      // Find the gym trainer record
      const gymTrainer = await GymTrainer.findOne({
        where: {
          id: trainerId,
          gym_id: ownerGym.id,
          record_status: 1
        },
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!gymTrainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found in your gym'
        });
      }

      // Can only change status of accepted trainers
      if (!gymTrainer.trainer_id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change status of pending invitations'
        });
      }

      // Update status
      if (status === 'active') {
        await gymTrainer.activate();
      } else {
        await gymTrainer.deactivate();
      }

      res.json({
        success: true,
        message: `Trainer ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
        data: {
          id: gymTrainer.id,
          status: gymTrainer.status,
          trainer: gymTrainer.trainer ? {
            name: `${gymTrainer.trainer.firstName} ${gymTrainer.trainer.lastName}`,
            email: gymTrainer.trainer.email
          } : null
        }
      });

    } catch (error) {
      console.error('Error updating trainer status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update trainer status'
      });
    }
  }

  // Remove trainer from gym
  static async removeTrainer(req, res) {
    try {
      const { trainerId } = req.params;
      const ownerId = req.user.id;

      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: {
          ownerId: ownerId,
          record_status: 1
        }
      });

      if (!ownerGym) {
        return res.status(404).json({
          success: false,
          message: 'No gym found for this owner'
        });
      }

      // Find the gym trainer record
      const gymTrainer = await GymTrainer.findOne({
        where: {
          id: trainerId,
          gym_id: ownerGym.id,
          record_status: 1
        },
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!gymTrainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found in your gym'
        });
      }

      // Soft delete the record
      gymTrainer.record_status = 0;
      await gymTrainer.save();

      // TODO: Notify trainer about removal via email

      res.json({
        success: true,
        message: 'Trainer removed successfully',
        data: {
          id: gymTrainer.id,
          trainer: gymTrainer.trainer ? {
            name: `${gymTrainer.trainer.firstName} ${gymTrainer.trainer.lastName}`,
            email: gymTrainer.trainer.email
          } : { email: 'Unknown' }
        }
      });

    } catch (error) {
      console.error('Error removing trainer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove trainer'
      });
    }
  }

  // Resend invitation
  static async resendInvitation(req, res) {
    try {
      const { trainerId } = req.params;
      const ownerId = req.user.id;

      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: {
          ownerId: ownerId,
          record_status: 1
        }
      });

      if (!ownerGym) {
        return res.status(404).json({
          success: false,
          message: 'No gym found for this owner'
        });
      }

      // Find the gym trainer record
      const gymTrainer = await GymTrainer.findOne({
        where: {
          id: trainerId,
          gym_id: ownerGym.id,
          status: 'pending',
          record_status: 1
        },
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: true // Must have a trainer user record
          }
        ]
      });

      if (!gymTrainer) {
        return res.status(404).json({
          success: false,
          message: 'Pending invitation not found'
        });
      }

      // Generate new token and extend expiry
      const crypto = require('crypto');
      const newToken = crypto.randomBytes(32).toString('hex');
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      gymTrainer.invitation_token = newToken;
      gymTrainer.expires_at = newExpiresAt;
      await gymTrainer.save();

      // Get owner details
      const owner = await User.findByPk(ownerId, {
        attributes: ['firstName', 'lastName', 'email']
      });

      // Resend invitation email
      const emailSent = await mailService.sendHtmlMail({
        to: gymTrainer.trainer.email,
        subject: `Reminder: Invitation to join ${ownerGym.name} as a Diet Plan Trainer`,
        text: `Reminder: You've been invited to join ${ownerGym.name} as a Diet Plan Trainer.`,
        html: `
        <h2>Reminder: Trainer Invitation</h2>
        <p>Hi there!</p>
        <p>This is a reminder that <strong>${owner.firstName} ${owner.lastName}</strong> has invited you to join <strong>${ownerGym.name}</strong> as a Diet Plan Trainer.</p>
        <p><strong>This invitation expires on ${newExpiresAt.toLocaleDateString()}.</strong></p>
        <p><a href="${process.env.API_BASE_URL || 'http://localhost:3000'}/api/trainers/accept-invitation?token=${newToken}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
        `
      });

      if (!emailSent.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to resend invitation email'
        });
      }

      res.json({
        success: true,
        message: 'Invitation resent successfully',
        data: {
          id: gymTrainer.id,
          email: gymTrainer.trainer.email,
          expires_at: gymTrainer.expires_at
        }
      });

    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend invitation'
      });
    }
  }
}

module.exports = OwnerTrainerController;