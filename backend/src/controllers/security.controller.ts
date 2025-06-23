import { Request, Response } from 'express';
import { prisma } from '../index';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { cacheUtils } from '../utils/cache';

const getSecurityUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.security.findMany({
      select: {
        id: true,
        name: true
      }
    });

    return res.json(users);
  } catch (error) {
    console.error('Error getting security users:', error);
    return res.status(500).json({ error: 'Failed to get security users' });
  }
};

const getPlates = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is security personnel
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.userType !== 'SECURITY') {
      return res.status(403).json({ error: 'Security access required' });
    }

    // Check and update expired guest plates before fetching
    await updateExpiredGuestPlates();

    // Get plates with user information
    const plates = await prisma.plate.findMany({
      where: {
        ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' })
      },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
            homeNumber: true
          }
        },
        documents: true
      },
      orderBy: {
        updatedAt: 'desc'
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

const getPlateHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is security personnel
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.userType !== 'SECURITY') {
      return res.status(403).json({ error: 'Security access required' });
    }

    // Get plate history (entries and exits)
    const history = await prisma.entry.findMany({
      include: {
        plate: {
          include: {
            user: {
              select: {
                name: true,
                phoneNumber: true,
                homeNumber: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100 // Limit to last 100 entries
    });

    return res.json(history);
  } catch (error) {
    console.error('Error getting plate history:', error);
    return res.status(500).json({ error: 'Failed to get plate history' });
  }
};

const approvePlate = async (req: Request, res: Response) => {
  try {
    const { plateId } = req.params;
    const { securityId } = req.body;

    if (!securityId) {
      return res.status(400).json({ error: 'Security ID is required' });
    }

    // Verify security user exists
    const security = await prisma.security.findUnique({
      where: { id: securityId }
    });

    if (!security) {
      return res.status(404).json({ error: 'Security user not found' });
    }

    // Get the plate to check its type
    const existingPlate = await prisma.plate.findUnique({
      where: { id: plateId }
    });

    if (!existingPlate) {
      return res.status(404).json({ error: 'Plate not found' });
    }

    // Calculate expiration time for guest plates (24 hours from now)
    const expiresAt = existingPlate.type === 'GUEST' 
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      : null;

    const plate = await prisma.plate.update({
      where: { id: plateId },
      data: {
        status: 'APPROVED',
        approvedById: securityId,
        ...(expiresAt && { expiresAt })
      }
    });

    // If it's a guest plate, automatically create temporary access
    if (existingPlate.type === 'GUEST') {
      await prisma.temporaryAccess.create({
        data: {
          plateCode: existingPlate.plateCode,
          plateNumber: existingPlate.plateNumber,
          country: existingPlate.country,
          emirate: existingPlate.emirate,
          purpose: 'Guest access - approved by security',
          expiresAt: expiresAt!,
          status: 'ACTIVE',
          createdById: req.user!.id
        }
      });
    }

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: plate.userId,
        message: `Your plate ${plate.plateCode} ${plate.plateNumber} has been approved${existingPlate.type === 'GUEST' ? ' and will expire in 24 hours' : ''}`
      }
    });

    // Invalidate user cache after plate approval
    await cacheUtils.invalidateUserCache(plate.userId);

    return res.json(plate);
  } catch (error) {
    console.error('Error approving plate:', error);
    return res.status(500).json({ error: 'Failed to approve plate' });
  }
};

const rejectPlate = async (req: Request, res: Response) => {
  try {
    const { plateId } = req.params;
    const { securityId } = req.body;

    if (!securityId) {
      return res.status(400).json({ error: 'Security ID is required' });
    }

    // Verify security user exists
    const security = await prisma.security.findUnique({
      where: { id: securityId }
    });

    if (!security) {
      return res.status(404).json({ error: 'Security user not found' });
    }

    const plate = await prisma.plate.update({
      where: { id: plateId },
      data: {
        status: 'REJECTED',
        approvedById: securityId
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: plate.userId,
        message: `Your plate ${plate.plateCode} ${plate.plateNumber} has been rejected`
      }
    });

    // Invalidate user cache after plate rejection
    await cacheUtils.invalidateUserCache(plate.userId);

    return res.json(plate);
  } catch (error) {
    console.error('Error rejecting plate:', error);
    return res.status(500).json({ error: 'Failed to reject plate' });
  }
};

const updateExpiredAccess = async () => {
  try {
    console.log('Checking for expired temporary access records...');
    const result = await prisma.temporaryAccess.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: new Date() // Less than current time
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });
    console.log(`Updated ${result.count} expired temporary access records`);
  } catch (error) {
    console.error('Error updating expired access:', error);
  }
};

const updateExpiredGuestPlates = async () => {
  try {
    console.log('Checking for expired guest plates...');
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
    console.log(`Updated ${result.count} expired guest plates`);
  } catch (error) {
    console.error('Error updating expired guest plates:', error);
  }
};

