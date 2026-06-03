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
  ADMINISTRATION: 'Administracao',
  OFFICE: 'Escritorio',
  TAX: 'Impostos',
  INSTALLMENT: 'Parcela/financiamento',
  OTHER: 'Outros',
};

const EXPENSE_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CORRECTION_REQUESTED: 'CORRECTION_REQUESTED',
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
]);

const expenseSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  date: z.string(),
  category: z.enum(Object.values(EXPENSE_CATEGORIES)),
  description: z.string().optional().nullable(),
  amount: z.number(),
  paid: z.boolean().default(true),
  status: z.enum(Object.values(EXPENSE_STATUSES)).optional(),
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

function numberValue(value) {
  return Number(value || 0);
}

function sum(list, selector) {
  return list.reduce((total, item) => total + numberValue(selector(item)), 0);
}

function normalizeCategory(value) {
  return String(value || '').trim();
}

function getPeriod(query = {}) {
  const now = new Date();
  const year = Number(query.year || now.getFullYear());
  const month = Number(query.month || now.getMonth() + 1);
  return {
    year,
    month,
    startDate: query.startDate ? new Date(query.startDate) : new Date(year, month - 1, 1),
    endDate: query.endDate ? new Date(query.endDate) : new Date(year, month, 1),
  };
}

function dateRange(query = {}) {
  const period = getPeriod(query);
  return { gte: period.startDate, lt: period.endDate };
}

function publicStatus(item) {
  return item.status || EXPENSE_STATUSES.APPROVED;
}

function routeKm(route) {
  if (!route.finalKm) return 0;
  return Math.max(0, numberValue(route.finalKm) - numberValue(route.initialKm));
}

function expenseWhere(user, query = {}) {
  const where = {};

  if (query.startDate || query.endDate || query.month || query.year) where.date = dateRange(query);
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.driverId) where.driverId = query.driverId;
  if (query.category) where.category = query.category;
  if (query.status) where.status = query.status;
  if (query.paid !== undefined) where.paid = String(query.paid) === 'true';
  if (user.role === 'DRIVER') where.vehicle = { driverId: user.id };

  return where;
}

function revenueWhere(query = {}) {
  const where = {};

  if (query.startDate || query.endDate || query.month || query.year) where.date = dateRange(query);
  if (query.company) where.company = { contains: query.company, mode: 'insensitive' };

  return where;
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
    if (!DRIVER_ALLOWED_CATEGORIES.has(category)) throw new AppError('Motorista nao pode registrar esta categoria de despesa', 403);
    if (category === EXPENSE_CATEGORIES.SALARY) throw new AppError('Motorista nao pode registrar despesa salarial', 403);
  }

  if (category === EXPENSE_CATEGORIES.SALARY && !['ADMIN', 'FINANCE'].includes(user.role)) {
    throw new AppError('Somente admin e financeiro podem registrar salario', 403);
  }
}

function expenseInclude() {
  return {
    vehicle: true,
    createdBy: { select: { id: true, name: true, email: true } },
    driver: { select: { id: true, name: true, email: true } },
    photos: true,
  };
}

