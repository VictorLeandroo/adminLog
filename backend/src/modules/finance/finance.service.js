const { z } = require('zod');
const { StatementStatus } = require('@prisma/client');

const prisma = require('../../lib/prisma');
const AppError = require('../../utils/AppError');

const EXPENSE_CATEGORIES = {
  FUEL: 'Combustivel',
  TOLL: 'Pedagio',
  MAINTENANCE: 'Manutencao do carro',
  TIRE: 'Pneus',
  INSURANCE: 'Seguro',
  FINE: 'Multa',
  SALARY: 'Salario',
  OTHER: 'Outros',
};

const DRIVER_ALLOWED_CATEGORIES = new Set([
  EXPENSE_CATEGORIES.FUEL,
  EXPENSE_CATEGORIES.TOLL,
  EXPENSE_CATEGORIES.MAINTENANCE,
  EXPENSE_CATEGORIES.TIRE,
  EXPENSE_CATEGORIES.INSURANCE,
  EXPENSE_CATEGORIES.FINE,
  EXPENSE_CATEGORIES.OTHER,
]);

const VEHICLE_REQUIRED_CATEGORIES = new Set([
  EXPENSE_CATEGORIES.FUEL,
  EXPENSE_CATEGORIES.TOLL,
  EXPENSE_CATEGORIES.MAINTENANCE,
  EXPENSE_CATEGORIES.TIRE,
  EXPENSE_CATEGORIES.INSURANCE,
  EXPENSE_CATEGORIES.FINE,
]);

const expenseSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  date: z.string(),
  category: z.enum(Object.values(EXPENSE_CATEGORIES)),
  description: z.string().optional().nullable(),
  amount: z.number(),
  paid: z.boolean().default(true),
  photos: z.array(z.object({
    fileUrl: z.string(),
    fileName: z.string().optional(),
  })).default([]),
});

const revenueSchema = z.object({
  date: z.string(),
  description: z.string().min(2),
  company: z.string().optional().nullable(),
  amount: z.number(),
  paid: z.boolean().default(true),
});

const statementSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  company: z.string().min(2),
  note: z.string().optional().nullable(),
});

function normalizeCategory(value) {
  return String(value || '').trim();
}

async function ensureDriverVehicle(userId, vehicleId) {
  if (!vehicleId) throw new AppError('Motorista deve informar o veiculo da despesa', 400);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new AppError('Veiculo nao encontrado', 404);
  if (vehicle.driverId !== userId) throw new AppError('Veiculo nao vinculado ao motorista', 403);
}

function assertExpensePermission(user, data) {
  const category = normalizeCategory(data.category);

  if (user.role === 'DRIVER') {
    if (!DRIVER_ALLOWED_CATEGORIES.has(category)) {
      throw new AppError('Motorista nao pode registrar esta categoria de despesa', 403);
    }

    if (category === EXPENSE_CATEGORIES.SALARY) {
      throw new AppError('Motorista nao pode registrar despesa salarial', 403);
    }
  }

  if (category === EXPENSE_CATEGORIES.SALARY && !['ADMIN', 'FINANCE'].includes(user.role)) {
    throw new AppError('Somente admin e financeiro podem registrar salario', 403);
  }
}

async function listExpenses(user, query) {
  const where = {};

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) where.date.lte = new Date(query.endDate);
  }

  if (user.role === 'DRIVER') {
    where.vehicle = { driverId: user.id };
  }

  const [expenses, maintenances] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
        driver: { select: { id: true, name: true, email: true } },
        photos: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.vehicleMaintenance.findMany({
      where: {
        ...(where.date ? { date: where.date } : {}),
        ...(user.role === 'DRIVER' ? { vehicle: { driverId: user.id } } : {}),
      },
      include: {
        vehicle: true,
      },
      orderBy: { date: 'desc' },
    }),
  ]);

  const maintenanceExpenses = maintenances.map((item) => ({
    id: `maintenance-${item.id}`,
    vehicleId: item.vehicleId,
    driverId: item.vehicle?.driverId || null,
    createdById: null,
    date: item.date,
    category: EXPENSE_CATEGORIES.MAINTENANCE,
    description: item.note || `${item.type}${item.workshop ? ` - ${item.workshop}` : ''}`,
    amount: item.amount || 0,
    paid: true,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    sourceType: 'MAINTENANCE',
    editable: false,
    photos: [],
    vehicle: item.vehicle,
    createdBy: null,
    driver: null,
  }));

  const rawExpenses = expenses.map((item) => ({
    ...item,
    sourceType: 'EXPENSE',
    editable: true,
  }));

  return [...rawExpenses, ...maintenanceExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function getExpense(id) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new AppError('Despesa nao encontrada', 404);
  return expense;
}

