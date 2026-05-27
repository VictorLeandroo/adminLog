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

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function escapePdfText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function truncate(value, max = 32) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function drawText(commands, text, x, y, size = 8) {
  commands.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
}

function drawLine(commands, x1, y1, x2, y2) {
  commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
}

function buildPdf(routes, { start, end, title = 'Relatorio de frete' }) {
  const width = 842;
  const height = 595;
  const margin = 32;
  const rowHeight = 22;
  const rowsPerPage = 18;
  const columns = [
    { title: 'DATA', x: 36, w: 55 },
    { title: 'MOTORISTA', x: 96, w: 98 },
    { title: 'VEICULO', x: 200, w: 92 },
    { title: 'CIDADES', x: 298, w: 140 },
    { title: 'NOTAS', x: 444, w: 108 },
    { title: 'KM', x: 558, w: 70 },
    { title: 'VALOR', x: 634, w: 84 },
  ];
  const pages = [];
  const totalPages = Math.max(1, Math.ceil(routes.length / rowsPerPage));
  const totalKm = routes.reduce((sum, route) => sum + Math.max(0, Number(route.finalKm || 0) - Number(route.initialKm || 0)), 0);
  const totalFreight = routes.reduce((sum, route) => sum + Number(route.freightAmount || 0), 0);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const commands = ['0.8 w'];
    const pageRows = routes.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    const tableTop = 485;

    drawText(commands, title.toUpperCase(), margin, 550, 16);
    drawText(commands, `Periodo: ${formatDate(start)} a ${formatDate(end)}`, margin, 528, 10);
    drawText(commands, `Gerado em: ${formatDate(new Date())}`, 650, 528, 9);

    drawLine(commands, margin, 516, width - margin, 516);

    columns.forEach((column) => drawText(commands, column.title, column.x, tableTop + 8, 8));
    drawLine(commands, margin, tableTop, 722, tableTop);
    drawLine(commands, margin, tableTop + rowHeight, 722, tableTop + rowHeight);

    pageRows.forEach((route, index) => {
      const y = tableTop - ((index + 1) * rowHeight) + 8;
      const km = Math.max(0, Number(route.finalKm || 0) - Number(route.initialKm || 0));
      const cityText = route.cities.map((city) => city.name).join(', ');
      const invoiceText = route.invoices.map((invoice) => invoice.number).join(', ');
      const vehicleText = `${route.vehicle.plate || ''} ${route.vehicle.model || ''}`.trim();

      drawText(commands, formatDate(route.date), columns[0].x, y, 7);
      drawText(commands, truncate(route.driver.name, 17), columns[1].x, y, 7);
      drawText(commands, truncate(vehicleText, 16), columns[2].x, y, 7);
      drawText(commands, truncate(cityText, 26), columns[3].x, y, 7);
      drawText(commands, truncate(invoiceText, 20), columns[4].x, y, 7);
      drawText(commands, `${km} km`, columns[5].x, y, 7);
      drawText(commands, formatMoney(route.freightAmount), columns[6].x, y, 7);
      drawLine(commands, margin, tableTop - ((index + 1) * rowHeight), 722, tableTop - ((index + 1) * rowHeight));
    });

    columns.forEach((column) => {
      drawLine(commands, column.x - 4, tableTop + rowHeight, column.x - 4, tableTop - (rowsPerPage * rowHeight));
    });
    drawLine(commands, 722, tableTop + rowHeight, 722, tableTop - (rowsPerPage * rowHeight));

    if (pageIndex === totalPages - 1) {
      drawText(commands, `TOTAL KM: ${totalKm} km`, 500, 58, 10);
      drawText(commands, `TOTAL FRETE: ${formatMoney(totalFreight)}`, 620, 58, 10);
    }

    drawText(commands, `Pagina ${pageIndex + 1}`, 760, 28, 8);
    pages.push(commands.join('\n'));
  }

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${(index * 2) + 3} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ];

  pages.forEach((content, index) => {
    const pageObjectNumber = (index * 2) + 3;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
  });

  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, 'latin1');
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

  const title = query.title || `Frete - ${dateOnly(start)} a ${dateOnly(end)}`;
  const buffer = buildPdf(routes, { start, end, title });
  const filename = `frete-${dateOnly(start)}-${dateOnly(end)}.pdf`;

  return { buffer, filename };
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
