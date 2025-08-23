const axios = require('axios');
const { Op } = require('sequelize');
const Gym = require('../models/Gym');

class LocationService {
  constructor() {
    this.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    this.DEFAULT_RADIUS_KM = 10; // Default search radius in kilometers
    this.MAX_DISTANCE_FOR_CHECKIN = 1000; // Maximum allowed distance in meters
    
    if (!this.GOOGLE_MAPS_API_KEY) {
      console.warn('⚠️  Google Maps API key not found in environment variables');
    }
  }

  /**
   * Validate coordinates
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean}
   */
  validateCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  /**
   * Calculate distance between two points using Haversine formula (fallback)
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distance in meters
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  }

  /**
   * Get distance between two locations using Google Distance Matrix API
   * @param {Object} origin - {latitude, longitude}
   * @param {Object} destination - {latitude, longitude}
   * @param {string} mode - travel mode (walking, driving, bicycling, transit)
   * @returns {Promise<Object>} Distance and duration information
   */
  async getGoogleDistance(origin, destination, mode = 'walking') {
    if (!this.GOOGLE_MAPS_API_KEY) {
      // Fallback to Haversine calculation
      const distance = this.calculateHaversineDistance(
        origin.latitude, origin.longitude,
        destination.latitude, destination.longitude
      );
      
      return {
        distance: {
          value: distance,
          text: `${distance}m`
        },
        duration: {
          value: Math.round(distance / 1.4), // Assume 1.4 m/s walking speed
          text: `${Math.round(distance / 84)} min` // ~5 km/h walking speed
        },
        status: 'OK',
        method: 'haversine_fallback'
      };
    }

    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
      
      const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: originStr,
          destinations: destinationStr,
          mode: mode,
          units: 'metric',
          key: this.GOOGLE_MAPS_API_KEY,
          avoid: 'tolls'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.status === 'OK' && response.data.rows.length > 0) {
        const element = response.data.rows[0].elements[0];
        
        if (element.status === 'OK') {
          return {
            distance: element.distance,
            duration: element.duration,
            status: element.status,
            method: 'google_distance_matrix'
          };
        } else {
          // Fallback to Haversine if Google API fails
          const distance = this.calculateHaversineDistance(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
          );
          
          return {
            distance: {
              value: distance,
              text: `${distance}m`
            },
            duration: {
              value: Math.round(distance / 1.4),
              text: `${Math.round(distance / 84)} min`
            },
            status: 'OK',
            method: 'haversine_fallback'
          };
        }
      } else {
        throw new Error(`Google Distance Matrix API error: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Google Distance Matrix API error:', error.message);
      
      // Fallback to Haversine calculation
      const distance = this.calculateHaversineDistance(
        origin.latitude, origin.longitude,
        destination.latitude, destination.longitude
      );
      
      return {
        distance: {
          value: distance,
          text: `${distance}m`
        },
        duration: {
          value: Math.round(distance / 1.4),
          text: `${Math.round(distance / 84)} min`
        },
        status: 'OK',
        method: 'haversine_fallback',
        error: error.message
      };
    }
  }

  /**
   * Find nearby gyms within specified radius
   * @param {Object} userLocation - {latitude, longitude}
   * @param {number} radiusKm - Search radius in kilometers
   * @param {number} limit - Maximum number of gyms to return
   * @returns {Promise<Array>} Array of nearby gyms with distances
   */
  async findNearbyGyms(userLocation, radiusKm = this.DEFAULT_RADIUS_KM, limit = 10) {
    if (!this.validateCoordinates(userLocation.latitude, userLocation.longitude)) {
      throw new Error('Invalid user coordinates provided');
    }

    try {
      // Get gyms within approximate bounding box (faster initial filter)
      const latRange = radiusKm / 111; // Approximate km per degree latitude
      const lonRange = radiusKm / (111 * Math.cos(userLocation.latitude * Math.PI / 180));

      const gyms = await Gym.findAll({
        where: {
          activeStatus: true,
          attendanceTrackingEnabled: true,
          latitude: {
            [Op.between]: [userLocation.latitude - latRange, userLocation.latitude + latRange]
          },
          longitude: {
            [Op.between]: [userLocation.longitude - lonRange, userLocation.longitude + lonRange]
          },
          latitude: { [Op.ne]: null },
          longitude: { [Op.ne]: null }
        },
        attributes: [
          'id', 'name', 'address', 'latitude', 'longitude', 
          'capacity', 'currentOccupancy', 'maxOccupancy',
          'checkInRadiusMeters', 'quickCheckinEnabled',
          'locationVerificationRequired'
        ],
        limit: limit * 2 // Get more initially to filter after distance calculation
      });

      // Calculate precise distances for each gym
      const gymsWithDistance = await Promise.all(
        gyms.map(async (gym) => {
          try {
            const distanceInfo = await this.getGoogleDistance(
              userLocation,
              { latitude: parseFloat(gym.latitude), longitude: parseFloat(gym.longitude) },
              'walking'
            );

            return {
              gym: gym.toJSON(),
              distance: distanceInfo.distance.value,
              distanceText: distanceInfo.distance.text,
              walkingDuration: distanceInfo.duration.text,
              canCheckIn: distanceInfo.distance.value <= (gym.checkInRadiusMeters || 50),
              withinRadius: distanceInfo.distance.value <= (radiusKm * 1000),
              distanceMethod: distanceInfo.method
            };
          } catch (error) {
            console.error(`Error calculating distance for gym ${gym.id}:`, error.message);
            
            // Fallback to Haversine
            const distance = this.calculateHaversineDistance(
              userLocation.latitude, userLocation.longitude,
              parseFloat(gym.latitude), parseFloat(gym.longitude)
            );

            return {
              gym: gym.toJSON(),
              distance: distance,
              distanceText: `${distance}m`,
              walkingDuration: `${Math.round(distance / 84)} min`,
              canCheckIn: distance <= (gym.checkInRadiusMeters || 50),
              withinRadius: distance <= (radiusKm * 1000),
              distanceMethod: 'haversine_fallback'
            };
          }
        })
      );

      // Filter by actual radius and sort by distance
      return gymsWithDistance
        .filter(item => item.withinRadius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding nearby gyms:', error);
      throw new Error('Failed to find nearby gyms');
    }
  }

  /**
   * Validate if user location is within check-in range of a specific gym
   * @param {Object} userLocation - {latitude, longitude}
   * @param {Object} gym - Gym object with coordinates and check-in settings
   * @returns {Promise<Object>} Validation result
   */
  async validateLocationForCheckIn(userLocation, gym) {
    if (!this.validateCoordinates(userLocation.latitude, userLocation.longitude)) {
      return {
        isValid: false,
        reason: 'Invalid user location coordinates',
        error: 'INVALID_COORDINATES'
      };
    }

    if (!gym.latitude || !gym.longitude) {
      return {
        isValid: false,
        reason: 'Gym location not configured',
        error: 'GYM_LOCATION_MISSING'
      };
    }

    if (!gym.locationVerificationRequired) {
      return {
        isValid: true,
        reason: 'Location verification not required for this gym',
        distance: null,
        method: 'verification_disabled'
      };
    }

    try {
      const gymLocation = {
        latitude: parseFloat(gym.latitude),
        longitude: parseFloat(gym.longitude)
      };

      const distanceInfo = await this.getGoogleDistance(userLocation, gymLocation, 'walking');
      const maxAllowedDistance = gym.checkInRadiusMeters || 50;
      const actualDistance = distanceInfo.distance.value;

      const isValid = actualDistance <= maxAllowedDistance;

      return {
        isValid,
        distance: actualDistance,
        distanceText: distanceInfo.distance.text,
        maxAllowedDistance,
        walkingDuration: distanceInfo.duration.text,
        reason: isValid ? 
          'Location validated successfully' : 
          `Too far from gym (${actualDistance}m > ${maxAllowedDistance}m)`,
        error: isValid ? null : 'DISTANCE_TOO_FAR',
        method: distanceInfo.method,
        locationAccuracy: this.assessLocationAccuracy(userLocation, gymLocation, actualDistance)
      };

    } catch (error) {
      console.error('Location validation error:', error);
      return {
        isValid: false,
        reason: 'Failed to validate location due to service error',
        error: 'SERVICE_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Assess location accuracy based on distance and coordinates precision
   * @param {Object} userLocation 
   * @param {Object} gymLocation 
   * @param {number} distance 
   * @returns {string} 'high' | 'medium' | 'low'
   */
  assessLocationAccuracy(userLocation, gymLocation, distance) {
    // Check coordinate precision (number of decimal places)
    const userLatPrecision = (userLocation.latitude.toString().split('.')[1] || '').length;
    const userLonPrecision = (userLocation.longitude.toString().split('.')[1] || '').length;
    
    const avgPrecision = (userLatPrecision + userLonPrecision) / 2;

    if (avgPrecision >= 6 && distance <= 10) return 'high';
    if (avgPrecision >= 4 && distance <= 50) return 'medium';
    return 'low';
  }

  /**
   * Get eligible gyms for user check-in based on location and subscriptions
   * @param {Object} userLocation 
   * @param {string} userEmail 
   * @returns {Promise<Object>} Eligible gyms with check-in capability
   */
  async getEligibleGymsForCheckIn(userLocation, userEmail) {
    try {
      // Find nearby gyms
      const nearbyGyms = await this.findNearbyGyms(userLocation, this.DEFAULT_RADIUS_KM);

      // Filter gyms where user can actually check in
      const eligibleGyms = [];
      
      for (const gymInfo of nearbyGyms) {
        const gym = gymInfo.gym;
        
        // Check if quick check-in is enabled
        if (!gym.quickCheckinEnabled) {
          continue;
        }

        // Validate location for check-in
        const locationValidation = await this.validateLocationForCheckIn(userLocation, gym);
        
        if (locationValidation.isValid || !gym.locationVerificationRequired) {
          eligibleGyms.push({
            ...gymInfo,
            locationValidation,
            canCheckIn: true,
            reason: 'Location and settings allow check-in'
          });
        } else {
          eligibleGyms.push({
            ...gymInfo,
            locationValidation,
            canCheckIn: false,
            reason: locationValidation.reason
          });
        }
      }

      return {
        success: true,
        userLocation,
        totalGymsFound: nearbyGyms.length,
        eligibleGyms: eligibleGyms.filter(g => g.canCheckIn),
        nearbyButIneligible: eligibleGyms.filter(g => !g.canCheckIn),
        searchRadius: this.DEFAULT_RADIUS_KM
      };

    } catch (error) {
      console.error('Error getting eligible gyms:', error);
      return {
        success: false,
        error: error.message,
        userLocation,
        eligibleGyms: [],
        nearbyButIneligible: []
      };
    }
  }

  /**
   * Validate location for a specific gym by gym ID
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {number} gymId 
   * @returns {Promise<Object>} Validation result
   */
  async validateLocationForGym(latitude, longitude, gymId) {
    try {
      // Find the gym
      const { Gym } = require('../models');
      const gym = await Gym.findByPk(gymId);
      
      if (!gym) {
        return {
          isValid: false,
          reason: 'Gym not found',
          error: 'GYM_NOT_FOUND'
        };
      }

      // Use the existing validateLocationForCheckIn function
      return await this.validateLocationForCheckIn(
        { latitude, longitude },
        gym.toJSON()
      );
    } catch (error) {
      console.error('validateLocationForGym error:', error);
      return {
        isValid: false,
        reason: 'Failed to validate location',
        error: 'VALIDATION_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Check if coordinates are valid (alias for validateCoordinates)
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean}
   */
  isValidCoordinate(latitude, longitude) {
    return this.validateCoordinates(latitude, longitude);
  }

  /**
   * Reverse geocode coordinates to get address (using Google Geocoding API)
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<Object>} Address information
   */
  async reverseGeocode(latitude, longitude) {
    if (!this.GOOGLE_MAPS_API_KEY) {
      return {
        success: false,
        error: 'Google Maps API key not configured'
      };
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.GOOGLE_MAPS_API_KEY
        },
        timeout: 10000
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        return {
          success: true,
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components,
          placeId: result.place_id
        };
      } else {
        return {
          success: false,
          error: `Geocoding failed: ${response.data.status}`
        };
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate and normalize location input
   * @param {Object} location 
   * @returns {Object} Normalized location object
   */
  normalizeLocation(location) {
    if (!location || typeof location !== 'object') {
      throw new Error('Location must be an object');
    }

    const { latitude, longitude, accuracy } = location;

    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid latitude or longitude values');
    }

    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new LocationService();
