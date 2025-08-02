class ResponseUtil {
  // Success response
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Error response
  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  // Validation error response
  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
      timestamp: new Date().toISOString()
    });
  }

  // Authentication error response
  static authError(res, message = 'Authentication failed') {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Authorization error response
  static forbiddenError(res, message = 'Access forbidden') {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Not found error response
  static notFoundError(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Conflict error response
  static conflictError(res, message = 'Resource already exists') {
    return res.status(409).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Paginated response
  static paginated(res, data, totalCount, page, limit, message = 'Success') {
    const totalPages = Math.ceil(totalCount / limit);
    
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ResponseUtil;
