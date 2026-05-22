const { z } = require('zod');
const { RouteStatus } = require('@prisma/client');

const prisma = require('../../lib/prisma');
const AppError = require('../../utils/AppError');

const startSchema = z.object({
  vehicleId: z.string().min(1),
  initialKm: z.number().int(),
  date: z.string().optional(),
});

const createSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.string().optional(),
  initialKm: z.number().int(),
  finalKm: z.number().int().optional().nullable(),
  status: z.enum(['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED']).optional(),
  cities: z.array(z.string()).optional(),
  cidades: z.array(z.string()).optional(),
  invoices: z.array(z.string()).optional(),
  invoiceNumbers: z.array(z.string()).optional(),
  notas: z.array(z.string()).optional(),
});

const finishSchema = z.object({
  finalKm: z.number().int(),
  cities: z.array(z.string()).optional(),
  cidades: z.array(z.string()).optional(),
  invoices: z.array(z.string()).optional(),
  invoiceNumbers: z.array(z.string()).optional(),
  notas: z.array(z.string()).optional(),
  photos: z.array(z.object({
    fileUrl: z.string(),
    fileName: z.string().optional(),
  })).default([]),
});

const reviewSchema = finishSchema.extend({
  initialKm: z.number().int().optional(),
  status: z.enum(['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED']).optional(),
});

const include = {
  vehicle: true,
  driver: { select: { id: true, name: true, email: true } },
  cities: true,
  invoices: true,
  photos: true,
};

function normalizeList(value) {
  return (value || [])
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function getFinishPayload(data) {
  return {
    cities: normalizeList(data.cities || data.cidades),
    invoices: normalizeList(data.invoices || data.invoiceNumbers || data.notas),
    photos: data.photos || [],
  };
}

async function listRoutes(user) {
  return prisma.route.findMany({
    where: user.role === 'DRIVER' ? { driverId: user.id } : undefined,
    include,
    orderBy: { createdAt: 'desc' },
  });
}

async function getRoute(id) {
  const route = await prisma.route.findUnique({ where: { id }, include });
  if (!route) throw new AppError('Rota nao encontrada', 404);
  return route;
}

async function getActiveRoute(driverId) {
  return prisma.route.findFirst({
    where: { driverId, status: RouteStatus.IN_PROGRESS },
    include,
  });
}

async function startRoute(user, input) {
  const data = startSchema.parse(input);

  const active = await getActiveRoute(user.id);
  if (active) throw new AppError('Motorista ja possui uma rota em andamento', 409);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });

  if (!vehicle) throw new AppError('Veiculo nao encontrado ou nao vinculado', 404);
  if (vehicle.driverId !== user.id) throw new AppError('Veiculo nao esta vinculado a este motorista', 403);
  if (data.initialKm < vehicle.currentKm) {
    throw new AppError('KM inicial nao pode ser menor que o KM atual do veiculo', 400);
  }

  return prisma.route.create({
    data: {
      vehicleId: vehicle.id,
      driverId: user.id,
      date: data.date ? new Date(data.date) : new Date(),
      initialKm: data.initialKm,
      status: RouteStatus.IN_PROGRESS,
    },
    include,
  });
}

async function createRoute(input) {
  const data = createSchema.parse(input);
  const payload = getFinishPayload(data);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });

  if (!vehicle) throw new AppError('Veiculo nao encontrado', 404);
  if (!vehicle.driverId) throw new AppError('Veiculo sem motorista vinculado', 400);

  const active = await getActiveRoute(vehicle.driverId);
  if (active && (data.status || 'IN_PROGRESS') === 'IN_PROGRESS') {
    throw new AppError('Motorista ja possui uma rota em andamento', 409);
  }

  if (data.finalKm !== null && data.finalKm !== undefined && data.finalKm < data.initialKm) {
    throw new AppError('KM final nao pode ser menor que KM inicial', 400);
  }

  const hasFinishedData = data.finalKm !== null && data.finalKm !== undefined;
  const status = data.status
    ? RouteStatus[data.status]
    : hasFinishedData && payload.cities.length && payload.invoices.length
      ? RouteStatus.COMPLETED
      : hasFinishedData
        ? RouteStatus.PENDING_REVIEW
        : RouteStatus.IN_PROGRESS;

  return prisma.$transaction(async (tx) => {
    if (hasFinishedData && data.finalKm > vehicle.currentKm) {
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { currentKm: data.finalKm },
      });
    }

    return tx.route.create({
      data: {
        vehicleId: vehicle.id,
        driverId: vehicle.driverId,
        date: data.date ? new Date(data.date) : new Date(),
        initialKm: data.initialKm,
        finalKm: hasFinishedData ? data.finalKm : null,
        status,
        finishedAt: hasFinishedData ? new Date() : null,
        cities: {
          create: payload.cities.map((name) => ({ name })),
        },
        invoices: {
          create: payload.invoices.map((number) => ({ number })),
        },
      },
      include,
    });
  });
}

