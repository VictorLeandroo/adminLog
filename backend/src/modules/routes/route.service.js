const { z } = require('zod');
const { RouteStatus } = require('@prisma/client');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');

const prisma = require('../../lib/prisma');
const AppError = require('../../utils/AppError');

const FREIGHT_TEMPLATE_PATH = path.resolve(__dirname, '../../templates/frete-base.xlsx');
const FREIGHT_BLOCK_ROWS = [2, 11, 20, 29, 38, 47, 56, 65, 74, 83, 92];
const FREIGHT_TOTAL_ROW = 100;
const DEFAULT_FREIGHT_SETTINGS = {
  baseAmount: 400,
  includedKm: 120,
  excessKmAmount: 1.5,
};
const FREIGHT_SETTINGS_ID = 'default';

const startSchema = z.object({
  vehicleId: z.string().min(1),
  initialKm: z.number().int(),
  plannedDeliveries: z.number().int().min(0).optional().nullable(),
  date: z.string().optional(),
});

const createSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.string().optional(),
  initialKm: z.number().int(),
  finalKm: z.number().int().optional().nullable(),
  plannedDeliveries: z.number().int().min(0).optional().nullable(),
  freightAmount: z.number().optional().nullable(),
  status: z.enum(['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED']).optional(),
  cities: z.array(z.string()).optional(),
  cidades: z.array(z.string()).optional(),
  invoices: z.array(z.string()).optional(),
  invoiceNumbers: z.array(z.string()).optional(),
  notas: z.array(z.string()).optional(),
});

const finishSchema = z.object({
  finalKm: z.number().int(),
  plannedDeliveries: z.number().int().min(0).optional().nullable(),
  tollAmount: z.number().min(0).optional().nullable(),
  cities: z.array(z.string()).optional(),
  cidades: z.array(z.string()).optional(),
  invoices: z.array(z.string()).optional(),
  invoiceNumbers: z.array(z.string()).optional(),
  notas: z.array(z.string()).optional(),
  photos: z.array(z.object({
    fileUrl: z.string(),
    fileName: z.string().optional(),
    deliveryIndex: z.number().int().optional().nullable(),
    deliveryNote: z.string().optional().nullable(),
    deliveredAt: z.string().optional().nullable(),
  })).default([]),
});

const reviewSchema = finishSchema.extend({
  initialKm: z.number().int().optional(),
  freightAmount: z.number().optional().nullable(),
  status: z.enum(['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED']).optional(),
});

const deliveryProgressSchema = z.object({
  note: z.string().optional().nullable(),
  photos: z.array(z.object({
    fileUrl: z.string(),
    fileName: z.string().optional(),
  })).min(1),
});

