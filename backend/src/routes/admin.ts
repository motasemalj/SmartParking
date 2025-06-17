import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Dashboard statistics
router.get('/stats', adminController.getStats);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/:userId', adminController.updateUserType);

// Plate management
router.get('/plates', adminController.getPlates);
router.patch('/plates/:plateId', adminController.updatePlateStatus);

// Reports
router.get('/reports', adminController.getReports);

export default router; 