import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding school buses...');

  // Clear existing buses
  await prisma.schoolBus.deleteMany();

  const buses = [
    {
      busNumber: 'BUS-001',
      routeName: 'Eldoret Town Route',
      driverName: 'James Kiprop',
      driverPhone: '+254 712 345 678',
      capacity: 45,
      currentStudents: 38,
      status: 'ACTIVE',
      color: 'teal',
    },
    {
      busNumber: 'BUS-002',
      routeName: 'Kaptagat Route',
      driverName: 'Samuel Chebet',
      driverPhone: '+254 723 456 789',
      capacity: 35,
      currentStudents: 28,
      status: 'ACTIVE',
      color: 'amber',
    },
    {
      busNumber: 'BUS-003',
      routeName: 'Huruma Route',
      driverName: 'Peter Kiptoo',
      driverPhone: '+254 734 567 890',
      capacity: 50,
      currentStudents: 45,
      status: 'ACTIVE',
      color: 'green',
    },
    {
      busNumber: 'BUS-004',
      routeName: 'Kapsoya Route',
      driverName: 'David Kemboi',
      driverPhone: '+254 745 678 901',
      capacity: 30,
      currentStudents: 20,
      status: 'ACTIVE',
      color: 'blue',
    },
    {
      busNumber: 'BUS-005',
      routeName: 'Langas Route',
      driverName: 'Joseph Rono',
      driverPhone: '+254 756 789 012',
      capacity: 40,
      currentStudents: 33,
      status: 'MAINTENANCE',
      color: 'red',
    },
  ];

  for (const bus of buses) {
    await prisma.schoolBus.create({ data: bus });
    console.log(`Created ${bus.busNumber}: ${bus.routeName}`);
  }

  const total = await prisma.schoolBus.count();
  console.log(`\nDone! Seeded ${total} school buses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
