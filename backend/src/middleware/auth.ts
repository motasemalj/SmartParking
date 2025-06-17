import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { JWTPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      console.log('No authorization header provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('No token found in authorization header');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    try {
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      console.log('Verifying token with secret:', process.env.JWT_SECRET);
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
      console.log('Decoded token:', decoded);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        console.log('User not found for ID:', decoded.id);
        return res.status(401).json({ message: 'User not found' });
      }

      console.log('User authenticated:', {
        id: user.id,
        name: user.name,
        userType: user.userType
      });

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: 'Invalid token', error: error.message });
      }
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Token expired', error: error.message });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('Checking admin access for user:', req.user);
  if (!req.user) {
    console.log('No user found in request');
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.userType !== 'ADMIN') {
    console.log('User is not an admin:', req.user.userType);
    return res.status(403).json({ message: 'Admin access required' });
  }
  console.log('Admin access granted');
  next();
};

export const requireSecurity = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('Checking security access for user:', req.user);
  if (!req.user) {
    console.log('No user found in request');
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.userType !== 'SECURITY') {
    console.log('User is not security:', req.user.userType);
    return res.status(403).json({ message: 'Security access required' });
  }
  console.log('Security access granted');
  next();
}; 