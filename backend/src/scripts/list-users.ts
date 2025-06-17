import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        userType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Display all users
    console.log('\n=== All Users ===');
    users.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`Phone: ${user.phoneNumber}`);
      console.log(`Type: ${user.userType}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('---');
    });

    // Display counts by type
    console.log('\n=== Summary ===');
    const counts = users.reduce((acc, user) => {
      acc[user.userType] = (acc[user.userType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(counts).forEach(([type, count]) => {
      console.log(`${type} Users: ${count}`);
    });
    console.log(`Total Users: ${users.length}`);

  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers(); 