const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../../config/database');

class TestHelpers {
  constructor(app) {
    this.app = app;
    this.tokens = {};
  }

  // Generate JWT token for testing
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  }

  // Create test user and get auth token
  async createTestUser(userData = {}) {
    const defaultUser = {
      id: 100001,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      password: await bcrypt.hash('123456', 10),
      phone_number: '+1234567890',
      role: 1,
      record_status: 1,
      is_verified: 1
    };

    const user = { ...defaultUser, ...userData };
    const token = this.generateToken(user);
    
    this.tokens[user.email] = token;
    return { user, token };
  }

  // Create test gym owner
  async createTestOwner(userData = {}) {
    const defaultOwner = {
      id: 200001,
      email: 'owner@example.com',
      first_name: 'Test',
      last_name: 'Owner',
      username: 'testowner',
      password: await bcrypt.hash('123456', 10),
      phone_number: '+1234567891',
      role: 2,
      record_status: 1,
      is_verified: 1
    };

    return this.createTestUser({ ...defaultOwner, ...userData });
  }

  // Create test admin
  async createTestAdmin(userData = {}) {
    const defaultAdmin = {
      id: 900001,
      email: 'admin@example.com',
      first_name: 'Test',
      last_name: 'Admin',
      username: 'testadmin',
      password: await bcrypt.hash('123456', 10),
      phone_number: '+1234567892',
      role: 4,
      record_status: 1,
      is_verified: 1
    };

    return this.createTestUser({ ...defaultAdmin, ...userData });
  }

  // Make authenticated request
  authenticatedRequest(method, url, token) {
    return request(this.app)[method](url).set('Authorization', `Bearer ${token}`);
  }

  // Clean test data from database
  async cleanTestData() {
    try {
      // Delete in proper order to avoid foreign key constraints
      const tables = [
        'gym_attendance',
        'gym_qr_codes', 
        'gym_unique_codes',
        'gym_check_in_methods',
        'advertisements',
        'notifications',
        'push_subscriptions',
        'gyms',
        'users'
      ];

      for (const table of tables) {
        await sequelize.query(`DELETE FROM ${table} WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`);
      }

      console.log('Test data cleaned from database');
    } catch (error) {
      console.error('Error cleaning test data:', error);
    }
  }

  // Seed test database with basic data
  async seedTestData() {
    try {
      // Create test users
      const { user: testUser } = await this.createTestUser();
      const { user: testOwner } = await this.createTestOwner();  
      const { user: testAdmin } = await this.createTestAdmin();

      // Insert users into database
      await sequelize.query(`
        INSERT IGNORE INTO users (id, email, first_name, last_name, username, password, phone_number, role, record_status, is_verified, created_at, updated_at)
        VALUES 
        (${testUser.id}, '${testUser.email}', '${testUser.first_name}', '${testUser.last_name}', '${testUser.username}', '${testUser.password}', '${testUser.phone_number}', ${testUser.role}, ${testUser.record_status}, ${testUser.is_verified}, NOW(), NOW()),
        (${testOwner.id}, '${testOwner.email}', '${testOwner.first_name}', '${testOwner.last_name}', '${testOwner.username}', '${testOwner.password}', '${testOwner.phone_number}', ${testOwner.role}, ${testOwner.record_status}, ${testOwner.is_verified}, NOW(), NOW()),
        (${testAdmin.id}, '${testAdmin.email}', '${testAdmin.first_name}', '${testAdmin.last_name}', '${testAdmin.username}', '${testAdmin.password}', '${testAdmin.phone_number}', ${testAdmin.role}, ${testAdmin.record_status}, ${testAdmin.is_verified}, NOW(), NOW())
      `);

      // Create test gym
      await sequelize.query(`
        INSERT IGNORE INTO gyms (id, name, capacity, address, latitude, longitude, description, opening_time, closing_time, record_status, owner_id, rating, current_occupancy, city, state, zip_code, check_in_radius_meters, default_session_duration_minutes, auto_checkout_enabled, location_verification_required, max_occupancy, allow_multiple_checkins, attendance_tracking_enabled, quick_checkin_enabled, qr_code_checkin_enabled, unique_code_checkin_enabled, owner_scan_enabled, biometric_checkin_enabled, created_at, updated_at, created_by, updated_by)
        VALUES (1, 'Test Gym', 100, '123 Test St', 40.7128, -74.0060, 'Test gym for automated testing', '06:00:00', '22:00:00', 1, ${testOwner.id}, 4.5, 0, 'Test City', 'TS', '12345', 100, 120, 0, 1, 100, 0, 1, 1, 1, 1, 1, 0, NOW(), NOW(), ${testOwner.id}, ${testOwner.id})
      `);

      console.log('Test data seeded successfully');
      return { testUser, testOwner, testAdmin };
    } catch (error) {
      console.error('Error seeding test data:', error);
      throw error;
    }
  }

  // Assertion helpers
  expectValidResponse(response, statusCode = 200) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toBeDefined();
  }

  expectAuthError(response, statusCode = 401) {
    expect(response.status).toBe(statusCode);
    expect(response.body.error || response.body.message).toBeDefined();
  }

  expectValidationError(response, statusCode = 400) {
    expect(response.status).toBe(statusCode);
    expect(response.body.error || response.body.errors).toBeDefined();
  }
}

module.exports = TestHelpers;
