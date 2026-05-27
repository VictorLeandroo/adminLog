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
const BASE_FREIGHT_AMOUNT = 400;
const INCLUDED_KM = 120;
const EXCESS_KM_AMOUNT = 1.5;

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
  freightAmount: z.number().optional().nullable(),
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
      include,
    });
  });
}

async function removeRoute(id) {
  await getRoute(id);
  await prisma.route.delete({ where: { id } });
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

function formatDateShort(value) {
  return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function numberValue(value) {
  return Number(value || 0);
}

function routeKm(route) {
  return Math.max(0, numberValue(route.finalKm) - numberValue(route.initialKm));
}

function routeExcessKm(route) {
  return Math.max(0, routeKm(route) - INCLUDED_KM);
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

function routeExtraAmount(route, expenses, keywords) {
  return expenses
    .filter((expense) => expense.vehicleId === route.vehicleId && dateOnly(expense.date) === dateOnly(route.date))
    .filter((expense) => keywords.some((keyword) => expenseText(expense).includes(keyword)))
    .reduce((sum, expense) => sum + numberValue(expense.amount), 0);
}

function routeFreightValues(route, expenses) {
  const excessKm = routeExcessKm(route);
  const toll = routeExtraAmount(route, expenses, ['pedagio', 'pedágio']);
  const blueZone = routeExtraAmount(route, expenses, ['zona azul']);
  const unloading = routeExtraAmount(route, expenses, ['descarga']);
  const excessAmount = excessKm * EXCESS_KM_AMOUNT;
  const total = BASE_FREIGHT_AMOUNT + excessAmount + toll + blueZone + unloading;

  return { km: routeKm(route), excessKm, excessAmount, toll, blueZone, unloading, total };
}

function setCellValue(worksheet, address, value) {
  worksheet.getCell(address).value = value;
}

function moneyOrBlank(value) {
  return numberValue(value) > 0 ? numberValue(value) : null;
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

function fillRouteBlock(worksheet, route, expenses, startRow) {
  const values = routeFreightValues(route, expenses);
  const cities = route.cities.map((city) => city.name).join(', ') || 'ENTREGA';
  const invoices = route.invoices.map((invoice) => invoice.number).join(', ');

  showBlockRows(worksheet, startRow);
  setCellValue(worksheet, `A${startRow + 1}`, formatDate(route.date));
  setCellValue(worksheet, `C${startRow + 1}`, cities);
  setCellValue(worksheet, `D${startRow + 2}`, BASE_FREIGHT_AMOUNT);
  setCellValue(worksheet, `A${startRow + 3}`, invoices);
  setCellValue(worksheet, `D${startRow + 3}`, values.excessAmount);
  setCellValue(worksheet, `A${startRow + 5}`, numberValue(route.initialKm));
  setCellValue(worksheet, `B${startRow + 5}`, numberValue(route.finalKm));
  setCellValue(worksheet, `D${startRow + 4}`, moneyOrBlank(values.toll));
  setCellValue(worksheet, `D${startRow + 5}`, moneyOrBlank(values.blueZone));
  setCellValue(worksheet, `B${startRow + 6}`, values.km);
  setCellValue(worksheet, `D${startRow + 6}`, moneyOrBlank(values.unloading));
  setCellValue(worksheet, `B${startRow + 7}`, values.excessKm);
  setCellValue(worksheet, `D${startRow + 7}`, values.total);

  return values.total;
}

function applyFreightFormatting(worksheet) {
  FREIGHT_BLOCK_ROWS.forEach((startRow) => {
    [startRow + 2, startRow + 3, startRow + 4, startRow + 5, startRow + 6, startRow + 7].forEach((rowNumber) => {
      worksheet.getCell(`D${rowNumber}`).numFmt = '"R$" #,##0.00';
    });
  });
  worksheet.getCell(`D${FREIGHT_TOTAL_ROW}`).numFmt = '"R$" #,##0.00';
  worksheet.pageSetup = {
    ...worksheet.pageSetup,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    printArea: `A1:D${FREIGHT_TOTAL_ROW}`,
  };
}

async function buildFreightWorkbook(routes, expenses, { start, end, title }) {
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

    total += fillRouteBlock(worksheet, route, expenses, startRow);
  });

  setCellValue(worksheet, `A${FREIGHT_TOTAL_ROW}`, 'TOTAL GERAL');
  setCellValue(worksheet, `D${FREIGHT_TOTAL_ROW}`, total);
  worksheet.getRow(FREIGHT_TOTAL_ROW).hidden = false;
  applyFreightFormatting(worksheet);

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
  const { start, end } = parseDateRange(query);
  const routes = await prisma.route.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { not: RouteStatus.IN_PROGRESS },
    },
    include,
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
    select: {
      vehicleId: true,
      date: true,
      category: true,
      description: true,
      amount: true,
    },
  });

  const title = getFreightTitle(query, routes, start, end);
  const xlsxFilename = `frete-${dateOnly(start)}-${dateOnly(end)}.xlsx`;
  const xlsxBuffer = Buffer.from(await buildFreightWorkbook(routes, expenses, { start, end, title }));
  const pdfBuffer = await convertXlsxToPdf(xlsxBuffer, xlsxFilename);

  if (!pdfBuffer) {
    return {
      buffer: xlsxBuffer,
      filename: xlsxFilename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  const filename = xlsxFilename.replace(/\.xlsx$/i, '.pdf');

  return { buffer: pdfBuffer, filename, contentType: 'application/pdf' };
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
  generateFreightPdf,
};
