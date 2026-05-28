import api from './api';

const apiOrigin = api.defaults.baseURL.replace(/\/api\/?$/, '');

function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function normalizeFileUrl(fileUrl) {
  if (!fileUrl) return fileUrl;

  try {
    const url = new URL(fileUrl);
    const publicObjectPath = '/storage/v1/object/public/';
    const publicObjectIndex = url.pathname.indexOf(publicObjectPath);

    if (url.hostname.endsWith('.supabase.co') && publicObjectIndex >= 0) {
      const pathParts = url.pathname.slice(publicObjectIndex + publicObjectPath.length).split('/');
      const objectPath = pathParts.slice(1).join('/');

      return objectPath ? `/uploads/supabase/${objectPath}` : fileUrl;
    }
  } catch (_error) {
    return fileUrl;
  }

  return fileUrl;
}

function publicFileUrl(fileUrl) {
  const normalized = normalizeFileUrl(fileUrl);
  return normalized?.startsWith('/uploads') ? `${apiOrigin}${normalized}` : normalized;
}

function normalizePhoto(photo) {
  const fileUrl = normalizeFileUrl(photo.fileUrl || photo.url || photo.preview);

  return {
    ...photo,
    name: photo.fileName || photo.name,
    fileUrl,
    url: publicFileUrl(fileUrl),
    preview: publicFileUrl(fileUrl),
    deliveryIndex: photo.deliveryIndex,
    deliveryNote: photo.deliveryNote,
    deliveredAt: photo.deliveredAt
  };
}

function normalizeRoute(route) {
  const mapStatus = {
    IN_PROGRESS: 'Em andamento',
    PENDING_REVIEW: 'Pendente de analise',
    COMPLETED: 'Concluida'
  };

  return {
    ...route,
    data: dateOnly(route.date),
    kmInicial: route.initialKm,
    kmFinal: route.finalKm,
    plannedDeliveries: route.plannedDeliveries,
    cidades: (route.cities || []).map(c => c.name),
    notas: (route.invoices || []).map(i => i.number),
    photos: (route.photos || []).map(normalizePhoto),
    status: mapStatus[route.status] || route.status,
    driver: route.driver?.name || 'Sem motorista'
  };
}

async function uploadPhoto(uri, name = 'foto.jpg') {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name,
  });
  const response = await api.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

async function photosPayload(photos = []) {
  const payload = [];
  for (const p of photos) {
    if (!p?.uri) continue;
    const uploaded = await uploadPhoto(p.uri, p.name || `foto-${Date.now()}.jpg`);
    payload.push({
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName || p.name || null
    });
  }
  return payload;
}

export async function getMyVehicle() {
  const response = await api.get('/vehicles/my-vehicle');
  return response.data;
}

export async function listRoutes() {
  const response = await api.get('/routes');
  return response.data.map(normalizeRoute);
}

export async function startRouteApi(payload) {
  const response = await api.post('/routes/start', {
    vehicleId: payload.vehicleId,
    initialKm: Number(payload.kmInicial),
    plannedDeliveries: payload.plannedDeliveries ? Number(payload.plannedDeliveries) : null
  });
  return normalizeRoute(response.data);
}

export async function addRouteDeliveryApi(routeId, payload) {
  const response = await api.post(`/routes/${routeId}/deliveries`, {
    note: payload.note || null,
    photos: await photosPayload(payload.photos || [])
  });
  return normalizeRoute(response.data);
}

export async function finishRouteApi(routeId, payload) {
  const response = await api.patch(`/routes/${routeId}/finish`, {
    finalKm: Number(payload.kmFinal),
    tollAmount: payload.tollAmount ? Number(payload.tollAmount) : null,
    cidades: payload.cidades || [],
    notas: payload.notas || [],
    photos: await photosPayload(payload.photos || [])
  });
  return normalizeRoute(response.data);
}

export async function reportRouteErrorApi(routeId, note) {
  const response = await api.patch(`/routes/${routeId}/request-correction`, { note });
  return normalizeRoute(response.data);
}
