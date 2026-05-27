const { z } = require('zod');
const { DocumentType, VehicleStatus } = require('@prisma/client');

const prisma = require('../../lib/prisma');
const AppError = require('../../utils/AppError');

const vehicleSchema = z.object({
  model: z.string().min(2),
  year: z.number().int().optional().nullable(),
  plate: z.string().min(3),
  currentKm: z.number().int().optional(),
  nextMaintenanceAtKm: z.number().int().optional().nullable(),
  renavam: z.string().optional().nullable(),
  chassis: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  photoName: z.string().optional().nullable(),
  licenseValidUntil: z.string().optional().nullable(),
  insuranceValidUntil: z.string().optional().nullable(),
  status: z.enum(['OK', 'ATTENTION', 'MAINTENANCE']).default('OK'),
  driverId: z.string().optional().nullable(),
});

const maintenanceSchema = z.object({
  type: z.string().min(2),
  date: z.string(),
  km: z.number().int(),
  workshop: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  nextDueKm: z.number().int().optional().nullable(),
  note: z.string().optional().nullable(),
});

const documentSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['CRLV', 'INSURANCE', 'INVOICE', 'OTHER']).default('OTHER'),
  fileUrl: z.string().min(1),
  expiresAt: z.string().optional().nullable(),
});

const include = {
  driver: { select: { id: true, name: true, email: true } },
  documents: { orderBy: { createdAt: 'desc' } },
  maintenances: { orderBy: { date: 'desc' } },
};

function toDate(value) {
  return value ? new Date(value) : null;
}

async function listVehicles() {
  return prisma.vehicle.findMany({
    include,
    orderBy: { createdAt: 'desc' },
  });
}

async function getVehicle(id) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, include });

  if (!vehicle) throw new AppError('Veiculo nao encontrado', 404);

  return vehicle;
}

async function getDriverVehicle(driverId) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { driverId },
    include,
  });

  if (!vehicle) throw new AppError('Nenhum veiculo vinculado ao motorista', 404);

  return vehicle;
}

async function createVehicle(input) {
  const data = vehicleSchema.parse(input);

  return prisma.vehicle.create({
    data: {
      ...data,
      status: VehicleStatus[data.status],
      licenseValidUntil: toDate(data.licenseValidUntil),
      insuranceValidUntil: toDate(data.insuranceValidUntil),
    },
    include,
  });
}

async function updateVehicle(id, input) {
  await getVehicle(id);
  const data = vehicleSchema.partial().parse(input);

  return prisma.vehicle.update({
    where: { id },
    data: {
      ...data,
      status: data.status ? VehicleStatus[data.status] : undefined,
      licenseValidUntil: data.licenseValidUntil !== undefined ? toDate(data.licenseValidUntil) : undefined,
      insuranceValidUntil: data.insuranceValidUntil !== undefined ? toDate(data.insuranceValidUntil) : undefined,
    },
    include,
  });
}

async function assignDriver(id, input) {
  await getVehicle(id);
  const schema = z.object({ driverId: z.string().min(1) });
  const data = schema.parse(input);

  const driver = await prisma.user.findUnique({
    where: { id: data.driverId },
  });

  if (!driver || driver.role !== 'DRIVER' || !driver.active) {
    throw new AppError('Motorista nao encontrado ou inativo', 404);
  }

  return prisma.vehicle.update({
    where: { id },
    data: { driverId: data.driverId },
    include,
  });
}

async function unassignDriver(id) {
  await getVehicle(id);

  return prisma.vehicle.update({
    where: { id },
    data: { driverId: null },
    include,
  });
}

async function removeVehicle(id) {
  await getVehicle(id);
  await prisma.vehicle.delete({ where: { id } });
}

async function createMaintenance(vehicleId, input) {
  await getVehicle(vehicleId);
  const data = maintenanceSchema.parse(input);

  const maintenance = await prisma.vehicleMaintenance.create({
    data: {
      vehicleId,
      type: data.type,
      date: new Date(data.date),
      km: data.km,
      workshop: data.workshop,
      amount: data.amount,
      nextDueKm: data.nextDueKm,
      note: data.note,
    },
  });

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      currentKm: { set: data.km },
      nextMaintenanceAtKm: data.nextDueKm,
    },
  });

  return maintenance;
}

async function createDocument(vehicleId, input) {
  await getVehicle(vehicleId);
  const data = documentSchema.parse(input);

  return prisma.vehicleDocument.create({
    data: {
      vehicleId,
      name: data.name,
      type: DocumentType[data.type],
      fileUrl: data.fileUrl,
      expiresAt: toDate(data.expiresAt),
    },
  });
}

module.exports = {
  listVehicles,
  getVehicle,
  getDriverVehicle,
  createVehicle,
  updateVehicle,
  assignDriver,
  unassignDriver,
  removeVehicle,
  createMaintenance,
  createDocument,
};
