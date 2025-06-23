import { Request, Response } from 'express';
import { prisma } from '../index';
import { cacheUtils } from '../utils/cache';
import { deleteFileFromS3, extractKeyFromUrl } from '../utils/s3';

interface UserStats {
  userType: string;
  _count: number;
}

interface PlateStats {
  status: string;
  _count: number;
}

interface DailyEntry {
  timestamp: Date;
  _count: number;
}

interface DailyActivity {
  timestamp: Date;
  _count: number;
}

interface DailyTemporaryAccess {
  createdAt: Date;
  _count: number;
}

interface DailyTotals {
  [key: string]: {
    entries: number;
    activities: number;
    temporaryAccess: number;
  };
}

// Get system statistics
export const getStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      pendingPlates,
      totalEntries,
      rejectedPlates,
      userStats,
      plateStats
    ] = await Promise.all([
      prisma.user.count(),
      prisma.plate.count({ where: { status: 'PENDING' } }),
      prisma.entry.count(),
      prisma.plate.count({ where: { status: 'REJECTED' } }),
      prisma.user.groupBy({
        by: ['userType'],
        _count: true
      }),
      prisma.plate.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    return res.json({
      totalUsers,
      pendingPlates,
      totalEntries,
      rejectedPlates,
      userStats: {
        total: totalUsers,
        residents: userStats.find((s: UserStats) => s.userType === 'RESIDENT')?._count || 0,
        security: userStats.find((s: UserStats) => s.userType === 'SECURITY')?._count || 0,
        admins: userStats.find((s: UserStats) => s.userType === 'ADMIN')?._count || 0
      },
      plateStats: {
        total: plateStats.reduce((acc: number, curr: PlateStats) => acc + curr._count, 0),
        approved: plateStats.find((s: PlateStats) => s.status === 'APPROVED')?._count || 0,
        pending: plateStats.find((s: PlateStats) => s.status === 'PENDING')?._count || 0,
        rejected: plateStats.find((s: PlateStats) => s.status === 'REJECTED')?._count || 0
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
};

// Get all users
export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        homeNumber: true,
        userType: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({ error: 'Failed to get users' });
  }
};

// Update user type
export const updateUserType = async (_req: Request, res: Response) => {
  try {
    const { userId } = _req.params;
    const { userType } = _req.body;

    // Prevent setting users as ADMIN - admins can only change between RESIDENT and SECURITY
    if (userType === 'ADMIN') {
      return res.status(403).json({ error: 'Admins cannot set other users as admins' });
    }

    if (!['RESIDENT', 'SECURITY'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type. Can only set as RESIDENT or SECURITY' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { userType },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        homeNumber: true,
        userType: true,
        createdAt: true
      }
    });

    // Invalidate admin cache since user data changed
    await cacheUtils.invalidateAdminCache();

    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user type:', error);
    return res.status(500).json({ error: 'Failed to update user type' });
  }
};

// Get all plates
export const getPlates = async (_req: Request, res: Response) => {
  try {
    const { status } = _req.query;

    const plates = await prisma.plate.findMany({
      where: {
        ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            homeNumber: true
          }
        },
        documents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the response to include proxy URLs instead of S3 URLs
    const transformedPlates = plates.map(plate => ({
      ...plate,
      documents: plate.documents.map((doc: any) => ({
        ...doc,
        url: `/api/files/${doc.id}` // Use proxy endpoint instead of S3 URL
      }))
    }));

    return res.json(transformedPlates);
  } catch (error) {
    console.error('Error getting plates:', error);
    return res.status(500).json({ error: 'Failed to get plates' });
  }
};

// Update plate status
export const updatePlateStatus = async (_req: Request, res: Response) => {
  try {
    const { plateId } = _req.params;
    const { status } = _req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const plate = await prisma.plate.update({
      where: { id: plateId },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            homeNumber: true
          }
        },
        documents: true
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: plate.userId,
        message: `Your plate ${plate.plateCode} ${plate.plateNumber} has been ${status.toLowerCase()}`
      }
    });

    // Invalidate plate-related cache since plate status changed
    await cacheUtils.invalidatePlateCache();

    return res.json(plate);
  } catch (error) {
    console.error('Error updating plate status:', error);
    return res.status(500).json({ error: 'Failed to update plate status' });
  }
};

