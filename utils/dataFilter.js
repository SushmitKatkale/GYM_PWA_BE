/**
 * Data filtering utility for role-based access
 * Filters response data based on user role (Admin vs Owner)
 */

class DataFilter {
  /**
   * Filter user data based on role
   * @param {Object} user - The requesting user
   * @param {Object|Array} data - Data to filter
   * @returns {Object|Array} Filtered data
   */
  static filterUserData(user, data) {
    if (user.type === '3') { // Admin - return all data
      return data;
    }

    // Owner/User - filter sensitive data
    const sensitiveFields = ['password', 'createdBy', 'updatedBy'];
    return this.removeFields(data, sensitiveFields);
  }

  /**
   * Filter gym data based on role
   * @param {Object} user - The requesting user
   * @param {Object|Array} data - Data to filter
   * @returns {Object|Array} Filtered data with consistent structure
   */
  static filterGymData(user, data) {
    if (user.type === '3') { // Admin - return all data
      return data;
    }

    // Owner - apply filtering to gym and nested objects
    if (Array.isArray(data)) {
      return data.map(gym => this.filterSingleGym(user, gym));
    }
    
    return this.filterSingleGym(user, data);
  }

  /**
   * Filter a single gym object with all nested data
   * @param {Object} user - The requesting user
   * @param {Object} gym - Single gym data
   * @returns {Object} Filtered gym data
   */
  static filterSingleGym(user, gym) {
    if (user.type === '3') { // Admin - return all data
      return gym;
    }

    // Start with gym-level masking
    let filteredGym = this.maskSensitiveFields(gym, {
      createdBy: null,
      updatedBy: null
    });

    // Filter amenities if present
    if (filteredGym.amenities && Array.isArray(filteredGym.amenities)) {
      filteredGym.amenities = this.filterAmenityData(user, filteredGym.amenities);
    }

    // Filter subscriptions and their features if present
    if (filteredGym.subscriptions && Array.isArray(filteredGym.subscriptions)) {
      filteredGym.subscriptions = filteredGym.subscriptions.map(subscription => {
        let filteredSub = this.filterSubscriptionData(user, subscription);
        
        // Filter subscription features if present
        if (filteredSub.features && Array.isArray(filteredSub.features)) {
          filteredSub.features = filteredSub.features.map(feature => 
            this.maskSensitiveFields(feature, {
              createdBy: null,
              updatedBy: null
            })
          );
        }
        
        return filteredSub;
      });
    }

    // Filter owner data if present
    if (filteredGym.owner) {
      filteredGym.owner = this.filterOwnerData(user, filteredGym.owner);
    }

    return filteredGym;
  }

  /**
   * Filter owner data based on role
   * @param {Object} user - The requesting user
   * @param {Object|Array} data - Data to filter
   * @returns {Object|Array} Filtered data with consistent structure
   */
  static filterOwnerData(user, data) {
    if (user.type === '3') { // Admin - return all data
      return data;
    }

    // Owner - return same structure but mask sensitive fields
    return this.maskSensitiveFields(data, {
      createdBy: null,
      updatedBy: null,
      isVerified: null,
      type: null // Hide user type for privacy
      // Keep all other fields intact
    });
  }

  /**
   * Filter subscription data based on role
   * @param {Object} user - The requesting user
   * @param {Object|Array} data - Data to filter
   * @returns {Object|Array} Filtered data with consistent structure
   */
  static filterSubscriptionData(user, data) {
    if (user.type === '3') { // Admin - return all data
      return data;
    }

    // Owner - return same structure but mask sensitive fields
    return this.maskSensitiveFields(data, {
      createdBy: null,
      updatedBy: null,
      discountedPrice: null // Hide internal pricing
    });
  }

  /**
   * Filter amenity data based on role
   * @param {Object} user - The requesting user
   * @param {Object|Array} data - Data to filter
   * @returns {Object|Array} Filtered data with consistent structure
   */
  static filterAmenityData(user, data) {
    if (user.type === '3') { // Admin - return all data
      return data;
    }

    // Owner - return same structure but mask sensitive fields
    return this.maskSensitiveFields(data, {
      createdBy: null,
      updatedBy: null
    });
  }

  /**
   * Filter slot data based on role
   * @param {Object} user - The requesting user
   * @param {Object|Array} data - Data to filter
   * @returns {Object|Array} Filtered data with consistent structure
   */
  static filterSlotData(user, data) {
    if (user.type === '3') { // Admin - return all data
      return data;
    }

    // Owner - return same structure but mask sensitive fields
    return this.maskSensitiveFields(data, {
      createdBy: null,
      updatedBy: null
    });
  }

  /**
   * Remove specified fields from data
   * @param {Object|Array} data - Data to filter
   * @param {Array} fieldsToRemove - Fields to remove
   * @returns {Object|Array} Filtered data
   */
  static removeFields(data, fieldsToRemove) {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.removeFields(item, fieldsToRemove));
    }

    const filtered = { ...data };
    fieldsToRemove.forEach(field => {
      delete filtered[field];
    });

    return filtered;
  }

  /**
   * Keep only specified fields from data
   * @param {Object|Array} data - Data to filter
   * @param {Array} fieldsToKeep - Fields to keep
   * @returns {Object|Array} Filtered data
   */
  static keepOnlyFields(data, fieldsToKeep) {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.keepOnlyFields(item, fieldsToKeep));
    }

    const filtered = {};
    fieldsToKeep.forEach(field => {
      if (data.hasOwnProperty(field)) {
        filtered[field] = data[field];
      }
    });

    return filtered;
  }

  /**
   * Apply ownership filter for owners (only their own data)
   * @param {Object} user - The requesting user
   * @param {Array} data - Array of data to filter
   * @param {String} ownerField - Field name that contains owner info (default: 'ownerId')
   * @returns {Array} Filtered data
   */
  static applyOwnershipFilter(user, data, ownerField = 'ownerId') {
    if (user.type === '3') { // Admin - return all data
      return data;
    }

    if (user.type === '2') { // Owner - only their own data
      return data.filter(item => item[ownerField] === user.email);
    }

    // Regular users get no ownership data
    return [];
  }

  /**
   * Mask sensitive fields while maintaining structure
   * @param {Object|Array} data - Data to mask
   * @param {Object} maskValues - Object with field names and their mask values
   * @returns {Object|Array} Data with masked fields
   */
  static maskSensitiveFields(data, maskValues) {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveFields(item, maskValues));
    }

    const masked = { ...data };
    Object.keys(maskValues).forEach(field => {
      if (masked.hasOwnProperty(field)) {
        masked[field] = maskValues[field];
      }
    });

    return masked;
  }
}

module.exports = DataFilter;
