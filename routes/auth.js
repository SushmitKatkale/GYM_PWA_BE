const express = require('express');
const { User, RefreshToken } = require('../models');
const JWTUtils = require('../utils/jwt');
const ResponseUtil = require('../utils/response');
const { 
  registerSchema, 
  loginSchema, 
  validate 
} = require('../utils/validation');
const { 
  errorHandler, 
  notFoundHandler 
} = require('../middleware/errorHandler');

const authRouter = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           example:
 *             username: 'johndoe'
 *             email: 'john@example.com'
 *             password: 'SecurePass123!'
 *             firstName: 'John'
 *             lastName: 'Doe'
 *             role: 'user'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRouter.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const user = await User.create(req.body);
    return ResponseUtil.success(res, user.toJSON(), 'User registered successfully', 201);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return ResponseUtil.conflictError(res, `${field} already exists`);
    }
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message);
      return ResponseUtil.validationError(res, errors);
    }
    return ResponseUtil.error(res, 'Failed to register user');
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user and return tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           example:
 *             email: 'john@example.com'
 *             password: 'SecurePass123!'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRouter.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);

    if (!user || user.activeStatus === '0' || !(await user.verifyPassword(password))) {
      return ResponseUtil.authError(res, 'Invalid email or password');
    }

    const accessToken = JWTUtils.generateAccessToken({ userEmail: user.email });
    const refreshTokenValue = JWTUtils.generateRefreshToken();
    const refreshTokenExpiration = JWTUtils.getRefreshTokenExpiration();

    await RefreshToken.createToken(user.email, refreshTokenValue, refreshTokenExpiration);

    return ResponseUtil.success(res, {
      accessToken,
      refreshToken: refreshTokenValue
    }, 'Login successful');
  } catch (error) {
    return ResponseUtil.error(res, 'Login failed');
  }
});

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: 'a1b2c3d4e5f6...'
 *     responses:
 *       200:
 *         description: Access token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           description: New JWT access token
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRouter.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const storedToken = await RefreshToken.findByToken(refreshToken);

    if (!storedToken || storedToken.isExpired()) {
      return ResponseUtil.authError(res, 'Invalid or expired refresh token');
    }

    const user = await User.findByPk(storedToken.userId);

    if (!user || user.activeStatus === '0') {
      return ResponseUtil.authError(res, 'User not found or inactive');
    }

    const newAccessToken = JWTUtils.generateAccessToken({ userEmail: user.email });
    return ResponseUtil.success(res, {
      accessToken: newAccessToken
    }, 'Access token refreshed');
  } catch (error) {
    return ResponseUtil.error(res, 'Failed to refresh token');
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: Invalidate refresh token and logout user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: 'a1b2c3d4e5f6...'
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Refresh token not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRouter.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const storedToken = await RefreshToken.findByToken(refreshToken);

    if (!storedToken) {
      return ResponseUtil.notFoundError(res, 'Refresh token not found');
    }

    await storedToken.destroy();
    return ResponseUtil.success(res, null, 'Logged out successfully');
  } catch (error) {
    return ResponseUtil.error(res, 'Logout failed');
  }
});

module.exports = authRouter;
