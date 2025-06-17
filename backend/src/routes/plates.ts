import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Get all plates for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const plates = await prisma.plate.findMany({
      where: { userId },
      include: {
        documents: true,
      },
    });
    res.json(plates);
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
    const { plateCode, plateNumber, country, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Document is required' });
    }

    const plate = await prisma.plate.create({
      data: {
        plateCode,
        plateNumber,
        country,
        type,
        status: 'PENDING',
        userId,
        documents: {
          create: {
            type: 'REGISTRATION',
            url: req.file.path,
          },
        },
      },
      include: {
        documents: true,
      },
    });

    res.status(201).json(plate);
  } catch (error) {
    console.error('Error creating plate:', error);
    res.status(500).json({ error: 'Failed to create plate' });
  }
});

// Delete a plate
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Verify the plate belongs to the user
    const plate = await prisma.plate.findFirst({
      where: { id, userId },
    });

    if (!plate) {
      return res.status(404).json({ error: 'Plate not found' });
    }

    await prisma.plate.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting plate:', error);
    res.status(500).json({ error: 'Failed to delete plate' });
  }
});

// Get plate history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const history = await prisma.entry.findMany({
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
    });
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router; 