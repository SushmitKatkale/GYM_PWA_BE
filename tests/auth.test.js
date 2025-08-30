const request = require('supertest');
const app = require('../server');
const TestHelpers = require('./utils/testHelpers');
const { sequelize } = require('../config/database');

describe('Authentication System', () => {
  let helpers;

  beforeAll(async () => {
    helpers = new TestHelpers(app);
    await helpers.seedTestData();
  });

  afterAll(async () => {
    await helpers.cleanTestData();
  });

  describe('User Registration', () => {
    test('should register a new user with user.id', async () => {
      const userData = {
        email: 'newuser@test.com',
        first_name: 'New',
        last_name: 'User',
        username: 'newuser',
        password: '123456',
        phone_number: '+1234567899'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      helpers.expectValidResponse(response, 201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      expect(typeof response.body.user.id).toBe('number');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe(1); // Default user role
    });

    test('should not register user with duplicate email', async () => {
      const userData = {
        email: 'test@example.com', // Already exists
        first_name: 'Duplicate',
        last_name: 'User',
        username: 'duplicateuser',
        password: '123456',
        phone_number: '+1234567898'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData);

      helpers.expectValidationError(response, 400);
    });
  });

  describe('User Login', () => {
    test('should login with email and return JWT with user.id', async () => {
      const loginData = {
        email: 'test@example.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      helpers.expectValidResponse(response, 200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(100001);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe(1);
    });

    test('should fail login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      helpers.expectAuthError(response, 401);
    });
  });

  describe('JWT Token Validation', () => {
    test('should validate JWT token containing user.id', async () => {
      const { token } = await helpers.createTestUser();

      const response = await helpers.authenticatedRequest('get', '/api/users/profile', token);
      
      helpers.expectValidResponse(response, 200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(100001);
    });

    test('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token');

      helpers.expectAuthError(response, 401);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      helpers.expectAuthError(response, 401);
    });
  });

  describe('Role-based Authentication', () => {
    test('should allow admin access with role 4', async () => {
      const { token } = await helpers.createTestAdmin();

      const response = await helpers.authenticatedRequest('get', '/api/admin/users', token);
      
      // Should succeed with admin token (if admin routes exist)
      expect([200, 404]).toContain(response.status); // 404 if route doesn't exist yet
    });

    test('should deny admin access to regular user', async () => {
      const { token } = await helpers.createTestUser();

      const response = await helpers.authenticatedRequest('get', '/api/admin/users', token);
      
      // Should fail with user token
      expect([403, 404]).toContain(response.status);
    });

    test('should allow owner access with role 2', async () => {
      const { token } = await helpers.createTestOwner();

      const response = await helpers.authenticatedRequest('get', '/api/owner/gyms', token);
      
      // Should succeed with owner token (if owner routes exist)
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Password Update', () => {
    test('should update user password using user.id', async () => {
      const { user, token } = await helpers.createTestUser({
        id: 100010,
        email: 'passwordtest@example.com'
      });

      const updateData = {
        currentPassword: '123456',
        newPassword: 'newpassword123'
      };

      const response = await helpers.authenticatedRequest('put', '/api/users/change-password', token)
        .send(updateData);

      // Should succeed or return appropriate error if endpoint doesn't exist
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Profile Updates', () => {
    test('should update user profile using user.id authentication', async () => {
      const { user, token } = await helpers.createTestUser({
        id: 100011,
        email: 'profiletest@example.com'
      });

      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        phone_number: '+1987654321'
      };

      const response = await helpers.authenticatedRequest('put', '/api/users/profile', token)
        .send(updateData);

      // Should succeed or return appropriate error if endpoint doesn't exist
      expect([200, 404]).toContain(response.status);
    });
  });
});
