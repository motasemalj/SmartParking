import { PrismaClient, UserType, PlateType, PlateStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  await prisma.user.create({
    data: {
      name: 'Admin User',
      phoneNumber: '1234567890',
      homeNumber: 'A101',
      userType: UserType.ADMIN,
    },
  });

  // Create security user
  const security = await prisma.security.create({
    data: {
      name: 'Security Guard',
    },
  });

  // Create resident users
  const resident1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      phoneNumber: '2345678901',
      homeNumber: 'B202',
      userType: UserType.RESIDENT,
    },
  });

  const resident2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      phoneNumber: '3456789012',
      homeNumber: 'C303',
      userType: UserType.RESIDENT,
    },
  });

  // Create plates for resident1
  await prisma.plate.create({
    data: {
      plateCode: 'ABC',
      plateNumber: '123',
      country: 'UAE',
      type: PlateType.PERSONAL,
      status: PlateStatus.PENDING,
      userId: resident1.id,
    },
  });

  const plate2 = await prisma.plate.create({
    data: {
      plateCode: 'XYZ',
      plateNumber: '456',
      country: 'UAE',
      type: PlateType.PERSONAL,
      status: PlateStatus.APPROVED,
      userId: resident1.id,
      approvedById: security.id,
    },
  });

  // Create plates for resident2
  const plate3 = await prisma.plate.create({
    data: {
      plateCode: 'DEF',
      plateNumber: '789',
      country: 'UAE',
      type: PlateType.PERSONAL,
      status: PlateStatus.REJECTED,
      userId: resident2.id,
    },
  });

  // Create some entries
  await prisma.entry.create({
    data: {
      plateId: plate2.id,
      userId: resident1.id,
      type: 'ENTRY',
    },
  });

  // Create notifications
  await prisma.notification.create({
    data: {
      userId: resident1.id,
      message: 'Your plate ABC123 has been approved',
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: resident2.id,
      message: 'Your plate DEF789 has been rejected',
      read: false,
    },
  });

  // Create activities
  await prisma.activity.create({
    data: {
      type: 'PLATE_APPROVED',
      description: 'Plate XYZ456 was approved by Security Guard',
      userId: resident1.id,
      plateId: plate2.id,
    },
  });

  await prisma.activity.create({
    data: {
      type: 'PLATE_REJECTED',
      description: 'Plate DEF789 was rejected',
      userId: resident2.id,
      plateId: plate3.id,
    },
  });

  console.log('Test data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 