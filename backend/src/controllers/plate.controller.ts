import { Request, Response } from 'express';
import { prisma } from '../index';
import { PlateCreateInput } from '../types';
import path from 'path';
import fs from 'fs';
import { uploadFileToS3, extractKeyFromUrl, deleteFileFromS3 } from '../utils/s3';
import { cacheUtils } from '../utils/cache';

export const addPlate = async (req: Request, res: Response) => {
  try {
    console.log('addPlate - Starting plate creation...');
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plateCode, plateNumber, country, emirate, type } = req.body as PlateCreateInput & { emirate?: string };
    const files = req.files as Express.Multer.File[];
    
    console.log('Request body:', { plateCode, plateNumber, country, emirate, type });
    console.log('Files:', files ? files.map(f => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      buffer: f.buffer ? 'Buffer present' : 'No buffer'
    })) : 'No files');

    // Check if user has reached their plate limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plates: {
          where: {
            type: 'PERSONAL'
          }
        }
      }
    });

    const systemConfig = await prisma.systemConfig.findFirst();
    const maxPlates = systemConfig?.maxPersonalPlates || 2;

    if (type === 'PERSONAL' && (user?.plates?.length ?? 0) >= maxPlates) {
      return res.status(400).json({
        error: `Maximum number of personal plates (${maxPlates}) reached`
      });
    }

    // Build match criteria
    const matchWhere = {
      plateCode,
      plateNumber,
      country,
      emirate: emirate || null,
    } as const;

    // Check duplicate in same user (ignore expired guest)
    const existingSameUser = await prisma.plate.findFirst({
      where: {
        ...matchWhere,
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

    if (existingSameUser) {
      return res.status(400).json({ error: 'This plate already exists in your account.' });
    }

    // No global uniqueness requirement; resident duplicates across users allowed.

    // -------- Duplicate validation completed above --------

    // Upload documents only after validation passes.
    let documentUrls: string[] = [];
    if (type === 'PERSONAL') {
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Mulkeya document is required for resident plates.' });
      }

      for (const file of files) {
        try {
          const s3Url = await uploadFileToS3(file.buffer, file.originalname, file.mimetype);
          documentUrls.push(s3Url);
        } catch (error) {
          console.error('Error uploading file to S3:', error);
          return res.status(500).json({ error: 'Failed to upload document' });
        }
      }
    } else if (files && files.length > 0) {
      // For guest plates, upload any provided docs but they're optional
      for (const file of files) {
        try {
          const s3Url = await uploadFileToS3(file.buffer, file.originalname, file.mimetype);
          documentUrls.push(s3Url);
        } catch (error) {
          console.error('Error uploading file to S3:', error);
        }
      }
    }

    console.log('Creating plate in database...');
    let plate;
    try {
      // If guest plate already exists but is EXPIRED, revive it instead of creating new (allows re-adding)
      if (type === 'GUEST') {
        const expiredDuplicate = await prisma.plate.findFirst({
          where: {
            ...matchWhere,
            userId,
            status: 'EXPIRED',
            type: 'GUEST',
          },
        });

        if (expiredDuplicate) {
          console.log('Reviving expired guest plate:', expiredDuplicate.id);

          // If there are new documents, attach them; otherwise keep existing docs
          if (documentUrls.length > 0) {
            await prisma.document.createMany({
              data: documentUrls.map(url => ({
                type: 'MULKEYA',
                url,
                plateId: expiredDuplicate.id,
              })),
            });
          }

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

          const transformed = {
            ...revived,
            documents: revived.documents.map(d => ({ ...d, url: `/api/files/${d.id}` })),
          };

          return res.json(transformed);
        }
      }

      plate = await prisma.plate.create({
        data: {
          plateCode,
          plateNumber,
          country,
          emirate,
          type,
          userId,
          ...(documentUrls.length > 0 && {
            documents: {
              create: documentUrls.map(url => ({
                type: 'MULKEYA',
                url: url
              }))
            }
          })
        },
        include: {
          documents: true
        }
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(400).json({ error: 'A plate with the same details already exists.' });
      }
      throw err;
    }

    // Transform the response to include proxy URLs instead of S3 URLs
    const transformedPlate = {
      ...plate,
      documents: plate.documents.map(doc => ({
        ...doc,
        url: `/api/files/${doc.id}` // Use proxy endpoint instead of S3 URL
      }))
    };

    console.log('Plate created successfully:', plate.id);
    
    // Invalidate user cache after adding a new plate
    await cacheUtils.invalidateUserCache(userId);
    
    return res.json(transformedPlate);
  } catch (error) {
    console.error('Error adding plate:', error);
    return res.status(500).json({ error: 'Failed to add plate' });
  }
};

export const getPlates = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const plates = await prisma.plate.findMany({
      where: { userId },
      include: {
        documents: true,
        approvedBy: true
      },
      orderBy: {
        createdAt: 'desc', // Newest plates first
      },
    });

    // Transform the response to include proxy URLs instead of S3 URLs
    const transformedPlates = plates.map(plate => ({
      ...plate,
      documents: plate.documents.map(doc => ({
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

export const removePlate = async (req: Request, res: Response) => {
  try {
    console.log('removePlate - Starting plate removal...');
    
    const userId = req.user?.id;
    const { plateId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Removing plate:', plateId, 'for user:', userId);

    // Verify plate belongs to user
    const plate = await prisma.plate.findFirst({
      where: {
        id: plateId,
        userId
      },
      include: {
        documents: true
      }
    });

    if (!plate) {
      console.log('Plate not found or user not authorized');
      return res.status(404).json({ error: 'Plate not found' });
    }

    console.log('Plate found, documents count:', plate.documents.length);

    // Delete associated files from S3 first
    for (const doc of plate.documents) {
      try {
        console.log('Deleting document from S3:', doc.id);
        const key = extractKeyFromUrl(doc.url);
        await deleteFileFromS3(key);
        console.log('Document deleted from S3 successfully');
      } catch (error) {
        console.error('Error deleting file from S3:', error);
        // Continue with deletion even if file deletion fails
      }
    }

    // Delete documents from database first
    if (plate.documents.length > 0) {
      console.log('Deleting documents from database...');
      await prisma.document.deleteMany({
        where: {
          plateId: plateId
        }
      });
      console.log('Documents deleted from database');
    }

    // Now delete the plate
    console.log('Deleting plate from database...');
    await prisma.plate.delete({
      where: { id: plateId }
    });

    // Invalidate user cache after removing a plate
    await cacheUtils.invalidateUserCache(userId);

    console.log('Plate removed successfully');
    return res.json({ message: 'Plate removed successfully' });
  } catch (error) {
    console.error('Error removing plate:', error);
    return res.status(500).json({ error: 'Failed to remove plate' });
  }
};

export const approvePlate = async (req: Request, res: Response) => {
  try {
    const { plateId } = req.params;
    const { securityId } = req.body;

    if (!securityId) {
      return res.status(400).json({ error: 'Security ID is required' });
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

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: plate.userId,
        message: `Your plate ${plate.plateCode} ${plate.plateNumber} has been approved${existingPlate.type === 'GUEST' ? ' and will expire in 24 hours' : ''}`
      }
    });

    return res.json(plate);
  } catch (error) {
    console.error('Error approving plate:', error);
    return res.status(500).json({ error: 'Failed to approve plate' });
  }
};

export const rejectPlate = async (req: Request, res: Response) => {
  try {
    const { plateId } = req.params;
    const { securityId } = req.body;

    if (!securityId) {
      return res.status(400).json({ error: 'Security ID is required' });
    }

    const plate = await prisma.plate.update({
      where: { id: plateId },
      data: {
        status: 'REJECTED'
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: plate.userId,
        message: `Your plate ${plate.plateCode} ${plate.plateNumber} has been rejected`
      }
    });

    return res.json(plate);
  } catch (error) {
    console.error('Error rejecting plate:', error);
    return res.status(500).json({ error: 'Failed to reject plate' });
  }
};

export const checkExpiredPlates = async (req: Request, res: Response) => {
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
    return res.json({ 
      message: `Updated ${result.count} expired guest plates`,
      updatedCount: result.count 
    });
  } catch (error) {
    console.error('Error checking expired plates:', error);
    return res.status(500).json({ error: 'Failed to check expired plates' });
  }
}; 