// Get reports data
export const getReports = async (_req: Request, res: Response) => {
  try {
    // Get daily entries for the last 30 days instead of 7 to get more data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log('Fetching reports data from:', thirtyDaysAgo.toISOString());

    const [
      dailyEntries, 
      dailyActivities, 
      dailyTemporaryAccess, 
      recentActivity,
      recentEntries,
      totalUsers,
      totalEntries,
      rejectedPlates,
      userStats,
      plateStats
    ] = await Promise.all([
      // Get daily entries
      prisma.entry.groupBy({
        by: ['timestamp'],
        _count: true,
        where: {
          timestamp: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      }),
      // Get daily activities
      prisma.activity.groupBy({
        by: ['timestamp'],
        _count: true,
        where: {
          timestamp: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      }),
      // Get daily temporary access
      prisma.temporaryAccess.groupBy({
        by: ['createdAt'],
        _count: true,
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),
      // Get recent activity
      prisma.activity.findMany({
        take: 50,
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          plate: {
            select: {
              plateCode: true,
              plateNumber: true
            }
          },
          user: {
            select: {
              name: true
            }
          }
        }
      }),
      // Get recent entries as fallback for activity
      prisma.entry.findMany({
        take: 20,
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          plate: {
            select: {
              plateCode: true,
              plateNumber: true
            }
          },
          user: {
            select: {
              name: true
            }
          }
        }
      }),
      // Get total users
      prisma.user.count(),
      // Get total entries
      prisma.entry.count(),
      // Get rejected plates
      prisma.plate.count({ where: { status: 'REJECTED' } }),
      // Get user stats
      prisma.user.groupBy({
        by: ['userType'],
        _count: true
      }),
      // Get plate stats
      prisma.plate.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    console.log('Backend data counts:');
    console.log('Daily entries:', dailyEntries.length);
    console.log('Daily activities:', dailyActivities.length);
    console.log('Daily temporary access:', dailyTemporaryAccess.length);
    console.log('Recent activity:', recentActivity.length);
    console.log('Recent entries:', recentEntries.length);

    // Format daily entries
    const formattedEntries = dailyEntries.map((entry: DailyEntry) => ({
      date: entry.timestamp.toISOString().split('T')[0],
      count: entry._count
    }));

    // Format daily activities
    const formattedActivities = dailyActivities.map((activity: DailyActivity) => ({
      date: activity.timestamp.toISOString().split('T')[0],
      count: activity._count
    }));

    // Format daily temporary access
    const formattedTemporaryAccess = dailyTemporaryAccess.map((access: DailyTemporaryAccess) => ({
      date: access.createdAt.toISOString().split('T')[0],
      count: access._count
    }));

    // Calculate daily totals
    const dailyTotals: DailyTotals = {};
    
    // Initialize all dates in the last 30 days with 0 counts
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyTotals[dateStr] = {
        entries: 0,
        activities: 0,
        temporaryAccess: 0
      };
    }
    
    // Fill in actual data
    formattedEntries.forEach(item => {
      if (dailyTotals[item.date]) {
        dailyTotals[item.date].entries = item.count;
      }
    });
    
    formattedActivities.forEach(item => {
      if (dailyTotals[item.date]) {
        dailyTotals[item.date].activities = item.count;
      }
    });
    
    formattedTemporaryAccess.forEach(item => {
      if (dailyTotals[item.date]) {
        dailyTotals[item.date].temporaryAccess = item.count;
      }
    });

    // Combine recent activity and entries, prioritizing activities
    const combinedRecentActivity = [
      ...recentActivity.map((activity: any) => ({
        id: activity.id,
        type: activity.type,
        timestamp: activity.timestamp,
        plateNumber: `${activity.plate?.plateCode || ''} ${activity.plate?.plateNumber || ''}`.trim()
      })),
      ...recentEntries.map((entry: any) => ({
        id: entry.id,
        type: 'ENTRY',
        timestamp: entry.timestamp,
        plateNumber: `${entry.plate?.plateCode || ''} ${entry.plate?.plateNumber || ''}`.trim()
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);

    const response = {
      userStats: {
        total: totalUsers,
        residents: userStats.find((s: UserStats) => s.userType === 'RESIDENT')?._count || 0,
        security: userStats.find((s: UserStats) => s.userType === 'SECURITY')?._count || 0,
        admins: userStats.find((s: UserStats) => s.userType === 'ADMIN')?._count || 0
      },
      plateStats: {
        total: plateStats.reduce((acc: number, curr: PlateStats) => acc + curr._count, 0),
        approved: plateStats.find((s: PlateStats) => s.status === 'APPROVED')?._count || 0,
        pending: plateStats.find((s: PlateStats) => s.status === 'PENDING')?._count || 0,
        rejected: plateStats.find((s: PlateStats) => s.status === 'REJECTED')?._count || 0
      },
      totalEntries,
      rejectedPlates,
      dailyTotals: Object.entries(dailyTotals).map(([date, totals]) => ({
        date,
        ...totals
      })),
      recentActivity: combinedRecentActivity
    };

    console.log('Final response daily totals:', response.dailyTotals.length);
    console.log('Final response recent activity:', response.recentActivity.length);

    return res.json(response);
  } catch (error) {
    console.error('Error getting reports:', error);
    return res.status(500).json({ error: 'Failed to get reports' });
  }
};

// Create new user
export const createUser = async (_req: Request, res: Response) => {
  try {
    const { name, phoneNumber, homeNumber, userType } = _req.body;

    // Validate required fields
    if (!name || !phoneNumber || !homeNumber || !userType) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate user type
    if (!['RESIDENT', 'SECURITY', 'ADMIN'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Check if phone number already exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name,
        phoneNumber,
        homeNumber,
        userType
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        homeNumber: true,
        userType: true,
        createdAt: true
      }
    });

    // Invalidate admin cache since user data changed
    await cacheUtils.invalidateAdminCache();

    return res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

// Delete user
export const deleteUser = async (_req: Request, res: Response) => {
  try {
    const { userId } = _req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plates: {
          include: {
            documents: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of the last admin
    if (user.userType === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { userType: 'ADMIN' }
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Delete associated documents from S3 first
    for (const plate of user.plates) {
      for (const doc of plate.documents) {
        try {
          const key = extractKeyFromUrl(doc.url);
          if (key) {
            await deleteFileFromS3(key);
          }
        } catch (error) {
          console.error('Error deleting file from S3:', error);
          // Continue with deletion even if file deletion fails
        }
      }
    }

    // Delete all associated data in the correct order
    // 1. Delete documents first
    for (const plate of user.plates) {
      if (plate.documents.length > 0) {
        await prisma.document.deleteMany({
          where: { plateId: plate.id }
        });
      }
    }

    // 2. Delete entries associated with user's plates
    for (const plate of user.plates) {
      await prisma.entry.deleteMany({
        where: { plateId: plate.id }
      });
    }

    // 3. Delete temporary access records associated with user's plates
    await prisma.temporaryAccess.deleteMany({
      where: { createdById: userId }
    });

    // 4. Delete activities associated with user's plates
    for (const plate of user.plates) {
      await prisma.activity.deleteMany({
        where: { plateId: plate.id }
      });
    }

    // 5. Delete user's activities
    await prisma.activity.deleteMany({
      where: { userId: userId }
    });

    // 6. Delete user's notifications
    await prisma.notification.deleteMany({
      where: { userId: userId }
    });

    // 7. Delete user's entries
    await prisma.entry.deleteMany({
      where: { userId: userId }
    });

    // 8. Delete plates
    await prisma.plate.deleteMany({
      where: { userId: userId }
    });

    // 9. Finally delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    // Invalidate admin cache since user data changed
    await cacheUtils.invalidateAdminCache();

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}; 