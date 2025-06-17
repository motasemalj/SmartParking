import { Router } from 'express';
import { authenticateToken, requireSecurity } from '../middleware/auth';
import * as securityController from '../controllers/security.controller';

const router = Router();

// Get all plates (with optional status filter)
router.get('/plates', authenticateToken, requireSecurity, securityController.getPlates);

// Get plate history
router.get('/history', authenticateToken, requireSecurity, securityController.getPlateHistory);

// Get all security users
router.get('/users', authenticateToken, requireSecurity, securityController.getSecurityUsers);

// Approve plate
router.post('/plates/:plateId/approve', authenticateToken, requireSecurity, securityController.approvePlate);

// Reject plate
router.post('/plates/:plateId/reject', authenticateToken, requireSecurity, securityController.rejectPlate);

// Temporary access routes
router.get('/temporary-access', authenticateToken, requireSecurity, securityController.getTemporaryAccess);
router.post('/temporary-access', authenticateToken, requireSecurity, securityController.createTemporaryAccess);

// Report generation route
router.get('/report', authenticateToken, requireSecurity, securityController.generateReport);

export default router; 