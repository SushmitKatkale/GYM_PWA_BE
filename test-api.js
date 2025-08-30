const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import models (but don't sync)
const { User, Gym, Subscription, Media, GymAmenity } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const gymRoutes = require('./routes/gym');
const subscriptionRoutes = require('./routes/subscription');
const amenityRoutes = require('./routes/amenity');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/amenities', amenityRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Test model imports
app.get('/test/models', (req, res) => {
  try {
    const models = {
      User: !!User,
      Gym: !!Gym,
      Subscription: !!Subscription,
      Media: !!Media,
      GymAmenity: !!GymAmenity
    };
    res.json({
      status: 'success',
      message: 'Models imported successfully',
      models
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Model import failed',
      error: error.message
    });
  }
});

// Test route imports
app.get('/test/routes', (req, res) => {
  try {
    const routes = {
      auth: !!authRoutes,
      user: !!userRoutes,
      gym: !!gymRoutes,
      subscription: !!subscriptionRoutes,
      amenity: !!amenityRoutes
    };
    res.json({
      status: 'success',
      message: 'Routes imported successfully',
      routes
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Route import failed',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  console.log(`🧪 Test API server running on port ${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔍 Model Test: http://localhost:${PORT}/test/models`);
  console.log(`🛣️  Route Test: http://localhost:${PORT}/test/routes`);
});