const freightSettingsSchema = z.object({
  baseAmount: z.number().min(0),
  includedKm: z.number().int().min(0),
  excessKmAmount: z.number().min(0),
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

function normalizeFreightSettings(settings) {
  return {
    baseAmount: numberValue(settings?.baseAmount ?? DEFAULT_FREIGHT_SETTINGS.baseAmount),
    includedKm: Number(settings?.includedKm ?? DEFAULT_FREIGHT_SETTINGS.includedKm),
    excessKmAmount: numberValue(settings?.excessKmAmount ?? DEFAULT_FREIGHT_SETTINGS.excessKmAmount),
  };
}

async function getFreightSettings() {
  const settings = await prisma.freightSetting.findUnique({ where: { id: FREIGHT_SETTINGS_ID } });
  return normalizeFreightSettings(settings);
}

async function updateFreightSettings(input) {
  const data = freightSettingsSchema.parse(input);

  const settings = await prisma.freightSetting.upsert({
    where: { id: FREIGHT_SETTINGS_ID },
    create: {
      id: FREIGHT_SETTINGS_ID,
      baseAmount: data.baseAmount,
      includedKm: data.includedKm,
      excessKmAmount: data.excessKmAmount,
    },
    update: {
      baseAmount: data.baseAmount,
      includedKm: data.includedKm,
      excessKmAmount: data.excessKmAmount,
    },
  });

  return normalizeFreightSettings(settings);
}

function getFinishPayload(data) {
  return {
    cities: normalizeList(data.cities || data.cidades),
    invoices: normalizeList(data.invoices || data.invoiceNumbers || data.notas),
    photos: data.photos || [],
  };
}

function tollRouteDescription(routeId) {
  return `[ROUTE_TOLL:${routeId}] Pedagio da rota`;
}

function routeIdFromTollDescription(description) {
  const match = String(description || '').match(/^\[ROUTE_TOLL:([^\]]+)\]/);
  return match ? match[1] : null;
}

async function routeTollAmounts(routeIds, client = prisma) {
  const ids = [...new Set((routeIds || []).filter(Boolean))];
  if (!ids.length) return new Map();

  const expenses = await client.expense.findMany({
    where: {
      description: { in: ids.map(tollRouteDescription) },
    },
    select: {
      description: true,
      amount: true,
    },
  });

  return expenses.reduce((amounts, expense) => {
    const routeId = routeIdFromTollDescription(expense.description);
    if (!routeId) return amounts;

    amounts.set(routeId, (amounts.get(routeId) || 0) + numberValue(expense.amount));
    return amounts;
  }, new Map());
}

async function withTollAmount(route, client = prisma) {
  if (!route) return route;
  const amounts = await routeTollAmounts([route.id], client);
  return { ...route, tollAmount: amounts.get(route.id) || 0 };
}

async function withTollAmounts(routes, client = prisma) {
  const amounts = await routeTollAmounts(routes.map((route) => route.id), client);
  return routes.map((route) => ({ ...route, tollAmount: amounts.get(route.id) || 0 }));
}

async function listRoutes(user) {
  const routes = await prisma.route.findMany({
    where: user.role === 'DRIVER' ? { driverId: user.id } : undefined,
    include,
    orderBy: { createdAt: 'desc' },
  });

  return withTollAmounts(routes);
}

async function getRoute(id) {
  const route = await prisma.route.findUnique({ where: { id }, include });
  if (!route) throw new AppError('Rota nao encontrada', 404);
  return withTollAmount(route);
}

async function getActiveRoute(driverId) {
  const route = await prisma.route.findFirst({
    where: { driverId, status: RouteStatus.IN_PROGRESS },
    include,
  });

  return withTollAmount(route);
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

  const route = await prisma.route.create({
    data: {
      vehicleId: vehicle.id,
      driverId: user.id,
      date: data.date ? new Date(data.date) : new Date(),
      initialKm: data.initialKm,
      plannedDeliveries: data.plannedDeliveries || null,
      status: RouteStatus.IN_PROGRESS,
    },
    include,
  });

  return { ...route, tollAmount: 0 };
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

    const route = await tx.route.create({
      data: {
        vehicleId: vehicle.id,
        driverId: vehicle.driverId,
        date: data.date ? new Date(data.date) : new Date(),
        initialKm: data.initialKm,
        finalKm: hasFinishedData ? data.finalKm : null,
        plannedDeliveries: data.plannedDeliveries || null,
        freightAmount: data.freightAmount,
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

    return { ...route, tollAmount: 0 };
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

    const updatedRoute = await tx.route.update({
      where: { id },
      data: {
        finalKm: data.finalKm,
        plannedDeliveries: data.plannedDeliveries,
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
            deliveryIndex: photo.deliveryIndex || null,
            deliveryNote: photo.deliveryNote || null,
            deliveredAt: photo.deliveredAt ? new Date(photo.deliveredAt) : null,
          })),
        },
      },
      include,
    });

    await tx.expense.deleteMany({
      where: {
        vehicleId: route.vehicleId,
        description: tollRouteDescription(id),
      },
    });

    if (Number(data.tollAmount || 0) > 0) {
      await tx.expense.create({
        data: {
          vehicleId: route.vehicleId,
          createdById: user.id,
          date: new Date(updatedRoute.date),
          category: 'Pedagio',
          description: tollRouteDescription(id),
          amount: Number(data.tollAmount),
          paid: true,
        },
      });
    }

    return withTollAmount(updatedRoute, tx);
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

    const updatedRoute = await tx.route.update({
      where: { id },
      data: {
        initialKm: data.initialKm,
        finalKm: data.finalKm,
        plannedDeliveries: data.plannedDeliveries,
        freightAmount: data.freightAmount,
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
    });

    await tx.routePhoto.deleteMany({ where: { routeId: id } });

    if (payload.photos.length) {
      await tx.routePhoto.createMany({
        data: payload.photos.map((photo) => ({
          routeId: id,
          fileUrl: photo.fileUrl,
          fileName: photo.fileName || null,
          deliveryIndex: photo.deliveryIndex || null,
          deliveryNote: photo.deliveryNote || null,
          deliveredAt: photo.deliveredAt ? new Date(photo.deliveredAt) : null,
        })),
      });
    }

    await tx.expense.deleteMany({
      where: {
        vehicleId: route.vehicleId,
        description: tollRouteDescription(id),
      },
    });

    if (Number(data.tollAmount || 0) > 0) {
      await tx.expense.create({
        data: {
          vehicleId: route.vehicleId,
          createdById: route.driverId,
          date: new Date(updatedRoute.date),
          category: 'Pedagio',
          description: tollRouteDescription(id),
          amount: Number(data.tollAmount),
          paid: true,
        },
      });
    }

    const refreshedRoute = await tx.route.findUnique({ where: { id }, include });
    return withTollAmount(refreshedRoute, tx);
  });
}

