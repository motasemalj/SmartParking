import cron from 'node-cron';
import { prisma } from '../index';

// Function to update expired temporary access records
const updateExpiredAccess = async () => {
  try {
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
    
    if (process.env.NODE_ENV !== 'production' && result.count > 0) {
      console.log(`Updated ${result.count} expired temporary access records`);
    }
  } catch (error) {
    console.error('Error updating expired access:', error);
  }
};

// Function to update expired guest plates
const updateExpiredGuestPlates = async () => {
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
    
    if (process.env.NODE_ENV !== 'production' && result.count > 0) {
      console.log(`Updated ${result.count} expired guest plates`);
    }
  } catch (error) {
    console.error('Error updating expired guest plates:', error);
  }
};

// Schedule the task to run every 15 minutes instead of every minute for better performance
export const startExpiredAccessCheck = () => {
  cron.schedule('*/15 * * * *', updateExpiredAccess);
  cron.schedule('*/15 * * * *', updateExpiredGuestPlates);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('Started expired access check scheduler (every 15 minutes)');
  }
}; 