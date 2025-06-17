import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Debug middleware
router.use((req, res, next) => {
  console.log('Auth Route:', req.method, req.path, req.body);
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

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // In production, verify the OTP here
    // For now, just return the user and token
    console.log('Verifying OTP for user:', user.id);
    return res.json({ 
      user,
      token: token
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

export default router; 