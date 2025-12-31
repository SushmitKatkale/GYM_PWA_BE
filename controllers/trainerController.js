const { GymTrainer, Gym, User } = require('../models');
const mailService = require('../services/mailService');
const jwt = require('jsonwebtoken');

class TrainerController {
  // Accept invitation from email link (public endpoint)
  static async acceptInvitationFromEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/invitation?error=missing_token`);
      }

      // Find invitation by token
      const invitation = await GymTrainer.findOne({
        where: {
          invitation_token: token,
          record_status: 1
        },
        include: [
          {
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name', 'address', 'city', 'state']
          },
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ]
      });

      if (!invitation) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/invitation?error=invalid_token`);
      }

      // Check if invitation is expired
      if (invitation.isExpired()) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/invitation?error=expired&token=${token}`);
      }

      // Check if invitation is still pending
      if (invitation.status !== 'pending') {
        const status = invitation.status === 'active' ? 'already_accepted' : invitation.status;
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/invitation?error=${status}&token=${token}`);
      }

      // If trainer already exists and invitation is valid, accept the invitation automatically
      if (invitation.trainer) {
        try {
          // Accept the invitation directly
          await invitation.acceptInvitation(invitation.trainer.id);
          
          // Send notification email to owner
          try {
            const inviter = await User.findByPk(invitation.invited_by, {
              attributes: ['firstName', 'lastName', 'email']
            });
            
            if (inviter) {
              await mailService.sendHtmlMail({
                to: inviter.email,
                subject: `Trainer Accepted: ${invitation.trainer.firstName} ${invitation.trainer.lastName} joined ${invitation.gym.name}`,
                text: `Great news! ${invitation.trainer.firstName} ${invitation.trainer.lastName} has accepted your invitation to join ${invitation.gym.name} as a trainer.`,
                html: `
                <h2>🎉 Trainer Invitation Accepted!</h2>
                <p>Hi ${inviter.firstName},</p>
                <p><strong>${invitation.trainer.firstName} ${invitation.trainer.lastName}</strong> has accepted your invitation to join <strong>${invitation.gym.name}</strong> as a Diet Plan Trainer.</p>
                <h3>Trainer Details:</h3>
                <ul>
                  <li><strong>Name:</strong> ${invitation.trainer.firstName} ${invitation.trainer.lastName}</li>
                  <li><strong>Email:</strong> ${invitation.trainer.email}</li>
                  <li><strong>Joined:</strong> ${new Date().toLocaleDateString()}</li>
                </ul>
                <p>Your new trainer is now ready to start creating personalized diet plans for your gym members.</p>
                `
              });
            }
          } catch (emailError) {
            console.error('Failed to send acceptance notification email:', emailError);
            // Don't fail the entire operation if email fails
          }
          
          // Redirect to login page with success message
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login?invitation_accepted=true&email=${encodeURIComponent(invitation.trainer.email)}&gym=${encodeURIComponent(invitation.gym.name)}`);
        } catch (acceptError) {
          console.error('Error accepting invitation:', acceptError);
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/invitation?error=acceptance_failed&token=${token}`);
        }
      }
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/register?invitation_token=${token}&role=trainer`);

    } catch (error) {
      console.error('Error processing email invitation acceptance:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/invitation?error=server_error`);
    }
  }

  // Get invitation details by token (public endpoint)
  static async getInvitationDetails(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token is required'
        });
      }

      // Find invitation by token
      const invitation = await GymTrainer.findOne({
        where: {
          invitation_token: token,
          record_status: 1
        },
        include: [
          {
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name', 'address', 'city', 'state', 'capacity']
          },
          {
            model: User,
            as: 'inviter',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation is expired
      if (invitation.isExpired()) {
        return res.status(400).json({
          success: false,
          message: 'This invitation has expired',
          data: {
            expired: true,
            expires_at: invitation.expires_at
          }
        });
      }

      // Check if invitation is still pending
      if (invitation.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `This invitation has already been ${invitation.status}`,
          data: {
            status: invitation.status
          }
        });
      }

      res.json({
        success: true,
        data: {
          invitation: {
            id: invitation.id,
            email: invitation.trainer?.email || 'Unknown',
            status: invitation.status,
            invited_at: invitation.invited_at,
            expires_at: invitation.expires_at,
            canAccept: invitation.canAccept()
          },
          gym: {
            id: invitation.gym.id,
            name: invitation.gym.name,
            address: invitation.gym.address,
            city: invitation.gym.city,
            state: invitation.gym.state,
            capacity: invitation.gym.capacity
          },
          inviter: {
            name: `${invitation.inviter.firstName} ${invitation.inviter.lastName}`,
            email: invitation.inviter.email
          }
        }
      });

    } catch (error) {
      console.error('Error fetching invitation details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch invitation details'
      });
    }
  }

  // Accept invitation (authenticated endpoint)
  static async acceptInvitation(req, res) {
    try {
      const { token } = req.body;
      const trainerId = req.user.id;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token is required'
        });
      }

      // Verify user is a trainer
      if (req.user.role !== 4) {
        return res.status(403).json({
          success: false,
          message: 'Only trainers can accept gym invitations'
        });
      }

      // Find invitation by token
      const invitation = await GymTrainer.findOne({
        where: {
          invitation_token: token,
          record_status: 1
        },
        include: [
          {
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name', 'address', 'city', 'state']
          },
          {
            model: User,
            as: 'inviter',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ]
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      // Verify invitation can be accepted
      if (!invitation.canAccept()) {
        const reason = invitation.isExpired() ? 'expired' : 'invalid status';
        return res.status(400).json({
          success: false,
          message: `Cannot accept invitation - ${reason}`,
          data: {
            status: invitation.status,
            expired: invitation.isExpired(),
            expires_at: invitation.expires_at
          }
        });
      }

      // Verify email matches the invitation
      const trainer = await User.findByPk(trainerId);
      if (trainer.email !== invitation.trainer.email) {
        return res.status(400).json({
          success: false,
          message: 'Your email does not match the invitation email'
        });
      }

      // Check if trainer is already assigned to this gym
      const existingAssignment = await GymTrainer.findOne({
        where: {
          gym_id: invitation.gym_id,
          trainer_id: trainerId,
          status: 'active',
          record_status: 1
        }
      });

      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: 'You are already assigned to this gym'
        });
      }

      // Accept the invitation
      await invitation.acceptInvitation(trainerId);

      // Send notification email to owner
      try {
        await mailService.sendHtmlMail({
          to: invitation.inviter.email,
          subject: `Trainer Accepted: ${trainer.firstName} ${trainer.lastName} joined ${invitation.gym.name}`,
          text: `Great news! ${trainer.firstName} ${trainer.lastName} has accepted your invitation to join ${invitation.gym.name} as a trainer.`,
          html: `
          <h2>🎉 Trainer Invitation Accepted!</h2>
          <p>Hi ${invitation.inviter.firstName},</p>
          <p><strong>${trainer.firstName} ${trainer.lastName}</strong> has accepted your invitation to join <strong>${invitation.gym.name}</strong> as a Diet Plan Trainer.</p>
          <h3>Trainer Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${trainer.firstName} ${trainer.lastName}</li>
            <li><strong>Email:</strong> ${trainer.email}</li>
            <li><strong>Joined:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Your new trainer is now ready to start creating personalized diet plans for your gym members.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send acceptance notification email:', emailError);
        // Don't fail the entire operation if email fails
      }

      res.json({
        success: true,
        message: 'Invitation accepted successfully! You are now a trainer for this gym.',
        data: {
          gym: {
            id: invitation.gym.id,
            name: invitation.gym.name,
            address: invitation.gym.address,
            city: invitation.gym.city,
            state: invitation.gym.state
          },
          assignment: {
            id: invitation.id,
            status: invitation.status,
            joined_at: invitation.joined_at
          }
        }
      });

    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to accept invitation'
      });
    }
  }

  // Decline invitation
  static async declineInvitation(req, res) {
    try {
      const { token, reason } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token is required'
        });
      }

      // Find invitation by token
      const invitation = await GymTrainer.findOne({
        where: {
          invitation_token: token,
          record_status: 1
        },
        include: [
          {
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'inviter',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `This invitation has already been ${invitation.status}`
        });
      }

      // Decline the invitation
      await invitation.declineInvitation();

      // Send notification email to owner
      try {
        await mailService.sendHtmlMail({
          to: invitation.inviter.email,
          subject: `Trainer Invitation Declined for ${invitation.gym.name}`,
          text: `The trainer invitation for ${invitation.gym.name} has been declined.`,
          html: `
          <h2>📋 Invitation Declined</h2>
          <p>Hi ${invitation.inviter.firstName},</p>
          <p>The trainer invitation for <strong>${invitation.gym.name}</strong> has been declined.</p>
          <h3>Details:</h3>
          <ul>
            <li><strong>Email:</strong> ${invitation.email}</li>
            <li><strong>Declined:</strong> ${new Date().toLocaleDateString()}</li>
            <li><strong>Reason:</strong> ${reason || 'No reason provided'}</li>
          </ul>
          <p>You can continue to invite other trainers through your owner dashboard.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send decline notification email:', emailError);
        // Don't fail the entire operation if email fails
      }

      res.json({
        success: true,
        message: 'Invitation declined successfully',
        data: {
          gym: {
            name: invitation.gym.name
          }
        }
      });

    } catch (error) {
      console.error('Error declining invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to decline invitation'
      });
    }
  }

  // Get trainer's assigned gyms
  static async getAssignedGyms(req, res) {
    try {
      const trainerId = req.user.id;

      // Verify user is a trainer
      if (req.user.role !== 4) {
        return res.status(403).json({
          success: false,
          message: 'Only trainers can access this endpoint'
        });
      }

      // Get all active gym assignments for this trainer
      const assignments = await GymTrainer.findAll({
        where: {
          trainer_id: trainerId,
          status: 'active',
          record_status: 1
        },
        include: [
          {
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name', 'address', 'city', 'state', 'capacity'],
            include: [
              {
                model: User,
                as: 'owner',
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
              }
            ]
          }
        ],
        order: [['joined_at', 'DESC']]
      });

      const formattedGyms = assignments.map(assignment => ({
        assignmentId: assignment.id,
        joinedAt: assignment.joined_at,
        gym: {
          id: assignment.gym.id,
          name: assignment.gym.name,
          address: assignment.gym.address,
          city: assignment.gym.city,
          state: assignment.gym.state,
          capacity: assignment.gym.capacity,
          owner: {
            id: assignment.gym.owner.id,
            name: `${assignment.gym.owner.firstName} ${assignment.gym.owner.lastName}`,
            email: assignment.gym.owner.email,
            phone: assignment.gym.owner.phone
          }
        }
      }));

      res.json({
        success: true,
        data: {
          totalGyms: formattedGyms.length,
          gyms: formattedGyms
        }
      });

    } catch (error) {
      console.error('Error fetching assigned gyms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch assigned gyms'
      });
    }
  }

  // Get trainer profile/stats
  static async getTrainerProfile(req, res) {
    try {
      const trainerId = req.user.id;

      // Get trainer details
      const trainer = await User.findByPk(trainerId, {
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'created_at']
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found'
        });
      }

      // Get gym assignments count
      const activeGyms = await GymTrainer.count({
        where: {
          trainer_id: trainerId,
          status: 'active',
          record_status: 1
        }
      });

      // TODO: Get diet plan statistics when DietPlan model is available
      // const totalDietPlans = await DietPlan.count({
      //   where: { trainer_id: trainerId, record_status: 1 }
      // });
      // const activeDietPlans = await DietPlan.count({
      //   where: { trainer_id: trainerId, status: 'active', record_status: 1 }
      // });

      res.json({
        success: true,
        data: {
          trainer: {
            id: trainer.id,
            firstName: trainer.firstName,
            lastName: trainer.lastName,
            email: trainer.email,
            phone: trainer.phone,
            memberSince: trainer.created_at
          },
          stats: {
            activeGyms: activeGyms,
            totalDietPlans: 0, // TODO: Implement when DietPlan is ready
            activeDietPlans: 0, // TODO: Implement when DietPlan is ready
            totalClients: 0 // TODO: Implement when DietPlan is ready
          }
        }
      });

    } catch (error) {
      console.error('Error fetching trainer profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trainer profile'
      });
    }
  }

  // Leave gym (trainer initiated)
  static async leaveGym(req, res) {
    try {
      const { gymId } = req.params;
      const trainerId = req.user.id;

      // Find the assignment
      const assignment = await GymTrainer.findOne({
        where: {
          gym_id: gymId,
          trainer_id: trainerId,
          status: 'active',
          record_status: 1
        },
        include: [
          {
            model: Gym,
            as: 'gym',
            attributes: ['id', 'name'],
            include: [
              {
                model: User,
                as: 'owner',
                attributes: ['firstName', 'lastName', 'email']
              }
            ]
          }
        ]
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Gym assignment not found or already inactive'
        });
      }

      // Deactivate the assignment
      await assignment.deactivate();

      // Send notification email to owner
      try {
        const trainer = await User.findByPk(trainerId, {
          attributes: ['firstName', 'lastName', 'email']
        });

        await mailService.sendHtmlMail({
          to: assignment.gym.owner.email,
          subject: `Trainer Left: ${trainer.firstName} ${trainer.lastName} left ${assignment.gym.name}`,
          text: `${trainer.firstName} ${trainer.lastName} has left ${assignment.gym.name}.`,
          html: `
          <h2>😪 Trainer Left</h2>
          <p>Hi ${assignment.gym.owner.firstName},</p>
          <p><strong>${trainer.firstName} ${trainer.lastName}</strong> has left <strong>${assignment.gym.name}</strong>.</p>
          <p>You can invite new trainers through your owner dashboard if needed.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send leave notification email:', emailError);
      }

      res.json({
        success: true,
        message: `Successfully left ${assignment.gym.name}`,
        data: {
          gym: {
            id: assignment.gym.id,
            name: assignment.gym.name
          }
        }
      });

    } catch (error) {
      console.error('Error leaving gym:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to leave gym'
      });
    }
  }
}

module.exports = TrainerController;