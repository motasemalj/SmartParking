import { Request, Response } from 'express';
import { prisma } from '../index';

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
export const getStats = async (req: Request, res: Response) => {
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
export const getUsers = async (req: Request, res: Response) => {
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
export const updateUserType = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;

    if (!['RESIDENT', 'SECURITY', 'ADMIN'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
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

    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user type:', error);
    return res.status(500).json({ error: 'Failed to update user type' });
  }
};

// Get all plates
export const getPlates = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const plates = await prisma.plate.findMany({
      where: {
        ...(status && { status: status as string })
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

    return res.json(plates);
  } catch (error) {
    console.error('Error getting plates:', error);
    return res.status(500).json({ error: 'Failed to get plates' });
  }
};

// Update plate status
export const updatePlateStatus = async (req: Request, res: Response) => {
  try {
    const { plateId } = req.params;
    const { status } = req.body;

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

    return res.json(plate);
  } catch (error) {
    console.error('Error updating plate status:', error);
    return res.status(500).json({ error: 'Failed to update plate status' });
  }
};

// Get reports data
export const getReports = async (req: Request, res: Response) => {
  try {
    // Get daily entries for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [dailyEntries, dailyActivities, dailyTemporaryAccess, recentActivity] = await Promise.all([
      // Get daily entries
      prisma.entry.groupBy({
        by: ['timestamp'],
        _count: true,
        where: {
          timestamp: {
            gte: sevenDaysAgo
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
            gte: sevenDaysAgo
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
            gte: sevenDaysAgo
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
      })
    ]);

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
    [...formattedEntries, ...formattedActivities, ...formattedTemporaryAccess].forEach(item => {
      if (!dailyTotals[item.date]) {
        dailyTotals[item.date] = {
          entries: 0,
          activities: 0,
          temporaryAccess: 0
        };
      }
      if (formattedEntries.find(e => e.date === item.date)?.count) {
        dailyTotals[item.date].entries = formattedEntries.find(e => e.date === item.date)?.count || 0;
      }
      if (formattedActivities.find(a => a.date === item.date)?.count) {
        dailyTotals[item.date].activities = formattedActivities.find(a => a.date === item.date)?.count || 0;
      }
      if (formattedTemporaryAccess.find(t => t.date === item.date)?.count) {
        dailyTotals[item.date].temporaryAccess = formattedTemporaryAccess.find(t => t.date === item.date)?.count || 0;
      }
    });

    return res.json({
      dailyTotals: Object.entries(dailyTotals).map(([date, totals]) => ({
        date,
        ...totals
      })),
      recentActivity
    });
  } catch (error) {
    console.error('Error getting reports:', error);
    return res.status(500).json({ error: 'Failed to get reports' });
  }
}; 