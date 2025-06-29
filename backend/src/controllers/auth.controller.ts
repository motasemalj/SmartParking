import { Request, Response } from 'express';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';
import { AuthResponse, OTPResponse } from '../types';
import { redisClient } from '../index';
import { twilioService } from '../services/twilio.service';

export const sendOTP = async (req: Request, res: Response): Promise<Response<OTPResponse>> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send OTP via Twilio Verify (no need to generate or store OTP manually)
    const otpSent = await twilioService.sendOTP(phoneNumber);
    
    if (!otpSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP via SMS. Please try again.'
      });
    }

    console.log(`OTP verification initiated via Twilio Verify for ${phoneNumber}`);

    return res.json({
      success: true,
      message: 'OTP sent successfully to your phone'
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<Response<AuthResponse>> => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        error: 'Phone number and OTP are required'
      });
    }

    // Verify OTP via Twilio Verify
    const verification = await twilioService.verifyOTP(phoneNumber, otp);

    if (!verification.success) {
      return res.status(400).json({
        error: 'Invalid or expired OTP'
      });
    }

    // Find user (do not create)
    const user = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        name: user.name,
        phoneNumber: user.phoneNumber
      },
      process.env.JWT_SECRET || 'dev-secret-key',
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
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '7d' } // 7 days expiration
    );

    // Store refresh token in Redis for blacklisting capability
    await redisClient.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    // Note: Twilio Verify automatically handles OTP cleanup

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        homeNumber: user.homeNumber,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      error: 'Failed to verify OTP'
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<Response<AuthResponse>> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'dev-secret-key') as any;
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          error: 'Invalid token type'
        });
      }

      // Check if refresh token is blacklisted
      const storedRefreshToken = await redisClient.get(`refresh_token:${decoded.id}`);
      if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
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
        process.env.JWT_SECRET || 'dev-secret-key',
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
        return res.status(401).json({
          error: 'Refresh token expired'
        });
      }
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({
      error: 'Failed to refresh token'
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Blacklist the refresh token
      await redisClient.del(`refresh_token:${userId}`);
    }

    return res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({
      error: 'Failed to logout'
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { name, homeNumber, userType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        homeNumber,
        userType
      }
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        homeNumber: true,
        userType: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ error: 'Failed to get user profile' });
  }
}; 