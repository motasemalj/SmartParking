import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { sendOTP, verifyOTP, refreshToken, logout, getProfile } from '../controllers/auth.controller';

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

export default router; 