const getTemporaryAccess = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update expired records before fetching
    await updateExpiredAccess();

    // Get all temporary access records
    const temporaryAccess = await prisma.temporaryAccess.findMany({
      where: {
        OR: [
          { status: 'ACTIVE' },
          {
            status: 'EXPIRED',
            expiresAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        ]
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json(temporaryAccess);
  } catch (error) {
    console.error('Error getting temporary access:', error);
    return res.status(500).json({ error: 'Failed to get temporary access records' });
  }
};

const createTemporaryAccess = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { plateCode, plateNumber, country, emirate, purpose, expiresAt } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!plateCode || !plateNumber || !country || !purpose || !expiresAt) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Verify user is security personnel
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.userType !== 'SECURITY') {
      return res.status(403).json({ error: 'Security access required' });
    }

    // Create both temporary access record and plate entry (upsert to avoid duplicates)
    const [temporaryAccess, _plate] = await prisma.$transaction([
      prisma.temporaryAccess.create({
        data: {
          plateCode,
          plateNumber,
          country,
          emirate,
          purpose,
          expiresAt: new Date(expiresAt),
          status: 'ACTIVE',
          createdById: userId
        },
        include: {
          createdBy: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.plate.upsert({
        where: {
          plateCode_plateNumber_country_type: {
            plateCode,
            plateNumber,
            country,
            type: 'GUEST'
          }
        },
        update: {
          status: 'APPROVED',
          expiresAt: new Date(expiresAt),
          userId: userId,
          approvedById: null,
          emirate
        },
        create: {
          plateCode,
          plateNumber,
          country,
          emirate,
          type: 'GUEST',
          status: 'APPROVED',
          expiresAt: new Date(expiresAt),
          userId: userId,
          approvedById: null
        }
      })
    ]);

    // Invalidate user cache after temporary access creation
    await cacheUtils.invalidateUserCache(userId);

    return res.json(temporaryAccess);
  } catch (error) {
    console.error('Error creating temporary access:', error);
    return res.status(500).json({ error: 'Failed to create temporary access record' });
  }
};

const generateReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is security personnel
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.userType !== 'SECURITY') {
      return res.status(403).json({ error: 'Security access required' });
    }

    // Parse dates
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get data for the report
    const [entries, temporaryAccess] = await Promise.all([
      // Get entries
      prisma.entry.findMany({
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        },
        include: {
          plate: {
            include: {
              user: {
                select: {
                  name: true,
                  phoneNumber: true,
                  homeNumber: true
                }
              }
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      }),
      // Get temporary access records
      prisma.temporaryAccess.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        include: {
          createdBy: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Create PDF
    const doc = new PDFDocument();
    const filename = `security-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(20).text('Security Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    doc.text(`Period: ${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}`);
    doc.moveDown();

    // Add entries section
    doc.fontSize(16).text('Vehicle Entries/Exits');
    doc.moveDown();
    entries.forEach(entry => {
      doc.fontSize(12).text(`Time: ${format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}`);
      doc.text(`Type: ${entry.type}`);
      doc.text(`Plate: ${entry.plate.plateCode} ${entry.plate.plateNumber}`);
      doc.text(`User: ${entry.plate.user.name} (${entry.plate.user.homeNumber})`);
      doc.moveDown();
    });

    // Add temporary access section
    doc.fontSize(16).text('Temporary Access Records');
    doc.moveDown();
    temporaryAccess.forEach(access => {
      doc.fontSize(12).text(`Created: ${format(new Date(access.createdAt), 'yyyy-MM-dd HH:mm:ss')}`);
      doc.text(`Plate: ${access.plateCode} ${access.plateNumber}`);
      doc.text(`Country: ${access.country}${access.emirate ? ` (${access.emirate})` : ''}`);
      doc.text(`Purpose: ${access.purpose}`);
      doc.text(`Status: ${access.status}`);
      doc.text(`Expires: ${format(new Date(access.expiresAt), 'yyyy-MM-dd HH:mm:ss')}`);
      doc.text(`Created by: ${access.createdBy.name}`);
      doc.moveDown();
    });

    // Finalize the PDF
    doc.end();
    
    return;
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
};

const forceExpireTemporaryAccess = async (req: Request, res: Response) => {
  try {
    const { accessId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is security personnel
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.userType !== 'SECURITY') {
      return res.status(403).json({ error: 'Security access required' });
    }

    // Get the temporary access record to find the corresponding plate
    const temporaryAccess = await prisma.temporaryAccess.findUnique({
      where: { id: accessId }
    });

    if (!temporaryAccess) {
      return res.status(404).json({ error: 'Temporary access record not found' });
    }

    // Update both temporary access and corresponding plate to expired
    const [updatedTemporaryAccess] = await prisma.$transaction([
      prisma.temporaryAccess.update({
        where: { id: accessId },
        data: {
          status: 'EXPIRED'
        },
        include: {
          createdBy: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.plate.updateMany({
        where: {
          plateCode: temporaryAccess.plateCode,
          plateNumber: temporaryAccess.plateNumber,
          country: temporaryAccess.country,
          type: 'GUEST',
          status: 'APPROVED'
        },
        data: {
          status: 'EXPIRED'
        }
      })
    ]);

    // Invalidate user cache after temporary access force expiration
    await cacheUtils.invalidateUserCache(userId);

    return res.json(updatedTemporaryAccess);
  } catch (error) {
    console.error('Error force expiring temporary access:', error);
    return res.status(500).json({ error: 'Failed to force expire temporary access' });
  }
};

export {
  getSecurityUsers,
  getPlates,
  getPlateHistory,
  approvePlate,
  rejectPlate,
  getTemporaryAccess,
  createTemporaryAccess,
  generateReport,
  forceExpireTemporaryAccess
}; 