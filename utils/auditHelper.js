/**
 * Audit Helper - Utility functions for working with audit trail
 * Provides easy methods to include user context in database operations
 */

class AuditHelper {
  /**
   * Create options object with user ID for audit trail
   * @param {number} userId - ID of the user performing the operation
   * @param {Object} additionalOptions - Any additional options to merge
   * @returns {Object} Options object with userId for Sequelize operations
   */
  static withUser(userId, additionalOptions = {}) {
    return {
      userId,
      ...additionalOptions
    };
  }

  /**
   * Create options for bulk operations with user context
   * @param {number} userId - ID of the user performing the operation
   * @param {Object} additionalOptions - Any additional options to merge
   * @returns {Object} Options object for bulk operations
   */
  static withUserBulk(userId, additionalOptions = {}) {
    return {
      userId,
      individualHooks: true, // Ensure hooks are called for bulk operations
      ...additionalOptions
    };
  }

  /**
   * Get user context from request object (Express middleware)
   * @param {Object} req - Express request object
   * @returns {Object} Options object with userId from request
   */
  static fromRequest(req, additionalOptions = {}) {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      console.warn('⚠️ No user ID found in request for audit trail');
    }
    return this.withUser(userId, additionalOptions);
  }

  /**
   * Create a scoped model instance with user context
   * @param {Object} model - Sequelize model
   * @param {number} userId - ID of the user
   * @returns {Object} Model with user context for operations
   */
  static scopeModel(model, userId) {
    const options = this.withUser(userId);
    
    return {
      // Scoped create method
      create: (data, additionalOptions = {}) => 
        model.create(data, { ...options, ...additionalOptions }),

      // Scoped bulk create method
      bulkCreate: (records, additionalOptions = {}) =>
        model.bulkCreate(records, { ...options, individualHooks: true, ...additionalOptions }),

      // Scoped update method
      update: (data, whereOptions, additionalOptions = {}) =>
        model.update(data, { ...whereOptions, ...options, individualHooks: true, ...additionalOptions }),

      // Scoped destroy method (soft delete)
      destroy: (whereOptions, additionalOptions = {}) =>
        model.destroy({ ...whereOptions, ...options, individualHooks: true, ...additionalOptions }),

      // Original model for other operations
      model
    };
  }
}

/**
 * Express middleware to add audit helper to request object
 * Usage: app.use(auditMiddleware);
 * Then in controllers: const options = req.auditOptions();
 */
const auditMiddleware = (req, res, next) => {
  req.auditOptions = (additionalOptions = {}) => 
    AuditHelper.fromRequest(req, additionalOptions);
  
  req.auditScope = (model) => 
    AuditHelper.scopeModel(model, req.user?.id || req.userId);
  
  next();
};

module.exports = {
  AuditHelper,
  auditMiddleware
};
