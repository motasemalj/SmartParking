import { redisClient } from '../index';

// Cache configuration
// Removed unused CACHE_TTL

// Cache keys
export const CACHE_KEYS = {
  USER_PLATES: (userId: string) => `user:${userId}:plates`,
  USER_HISTORY: (userId: string, page: number = 1, limit: number = 20) => 
    `user:${userId}:history:${page}:${limit}`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  ADMIN_STATS: () => 'admin:stats',
  ADMIN_USERS: () => 'admin:users',
  ADMIN_PLATES: (status?: string) => `admin:plates${status ? `:${status}` : ''}`,
  ADMIN_REPORTS: () => 'admin:reports',
  SECURITY_PLATES: (status?: string) => `security:plates${status ? `:${status}` : ''}`,
  SECURITY_HISTORY: () => 'security:history',
  SECURITY_TEMPORARY_ACCESS: () => 'security:temporary-access',
  SECURITY_USERS: () => 'security:users',
};

// Cache utility functions
export const cacheUtils = {
  // Get data from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Set data in cache
  async set(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  // Delete cache key
  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  },

  // Delete multiple cache keys by pattern
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  },

  // Invalidate all user-related cache
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      await Promise.all([
        this.delPattern(`user:${userId}:plates*`),
        this.delPattern(`user:${userId}:history*`),
        this.del(CACHE_KEYS.USER_PROFILE(userId)),
      ]);
    } catch (error) {
      console.error('Cache invalidate user error:', error);
    }
  },

  // Invalidate all admin-related cache
  async invalidateAdminCache(): Promise<void> {
    try {
      await Promise.all([
        this.del(CACHE_KEYS.ADMIN_STATS()),
        this.del(CACHE_KEYS.ADMIN_USERS()),
        this.delPattern('admin:plates*'),
        this.del(CACHE_KEYS.ADMIN_REPORTS()),
      ]);
    } catch (error) {
      console.error('Cache invalidate admin error:', error);
    }
  },

  // Invalidate all security-related cache
  async invalidateSecurityCache(): Promise<void> {
    try {
      await Promise.all([
        this.delPattern('security:plates*'),
        this.del(CACHE_KEYS.SECURITY_HISTORY()),
        this.del(CACHE_KEYS.SECURITY_TEMPORARY_ACCESS()),
        this.del(CACHE_KEYS.SECURITY_USERS()),
      ]);
    } catch (error) {
      console.error('Cache invalidate security error:', error);
    }
  },

  // Invalidate all plate-related cache (when plates are modified)
  async invalidatePlateCache(): Promise<void> {
    try {
      await Promise.all([
        this.delPattern('user:*:plates*'),
        this.delPattern('admin:plates*'),
        this.delPattern('security:plates*'),
      ]);
    } catch (error) {
      console.error('Cache invalidate plate error:', error);
    }
  },

  // Check if cache key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  // Get TTL for cache key
  async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  },

  // Get cache status and statistics
  async getStatus(): Promise<any> {
    try {
      const info = await redisClient.info();
      const keys = await redisClient.keys('*');
      
      return {
        connected: true,
        totalKeys: keys.length,
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Cache status error:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  },
};

// Cache middleware for API responses
export const withCache = (_ttl: number) => {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    if (!userId) {
      return next();
    }

    // Generate cache key based on endpoint and user
    let cacheKey = '';
    if (req.path === '/api/plates') {
      cacheKey = CACHE_KEYS.USER_PLATES(userId);
    } else if (req.path === '/api/plates/history') {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      cacheKey = CACHE_KEYS.USER_HISTORY(userId, page, limit);
    } else if (req.path === '/api/admin/stats') {
      cacheKey = CACHE_KEYS.ADMIN_STATS();
    } else if (req.path === '/api/admin/users') {
      cacheKey = CACHE_KEYS.ADMIN_USERS();
    } else if (req.path === '/api/admin/plates') {
      const status = req.query.status as string;
      cacheKey = CACHE_KEYS.ADMIN_PLATES(status);
    } else if (req.path === '/api/admin/reports') {
      cacheKey = CACHE_KEYS.ADMIN_REPORTS();
    } else if (req.path === '/api/security/plates') {
      const status = req.query.status as string;
      cacheKey = CACHE_KEYS.SECURITY_PLATES(status);
    } else if (req.path === '/api/security/history') {
      cacheKey = CACHE_KEYS.SECURITY_HISTORY();
    } else if (req.path === '/api/security/temporary-access') {
      cacheKey = CACHE_KEYS.SECURITY_TEMPORARY_ACCESS();
    } else if (req.path === '/api/security/users') {
      cacheKey = CACHE_KEYS.SECURITY_USERS();
    }

    if (!cacheKey) {
      return next();
    }

    try {
      // Try to get from cache first
      const cachedData = await cacheUtils.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for ${cacheKey}`);
        return res.json(cachedData);
      }

      // If not in cache, proceed with original handler
      console.log(`Cache miss for ${cacheKey}`);
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Function to cache API response
export const cacheResponse = async (key: string, data: any, ttl: number): Promise<void> => {
  await cacheUtils.set(key, data, ttl);
}; 