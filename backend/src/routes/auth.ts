import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Debug middleware
router.use((_req, _res, next) => {
  console.log('Auth Route:', _req.method, _req.path, _req.body);
  next();
});

// Send OTP endpoint
router.post('/otp/send', async (req, res) => {
  console.log('Received OTP send request:', req.body);
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    console.log('No phone number provided');
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Check if user exists
    console.log('Checking for user with phone number:', phoneNumber);
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    console.log('User found:', user);

    if (!user) {
      console.log('User not found for phone number:', phoneNumber);
      return res.status(404).json({ error: 'User not found' });
    }

    // For development, we'll just return success
    // In production, you would generate and send a real OTP
    console.log('Sending mock OTP for user:', user.id);
    return res.json({ 
      message: 'OTP sent successfully',
      // For development, we'll return a mock OTP
      otp: '123456'
    });
  } catch (error) {
    console.error('Detailed error sending OTP:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      phoneNumber
    });
    return res.status(500).json({ 
      error: 'Failed to send OTP',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
});

// Verify OTP endpoint
router.post('/otp/verify', async (req, res) => {
  console.log('Received OTP verify request:', req.body);
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    console.log('Missing required fields:', { phoneNumber, otp });
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  try {
    // For development, accept any OTP if the phone number exists
    console.log('Checking for user with phone number:', phoneNumber);
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    console.log('User found:', user);

    if (!user) {
      console.log('User not found for phone number:', phoneNumber);
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        name: user.name,
        phoneNumber: user.phoneNumber
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' } // 1 hour expiration
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        name: user.name,
        phoneNumber: user.phoneNumber,
        type: 'refresh'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' } // 7 days expiration
    );

    // In production, verify the OTP here
    // For now, just return the user and tokens
    console.log('Verifying OTP for user:', user.id);
    return res.json({ 
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Detailed error verifying OTP:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      phoneNumber
    });
    return res.status(500).json({ 
      error: 'Failed to verify OTP',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  console.log('Received refresh token request');
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        name: user.name,
        phoneNumber: user.phoneNumber
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    return res.json({
      accessToken: newAccessToken,
      refreshToken, // Return the same refresh token
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        homeNumber: user.homeNumber,
        userType: user.userType
      }
    });
  } catch (jwtError) {
    if (jwtError instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // In a real implementation, you would blacklist the refresh token here
      // For now, we'll just return success
      console.log('User logged out:', userId);
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router; 