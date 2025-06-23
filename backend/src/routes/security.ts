import { Router } from 'express';
import { authenticateToken, requireSecurity } from '../middleware/auth';
import * as securityController from '../controllers/security.controller';
import { withCache, cacheResponse, CACHE_KEYS } from '../utils/cache';

const router = Router();

// Get all plates (with optional status filter)
router.get('/plates', authenticateToken, requireSecurity, withCache(300), async (req, res) => {
  try {
    const plates = await securityController.getPlates(req, res);
    if (res.statusCode === 200) {
      const status = req.query.status as string;
      await cacheResponse(CACHE_KEYS.SECURITY_PLATES(status), plates, 300);
    }
  } catch (error) {
    console.error('Error in cached security plates route:', error);
    res.status(500).json({ error: 'Failed to get plates' });
  }
});

// Get plate history
router.get('/history', authenticateToken, requireSecurity, withCache(180), async (req, res) => {
  try {
    const history = await securityController.getPlateHistory(req, res);
    if (res.statusCode === 200) {
      await cacheResponse(CACHE_KEYS.SECURITY_HISTORY(), history, 180);
    }
  } catch (error) {
    console.error('Error in cached security history route:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get all security users
router.get('/users', authenticateToken, requireSecurity, withCache(300), async (req, res) => {
  try {
    const users = await securityController.getSecurityUsers(req, res);
    if (res.statusCode === 200) {
      await cacheResponse(CACHE_KEYS.SECURITY_USERS(), users, 300);
    }
  } catch (error) {
    console.error('Error in cached security users route:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Approve plate
router.post('/plates/:plateId/approve', authenticateToken, requireSecurity, securityController.approvePlate);

// Reject plate
router.post('/plates/:plateId/reject', authenticateToken, requireSecurity, securityController.rejectPlate);

// Temporary access routes
router.get('/temporary-access', authenticateToken, requireSecurity, withCache(300), async (req, res) => {
  try {
    const access = await securityController.getTemporaryAccess(req, res);
    if (res.statusCode === 200) {
      await cacheResponse(CACHE_KEYS.SECURITY_TEMPORARY_ACCESS(), access, 300);
    }
  } catch (error) {
    console.error('Error in cached temporary access route:', error);
    res.status(500).json({ error: 'Failed to get temporary access' });
  }
});

router.post('/temporary-access', authenticateToken, requireSecurity, securityController.createTemporaryAccess);
router.put('/temporary-access/:accessId/force-expire', authenticateToken, requireSecurity, securityController.forceExpireTemporaryAccess);

// Report generation route
router.get('/report', authenticateToken, requireSecurity, securityController.generateReport);

export default router; 