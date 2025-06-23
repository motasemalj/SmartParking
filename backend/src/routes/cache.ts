import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { cacheUtils, CACHE_KEYS } from '../utils/cache';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get cache status for all cache types
router.get('/status', async (req, res) => {
  try {
    const cacheStatus = await cacheUtils.getStatus();
    res.json(cacheStatus);
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

// Get cache status for user cache
router.get('/status/user', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userCacheKeys = [
      CACHE_KEYS.USER_PLATES(userId),
      CACHE_KEYS.USER_HISTORY(userId, 1, 20),
      CACHE_KEYS.USER_PROFILE(userId)
    ];

    const userCacheStatus = await Promise.all(
      userCacheKeys.map(async (key) => {
        const exists = await cacheUtils.exists(key);
        const ttl = exists ? await cacheUtils.ttl(key) : -1;
        return { key, exists, ttl };
      })
    );

    res.json({
      userId,
      cacheStatus: userCacheStatus
    });
  } catch (error) {
    console.error('Error getting user cache status:', error);
    res.status(500).json({ error: 'Failed to get user cache status' });
  }
});

// Get cache status for admin cache
router.get('/status/admin', async (req, res) => {
  try {
    const adminCacheKeys = [
      CACHE_KEYS.ADMIN_STATS(),
      CACHE_KEYS.ADMIN_USERS(),
      CACHE_KEYS.ADMIN_PLATES(),
      CACHE_KEYS.ADMIN_PLATES('PENDING'),
      CACHE_KEYS.ADMIN_PLATES('APPROVED'),
      CACHE_KEYS.ADMIN_PLATES('REJECTED'),
      CACHE_KEYS.ADMIN_REPORTS()
    ];

    const adminCacheStatus = await Promise.all(
      adminCacheKeys.map(async (key) => {
        const exists = await cacheUtils.exists(key);
        const ttl = exists ? await cacheUtils.ttl(key) : -1;
        return { key, exists, ttl };
      })
    );

    res.json({
      cacheStatus: adminCacheStatus
    });
  } catch (error) {
    console.error('Error getting admin cache status:', error);
    res.status(500).json({ error: 'Failed to get admin cache status' });
  }
});

// Get cache status for security cache
router.get('/status/security', async (req, res) => {
  try {
    const securityCacheKeys = [
      CACHE_KEYS.SECURITY_PLATES(),
      CACHE_KEYS.SECURITY_PLATES('PENDING'),
      CACHE_KEYS.SECURITY_PLATES('APPROVED'),
      CACHE_KEYS.SECURITY_PLATES('REJECTED'),
      CACHE_KEYS.SECURITY_HISTORY(),
      CACHE_KEYS.SECURITY_TEMPORARY_ACCESS(),
      CACHE_KEYS.SECURITY_USERS()
    ];

    const securityCacheStatus = await Promise.all(
      securityCacheKeys.map(async (key) => {
        const exists = await cacheUtils.exists(key);
        const ttl = exists ? await cacheUtils.ttl(key) : -1;
        return { key, exists, ttl };
      })
    );

    res.json({
      cacheStatus: securityCacheStatus
    });
  } catch (error) {
    console.error('Error getting security cache status:', error);
    res.status(500).json({ error: 'Failed to get security cache status' });
  }
});

export default router; 