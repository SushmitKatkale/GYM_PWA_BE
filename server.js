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
const uploadRoutes = require('./routes/upload');
const subscriptionRoutes = require('./routes/subscriptions');
const subscriptionFeatureRoutes = require('./routes/subscriptionFeatures');
const userSubscriptionRoutes = require('./routes/userSubscriptions');
const slotRoutes = require('./routes/slots');
const ownerRoutes = require('./routes/owners');
const adminPaymentRoutes = require('./routes/adminPayments');
const paymentRoutes = require('./routes/payments');
const advertisementRoutes = require('./routes/advertisements');
const dashboardRoutes = require('./routes/dashboard');
const invoiceRoutes = require('./routes/invoices');
// const reviewRoutes = require('./routes/reviews');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');
const { testConnection, syncDatabase } = require('./models');
const AdvertisementScheduler = require('./middleware/advertisementScheduler');

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Apply CORS
app.use(cors(corsOptions));

// Helmet configuration - more permissive for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
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
app.use('/api/upload', uploadRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscription-features', subscriptionFeatureRoutes);
app.use('/api/user-subscriptions', userSubscriptionRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/admin', adminPaymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
// app.use('/api/reviews', reviewRoutes);

// Gateway status route for frontend payment redirect (no authentication required)
app.use('/gateway', paymentRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Test DB connection and sync models
testConnection();
syncDatabase();

// Initialize advertisement scheduler
AdvertisementScheduler.init();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});
