const { z } = require('zod');
const { StatementStatus } = require('@prisma/client');

const prisma = require('../../lib/prisma');
const AppError = require('../../utils/AppError');

const expenseSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  date: z.string(),
  category: z.string().min(2),
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

async function listExpenses(query) {
  const where = {};

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) where.date.lte = new Date(query.endDate);
  }

  return prisma.expense.findMany({
    where,
    include: {
      vehicle: true,
      createdBy: { select: { id: true, name: true, email: true } },
      photos: true,
    },
    orderBy: { date: 'desc' },
  });
}

async function getExpense(id) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new AppError('Despesa nao encontrada', 404);
  return expense;
}

async function createExpense(user, input) {
  const data = expenseSchema.parse(input);

  return prisma.expense.create({
    data: {
      vehicleId: data.vehicleId,
      createdById: user.id,
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
    include: { photos: true, vehicle: true },
  });
}

async function updateExpense(id, input) {
  await getExpense(id);
  const data = expenseSchema.partial().parse(input);

  return prisma.expense.update({
    where: { id },
    data: {
      vehicleId: data.vehicleId,
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
    include: { photos: true, vehicle: true },
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