async function finishRoute(user, id, input) {
  const data = finishSchema.parse(input);
  const payload = getFinishPayload(data);
  const route = await getRoute(id);

  if (route.driverId !== user.id && user.role !== 'ADMIN') {
    throw new AppError('Acesso negado', 403);
  }

  if (data.finalKm < route.initialKm) {
    throw new AppError('KM final nao pode ser menor que KM inicial', 400);
  }

  const status = payload.cities.length && payload.invoices.length
    ? RouteStatus.COMPLETED
    : RouteStatus.PENDING_REVIEW;

  return prisma.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { id: route.vehicleId },
      data: { currentKm: data.finalKm },
    });

    return tx.route.update({
      where: { id },
      data: {
        finalKm: data.finalKm,
        status,
        finishedAt: new Date(),
        correctionRequested: false,
        correctionNote: null,
        cities: {
          deleteMany: {},
          create: payload.cities.map((name) => ({ name })),
        },
        invoices: {
          deleteMany: {},
          create: payload.invoices.map((number) => ({ number })),
        },
        photos: {
          create: payload.photos.map((photo) => ({
            fileUrl: photo.fileUrl,
            fileName: photo.fileName,
          })),
        },
      },
      include,
    });
  });
}

async function reportError(user, id, input) {
  const schema = z.object({ note: z.string().min(3) });
  const data = schema.parse(input);
  const route = await getRoute(id);

  if (route.driverId !== user.id) {
    throw new AppError('Acesso negado', 403);
  }

  if (route.status === RouteStatus.IN_PROGRESS) {
    throw new AppError('Nao e possivel solicitar correcao em rota em andamento', 400);
  }

  return prisma.route.update({
    where: { id },
    data: {
      correctionRequested: true,
      correctionNote: data.note,
      status: RouteStatus.PENDING_REVIEW,
    },
    include,
  });
}

async function reviewRoute(id, input) {
  const data = reviewSchema.parse(input);
  const payload = getFinishPayload(data);
  const route = await getRoute(id);

  if (data.finalKm !== undefined && data.finalKm < (data.initialKm ?? route.initialKm)) {
    throw new AppError('KM final nao pode ser menor que KM inicial', 400);
  }

  return prisma.$transaction(async (tx) => {
    if (data.finalKm !== undefined && data.finalKm !== null && data.finalKm > route.vehicle.currentKm) {
      await tx.vehicle.update({
        where: { id: route.vehicleId },
        data: { currentKm: data.finalKm },
      });
    }

    return tx.route.update({
      where: { id },
      data: {
        initialKm: data.initialKm,
        finalKm: data.finalKm,
        status: data.status ? RouteStatus[data.status] : undefined,
        finishedAt: data.finalKm !== undefined && data.finalKm !== null && data.status !== 'IN_PROGRESS' ? new Date() : undefined,
        correctionRequested: data.status === 'COMPLETED' ? false : undefined,
        correctionNote: data.status === 'COMPLETED' ? null : undefined,
        cities: {
          deleteMany: {},
          create: payload.cities.map((name) => ({ name })),
        },
        invoices: {
          deleteMany: {},
          create: payload.invoices.map((number) => ({ number })),
        },
      },
      include,
    });
  });
}

async function removeRoute(id) {
  await getRoute(id);
  await prisma.route.delete({ where: { id } });
}

module.exports = {
  listRoutes,
  getActiveRoute,
  startRoute,
  createRoute,
  finishRoute,
  reportError,
  reviewRoute,
  removeRoute,
};
