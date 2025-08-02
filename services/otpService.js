const crypto = require('crypto');
const mailService = require('./mailService');

class OTPService {
  constructor() {
    // In-memory storage for OTPs (in production, use Redis or database)
    this.otpStorage = new Map();
    this.OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
  }

  // Generate a 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Store OTP with expiry and optional user data
  storeOTP(email, otp, userData = null) {
    const expiryTime = Date.now() + this.OTP_EXPIRY_TIME;
    this.otpStorage.set(email, {
      otp,
      expiryTime,
      attempts: 0,
      userData // Store temporary user data for registration
    });
    
    // Auto-cleanup expired OTP after expiry time
    setTimeout(() => {
      this.otpStorage.delete(email);
    }, this.OTP_EXPIRY_TIME);
  }

  // Verify OTP
  verifyOTP(email, providedOTP) {
    const otpData = this.otpStorage.get(email);
    
    if (!otpData) {
      return { success: false, message: 'OTP not found or expired' };
    }

    if (Date.now() > otpData.expiryTime) {
      this.otpStorage.delete(email);
      return { success: false, message: 'OTP has expired' };
    }

    if (otpData.attempts >= 3) {
      this.otpStorage.delete(email);
      return { success: false, message: 'Maximum OTP verification attempts exceeded' };
    }

    if (otpData.otp !== providedOTP) {
      otpData.attempts++;
      return { success: false, message: 'Invalid OTP' };
    }

    // OTP is valid, return user data and remove from storage
    const { userData } = otpData;
    this.otpStorage.delete(email);
    return { success: true, message: 'OTP verified successfully', userData };
  }

  // Send OTP via email
  async sendOTP(email, firstName = '', userData = null) {
    try {
      const otp = this.generateOTP();
      this.storeOTP(email, otp, userData);

      const subject = 'Your GYM PWA Verification Code';
      const text = `Hello ${firstName},

Your verification code for GYM PWA is: ${otp}

This code will expire in 10 minutes. Please do not share this code with anyone.

If you didn't request this code, please ignore this email.

Best regards,
GYM PWA Team`;

      await mailService.sendMail(email, subject, text);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  // Check if OTP exists for email
  hasOTP(email) {
    return this.otpStorage.has(email);
  }

  // Get OTP data for email (without revealing the actual OTP)
  getOTPData(email) {
    const otpData = this.otpStorage.get(email);
    if (!otpData) {
      return null;
    }
    
    // Return data without the actual OTP for security
    return {
      userData: otpData.userData,
      expiryTime: otpData.expiryTime,
      attempts: otpData.attempts
    };
  }

  // Clear OTP for email
  clearOTP(email) {
    this.otpStorage.delete(email);
  }
}

module.exports = new OTPService();
