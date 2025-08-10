const express = require('express');
const { User, RefreshToken } = require('../models');
const JWTUtils = require('../utils/jwt');
const ResponseUtil = require('../utils/response');
const otpService = require('../services/otpService');
const { 
  registerSchema, 
  loginSchema, 
  sendOtpSchema,
  verifyOtpSchema,
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
/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Send OTP for email verification
 *     description: Send OTP to user's email for signup verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *             required:
 *               - email
 *           example:
 *             email: 'john@example.com'
 *             firstName: 'John'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid request
 *       409:
 *         description: Email already exists
 */
authRouter.post('/send-otp', validate(sendOtpSchema), async (req, res) => {
  try {
    const { email, firstName } = req.body;
    
    if (!email) {
      return ResponseUtil.validationError(res, ['Email is required']);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return ResponseUtil.conflictError(res, 'Email already exists');
    }

    // Send OTP
    const result = await otpService.sendOTP(email, firstName || '');
    
    if (result.success) {
      return ResponseUtil.success(res, null, result.message);
    } else {
      return ResponseUtil.error(res, result.message);
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    return ResponseUtil.error(res, 'Failed to send OTP');
  }
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify OTP
 *     description: Verify OTP code sent to user's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *             required:
 *               - email
 *               - otp
 *           example:
 *             email: 'john@example.com'
 *             otp: '123456'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP or request
 */
authRouter.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log('=== VERIFY OTP REQUEST ===');
    console.log('Email:', email);
    console.log('OTP:', otp);
    
    if (!email || !otp) {
      console.log('Validation failed: Missing email or OTP');
      return ResponseUtil.validationError(res, ['Email and OTP are required']);
    }

    const result = await otpService.verifyOTP(email, otp);
    console.log('OTP verification result:', result);
    
if (result.success) {
      // Check if we have user data from registration flow
      if (result.userData) {
        console.log('User data found:', result.userData);
        // Create user account upon successful OTP verification
        const userData = { ...result.userData, isVerified: true };
        console.log('Creating user with data:', userData);
        const user = await User.create(userData);
        console.log('User created successfully:', user.toJSON());

        return ResponseUtil.success(res, {
          user: user.toJSON()
        }, 'Email verified and user created successfully');
      } else {
        console.log('No user data found - just email verification');
        // Just email verification without user creation
        return ResponseUtil.success(res, null, 'Email verified successfully');
      }
    } else {
      console.log('OTP verification failed:', result.message);
      return ResponseUtil.validationError(res, [result.message]);
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    return ResponseUtil.error(res, 'Failed to verify OTP');
  }
});

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend OTP for email verification
 *     description: Resend OTP to user's email for verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             required:
 *               - email
 *           example:
 *             email: 'john@example.com'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Invalid request or no OTP request found
 */
authRouter.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ResponseUtil.validationError(res, ['Email is required']);
    }

    // Check if there's an existing OTP request for this email
    if (!otpService.hasOTP(email)) {
      return ResponseUtil.error(res, 'No OTP request found for this email. Please initiate registration first.');
    }

    // Get existing user data from the OTP storage
    const existingOtpData = otpService.getOTPData(email);
    const userData = existingOtpData ? existingOtpData.userData : null;
    const firstName = userData ? userData.firstName : '';

    // Resend OTP with the same user data
    const otpResult = await otpService.sendOTP(email, firstName, userData);

    return ResponseUtil.success(res, {
      otpSent: otpResult.success
    }, 'OTP resent successfully');
  } catch (error) {
    console.error('Resend OTP error:', error);
    return ResponseUtil.error(res, 'Failed to resend OTP');
  }
});

authRouter.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, firstName, lastName, username, password } = req.body;
    console.log('=== REGISTER REQUEST ===');
    console.log('Email:', email);
    console.log('FirstName:', firstName);
    console.log('LastName:', lastName);
    console.log('Username:', username);
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('User already exists:', email);
      return ResponseUtil.conflictError(res, 'Email already exists');
    }

    // Prepare user data for temporary storage
    const userData = { email, firstName, lastName, username, password };
    console.log('Prepared user data:', userData);

    // Send OTP for email verification with user data
    const otpResult = await otpService.sendOTP(email, firstName, userData);
    console.log('OTP send result:', otpResult);

    return ResponseUtil.success(res, {
      otpSent: otpResult.success
    }, 'Please verify your email with the OTP sent.', 200);
  } catch (error) {
    console.error('Register error:', error);
    return ResponseUtil.error(res, 'Failed to initiate registration');
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
    const refreshTokenExpiration = JWTUtils.getRefreshTokenExpiration(user.type == 3);

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