async function createExpense(user, input) {
  const data = expenseSchema.parse(input);
  const category = normalizeCategory(data.category);
  assertExpensePermission(user, data);

  if (user.role === 'DRIVER') {
    await ensureDriverVehicle(user.id, data.vehicleId);
  }

  if (VEHICLE_REQUIRED_CATEGORIES.has(category) && !data.vehicleId) {
    throw new AppError('Categoria selecionada exige vinculo com veiculo', 400);
  }

  if (category === EXPENSE_CATEGORIES.SALARY && !data.driverId) {
    throw new AppError('Despesa salarial exige motorista vinculado', 400);
  }

  if (category === EXPENSE_CATEGORIES.SALARY) {
    const driver = await prisma.user.findUnique({ where: { id: data.driverId } });
    if (!driver || driver.role !== 'DRIVER') {
      throw new AppError('Motorista da despesa salarial nao encontrado', 404);
    }
  }

  return prisma.expense.create({
    data: {
      vehicleId: category === EXPENSE_CATEGORIES.SALARY ? null : data.vehicleId,
      createdById: user.id,
      driverId: category === EXPENSE_CATEGORIES.SALARY ? data.driverId : null,
      date: new Date(data.date),
      category: data.category,
      description: data.description,
      amount: data.amount,
      paid: data.paid,
      photos: {
        create: data.photos.map((photo) => ({
          fileUrl: photo.fileUrl,
          fileName: photo.fileName,
        })),
      },
    },
    include: { photos: true, vehicle: true, driver: true },
  });
}

async function updateExpense(id, input) {
  await getExpense(id);
  const data = expenseSchema.partial().parse(input);
  const category = data.category ? normalizeCategory(data.category) : null;

  if (category === EXPENSE_CATEGORIES.SALARY && data.driverId === '') {
    throw new AppError('Despesa salarial exige motorista vinculado', 400);
  }

  return prisma.expense.update({
    where: { id },
    data: {
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      date: data.date ? new Date(data.date) : undefined,
      category: data.category,
      description: data.description,
      amount: data.amount,
      paid: data.paid,
      photos: data.photos
        ? {
          deleteMany: {},
          create: data.photos.map((photo) => ({
            fileUrl: photo.fileUrl,
            fileName: photo.fileName,
          })),
        }
        : undefined,
    },
    include: { photos: true, vehicle: true, driver: true },
  });
}

async function removeExpense(id) {
  await getExpense(id);
  await prisma.expense.delete({ where: { id } });
}

async function listRevenues(query) {
  const where = {};

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) where.date.lte = new Date(query.endDate);
  }

  return prisma.revenue.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: 'desc' },
  });
}

async function getRevenue(id) {
  const revenue = await prisma.revenue.findUnique({ where: { id } });
  if (!revenue) throw new AppError('Receita nao encontrada', 404);
  return revenue;
}

async function createRevenue(user, input) {
  const data = revenueSchema.parse(input);

  return prisma.revenue.create({
    data: {
      createdById: user.id,
      date: new Date(data.date),
      description: data.description,
      company: data.company,
      amount: data.amount,
      paid: data.paid,
    },
  });
}

async function updateRevenue(id, input) {
  await getRevenue(id);
  const data = revenueSchema.partial().parse(input);

  return prisma.revenue.update({
    where: { id },
    data: {
      date: data.date ? new Date(data.date) : undefined,
      description: data.description,
      company: data.company,
      amount: data.amount,
      paid: data.paid,
    },
  });
}

async function removeRevenue(id) {
  await getRevenue(id);
  await prisma.revenue.delete({ where: { id } });
}

async function listStatementRequests() {
  return prisma.freightStatementRequest.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

async function createStatementRequest(input) {
  const data = statementSchema.parse(input);

  return prisma.freightStatementRequest.create({
    data: {
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      company: data.company,
      note: data.note,
    },
  });
}

async function updateStatementRequest(id, input) {
  const schema = z.object({
    status: z.enum(['REQUESTED', 'PROCESSING', 'DONE', 'CANCELED']).optional(),
    fileUrl: z.string().optional().nullable(),
  });
  const data = schema.parse(input);

  return prisma.freightStatementRequest.update({
    where: { id },
    data: {
      status: data.status ? StatementStatus[data.status] : undefined,
      fileUrl: data.fileUrl,
    },
  });
}

module.exports = {
  listRevenues,
  createRevenue,
  updateRevenue,
  removeRevenue,
  listExpenses,
  createExpense,
  updateExpense,
  removeExpense,
  listStatementRequests,
  createStatementRequest,
  updateStatementRequest,
};
