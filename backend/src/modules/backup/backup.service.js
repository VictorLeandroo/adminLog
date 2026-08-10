const fs = require('fs/promises');
const path = require('path');

const prisma = require('../../lib/prisma');

const uploadDir = path.resolve(process.cwd(), 'uploads');

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'photos',
  };
}

function uniqueFileRefs(...groups) {
  const seen = new Set();
  const refs = [];

  groups.flat().filter(Boolean).forEach((item) => {
    const fileUrl = item.fileUrl;
    if (!fileUrl || seen.has(fileUrl)) return;

    seen.add(fileUrl);
    refs.push({
      fileUrl,
      fileName: item.fileName || item.name || path.basename(fileUrl),
      source: item.source || 'unknown',
    });
  });

  return refs;
}

function supabaseObjectPath(fileUrl) {
  const localPrefix = '/uploads/supabase/';
  if (fileUrl.startsWith(localPrefix)) return fileUrl.slice(localPrefix.length);

  try {
    const url = new URL(fileUrl);
    const publicPrefix = '/storage/v1/object/public/';
    const publicIndex = url.pathname.indexOf(publicPrefix);
    if (publicIndex < 0) return null;

    const parts = url.pathname.slice(publicIndex + publicPrefix.length).split('/');
    return parts.slice(1).join('/') || null;
  } catch (_error) {
    return null;
  }
}

async function readSupabaseFile(fileUrl) {
  const objectPath = supabaseObjectPath(fileUrl);
  const { url: supabaseUrl, key: supabaseKey, bucket } = supabaseConfig();

  if (!objectPath || !supabaseUrl || !supabaseKey) {
    throw new Error('Arquivo externo sem configuração de Supabase.');
  }

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) throw new Error(`Supabase respondeu ${response.status}.`);

  return {
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

async function readLocalFile(fileUrl) {
  if (!fileUrl.startsWith('/uploads/')) throw new Error('Arquivo não é local nem Supabase.');

  const filename = fileUrl.replace(/^\/uploads\//, '');
  const filePath = path.resolve(uploadDir, filename);
  const relative = path.relative(uploadDir, filePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Caminho de arquivo inválido.');
  }

  return {
    contentType: 'application/octet-stream',
    buffer: await fs.readFile(filePath),
  };
}

async function readStoredFile(fileUrl) {
  if (fileUrl.startsWith('/uploads/supabase/') || supabaseObjectPath(fileUrl)) return readSupabaseFile(fileUrl);
  return readLocalFile(fileUrl);
}

async function serializeFile(ref) {
  try {
    const { contentType, buffer } = await readStoredFile(ref.fileUrl);

    return {
      ...ref,
      ok: true,
      contentType,
      size: buffer.length,
      contentBase64: buffer.toString('base64'),
    };
  } catch (error) {
    return {
      ...ref,
      ok: false,
      error: error.message,
    };
  }
}

async function operationalSnapshot() {
  const [
    users,
    vehicles,
    vehicleDocuments,
    vehicleMaintenances,
    routes,
    routeCities,
    routeInvoices,
    routePhotos,
    freightSettings,
    expenses,
    expensePhotos,
    revenues,
    freightStatementRequests,
    financialFunds,
    financialFundMovements,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, photoUrl: true, photoName: true, createdAt: true, updatedAt: true } }),
    prisma.vehicle.findMany(),
    prisma.vehicleDocument.findMany(),
    prisma.vehicleMaintenance.findMany(),
    prisma.route.findMany(),
    prisma.routeCity.findMany(),
    prisma.routeInvoice.findMany(),
    prisma.routePhoto.findMany(),
    prisma.freightSetting.findMany(),
    prisma.expense.findMany(),
    prisma.expensePhoto.findMany(),
    prisma.revenue.findMany(),
    prisma.freightStatementRequest.findMany(),
    prisma.financialFund.findMany(),
    prisma.financialFundMovement.findMany(),
  ]);

  return {
    users,
    vehicles,
    vehicleDocuments,
    vehicleMaintenances,
    routes,
    routeCities,
    routeInvoices,
    routePhotos,
    freightSettings,
    expenses,
    expensePhotos,
    revenues,
    freightStatementRequests,
    financialFunds,
    financialFundMovements,
  };
}

function fileRefsFromSnapshot(snapshot) {
  return uniqueFileRefs(
    snapshot.users.map((user) => ({ fileUrl: user.photoUrl, fileName: user.photoName, source: `user:${user.id}` })),
    snapshot.vehicles.map((vehicle) => ({ fileUrl: vehicle.photoUrl, fileName: vehicle.photoName, source: `vehicle:${vehicle.id}` })),
    snapshot.vehicleDocuments.map((document) => ({ fileUrl: document.fileUrl, fileName: document.name, source: `vehicleDocument:${document.id}` })),
    snapshot.routePhotos.map((photo) => ({ fileUrl: photo.fileUrl, fileName: photo.fileName, source: `routePhoto:${photo.id}` })),
    snapshot.expensePhotos.map((photo) => ({ fileUrl: photo.fileUrl, fileName: photo.fileName, source: `expensePhoto:${photo.id}` })),
    snapshot.freightStatementRequests.map((request) => ({ fileUrl: request.fileUrl, source: `freightStatementRequest:${request.id}` })),
  );
}

async function createEmergencyBackup(user) {
  const snapshot = await operationalSnapshot();
  const fileRefs = fileRefsFromSnapshot(snapshot);
  const files = await Promise.all(fileRefs.map(serializeFile));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    excludes: ['user.passwordHash'],
    counts: Object.fromEntries(Object.entries(snapshot).map(([key, value]) => [key, value.length])),
    filesSummary: {
      total: files.length,
      available: files.filter((file) => file.ok).length,
      missing: files.filter((file) => !file.ok).length,
    },
    database: snapshot,
    files,
  };
}

module.exports = {
  createEmergencyBackup,
};
