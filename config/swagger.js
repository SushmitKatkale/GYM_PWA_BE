const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GYM PWA Backend API',
      version: '1.0.0',
      description: 'A REST API for Gym Progressive Web Application built with Node.js, Express, MySQL, and JWT authentication',
      contact: {
        name: 'API Support',
        email: 'support@gym-pwa.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-domain.com/' 
          : `http://localhost:${process.env.PORT || 3000}/`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            firstName: {
              type: 'string',
              description: 'First name'
            },
            lastName: {
              type: 'string',
              description: 'Last name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'User active status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        UserRegistration: {
          type: 'object',
          required: ['username', 'email', 'password', 'firstName', 'lastName'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              pattern: '^[a-zA-Z0-9]+$',
              description: 'Username (alphanumeric only)'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 100,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])',
              description: 'Password (must contain uppercase, lowercase, number, and special character)'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'First name'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Last name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role (optional, defaults to user)'
            }
          }
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            password: {
              type: 'string',
              description: 'User password'
            }
          }
        },
        TokenResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'Refresh token'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token'
            }
          }
        },
        ChangePassword: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Current password'
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              maxLength: 100,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])',
              description: 'New password (must contain uppercase, lowercase, number, and special character)'
            }
          }
        },
        UpdateUser: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              pattern: '^[a-zA-Z0-9]+$',
              description: 'Username (alphanumeric only)'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'First name'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Last name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error description'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Detailed error messages'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        Gym: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Gym ID'
            },
            name: {
              type: 'string',
              description: 'Gym name'
            },
            capacity: {
              type: 'integer',
              description: 'Maximum capacity of the gym'
            },
            address: {
              type: 'string',
              description: 'Gym address'
            },
            description: {
              type: 'string',
              description: 'Gym description'
            },
            openingTime: {
              type: 'string',
              format: 'time',
              description: 'Opening time (HH:MM format)'
            },
            closingTime: {
              type: 'string',
              format: 'time',
              description: 'Closing time (HH:MM format)'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the gym'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the gym'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the gym'
            },
            ownerId: {
              type: 'integer',
              description: 'ID of the user who owns this gym'
            },
            owner: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                firstName: {
                  type: 'string'
                },
                lastName: {
                  type: 'string'
                },
                email: {
                  type: 'string'
                }
              },
              description: 'Gym owner details'
            },
            amenities: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Amenity'
              },
              description: 'List of gym amenities'
            },
            images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GymImage'
              },
              description: 'List of gym images'
            }
          }
        },
        CreateGym: {
          type: 'object',
          required: ['name', 'capacity', 'address', 'openingTime', 'closingTime'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Gym name'
            },
            capacity: {
              type: 'integer',
              minimum: 1,
              maximum: 10000,
              description: 'Maximum capacity of the gym'
            },
            address: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              description: 'Gym address'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Gym description'
            },
            openingTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Opening time (HH:MM format, 24-hour)'
            },
            closingTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Closing time (HH:MM format, 24-hour)'
            },
            createdBy: {
              type: 'string',
              description: 'User who is creating the gym'
            },
            ownerId: {
              type: 'integer',
              description: 'ID of the user who will own this gym'
            }
          }
        },
        UpdateGym: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Gym name'
            },
            capacity: {
              type: 'integer',
              minimum: 1,
              maximum: 10000,
              description: 'Maximum capacity of the gym'
            },
            address: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              description: 'Gym address'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Gym description'
            },
            openingTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Opening time (HH:MM format, 24-hour)'
            },
            closingTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Closing time (HH:MM format, 24-hour)'
            },
            updatedBy: {
              type: 'string',
              description: 'User who is updating the gym'
            }
          }
        },
        Amenity: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Amenity ID'
            },
            name: {
              type: 'string',
              description: 'Amenity name'
            },
            description: {
              type: 'string',
              description: 'Amenity description'
            },
            gymId: {
              type: 'integer',
              description: 'ID of the gym this amenity belongs to'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the amenity'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the amenity'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the amenity'
            },
            gym: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                name: {
                  type: 'string'
                }
              },
              description: 'Associated gym details'
            }
          }
        },
        CreateAmenity: {
          type: 'object',
          required: ['name', 'gymId'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Amenity name'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Amenity description'
            },
            gymId: {
              type: 'integer',
              description: 'ID of the gym this amenity belongs to'
            },
            createdBy: {
              type: 'string',
              description: 'User who is creating the amenity'
            }
          }
        },
        UpdateAmenity: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Amenity name'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Amenity description'
            },
            updatedBy: {
              type: 'string',
              description: 'User who is updating the amenity'
            }
          }
        },
        GymImage: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Image ID'
            },
            title: {
              type: 'string',
              description: 'Image title'
            },
            path: {
              type: 'string',
              description: 'Image file path'
            },
            fullUrl: {
              type: 'string',
              description: 'Full URL to access the image'
            },
            gymId: {
              type: 'integer',
              description: 'ID of the gym this image belongs to'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the image'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who uploaded the image'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the image'
            },
            gym: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                name: {
                  type: 'string'
                }
              },
              description: 'Associated gym details'
            }
          }
        },
        UpdateGymImage: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Image title'
            },
            updatedBy: {
              type: 'string',
              description: 'User who is updating the image'
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              description: 'Current page number'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            },
            totalItems: {
              type: 'integer',
              description: 'Total number of items'
            },
            itemsPerPage: {
              type: 'integer',
              description: 'Number of items per page'
            }
          }
        },
        Subscription: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Subscription ID'
            },
            title: {
              type: 'string',
              description: 'Subscription title'
            },
            validityDays: {
              type: 'integer',
              description: 'Subscription validity in days'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Subscription price'
            },
            discountedPrice: {
              type: 'number',
              format: 'decimal',
              description: 'Discounted price (optional)'
            },
            gymId: {
              type: 'integer',
              description: 'ID of the gym this subscription belongs to'
            },
            isMostPopular: {
              type: 'boolean',
              description: 'Whether this is the most popular subscription'
            },
            isCheapest: {
              type: 'boolean',
              description: 'Whether this is the cheapest subscription'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the subscription'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the subscription'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the subscription'
            },
            gym: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                name: {
                  type: 'string'
                }
              },
              description: 'Associated gym details'
            },
            features: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/SubscriptionFeature'
              },
              description: 'List of subscription features'
            }
          }
        },
        CreateSubscription: {
          type: 'object',
          required: ['title', 'validityDays', 'price', 'gymId'],
          properties: {
            title: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Subscription title'
            },
            validityDays: {
              type: 'integer',
              minimum: 1,
              description: 'Subscription validity in days'
            },
            price: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Subscription price'
            },
            discountedPrice: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Discounted price (optional)'
            },
            gymId: {
              type: 'integer',
              description: 'ID of the gym this subscription belongs to'
            },
            isMostPopular: {
              type: 'boolean',
              description: 'Whether this is the most popular subscription'
            },
            isCheapest: {
              type: 'boolean',
              description: 'Whether this is the cheapest subscription'
            },
            createdBy: {
              type: 'string',
              description: 'User who is creating the subscription'
            }
          }
        },
        UpdateSubscription: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Subscription title'
            },
            validityDays: {
              type: 'integer',
              minimum: 1,
              description: 'Subscription validity in days'
            },
            price: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Subscription price'
            },
            discountedPrice: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Discounted price (optional)'
            },
            isMostPopular: {
              type: 'boolean',
              description: 'Whether this is the most popular subscription'
            },
            isCheapest: {
              type: 'boolean',
              description: 'Whether this is the cheapest subscription'
            },
            updatedBy: {
              type: 'string',
              description: 'User who is updating the subscription'
            }
          }
        },
        SubscriptionFeature: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Feature ID'
            },
            title: {
              type: 'string',
              description: 'Feature title'
            },
            subscriptionId: {
              type: 'integer',
              description: 'ID of the subscription this feature belongs to'
            },
            isHighlighted: {
              type: 'boolean',
              description: 'Whether this feature is highlighted'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the feature'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the feature'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the feature'
            },
            subscription: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                title: {
                  type: 'string'
                },
                gym: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'integer'
                    },
                    name: {
                      type: 'string'
                    }
                  }
                }
              },
              description: 'Associated subscription details'
            }
          }
        },
        CreateSubscriptionFeature: {
          type: 'object',
          required: ['title', 'subscriptionId'],
          properties: {
            title: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Feature title'
            },
            subscriptionId: {
              type: 'integer',
              description: 'ID of the subscription this feature belongs to'
            },
            isHighlighted: {
              type: 'boolean',
              description: 'Whether this feature is highlighted'
            },
            createdBy: {
              type: 'string',
              description: 'User who is creating the feature'
            }
          }
        },
        UpdateSubscriptionFeature: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Feature title'
            },
            isHighlighted: {
              type: 'boolean',
              description: 'Whether this feature is highlighted'
            },
            updatedBy: {
              type: 'string',
              description: 'User who is updating the feature'
            }
          }
        },
        UserSubscription: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User subscription ID'
            },
            userEmail: {
              type: 'string',
              format: 'email',
              description: 'User email who purchased the subscription'
            },
            subscriptionId: {
              type: 'integer',
              description: 'ID of the purchased subscription'
            },
            paymentId: {
              type: 'integer',
              description: 'ID of the payment transaction'
            },
            validFrom: {
              type: 'string',
              format: 'date-time',
              description: 'Subscription validity start date'
            },
            validTo: {
              type: 'string',
              format: 'date-time',
              description: 'Subscription validity end date'
            },
            bufferDays: {
              type: 'integer',
              description: 'Additional buffer days for subscription'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the user subscription'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the record'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the record'
            },
            subscription: {
              $ref: '#/components/schemas/Subscription',
              description: 'Associated subscription details'
            },
            payment: {
              $ref: '#/components/schemas/Payment',
              description: 'Associated payment details'
            }
          }
        },
        CreateUserSubscription: {
          type: 'object',
          required: ['userEmail', 'subscriptionId', 'paymentId', 'validFrom', 'validTo'],
          properties: {
            userEmail: {
              type: 'string',
              format: 'email',
              description: 'User email who is purchasing the subscription'
            },
            subscriptionId: {
              type: 'integer',
              description: 'ID of the subscription to purchase'
            },
            paymentId: {
              type: 'integer',
              description: 'ID of the payment transaction'
            },
            validFrom: {
              type: 'string',
              format: 'date-time',
              description: 'Subscription validity start date'
            },
            validTo: {
              type: 'string',
              format: 'date-time',
              description: 'Subscription validity end date'
            },
            bufferDays: {
              type: 'integer',
              description: 'Additional buffer days for subscription'
            },
            createdBy: {
              type: 'string',
              description: 'User who is creating the record'
            }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Payment ID'
            },
            paymentRefNo: {
              type: 'string',
              description: 'Payment reference number'
            },
            bankRefNo: {
              type: 'string',
              description: 'Bank reference number'
            },
            paidVia: {
              type: 'string',
              enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cash', 'bank_transfer'],
              description: 'Payment method used'
            },
            paymentCcy: {
              type: 'string',
              description: 'Payment currency (3-letter code)'
            },
            paymentAmount: {
              type: 'number',
              format: 'decimal',
              description: 'Payment amount'
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
              description: 'Payment status'
            },
            transactionId: {
              type: 'string',
              description: 'Transaction ID from payment gateway'
            },
            gatewayResponse: {
              type: 'string',
              description: 'Payment gateway response'
            },
            userEmail: {
              type: 'string',
              format: 'email',
              description: 'User email who made the payment'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the payment record'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the record'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the record'
            },
            userSubscription: {
              $ref: '#/components/schemas/UserSubscription',
              description: 'Associated user subscription'
            },
            invoice: {
              $ref: '#/components/schemas/Invoice',
              description: 'Associated invoice'
            }
          }
        },
        CreatePayment: {
          type: 'object',
          required: ['paymentRefNo', 'paidVia', 'paymentCcy', 'paymentAmount', 'userEmail'],
          properties: {
            paymentRefNo: {
              type: 'string',
              description: 'Payment reference number'
            },
            bankRefNo: {
              type: 'string',
              description: 'Bank reference number'
            },
            paidVia: {
              type: 'string',
              enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cash', 'bank_transfer'],
              description: 'Payment method used'
            },
            paymentCcy: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              description: 'Payment currency (3-letter code)'
            },
            paymentAmount: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Payment amount'
            },
            transactionId: {
              type: 'string',
              description: 'Transaction ID from payment gateway'
            },
            gatewayResponse: {
              type: 'string',
              description: 'Payment gateway response'
            },
            userEmail: {
              type: 'string',
              format: 'email',
              description: 'User email who is making the payment'
            },
            createdBy: {
              type: 'string',
              description: 'User who is creating the record'
            }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Invoice ID'
            },
            invoiceNumber: {
              type: 'string',
              description: 'Invoice number'
            },
            paymentId: {
              type: 'integer',
              description: 'ID of the associated payment'
            },
            path: {
              type: 'string',
              description: 'File path of the invoice document'
            },
            fileName: {
              type: 'string',
              description: 'Invoice file name'
            },
            fileSize: {
              type: 'integer',
              description: 'Invoice file size in bytes'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type of the invoice file'
            },
            invoiceDate: {
              type: 'string',
              format: 'date-time',
              description: 'Invoice date'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Invoice due date'
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
              description: 'Total invoice amount'
            },
            currency: {
              type: 'string',
              description: 'Invoice currency (3-letter code)'
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
              description: 'Invoice status'
            },
            activeStatus: {
              type: 'boolean',
              description: 'Active status of the invoice'
            },
            createTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the record'
            },
            updateTimestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the record'
            },
            payment: {
              $ref: '#/components/schemas/Payment',
              description: 'Associated payment details'
            }
          }
        },
        CreateInvoice: {
          type: 'object',
          required: ['invoiceNumber', 'paymentId', 'path', 'fileName', 'totalAmount'],
          properties: {
            invoiceNumber: {
              type: 'string',
              description: 'Invoice number'
            },
            paymentId: {
              type: 'integer',
              description: 'ID of the associated payment'
            },
            path: {
              type: 'string',
              description: 'File path of the invoice document'
            },
            fileName: {
              type: 'string',
              description: 'Invoice file name'
            },
            fileSize: {
              type: 'integer',
              description: 'Invoice file size in bytes'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type of the invoice file'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Invoice due date'
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Total invoice amount'
            },
            currency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              description: 'Invoice currency (3-letter code)'
            },
            createdBy: {
              type: 'string',
              description: 'User who is creating the record'
            }
          }
        },
        PurchaseSubscriptionRequest: {
          type: 'object',
          required: ['subscriptionId', 'paymentDetails'],
          properties: {
            subscriptionId: {
              type: 'integer',
              description: 'ID of the subscription to purchase'
            },
            paymentDetails: {
              $ref: '#/components/schemas/CreatePayment',
              description: 'Payment information'
            },
            bufferDays: {
              type: 'integer',
              description: 'Additional buffer days for subscription'
            }
          }
        },
        GymSlot: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Gym slot ID'
            },
            gymId: {
              type: 'integer',
              description: 'ID of the gym this slot belongs to'
            },
            startTime: {
              type: 'string',
              format: 'time',
              description: 'Slot start time (HH:MM format)'
            },
            endTime: {
              type: 'string',
              format: 'time',
              description: 'Slot end time (HH:MM format)'
            },
            capacity: {
              type: 'integer',
              description: 'Maximum capacity for this slot'
            },
            daysOfWeek: {
              type: 'array',
              items: {
                type: 'integer',
                minimum: 0,
                maximum: 6
              },
              description: 'Days of week when slot is available (0=Sunday, 6=Saturday)'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Status of the gym slot'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the slot'
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the slot'
            },
            gym: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                name: {
                  type: 'string'
                },
                address: {
                  type: 'string'
                }
              },
              description: 'Associated gym details'
            }
          }
        },
        CreateGymSlot: {
          type: 'object',
          required: ['gymId', 'startTime', 'endTime', 'capacity', 'daysOfWeek'],
          properties: {
            gymId: {
              type: 'integer',
              minimum: 1,
              description: 'ID of the gym this slot belongs to'
            },
            startTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Slot start time (HH:MM format, 24-hour)'
            },
            endTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Slot end time (HH:MM format, 24-hour)'
            },
            capacity: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
              description: 'Maximum capacity for this slot'
            },
            daysOfWeek: {
              type: 'array',
              items: {
                type: 'integer',
                minimum: 0,
                maximum: 6
              },
              minItems: 1,
              maxItems: 7,
              description: 'Days of week when slot is available (0=Sunday, 6=Saturday)'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the slot is active'
            }
          }
        },
        SlotAvailability: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Availability record ID'
            },
            gymSlotId: {
              type: 'integer',
              description: 'ID of the gym slot'
            },
            availabilityDate: {
              type: 'string',
              format: 'date',
              description: 'Date for this availability record'
            },
            availableCapacity: {
              type: 'integer',
              description: 'Available capacity for this date'
            },
            bookedCount: {
              type: 'integer',
              description: 'Number of bookings for this date'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            gymSlot: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                startTime: {
                  type: 'string'
                },
                endTime: {
                  type: 'string'
                },
                capacity: {
                  type: 'integer'
                },
                gym: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'integer'
                    },
                    name: {
                      type: 'string'
                    }
                  }
                }
              },
              description: 'Associated gym slot details'
            }
          }
        },
        UserSlotBooking: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Booking ID'
            },
            userEmail: {
              type: 'string',
              format: 'email',
              description: 'Email of the user who made the booking'
            },
            userSubscriptionId: {
              type: 'integer',
              description: 'ID of the user subscription'
            },
            gymSlotId: {
              type: 'integer',
              description: 'ID of the booked gym slot'
            },
            bookingDate: {
              type: 'string',
              format: 'date',
              description: 'Date of the booking'
            },
            bookingStatus: {
              type: 'string',
              enum: ['active', 'cancelled', 'completed', 'no_show', 'checked_in'],
              description: 'Status of the booking'
            },
            bookingType: {
              type: 'string',
              enum: ['regular', 'one_time_change', 'temporary'],
              description: 'Type of booking'
            },
            checkinTime: {
              type: 'string',
              format: 'date-time',
              description: 'Check-in timestamp'
            },
            checkoutTime: {
              type: 'string',
              format: 'date-time',
              description: 'Check-out timestamp'
            },
            cancellationReason: {
              type: 'string',
              description: 'Reason for cancellation'
            },
            cancellationTime: {
              type: 'string',
              format: 'date-time',
              description: 'Cancellation timestamp'
            },
            notes: {
              type: 'string',
              description: 'Additional notes for the booking'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            gymSlot: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer'
                },
                startTime: {
                  type: 'string'
                },
                endTime: {
                  type: 'string'
                },
                capacity: {
                  type: 'integer'
                },
                gym: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'integer'
                    },
                    name: {
                      type: 'string'
                    },
                    address: {
                      type: 'string'
                    }
                  }
                }
              },
              description: 'Associated gym slot details'
            }
          }
        },
        BookSlot: {
          type: 'object',
          required: ['gymSlotId', 'bookingDate'],
          properties: {
            gymSlotId: {
              type: 'integer',
              minimum: 1,
              description: 'ID of the gym slot to book'
            },
            bookingDate: {
              type: 'string',
              format: 'date',
              description: 'Date for the booking (YYYY-MM-DD format)'
            },
            bookingType: {
              type: 'string',
              enum: ['regular', 'one_time_change', 'temporary'],
              description: 'Type of booking (defaults to regular)'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Gyms',
        description: 'Gym management endpoints'
      },
      {
        name: 'Amenities',
        description: 'Gym amenities management endpoints'
      },
      {
        name: 'Gym Images',
        description: 'Gym image upload and management endpoints'
      },
      {
        name: 'Subscriptions',
        description: 'Gym subscription plans management endpoints'
      },
      {
        name: 'Subscription Features',
        description: 'Subscription feature management endpoints'
      },
      {
        name: 'User Subscriptions',
        description: 'User subscription purchase and management endpoints'
      },
      {
        name: 'Payments',
        description: 'Payment transaction management endpoints'
      },
      {
        name: 'Invoices',
        description: 'Invoice document management endpoints'
      },
      {
        name: 'Gym Slots',
        description: 'Gym slot booking and management endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoint'
      }
    ]
  },
  apis: ['./routes/*.js', './server.js']
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6; }
  `,
  customSiteTitle: 'GYM PWA API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};
