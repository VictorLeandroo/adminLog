const bcrypt = require('bcryptjs');
const { PrismaClient, UserRole, VehicleStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fiorino.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@fiorino.local',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: 'motorista@fiorino.local' },
    update: {},
    create: {
      name: 'Estevao',
      email: 'motorista@fiorino.local',
      passwordHash,
      role: UserRole.DRIVER,
    },
  });

  await prisma.vehicle.upsert({
    where: { plate: 'ABC-1234' },
    update: {},
    create: {
      model: 'Fiat Fiorino Endurance',
      year: 2021,
      plate: 'ABC-1234',
      currentKm: 42380,
      nextMaintenanceAtKm: 45000,
      renavam: '01234567890',
      chassis: '9BD2651ABC1234567',
      status: VehicleStatus.OK,
      driverId: driver.id,
      documents: {
        create: {
          name: 'CRLV Digital',
          type: 'CRLV',
          fileUrl: '/uploads/demo/crlv.pdf',
        },
      },
      maintenances: {
        create: [
          {
            type: 'Troca de oleo',
            date: new Date('2026-04-10'),
            km: 39800,
            workshop: 'Auto Center Sao Pedro',
            amount: 320,
            nextDueKm: 44800,
            note: 'Oleo, filtro de oleo e filtro de ar trocados.',
          },
          {
            type: 'Pastilhas de freio',
            date: new Date('2026-05-05'),
            km: 42300,
            workshop: 'Freios Sorocaba',
            amount: 580,
            nextDueKm: 47300,
            note: 'Pastilhas dianteiras trocadas.',
          },
        ],
      },
    },
  });

  await prisma.revenue.upsert({
    where: { id: 'seed-revenue-1' },
    update: {},
    create: {
      id: 'seed-revenue-1',
      createdById: admin.id,
      description: 'Recebimento Empresa',
      company: 'Empresa contratante',
      date: new Date('2026-05-10'),
      amount: 8128.98,
      paid: true,
    },
  });

  await prisma.revenue.upsert({
    where: { id: 'seed-revenue-2' },
    update: {},
    create: {
      id: 'seed-revenue-2',
      createdById: admin.id,
      description: 'Recebimento Empresa',
      company: 'Empresa contratante',
      date: new Date('2026-05-25'),
      amount: 6989.01,
      paid: true,
    },
  });

  console.log('Seed concluido:', { admin: admin.email, driver: driver.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