async function listExpenses(user, query = {}) {
  const where = expenseWhere(user, query);

  const [expenses, maintenances] = await Promise.all([
    prisma.expense.findMany({ where, include: expenseInclude(), orderBy: { date: 'desc' } }),
    prisma.vehicleMaintenance.findMany({
      where: {
        ...(where.date ? { date: where.date } : {}),
        ...(user.role === 'DRIVER' ? { vehicle: { driverId: user.id } } : {}),
      },
      include: { vehicle: true },
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
    status: EXPENSE_STATUSES.APPROVED,
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
    status: publicStatus(item),
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

  if (user.role === 'DRIVER') await ensureDriverVehicle(user.id, data.vehicleId);
  if (VEHICLE_REQUIRED_CATEGORIES.has(category) && !data.vehicleId) throw new AppError('Categoria selecionada exige vinculo com veiculo', 400);
  if (category === EXPENSE_CATEGORIES.SALARY && !data.driverId) throw new AppError('Despesa salarial exige motorista vinculado', 400);

  if (category === EXPENSE_CATEGORIES.SALARY) {
    const driver = await prisma.user.findUnique({ where: { id: data.driverId } });
    if (!driver || driver.role !== 'DRIVER') throw new AppError('Motorista da despesa salarial nao encontrado', 404);
  }

  return prisma.expense.create({
    data: {
      vehicleId: category === EXPENSE_CATEGORIES.SALARY ? null : (data.vehicleId || null),
      createdById: user.id,
      driverId: category === EXPENSE_CATEGORIES.SALARY ? data.driverId : null,
      date: new Date(data.date),
      category: data.category,
      description: data.description,
      amount: data.amount,
      paid: data.paid,
      status: user.role === 'DRIVER' ? EXPENSE_STATUSES.PENDING : (data.status || EXPENSE_STATUSES.APPROVED),
      reviewNote: null,
      reviewedAt: null,
      reviewedById: null,
      photos: { create: data.photos.map((photo) => ({ fileUrl: photo.fileUrl, fileName: photo.fileName })) },
    },
    include: expenseInclude(),
  });
}

async function updateExpense(id, input) {
  const current = await getExpense(id);
  const data = expenseSchema.partial().parse(input);
  const category = data.category ? normalizeCategory(data.category) : null;

  if (category === EXPENSE_CATEGORIES.SALARY && data.driverId === '') throw new AppError('Despesa salarial exige motorista vinculado', 400);

  const wasCorrection = current.status === EXPENSE_STATUSES.CORRECTION_REQUESTED;

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
      status: wasCorrection ? EXPENSE_STATUSES.PENDING : data.status,
      reviewNote: wasCorrection ? null : undefined,
      reviewedAt: wasCorrection ? null : undefined,
      reviewedById: wasCorrection ? null : undefined,
      photos: data.photos ? { deleteMany: {}, create: data.photos.map((photo) => ({ fileUrl: photo.fileUrl, fileName: photo.fileName })) } : undefined,
    },
    include: expenseInclude(),
  });
}

async function reviewExpense(user, id, input) {
  const schema = z.object({
    status: z.enum([EXPENSE_STATUSES.APPROVED, EXPENSE_STATUSES.REJECTED, EXPENSE_STATUSES.CORRECTION_REQUESTED]),
    reviewNote: z.string().optional().nullable(),
  });
  const data = schema.parse(input);

  if (data.status !== EXPENSE_STATUSES.APPROVED && !String(data.reviewNote || '').trim()) {
    throw new AppError('Informe uma observacao para recusar ou solicitar correcao', 400);
  }

  await getExpense(id);

  return prisma.expense.update({
    where: { id },
    data: {
      status: data.status,
      reviewNote: data.status === EXPENSE_STATUSES.APPROVED ? null : data.reviewNote,
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
    include: expenseInclude(),
  });
}

async function removeExpense(id) {
  await getExpense(id);
  await prisma.expense.delete({ where: { id } });
}

async function listRevenues(query = {}) {
  return prisma.revenue.findMany({
    where: revenueWhere(query),
    include: { createdBy: { select: { id: true, name: true, email: true } } },
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

async function getFinanceContext(user, query = {}) {
  const period = getPeriod(query);
  const [expenses, revenues, vehicles, drivers, routes] = await Promise.all([
    listExpenses(user, query),
    user.role === 'DRIVER' ? [] : listRevenues(query),
    prisma.vehicle.findMany({ include: { driver: true } }),
    prisma.user.findMany({ where: { role: 'DRIVER' }, include: { assignedVehicles: true } }),
    prisma.route.findMany({
      where: {
        date: { gte: period.startDate, lt: period.endDate },
        ...(user.role === 'DRIVER' ? { driverId: user.id } : {}),
      },
      include: { vehicle: true, driver: true },
    }),
  ]);

  return { period, expenses, revenues, vehicles, drivers, routes };
}

function categoryTotals(expenses) {
  const groups = expenses.reduce((acc, expense) => {
    const category = expense.category || EXPENSE_CATEGORIES.OTHER;
    if (!acc[category]) acc[category] = { category, total: 0, count: 0 };
    acc[category].total += numberValue(expense.amount);
    acc[category].count += 1;
    return acc;
  }, {});

  return Object.values(groups).sort((a, b) => b.total - a.total);
}

async function getSummary(user, query) {
  const { period, expenses, revenues } = await getFinanceContext(user, query);
  const totalExpenses = sum(expenses, (item) => item.amount);
  const totalRevenue = sum(revenues, (item) => item.amount);
  const categories = categoryTotals(expenses);

  return {
    period,
    totalRevenue,
    totalExpenses,
    netBalance: totalRevenue - totalExpenses,
    expenseCount: expenses.length,
    revenueCount: revenues.length,
    averageExpense: expenses.length ? totalExpenses / expenses.length : 0,
    pendingExpenses: expenses.filter((item) => publicStatus(item) === EXPENSE_STATUSES.PENDING).length,
    correctionExpenses: expenses.filter((item) => publicStatus(item) === EXPENSE_STATUSES.CORRECTION_REQUESTED).length,
    topCategory: categories[0] || null,
    categoryTotals: categories,
  };
}

async function getCashFlow(user, query) {
  const { expenses, revenues } = await getFinanceContext(user, query);
  let balance = 0;

  return [
    ...revenues.map((item) => ({
      id: `revenue-${item.id}`,
      date: item.date,
      type: 'IN',
      description: item.description,
      category: item.company || 'Receita',
      related: item.company || '-',
      status: item.paid ? 'PAID' : 'OPEN',
      amount: numberValue(item.amount),
    })),
    ...expenses.map((item) => ({
      id: `expense-${item.id}`,
      date: item.date,
      type: 'OUT',
      description: item.description || item.category,
      category: item.category,
      related: item.vehicle?.plate || item.driver?.name || '-',
      status: publicStatus(item),
      hasReceipt: Boolean(item.photos?.length),
      amount: -numberValue(item.amount),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date)).map((item) => {
    balance += item.amount;
    return { ...item, balance };
  });
}

async function getDre(user, query) {
  const { expenses, revenues } = await getFinanceContext(user, query);
  const totalRevenue = sum(revenues, (item) => item.amount);
  const categories = categoryTotals(expenses);
  const totalExpenses = sum(categories, (item) => item.total);
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    categories,
    totalExpenses,
    netProfit,
    margin: totalRevenue ? (netProfit / totalRevenue) * 100 : 0,
  };
}

async function getVehicleDre(user, query) {
  const { expenses, revenues, vehicles, routes } = await getFinanceContext(user, query);
  const totalRevenue = sum(revenues, (item) => item.amount);
  const completedRoutes = routes.filter((route) => route.finalKm);
  const averageRouteRevenue = completedRoutes.length ? totalRevenue / completedRoutes.length : 0;

  return vehicles.map((vehicle) => {
    const vehicleRoutes = completedRoutes.filter((route) => route.vehicleId === vehicle.id);
    const vehicleExpenses = expenses.filter((item) => item.vehicleId === vehicle.id || item.driverId === vehicle.driverId);
    const revenue = vehicleRoutes.length * averageRouteRevenue;
    const costs = sum(vehicleExpenses, (item) => item.amount);
    const km = sum(vehicleRoutes, routeKm);
    const netProfit = revenue - costs;

    return {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      driver: vehicle.driver?.name || 'Sem motorista',
      revenue,
      costs,
      netProfit,
      margin: revenue ? (netProfit / revenue) * 100 : 0,
      km,
      costPerKm: km ? costs / km : 0,
      revenuePerKm: km ? revenue / km : 0,
    };
  }).sort((a, b) => b.netProfit - a.netProfit);
}

async function getFunds(user, query) {
  const summary = await getSummary(user, query);
  const activeVehicles = await prisma.vehicle.count({ where: { status: { not: 'MAINTENANCE' } } });
  const surplus = Math.max(0, summary.netBalance);
  const operationalTarget = activeVehicles * 10000;
  const maintenanceTarget = activeVehicles * 5000;
  const funds = [
    { key: 'cash', label: 'Caixa operacional', value: surplus * 0.3, target: activeVehicles * 3000 },
    { key: 'reserve', label: 'Reserva de emergencia', value: surplus * 0.35, target: operationalTarget },
    { key: 'maintenance', label: 'Fundo de manutencao', value: surplus * 0.25, target: maintenanceTarget },
    { key: 'expansion', label: 'Expansao / frota', value: surplus * 0.2, target: activeVehicles * 3000 },
    { key: 'office', label: 'Reforma escritorio', value: surplus * 0.05, target: 8000 },
    { key: 'partners', label: 'Distribuicao socios', value: operationalTarget > surplus * 0.35 ? surplus * 0.15 : surplus * 0.25, target: surplus },
  ];

  return {
    surplus,
    funds: funds.map((fund) => ({ ...fund, progress: fund.target ? Math.min(100, (fund.value / fund.target) * 100) : 0 })),
  };
}

async function getSalarySettlements(user, query) {
  const { expenses, drivers } = await getFinanceContext(user, query);

  return drivers.map((driver) => {
    const salaryExpenses = expenses.filter((item) => item.driverId === driver.id && item.category === EXPENSE_CATEGORIES.SALARY);
    const fines = expenses.filter((item) => item.vehicle?.driverId === driver.id && item.category === EXPENSE_CATEGORIES.FINE);
    const totalSalary = sum(salaryExpenses, (item) => item.amount);
    const totalFines = sum(fines, (item) => item.amount);

    return {
      driverId: driver.id,
      driver: driver.name,
      vehicle: driver.assignedVehicles?.[0]?.plate || 'Sem veiculo',
      baseSalary: totalSalary,
      absences: 0,
      discounts: totalFines,
      bonus: 0,
      totalToPay: Math.max(0, totalSalary - totalFines),
      status: totalSalary ? 'REGISTERED' : 'PENDING',
    };
  });
}

async function getInsights(user, query) {
  const { expenses } = await getFinanceContext(user, query);
  const dre = await getDre(user, query);
  const funds = await getFunds(user, query);
  const vehicleDre = await getVehicleDre(user, query);
  const insights = [];
  const withoutReceipt = expenses.filter((item) => !item.photos?.length && item.sourceType === 'EXPENSE');

  if (withoutReceipt.length) insights.push({ tone: 'attention', title: 'Despesa sem comprovante', text: `${withoutReceipt.length} despesa(s) precisam de comprovante.` });
  if (expenses.some((item) => publicStatus(item) === EXPENSE_STATUSES.CORRECTION_REQUESTED)) insights.push({ tone: 'info', title: 'Correcao pendente', text: 'Existem despesas aguardando ajuste do motorista.' });
  if (dre.margin < 10 && dre.totalRevenue > 0) insights.push({ tone: 'danger', title: 'Margem baixa', text: `Margem liquida em ${dre.margin.toFixed(1)}%.` });
  if (funds.funds.find((fund) => fund.key === 'reserve')?.progress < 50) insights.push({ tone: 'attention', title: 'Reserva abaixo da meta', text: 'Reserva operacional ainda esta abaixo do alvo recomendado.' });

  const weakVehicle = vehicleDre.find((item) => item.margin < 10 && item.revenue > 0);
  if (weakVehicle) insights.push({ tone: 'danger', title: 'Veiculo com margem baixa', text: `${weakVehicle.plate} esta com margem de ${weakVehicle.margin.toFixed(1)}%.` });

  return insights.length ? insights : [{ tone: 'neutral', title: 'Sem alertas financeiros', text: 'Nenhum insight critico encontrado para o periodo.' }];
}

async function listStatementRequests() {
  return prisma.freightStatementRequest.findMany({ orderBy: { createdAt: 'desc' } });
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
  reviewExpense,
  removeExpense,
  getSummary,
  getCashFlow,
  getDre,
  getVehicleDre,
  getFunds,
  getSalarySettlements,
  getInsights,
  listStatementRequests,
  createStatementRequest,
  updateStatementRequest,
};
