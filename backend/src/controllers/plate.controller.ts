import { Request, Response } from 'express';
import { prisma } from '../index';
import { PlateCreateInput } from '../types';
import path from 'path';
import fs from 'fs';

export const addPlate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plateCode, plateNumber, country, type } = req.body as PlateCreateInput;
    const file = req.file;

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

    // Save document locally if provided
    let documentUrl = '';
    if (file) {
      const uploadsDir = path.join(__dirname, '../../uploads');
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(uploadsDir, fileName);

      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save file
      fs.writeFileSync(filePath, file.buffer);
      documentUrl = `/uploads/${fileName}`;
    }

    // Create plate
    const plate = await prisma.plate.create({
      data: {
        plateCode,
        plateNumber,
        country,
        type,
        userId,
        ...(documentUrl && {
          documents: {
            create: {
              type: 'MULKEYA',
              url: documentUrl
            }
          }
        })
      }
    });

    return res.json(plate);
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
        documents: true
      }
    });

    return res.json(plates);
  } catch (error) {
    console.error('Error getting plates:', error);
    return res.status(500).json({ error: 'Failed to get plates' });
  }
};

export const removePlate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { plateId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
      return res.status(404).json({ error: 'Plate not found' });
    }

    // Delete associated files
    for (const doc of plate.documents) {
      const filePath = path.join(__dirname, '../../', doc.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete plate and associated documents
    await prisma.plate.delete({
      where: { id: plateId }
    });

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

    const plate = await prisma.plate.update({
      where: { id: plateId },
      data: {
        status: 'APPROVED'
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: plate.userId,
        message: `Your plate ${plate.plateCode} ${plate.plateNumber} has been approved`
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