async function addDeliveryProgress(user, id, input) {
  const data = deliveryProgressSchema.parse(input);
  const route = await getRoute(id);

  if (route.driverId !== user.id && user.role !== 'ADMIN') {
    throw new AppError('Acesso negado', 403);
  }

  if (route.status !== RouteStatus.IN_PROGRESS) {
    throw new AppError('So e possivel registrar entrega em rota em andamento', 400);
  }

  const nextIndex = route.photos.filter((photo) => photo.deliveredAt || photo.deliveryIndex).length + 1;

  const updatedRoute = await prisma.route.update({
    where: { id },
    data: {
      photos: {
        create: data.photos.map((photo, index) => ({
          fileUrl: photo.fileUrl,
          fileName: photo.fileName || null,
          deliveryIndex: nextIndex + index,
          deliveryNote: data.note || null,
          deliveredAt: new Date(),
        })),
      },
    },
    include,
  });

  return withTollAmount(updatedRoute);
}

async function removeRoute(id) {
  await getRoute(id);
  await prisma.$transaction(async (tx) => {
    await tx.expense.deleteMany({
      where: {
        description: tollRouteDescription(id),
      },
    });

    await tx.route.delete({ where: { id } });
  });
}

function dateOnly(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateRange(query) {
  const now = new Date();
  const start = query.startDate
    ? new Date(`${query.startDate}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() <= 15 ? 1 : 16);
  const end = query.endDate
    ? new Date(`${query.endDate}T23:59:59.999`)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError('Periodo invalido para gerar o frete', 400);
  }

  return { start, end };
}

function formatDate(value) {
  return value.toLocaleDateString('pt-BR');
}

function formatBRL(value) {
  if (value == null || value === '') return '';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatMoney(value) {
  return formatBRL(value || 0);
}

function setMoneyCell(worksheet, address, value) {
  const cell = worksheet.getCell(address);

  cell.value = formatBRL(value);

  cell.alignment = {
    horizontal: 'right',
    vertical: 'middle',
  };

  cell.numFmt = '@';
}

function positiveMoneyOrBlank(value) {
  return numberValue(value) > 0 ? numberValue(value) : '';
}

function applyFreightPageSetup(worksheet) {
  worksheet.pageSetup = {
    orientation: 'portrait',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    verticalCentered: false,
    printArea: `A1:D${FREIGHT_TOTAL_ROW}`,
  };
}

function formatDateShort(value) {
  return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function numberValue(value) {
  return Number(value || 0);
}

function routeKm(route) {
  return Math.max(0, numberValue(route.finalKm) - numberValue(route.initialKm));
}

function routeExcessKm(route, settings) {
  return Math.max(0, routeKm(route) - settings.includedKm);
}

function getDriverName(routes) {
  const names = [...new Set(routes.map((route) => route.driver?.name).filter(Boolean))];
  return names.length === 1 ? names[0] : 'GERAL';
}

function getFreightTitle(query, routes, start, end) {
  if (query.title) return String(query.title).toUpperCase();
  return `FRETE ${formatDateShort(start)} - ${formatDateShort(end)} - ${getDriverName(routes)}`.toUpperCase();
}

function expenseText(expense) {
  return `${expense.category || ''} ${expense.description || ''}`.toLowerCase();
}

function routeExtraAmount(route, expenses, keywords, categories = []) {
  return expenses
    .filter((expense) => expense.vehicleId === route.vehicleId && dateOnly(expense.date) === dateOnly(route.date))
    .filter((expense) => {
      const categoryText = String(expense.category || '').toLowerCase();
      return categories.includes(categoryText) || keywords.some((keyword) => expenseText(expense).includes(keyword));
    })
    .reduce((sum, expense) => sum + numberValue(expense.amount), 0);
}

function routeTollAmount(route, expenses) {
  const routeSpecificToll = expenses
    .filter((expense) => expense.description === tollRouteDescription(route.id))
    .reduce((sum, expense) => sum + numberValue(expense.amount), 0);

  if (routeSpecificToll > 0) return routeSpecificToll;

  if (route.tollAmount !== undefined && route.tollAmount !== null) return numberValue(route.tollAmount);

  return routeExtraAmount(route, expenses, ['pedagio', 'pedágio'], ['pedagio']);
}

function routeFreightValues(route, expenses, settings) {
  const excessKm = routeExcessKm(route, settings);
  const toll = routeTollAmount(route, expenses);
  const blueZone = routeExtraAmount(route, expenses, ['zona azul']);
  const unloading = routeExtraAmount(route, expenses, ['descarga']);
  const excessAmount = excessKm * settings.excessKmAmount;
  const calculatedTotal = settings.baseAmount + excessAmount + toll + blueZone + unloading;
  const manualAmount = route.freightAmount !== null && route.freightAmount !== undefined
    ? numberValue(route.freightAmount)
    : null;
  const total = manualAmount ?? calculatedTotal;

  return {
    km: routeKm(route),
    excessKm,
    excessAmount,
    toll,
    blueZone,
    unloading,
    total,
    manualAmount,
    baseAmount: settings.baseAmount,
    includedKm: settings.includedKm,
    excessKmAmount: settings.excessKmAmount,
  };
}

function setCellValue(worksheet, address, value) {
  worksheet.getCell(address).value = value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getFreightData(query) {
  const { start, end } = parseDateRange(query);
  const routes = await prisma.route.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { not: RouteStatus.IN_PROGRESS },
    },
    include,
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  const [expenses, settings] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      select: {
        vehicleId: true,
        date: true,
        category: true,
        description: true,
        amount: true,
      },
    }),
    getFreightSettings(),
  ]);

  return {
    start,
    end,
    routes,
    expenses,
    settings,
    title: getFreightTitle(query, routes, start, end),
  };
}

function hideBlockRows(worksheet, startRow) {
  for (let rowNumber = startRow; rowNumber <= startRow + 8; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.hidden = true;
    row.height = 0;
  }
}

function showBlockRows(worksheet, startRow) {
  for (let rowNumber = startRow; rowNumber <= startRow + 8; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.hidden = false;
  }
}

function fillRouteBlock(worksheet, route, expenses, settings, startRow) {
  const values = routeFreightValues(route, expenses, settings);
  const cities = route.cities.map((city) => city.name).join(', ');
  const invoices = route.invoices.map((invoice) => invoice.number).join(', ');

  showBlockRows(worksheet, startRow);

  setCellValue(worksheet, `A${startRow + 1}`, formatDate(route.date));
  setCellValue(worksheet, `C${startRow + 1}`, cities);

  setMoneyCell(worksheet, `D${startRow + 2}`, values.baseAmount);
  setCellValue(worksheet, `A${startRow + 2}`, invoices);

  setMoneyCell(worksheet, `D${startRow + 3}`, values.excessAmount);

  setCellValue(worksheet, `A${startRow + 5}`, numberValue(route.initialKm));
  setCellValue(worksheet, `B${startRow + 5}`, numberValue(route.finalKm));

  setMoneyCell(worksheet, `D${startRow + 4}`, positiveMoneyOrBlank(values.toll));
  setMoneyCell(worksheet, `D${startRow + 5}`, positiveMoneyOrBlank(values.blueZone));

  setCellValue(worksheet, `B${startRow + 6}`, numberValue(values.km));
  setMoneyCell(worksheet, `D${startRow + 6}`, positiveMoneyOrBlank(values.unloading));

  setCellValue(worksheet, `B${startRow + 7}`, numberValue(values.excessKm));
  setMoneyCell(worksheet, `D${startRow + 7}`, values.total);

  return numberValue(values.total);
}

async function buildFreightWorkbook(routes, expenses, settings, { start, end, title }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FREIGHT_TEMPLATE_PATH);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new AppError('Template de frete invalido', 500);

  if (routes.length > FREIGHT_BLOCK_ROWS.length) {
    throw new AppError(`O template de frete suporta ate ${FREIGHT_BLOCK_ROWS.length} rotas por arquivo`, 400);
  }

  setCellValue(worksheet, 'A1', title);

  let total = 0;
  FREIGHT_BLOCK_ROWS.forEach((startRow, index) => {
    const route = routes[index];
    if (!route) {
      hideBlockRows(worksheet, startRow);
      return;
    }

    total += fillRouteBlock(worksheet, route, expenses, settings, startRow);
  });

  setCellValue(worksheet, `A${FREIGHT_TOTAL_ROW}`, 'TOTAL GERAL');
  setMoneyCell(worksheet, `D${FREIGHT_TOTAL_ROW}`, total);
  worksheet.getRow(FREIGHT_TOTAL_ROW).hidden = false;
  applyFreightPageSetup(worksheet);

  return workbook.xlsx.writeBuffer();
}

function runProcess(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', () => resolve({ ok: false }));
    child.on('close', (code) => resolve({ ok: code === 0, stderr }));
  });
}

async function convertXlsxToPdf(xlsxBuffer, filename) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frete-'));
  const xlsxPath = path.join(tempDir, filename);
  const pdfPath = xlsxPath.replace(/\.xlsx$/i, '.pdf');
  const commands = [process.env.LIBREOFFICE_PATH, 'soffice', 'libreoffice'].filter(Boolean);

  try {
    await fs.writeFile(xlsxPath, xlsxBuffer);

    for (const command of commands) {
      const result = await runProcess(command, [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        tempDir,
        xlsxPath,
      ]);

      if (!result.ok) continue;

      try {
        return await fs.readFile(pdfPath);
      } catch (error) {
        continue;
      }
    }

    return null;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function generateFreightPdf(query) {
  const { start, end, routes, expenses, settings, title } = await getFreightData(query);
  const xlsxFilename = `frete-${dateOnly(start)}-${dateOnly(end)}.xlsx`;
  const xlsxBuffer = Buffer.from(await buildFreightWorkbook(routes, expenses, settings, { start, end, title }));
  const pdfBuffer = await convertXlsxToPdf(xlsxBuffer, xlsxFilename);

  if (!pdfBuffer) {
    throw new AppError('Nao foi possivel converter a planilha de frete para PDF. Instale o LibreOffice no servidor ou configure LIBREOFFICE_PATH.', 500);
  }

  const filename = xlsxFilename.replace(/\.xlsx$/i, '.pdf');

  return { buffer: pdfBuffer, filename, contentType: 'application/pdf' };
}

function renderFreightRouteBlock(route, expenses, settings) {
  const values = routeFreightValues(route, expenses, settings);
  const cities = route.cities.map((city) => city.name).join(', ') || 'ENTREGA';
  const invoices = route.invoices.map((invoice) => invoice.number).join(', ');
  const manualNote = values.manualAmount !== null ? ' (manual)' : '';

  return `
    <section class="route-block">
      <div class="grid head">
        <div class="date-head">DATA</div>
        <div>DISCRIMINACAO</div>
        <div class="value-head">VALOR</div>
      </div>
      <div class="grid main-row">
        <div class="date-cell">${escapeHtml(formatDate(route.date))}</div>
        <div class="description">${escapeHtml(cities)}</div>
        <div class="value-cell"></div>
      </div>
      <div class="grid">
        <div class="left notes">${escapeHtml(invoices)}</div>
        <div class="label">Saida (ate ${values.includedKm}km)</div>
        <div class="amount">${formatMoney(values.baseAmount)}</div>
      </div>
      <div class="grid">
        <div class="left strong">Quilometragem</div>
        <div class="label">Kms excedentes (${formatMoney(values.excessKmAmount)})</div>
        <div class="amount">${formatMoney(values.excessAmount)}</div>
      </div>
      <div class="grid">
        <div class="km-pair">
          <span>Inicial</span>
          <strong>${numberValue(route.initialKm)}</strong>
        </div>
        <div class="label">Pedagios</div>
        <div class="amount">${values.toll ? formatMoney(values.toll) : ''}</div>
      </div>
      <div class="grid">
        <div class="km-pair">
          <span>Final</span>
          <strong>${numberValue(route.finalKm)}</strong>
        </div>
        <div class="label">Zona Azul</div>
        <div class="amount">${values.blueZone ? formatMoney(values.blueZone) : ''}</div>
      </div>
      <div class="grid">
        <div class="km-pair">
          <span>KM rodados</span>
          <strong>${values.km}</strong>
        </div>
        <div class="label">Descarga</div>
        <div class="amount">${values.unloading ? formatMoney(values.unloading) : ''}</div>
      </div>
      <div class="grid total-row">
        <div class="km-pair">
          <span>Km excedente</span>
          <strong>${values.excessKm}</strong>
        </div>
        <div class="label">TOTAL${manualNote}</div>
        <div class="amount">${formatMoney(values.total)}</div>
      </div>
    </section>
  `;
}

async function generateFreightHtml(query) {
  const { routes, expenses, settings, title } = await getFreightData(query);
  const total = routes.reduce((sum, route) => sum + routeFreightValues(route, expenses, settings).total, 0);
  const blocks = routes.length
    ? routes.map((route) => renderFreightRouteBlock(route, expenses, settings)).join('')
    : '<p class="empty">Nenhuma rota concluida encontrada nesse periodo.</p>';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111;
      background: #f3f4f6;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }
    .sheet {
      width: 190mm;
      min-height: 277mm;
      margin: 12px auto;
      background: #fff;
      padding: 0;
    }
    .title {
      display: grid;
      grid-template-columns: 1fr 30mm;
      background: #fff200;
      border: 1px solid #111;
      border-bottom: 0;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
    }
    .title div {
      min-height: 14px;
      padding: 2px 4px;
      border-right: 1px solid #111;
    }
    .title div:last-child { border-right: 0; }
    .route-block {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #111;
      border-bottom: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: 47mm 1fr 30mm;
      min-height: 15px;
      border-bottom: 1px solid #555;
    }
    .grid > * {
      padding: 2px 4px;
      border-right: 1px solid #555;
      display: flex;
      align-items: center;
      min-width: 0;
    }
    .grid > *:last-child { border-right: 0; }
    .head {
      min-height: 13px;
      font-weight: 700;
      text-align: center;
    }
    .head > * { justify-content: center; }
    .date-head { grid-column: 1; }
    .value-head { grid-column: 3; }
    .main-row { min-height: 17px; }
    .date-cell, .description { font-weight: 600; }
    .description {
      justify-content: center;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .notes {
      align-items: flex-start;
      overflow-wrap: anywhere;
      line-height: 1.25;
    }
    .strong { font-weight: 700; justify-content: center; }
    .label { justify-content: center; text-align: center; }
    .amount {
      justify-content: flex-end;
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .km-pair {
      justify-content: space-between;
      gap: 8px;
    }
    .km-pair strong { font-variant-numeric: tabular-nums; }
    .total-row {
      min-height: 16px;
      font-weight: 700;
    }
    .grand-total {
      display: grid;
      grid-template-columns: 1fr 30mm;
      min-height: 17px;
      background: #fff200;
      border: 1px solid #111;
      font-weight: 700;
    }
    .grand-total div {
      padding: 3px 5px;
      border-right: 1px solid #111;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    .grand-total div:last-child { border-right: 0; }
    .empty {
      border: 1px solid #111;
      margin: 0;
      padding: 18px;
      text-align: center;
    }
    .print-hint {
      position: sticky;
      top: 0;
      margin: 0 auto;
      padding: 10px 12px;
      width: 190mm;
      background: #111827;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }
    .print-hint button {
      border: 0;
      background: #fff200;
      color: #111;
      padding: 8px 12px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      body { background: #fff; }
      .sheet { width: auto; min-height: 0; margin: 0; }
      .print-hint { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-hint">
    <span>Relatorio pronto. Na janela de impressao, escolha "Salvar como PDF".</span>
    <button onclick="window.print()">Imprimir / salvar PDF</button>
  </div>
  <main class="sheet">
    <header class="title">
      <div>${escapeHtml(title)}</div>
      <div>PLACA</div>
    </header>
    ${blocks}
    <footer class="grand-total">
      <div>TOTAL GERAL</div>
      <div>${formatMoney(total)}</div>
    </footer>
  </main>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 350);
    });
  </script>
</body>
</html>`;
}

module.exports = {
  listRoutes,
  getActiveRoute,
  getFreightSettings,
  updateFreightSettings,
  startRoute,
  createRoute,
  finishRoute,
  addDeliveryProgress,
  reportError,
  reviewRoute,
  removeRoute,
  generateFreightPdf,
  generateFreightHtml,
};
