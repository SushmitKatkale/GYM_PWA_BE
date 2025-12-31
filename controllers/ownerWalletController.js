const { Gym, Payment, UserSubscription, sequelize } = require('../models');
const ResponseUtil = require('../utils/response');
const { Op } = require('sequelize');

class OwnerWalletController {
  /**
   * Get owner's wallet overview
   */
  static async getWalletOverview(req, res) {
    try {
      const ownerId = req.user.id;
      
      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: { 
          ownerId: ownerId,
          recordStatus: 1 
        }
      });

      if (!ownerGym) {
        return ResponseUtil.notFoundError(res, 'No gym found for this owner');
      }

      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      // Calculate earnings from payments
      const [
        totalEarnings,
        monthlyEarnings,
        lastMonthEarnings,
        pendingEarnings
      ] = await Promise.all([
        this.calculateEarnings(ownerGym.id, null, null), // All time
        this.calculateEarnings(ownerGym.id, firstDayOfMonth, currentDate), // This month
        this.calculateEarnings(ownerGym.id, firstDayOfLastMonth, lastDayOfLastMonth), // Last month
        this.calculatePendingEarnings(ownerGym.id) // Pending
      ]);

      // Calculate growth rate
      const weeklyGrowth = lastMonthEarnings > 0 
        ? ((monthlyEarnings - lastMonthEarnings) / lastMonthEarnings * 100)
        : 0;

      // Mock current balance and payout data (would be from actual wallet/payout system)
      const walletData = {
        currentBalance: totalEarnings * 0.7, // 70% of total earnings available
        pendingEarnings: pendingEarnings,
        totalEarnings: totalEarnings,
        monthlyEarnings: monthlyEarnings,
        weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
        lastPayout: '2024-01-15', // Would be from payout records
        nextPayoutDate: '2024-02-01', // Would be calculated based on payout schedule
        commission: 0.15 // Platform commission rate
      };

      return ResponseUtil.success(res, walletData, 'Wallet overview retrieved successfully');
    } catch (error) {
      console.error('Get wallet overview error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve wallet information');
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactions(req, res) {
    try {
      const ownerId = req.user.id;
      const { page = 1, limit = 20, type, status } = req.query;
      
      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: { 
          ownerId: ownerId,
          recordStatus: 1 
        }
      });

      if (!ownerGym) {
        return ResponseUtil.notFoundError(res, 'No gym found for this owner');
      }

      // Get actual payment transactions
      const transactions = await sequelize.query(`
        SELECT 
          p.id,
          p.amount,
          p.status,
          p.created_at as date,
          'earning' as type,
          CONCAT('Payment from ', u.first_name, ' ', u.last_name, ' - ', s.name) as description,
          p.payment_method,
          p.transaction_id as reference
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN users u ON us.user_id = u.id
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND p.record_status = 1
          AND p.status = 'completed'
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { 
          gymId: ownerGym.id,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit)
        },
        type: sequelize.QueryTypes.SELECT
      });

      // Transform data
      const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        description: tx.description,
        amount: parseFloat(tx.amount),
        date: tx.date,
        status: tx.status,
        reference: tx.reference,
        gymName: ownerGym.name
      }));

      return ResponseUtil.success(res, {
        transactions: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: formattedTransactions.length
        }
      }, 'Transactions retrieved successfully');
    } catch (error) {
      console.error('Get transactions error:', error);
      return ResponseUtil.error(res, 'Failed to retrieve transactions');
    }
  }

  /**
   * Request payout
   */
  static async requestPayout(req, res) {
    try {
      const ownerId = req.user.id;
      const { amount, method = 'bank_transfer' } = req.body;

      if (!amount || amount <= 0) {
        return ResponseUtil.validationError(res, 'Invalid amount specified');
      }

      // Get owner's gym
      const ownerGym = await Gym.findOne({
        where: { 
          ownerId: ownerId,
          recordStatus: 1 
        }
      });

      if (!ownerGym) {
        return ResponseUtil.notFoundError(res, 'No gym found for this owner');
      }

      // Check available balance (mock calculation)
      const totalEarnings = await this.calculateEarnings(ownerGym.id, null, null);
      const availableBalance = totalEarnings * 0.7; // 70% available

      if (amount > availableBalance) {
        return ResponseUtil.validationError(res, 'Insufficient balance for payout');
      }

      // In real implementation, create payout request record
      const payoutRequest = {
        id: Date.now(), // Mock ID
        amount: parseFloat(amount),
        requestDate: new Date().toISOString(),
        status: 'pending',
        method: method,
        expectedProcessingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days
      };

      return ResponseUtil.success(res, payoutRequest, 'Payout request submitted successfully');
    } catch (error) {
      console.error('Request payout error:', error);
      return ResponseUtil.error(res, 'Failed to process payout request');
    }
  }

  /**
   * Helper method to calculate earnings from payments
   */
  static async calculateEarnings(gymId, startDate, endDate) {
    try {
      const whereClause = {
        gym_id: gymId,
        status: 'completed',
        record_status: 1
      };

      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [startDate, endDate]
        };
      }

      const result = await sequelize.query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_earnings
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND p.status = 'completed'
          AND p.record_status = 1
          ${startDate && endDate ? 'AND p.created_at BETWEEN :startDate AND :endDate' : ''}
      `, {
        replacements: { 
          gymId,
          ...(startDate && endDate && { startDate, endDate })
        },
        type: sequelize.QueryTypes.SELECT
      });

      return parseFloat(result[0]?.total_earnings || 0);
    } catch (error) {
      console.error('Calculate earnings error:', error);
      return 0;
    }
  }

  /**
   * Helper method to calculate pending earnings
   */
  static async calculatePendingEarnings(gymId) {
    try {
      const result = await sequelize.query(`
        SELECT COALESCE(SUM(p.amount), 0) as pending_earnings
        FROM payments p
        JOIN user_subscriptions us ON p.id = us.payment_id
        JOIN subscriptions s ON us.subscription_id = s.id
        WHERE s.gym_id = :gymId
          AND p.status = 'pending'
          AND p.record_status = 1
      `, {
        replacements: { gymId },
        type: sequelize.QueryTypes.SELECT
      });

      return parseFloat(result[0]?.pending_earnings || 0);
    } catch (error) {
      console.error('Calculate pending earnings error:', error);
      return 0;
    }
  }
}

module.exports = OwnerWalletController;