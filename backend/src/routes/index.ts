import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';
import * as plateController from '../controllers/plate.controller';
import securityRoutes from './security';
import adminRoutes from './admin';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Auth routes
router.post('/auth/otp/send', authController.sendOTP);
router.post('/auth/otp/verify', authController.verifyOTP);
router.get('/auth/profile', authenticateToken, authController.getProfile);

// Plate routes
router.post('/plates', authenticateToken, upload.array('documents'), plateController.addPlate);
router.get('/plates', authenticateToken, plateController.getPlates);
router.delete('/plates/:plateId', authenticateToken, plateController.removePlate);
router.post('/plates/:plateId/approve', authenticateToken, plateController.approvePlate);
router.post('/plates/:plateId/reject', authenticateToken, plateController.rejectPlate);

// Security routes
router.use('/security', securityRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router; 