import express from 'express';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { uploadFileToS3 } from '../utils/s3';
import { prisma } from '../index';
import { cacheUtils, CACHE_KEYS, withCache, cacheResponse } from '../utils/cache';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// Get all plates for the authenticated user with pagination
router.get('/', authenticateToken, withCache(300), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [plates, totalCount] = await Promise.all([
      prisma.plate.findMany({
        where: { userId },
        include: {
          documents: true,
        },
        orderBy: {
          createdAt: 'desc', // Newest plates first
        },
        skip,
        take: limit,
      }),
      prisma.plate.count({
        where: { userId }
      })
    ]);

    const response = {
      plates,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };

    // Cache the response
    await cacheResponse(CACHE_KEYS.USER_PLATES(userId), response, 300);

    res.json(response);
  } catch (error) {
    console.error('Error fetching plates:', error);
    res.status(500).json({ error: 'Failed to fetch plates' });
  }
});

// Add a new plate
router.post('/', authenticateToken, upload.single('documents'), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const { plateCode, plateNumber, country, emirate, type } = req.body;

    // ---------------------------------------------------------------------
    // Duplicate validation rules
    // 1. No duplicate (same plateCode/plateNumber/country/emirate) is allowed
    //    for the SAME user, regardless of plate type.
    // 2. PERSONAL plates must be globally unique across ALL users.
    //    Guest duplicates across accounts are allowed.
    // ---------------------------------------------------------------------

    // Build a reusable where clause for matching plates
    const plateMatchWhere = {
      plateCode,
      plateNumber,
      country,
      // treat empty string emirate the same as null
      emirate: emirate || null,
    } as const;

    // Check duplicates within current user first (ignore expired guest plates)
    const duplicateForUser = await prisma.plate.findFirst({
      where: {
        ...plateMatchWhere,
        userId,
        ...(type === 'GUEST'
          ? {
              NOT: {
                status: 'EXPIRED',
              },
            }
          : {}),
      },
    });

    if (duplicateForUser) {
      return res.status(400).json({
        error: 'This plate already exists in your account.',
      });
    }

    // If guest plate exists but is EXPIRED, revive instead of creating new
    if (type === 'GUEST') {
      const expiredDuplicate = await prisma.plate.findFirst({
        where: {
          ...plateMatchWhere,
          userId,
          status: 'EXPIRED',
          type: 'GUEST',
        },
      });

      if (expiredDuplicate) {
        // Upload doc first
        const s3Url = await uploadFileToS3(req.file!.buffer, req.file!.originalname, req.file!.mimetype);

        await prisma.document.create({
          data: {
            type: 'REGISTRATION',
            url: s3Url,
            plateId: expiredDuplicate.id,
          },
        });

        const revived = await prisma.plate.update({
          where: { id: expiredDuplicate.id },
          data: {
            status: 'PENDING',
            expiresAt: null,
            updatedAt: new Date(),
          },
          include: {
            documents: true,
          },
        });

        await cacheUtils.invalidateUserCache(userId);

        return res.status(201).json(revived);
      }
    }

    // If the plate is PERSONAL, ensure it is unique within the same user account only.
    // Global duplicates of resident plates across different users are allowed.

    // Upload file only if required (PERSONAL) or provided
    let s3Url: string | null = null;
    if (type === 'PERSONAL') {
      if (!req.file) {
        return res.status(400).json({ error: 'Mulkeya document is required for resident plates.' });
      }
      s3Url = await uploadFileToS3(req.file!.buffer, req.file!.originalname, req.file!.mimetype);
    } else if (req.file) {
      s3Url = await uploadFileToS3(req.file!.buffer, req.file!.originalname, req.file!.mimetype);
    }

    let plate;
    try {
      plate = await prisma.plate.create({
        data: {
          plateCode,
          plateNumber,
          country,
          emirate: emirate || null,
          type,
          status: 'PENDING',
          userId,
          ...(s3Url && {
            documents: {
              create: {
                type: 'REGISTRATION',
                url: s3Url,
              },
            },
          }),
        },
        include: {
          documents: true,
        },
      });
    } catch (err: any) {
      // Handle unique constraint violation (Prisma error code P2002)
      if (err.code === 'P2002') {
        return res.status(400).json({
          error: 'A plate with the same details already exists.',
        });
      }
      console.error('Error creating plate:', err);
      return res.status(500).json({ error: 'Failed to create plate' });
    }

    res.status(201).json(plate);
  } catch (error) {
    console.error('Error creating plate:', error);
    res.status(500).json({ error: 'Failed to create plate' });
  }
});

// Get plate history with pagination
router.get('/history', authenticateToken, withCache(180), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [history, totalCount] = await Promise.all([
      prisma.entry.findMany({
        where: {
          plate: {
            userId,
          },
        },
        include: {
          plate: {
            select: {
              plateCode: true,
              plateNumber: true,
              country: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.entry.count({
        where: {
          plate: {
            userId,
          },
        },
      })
    ]);

    const response = {
      history,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };

    // Cache the response
    await cacheResponse(CACHE_KEYS.USER_HISTORY(userId, page, limit), response, 180);

    res.json(response);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Check and update expired guest plates
router.post('/check-expired', authenticateToken, async (req, res) => {
  try {
    const result = await prisma.plate.updateMany({
      where: {
        type: 'GUEST',
        status: 'APPROVED',
        expiresAt: {
          lt: new Date() // Less than current time
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });
    
    res.json({ 
      message: `Updated ${result.count} expired guest plates`,
      updatedCount: result.count 
    });
  } catch (error) {
    console.error('Error checking expired plates:', error);
    res.status(500).json({ error: 'Failed to check expired plates' });
  }
});

// Cache status endpoint (for monitoring)
router.get('/cache-status', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const platesKey = CACHE_KEYS.USER_PLATES(userId);
    const historyKey = CACHE_KEYS.USER_HISTORY(userId, 1, 20);

    const [platesCached, historyCached] = await Promise.all([
      cacheUtils.get(platesKey),
      cacheUtils.get(historyKey)
    ]);

    res.json({
      cacheStatus: {
        plates: {
          cached: !!platesCached,
          key: platesKey
        },
        history: {
          cached: !!historyCached,
          key: historyKey
        }
      },
      cacheInfo: {
        platesTTL: 300, // 5 minutes
        historyTTL: 180, // 3 minutes
        description: 'Cache automatically invalidates when plates are modified'
      }
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

export default router; 