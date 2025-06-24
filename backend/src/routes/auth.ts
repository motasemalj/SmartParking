import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { sendOTP, verifyOTP, refreshToken, logout, getProfile } from '../controllers/auth.controller';
import { TwilioService } from '../services/twilio.service';

const router = express.Router();

// Debug middleware
router.use((_req, _res, next) => {
  console.log('Auth Route:', _req.method, _req.path, _req.body);
  next();
});

// Send OTP endpoint - using proper Redis implementation
router.post('/otp/send', sendOTP);

// Verify OTP endpoint - using proper Redis implementation
router.post('/otp/verify', verifyOTP);

// Refresh token endpoint - using proper Redis implementation
router.post('/refresh', refreshToken);

// Logout endpoint
router.post('/logout', authenticateToken, logout);

// Get profile endpoint
router.get('/profile', authenticateToken, getProfile);

// Test Twilio integration endpoint (remove in production)
router.post('/test-twilio', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Test Twilio account info
    const accountInfo = await TwilioService.getAccountInfo();
    
    // Test sending a simple message
    const testOTP = '123456';
    const smsSent = await TwilioService.sendOTP(phoneNumber, testOTP);
    
    return res.json({
      success: true,
      message: 'Twilio test completed',
      accountInfo,
      smsSent,
      testOTP
    });
  } catch (error) {
    console.error('Twilio test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Twilio test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 