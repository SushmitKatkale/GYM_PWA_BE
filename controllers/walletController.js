const { 
  Wallet, 
  WalletTransaction, 
  WithdrawRequest,
  User, 
  Gym 
} = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

class WalletController {
  // Get wallet information
  static async getWallet(req, res) {
    try {
      const userId = req.user.id;

      // Only owners and admins can have wallets
      if (![2, 4].includes(req.user.role)) {
        return ResponseUtil.forbiddenError(res, 'Only gym owners and admins can access wallet features');
      }

      let wallet = await Wallet.findOne({
        where: { user_id: userId }
      });

      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = await Wallet.create({
          user_id: userId,
          balance: 0.00,
          wallet_type: req.user.role === 4 ? 'admin' : 'owner'
        });
      }

      return ResponseUtil.success(res, wallet, 'Wallet retrieved successfully');
    } catch (error) {
      console.error('Get wallet error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve wallet');
    }
  }

  // Get wallet transactions
  static async getWalletTransactions(req, res) {
    try {
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        type, 
        status, 
        startDate, 
        endDate,
        reference_type 
      } = req.query;

      if (![2, 4].includes(req.user.role)) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const whereClause = { user_id: userId };

      if (type) whereClause.transaction_type = type;
      if (status) whereClause.status = status;
      if (reference_type) whereClause.reference_type = reference_type;

      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const { count, rows } = await WalletTransaction.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ]
      });

      return ResponseUtil.success(res, {
        transactions: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          total: count,
          limit: parseInt(limit)
        }
      }, 'Wallet transactions retrieved successfully');
    } catch (error) {
      console.error('Get wallet transactions error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve wallet transactions');
    }
  }

  // Create credit transaction (admin can credit any wallet)
  static async creditWallet(req, res) {
    try {
      const { user_id, amount, description, reference_id, reference_type } = req.body;

      // Only admins can manually credit wallets
      if (req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Only admins can manually credit wallets');
      }

      if (!user_id || !amount || amount <= 0) {
        return ResponseUtil.validationError(res, 'user_id and positive amount are required');
      }

      // Verify target user exists and is eligible for wallet
      const targetUser = await User.findByPk(user_id);
      if (!targetUser || ![2, 4].includes(targetUser.role)) {
        return ResponseUtil.notFoundError(res, 'Target user not found or not eligible for wallet');
      }

      // Get or create wallet
      let wallet = await Wallet.findOne({ where: { user_id } });
      if (!wallet) {
        wallet = await Wallet.create({
          user_id,
          balance: 0.00,
          wallet_type: targetUser.role === 4 ? 'admin' : 'owner'
        });
      }

      // Create credit transaction
      const transaction = await WalletTransaction.create({
        user_id,
        transaction_type: 'credit',
        amount: parseFloat(amount),
        balance_after: wallet.balance + parseFloat(amount),
        description: description || 'Manual credit by admin',
        reference_id,
        reference_type: reference_type || 'manual',
        status: 'completed'
      });

      // Update wallet balance
      await wallet.update({
        balance: wallet.balance + parseFloat(amount)
      });

      return ResponseUtil.success(res, {
        transaction,
        wallet: await Wallet.findOne({ where: { user_id } })
      }, 'Wallet credited successfully', 201);
    } catch (error) {
      console.error('Credit wallet error:', error);
      return ResponseUtil.error(res, 'Failed to credit wallet');
    }
  }

  // Create withdraw request
  static async createWithdrawRequest(req, res) {
    try {
      const userId = req.user.id;
      const { amount, withdraw_method, account_details } = req.body;

      if (![2, 4].includes(req.user.role)) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      if (!amount || amount <= 0) {
        return ResponseUtil.validationError(res, 'Positive amount is required');
      }

      if (!withdraw_method || !account_details) {
        return ResponseUtil.validationError(res, 'withdraw_method and account_details are required');
      }

      // Get user's wallet
      const wallet = await Wallet.findOne({ where: { user_id: userId } });
      if (!wallet) {
        return ResponseUtil.notFoundError(res, 'Wallet not found');
      }

      // Check sufficient balance
      if (wallet.balance < amount) {
        return ResponseUtil.validationError(res, 'Insufficient wallet balance');
      }

      // Check for minimum withdrawal amount (e.g., $10)
      const MIN_WITHDRAWAL = 10.00;
      if (amount < MIN_WITHDRAWAL) {
        return ResponseUtil.validationError(res, `Minimum withdrawal amount is $${MIN_WITHDRAWAL}`);
      }

      // Create withdraw request
      const withdrawRequest = await WithdrawRequest.create({
        user_id: userId,
        amount: parseFloat(amount),
        withdraw_method,
        account_details,
        status: 'pending'
      });

      return ResponseUtil.success(res, withdrawRequest, 'Withdraw request created successfully', 201);
    } catch (error) {
      console.error('Create withdraw request error:', error);
      return ResponseUtil.error(res, 'Failed to create withdraw request');
    }
  }

  // Get withdraw requests (user's own or admin can see all)
  static async getWithdrawRequests(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      if (![2, 4].includes(req.user.role)) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const whereClause = {};

      // Non-admins can only see their own requests
      if (req.user.role !== 4) {
        whereClause.user_id = userId;
      }

      if (status) {
        whereClause.status = status;
      }

      const { count, rows } = await WithdrawRequest.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: true
          }
        ]
      });

      return ResponseUtil.success(res, {
        withdrawRequests: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          total: count,
          limit: parseInt(limit)
        }
      }, 'Withdraw requests retrieved successfully');
    } catch (error) {
      console.error('Get withdraw requests error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve withdraw requests');
    }
  }

  // Process withdraw request (admin only)
  static async processWithdrawRequest(req, res) {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;
      const adminId = req.user.id;

      if (req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Only admins can process withdraw requests');
      }

      if (!['approved', 'rejected'].includes(status)) {
        return ResponseUtil.validationError(res, 'Status must be approved or rejected');
      }

      const withdrawRequest = await WithdrawRequest.findByPk(id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      if (!withdrawRequest) {
        return ResponseUtil.notFoundError(res, 'Withdraw request not found');
      }

      if (withdrawRequest.status !== 'pending') {
        return ResponseUtil.validationError(res, 'Can only process pending requests');
      }

      // Update the withdraw request
      await withdrawRequest.update({
        status,
        admin_notes,
        processed_by: adminId,
        processed_at: new Date()
      });

      if (status === 'approved') {
        // Get user's wallet
        const wallet = await Wallet.findOne({ 
          where: { user_id: withdrawRequest.user_id } 
        });

        if (!wallet || wallet.balance < withdrawRequest.amount) {
          return ResponseUtil.validationError(res, 'Insufficient wallet balance');
        }

        // Create debit transaction
        await WalletTransaction.create({
          user_id: withdrawRequest.user_id,
          transaction_type: 'debit',
          amount: withdrawRequest.amount,
          balance_after: wallet.balance - withdrawRequest.amount,
          description: `Withdrawal processed - ${withdrawRequest.withdraw_method}`,
          reference_id: withdrawRequest.id,
          reference_type: 'withdrawal',
          status: 'completed'
        });

        // Update wallet balance
        await wallet.update({
          balance: wallet.balance - withdrawRequest.amount
        });

        // Update withdraw request status
        await withdrawRequest.update({ status: 'completed' });
      }

      // Fetch updated request with user details
      const updatedRequest = await WithdrawRequest.findByPk(id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      return ResponseUtil.success(res, updatedRequest, `Withdraw request ${status} successfully`);
    } catch (error) {
      console.error('Process withdraw request error:', error);
      return ResponseUtil.error(res, 'Failed to process withdraw request');
    }
  }

  // Get wallet statistics (admin only)
  static async getWalletStats(req, res) {
    try {
      if (req.user.role !== 4) {
        return ResponseUtil.forbiddenError(res, 'Only admins can view wallet statistics');
      }

      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const [
        totalWallets,
        totalBalance,
        pendingWithdrawals,
        totalCredits,
        totalDebits,
        recentTransactions
      ] = await Promise.all([
        Wallet.count(),
        Wallet.sum('balance'),
        WithdrawRequest.findAll({
          where: { status: 'pending' },
          attributes: ['id', 'user_id', 'amount', 'created_at'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }],
          limit: 10,
          order: [['created_at', 'DESC']]
        }),
        WalletTransaction.sum('amount', {
          where: {
            transaction_type: 'credit',
            ...dateFilter
          }
        }),
        WalletTransaction.sum('amount', {
          where: {
            transaction_type: 'debit',
            ...dateFilter
          }
        }),
        WalletTransaction.findAll({
          where: dateFilter,
          limit: 20,
          order: [['created_at', 'DESC']],
          include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        })
      ]);

      const stats = {
        summary: {
          totalWallets,
          totalBalance: totalBalance || 0,
          totalCredits: totalCredits || 0,
          totalDebits: totalDebits || 0,
          pendingWithdrawalsCount: pendingWithdrawals.length,
          pendingWithdrawalsAmount: pendingWithdrawals.reduce((sum, req) => sum + req.amount, 0)
        },
        pendingWithdrawals,
        recentTransactions
      };

      return ResponseUtil.success(res, stats, 'Wallet statistics retrieved successfully');
    } catch (error) {
      console.error('Get wallet stats error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve wallet statistics');
    }
  }

  // Get wallet balance summary
  static async getWalletBalance(req, res) {
    try {
      const userId = req.user.id;

      if (![2, 4].includes(req.user.role)) {
        return ResponseUtil.forbiddenError(res, 'Access denied');
      }

      const wallet = await Wallet.findOne({ where: { user_id: userId } });
      
      if (!wallet) {
        return ResponseUtil.success(res, {
          balance: 0.00,
          pendingWithdrawals: 0.00,
          availableBalance: 0.00
        }, 'Wallet balance retrieved');
      }

      // Get pending withdrawals amount
      const pendingWithdrawals = await WithdrawRequest.sum('amount', {
        where: {
          user_id: userId,
          status: 'pending'
        }
      }) || 0;

      const balance = {
        balance: wallet.balance,
        pendingWithdrawals,
        availableBalance: wallet.balance - pendingWithdrawals
      };

      return ResponseUtil.success(res, balance, 'Wallet balance retrieved successfully');
    } catch (error) {
      console.error('Get wallet balance error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve wallet balance');
    }
  }

  // Auto-credit from gym revenue (internal method, would be called by payment processing)
  static async autoCreditFromRevenue(userId, amount, referenceId, referenceType = 'gym_revenue') {
    try {
      // Get or create wallet
      let wallet = await Wallet.findOne({ where: { user_id: userId } });
      if (!wallet) {
        const user = await User.findByPk(userId);
        wallet = await Wallet.create({
          user_id: userId,
          balance: 0.00,
          wallet_type: user.role === 4 ? 'admin' : 'owner'
        });
      }

      // Create credit transaction
      const transaction = await WalletTransaction.create({
        user_id: userId,
        transaction_type: 'credit',
        amount: parseFloat(amount),
        balance_after: wallet.balance + parseFloat(amount),
        description: 'Auto-credit from gym revenue',
        reference_id: referenceId,
        reference_type: referenceType,
        status: 'completed'
      });

      // Update wallet balance
      await wallet.update({
        balance: wallet.balance + parseFloat(amount)
      });

      return { transaction, wallet };
    } catch (error) {
      console.error('Auto credit from revenue error:', error);
      throw error;
    }
  }
}

module.exports = WalletController;
