import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';
import * as plateController from '../controllers/plate.controller';
import securityRoutes from './security';
import adminRoutes from './admin';
import multer from 'multer';
import { getFileFromS3, extractKeyFromUrl } from '../utils/s3';
import { prisma } from '../index';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Auth routes
router.post('/auth/otp/send', authController.sendOTP);
router.post('/auth/otp/verify', authController.verifyOTP);
router.get('/auth/profile', authenticateToken, authController.getProfile);

// Plate routes
router.post('/plates', authenticateToken, upload.array('documents'), plateController.addPlate);
router.get('/plates', authenticateToken, plateController.getPlates);
router.delete('/plates/:plateId', authenticateToken, (_req, res, _next) => {
  console.log('DEBUG: DELETE route in index.ts called with plateId:', _req.params.plateId);
  console.log('DEBUG: User:', _req.user);
  plateController.removePlate(_req, res);
});
router.post('/plates/:plateId/approve', authenticateToken, plateController.approvePlate);
router.post('/plates/:plateId/reject', authenticateToken, plateController.rejectPlate);

// File proxy endpoint - serves S3 files with authentication
router.get('/files/:documentId', authenticateToken, async (_req, res) => {
  try {
    console.log('Proxy endpoint called for document:', _req.params.documentId);
    
    const { documentId } = _req.params;
    const userId = _req.user?.id;
    const userType = _req.user?.userType;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId
      },
      include: {
        plate: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!document) {
      console.log('Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check authorization: users can view their own documents, admins and security can view any document
    const isOwner = document.plate.userId === userId;
    const isAdmin = userType === 'ADMIN';
    const isSecurity = userType === 'SECURITY';

    if (!isOwner && !isAdmin && !isSecurity) {
      console.log('User not authorized to view this document');
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('Document found, extracting S3 key from URL:', document.url);
    
    // Extract the S3 key from the URL
    const key = extractKeyFromUrl(document.url);
    console.log('S3 key extracted:', key);
    
    // Get the file from S3
    const { buffer, contentType } = await getFileFromS3(key);
    console.log('File retrieved from S3, content type:', contentType);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', 'inline'); // Display in browser instead of download
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

    console.log('Sending file response');
    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Security routes
router.use('/security', securityRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router; 