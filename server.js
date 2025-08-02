const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gymRoutes = require('./routes/gyms');
const amenityRoutes = require('./routes/amenities');
const gymImageRoutes = require('./routes/gymImages');
const subscriptionRoutes = require('./routes/subscriptions');
const subscriptionFeatureRoutes = require('./routes/subscriptionFeatures');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');
const { testConnection, syncDatabase } = require('./models');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (for uploaded images)
app.use('/uploads', express.static('uploads'));

// Rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  }
});
app.use(limiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to GYM PWA Backend API',
    data: {
      version: '1.0.0',
      documentation: '/api-docs',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Check if the server is running
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: 'Server is running'
 *               data: null
 *               timestamp: '2024-01-01T00:00:00.000Z'
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/gym-images', gymImageRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscription-features', subscriptionFeatureRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Test DB connection and sync models
testConnection();
syncDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});
