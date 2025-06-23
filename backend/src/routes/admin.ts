import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';
import { withCache, cacheResponse, CACHE_KEYS } from '../utils/cache';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Dashboard statistics
router.get('/stats', withCache(600), async (req, res) => {
  try {
    const stats = await adminController.getStats(req, res);
    if (res.statusCode === 200) {
      await cacheResponse(CACHE_KEYS.ADMIN_STATS(), stats, 600);
    }
  } catch (error) {
    console.error('Error in cached stats route:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// User management
router.get('/users', withCache(300), async (req, res) => {
  try {
    const users = await adminController.getUsers(req, res);
    if (res.statusCode === 200) {
      await cacheResponse(CACHE_KEYS.ADMIN_USERS(), users, 300);
    }
  } catch (error) {
    console.error('Error in cached users route:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.post('/users', adminController.createUser);

router.patch('/users/:userId', adminController.updateUser);

router.delete('/users/:userId', adminController.deleteUser);

// Plate management
router.get('/plates', withCache(300), async (req, res) => {
  try {
    const plates = await adminController.getPlates(req, res);
    if (res.statusCode === 200) {
      const status = req.query.status as string;
      await cacheResponse(CACHE_KEYS.ADMIN_PLATES(status), plates, 300);
    }
  } catch (error) {
    console.error('Error in cached plates route:', error);
    res.status(500).json({ error: 'Failed to get plates' });
  }
});

router.patch('/plates/:plateId', adminController.updatePlateStatus);

// Reports
router.get('/reports', withCache(900), async (req, res) => {
  try {
    const reports = await adminController.getReports(req, res);
    if (res.statusCode === 200) {
      await cacheResponse(CACHE_KEYS.ADMIN_REPORTS(), reports, 900);
    }
  } catch (error) {
    console.error('Error in cached reports route:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

export default router; 