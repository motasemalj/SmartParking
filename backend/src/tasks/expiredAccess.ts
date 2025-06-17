import cron from 'node-cron';
import { prisma } from '../index';

// Function to update expired temporary access records
const updateExpiredAccess = async () => {
  try {
    console.log('Checking for expired temporary access records...');
    const result = await prisma.temporaryAccess.updateMany({
      where: {
        status: 'ACTIVE',
        endTime: {
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

// Schedule the task to run every minute
export const startExpiredAccessCheck = () => {
  cron.schedule('* * * * *', updateExpiredAccess);
  console.log('Started expired temporary access check scheduler');
}; 