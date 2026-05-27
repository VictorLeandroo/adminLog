import api from './api'

const apiOrigin = api.defaults.baseURL.replace(/\/api\/?$/, '')

const statusFromApi = {
  OK: 'Em dia',
  ATTENTION: 'Atencao',
  MAINTENANCE: 'Manutencao',
  IN_PROGRESS: 'Em andamento',
  PENDING_REVIEW: 'Pendente de analise',
  COMPLETED: 'Concluida',
  REQUESTED: 'Solicitado',
  PROCESSING: 'Processando',
  DONE: 'Concluido',
  CANCELED: 'Cancelado'
}

const vehicleStatusToApi = {
  'Em dia': 'OK',
  Atencao: 'ATTENTION',
  Manutencao: 'MAINTENANCE'
}

const routeStatusToApi = {
  'Em andamento': 'IN_PROGRESS',
  'Pendente de analise': 'PENDING_REVIEW',
  Concluida: 'COMPLETED'
}

function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export function parseLocalDate(value) {
  if (!value) return null

  if (value instanceof Date) return value

  const dateText = String(value)
  const dateOnlyMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return new Date(value)
}

export function formatLocalDate(value, options = {}) {
  const parsed = parseLocalDate(value)
  return parsed ? parsed.toLocaleDateString('pt-BR', options) : '-'
}

export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function normalizePhoto(photo) {
  const fileUrl = photo.fileUrl || photo.url || photo.preview

  return {
    ...photo,
    name: photo.fileName || photo.name,
    url: fileUrl?.startsWith('/uploads') ? `${apiOrigin}${fileUrl}` : fileUrl,
    fileUrl
  }
}

export function getQuinzenna(date) {
  const day = parseLocalDate(date).getDate()
  return day <= 15 ? 1 : 2
}

export function normalizeVehicle(vehicle) {
  const photoUrl = vehicle.photoUrl?.startsWith('/uploads') ? `${apiOrigin}${vehicle.photoUrl}` : vehicle.photoUrl

  return {
    ...vehicle,
    driver: vehicle.driver?.name || 'Sem motorista',
    photoUrl,
    photoName: vehicle.photoName,
    nextMaintenanceAt: vehicle.nextMaintenanceAtKm || '',
    status: statusFromApi[vehicle.status] || vehicle.status,
    licenseValidUntil: dateOnly(vehicle.licenseValidUntil),
    insuranceValidUntil: dateOnly(vehicle.insuranceValidUntil),
    documents: (vehicle.documents || []).map(document => ({
      ...document,
      url: document.fileUrl?.startsWith('/uploads') ? `${apiOrigin}${document.fileUrl}` : document.fileUrl,
      updatedAt: document.updatedAt || document.createdAt
    })),
    maintenances: (vehicle.maintenances || []).map(item => ({
      ...item,
      amount: Number(item.amount || 0),
      date: dateOnly(item.date)
    }))
  }
}

export function normalizeRoute(route) {
  return {
    ...route,
    data: dateOnly(route.date),
    kmInicial: route.initialKm,
    kmFinal: route.finalKm,
    freightAmount: Number(route.freightAmount || 0),
    cidades: (route.cities || []).map(city => city.name),
    notas: (route.invoices || []).map(invoice => invoice.number),
    photos: (route.photos || []).map(normalizePhoto),
    status: statusFromApi[route.status] || route.status,
    driver: route.driver?.name || 'Sem motorista'
  }
}

export function normalizeExpense(expense) {
  return {
    ...expense,
    amount: Number(expense.amount || 0),
    date: dateOnly(expense.date),
    quinzenna: getQuinzenna(expense.date),
    photos: (expense.photos || []).map(normalizePhoto)
  }
}

export function normalizeRevenue(revenue) {
  return {
    ...revenue,
    amount: Number(revenue.amount || 0),
    date: dateOnly(revenue.date),
    quinzenna: getQuinzenna(revenue.date)
  }
}

export function normalizeStatementRequest(request) {
  return {
    ...request,
    startDate: dateOnly(request.startDate),
    endDate: dateOnly(request.endDate),
    status: statusFromApi[request.status] || request.status
  }
}

async function uploadFile(file) {
  const fileToUpload = await compressImageFile(file)
  const formData = new FormData()
  formData.append('file', fileToUpload)
  const response = await api.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Nao foi possivel carregar a imagem.'))
    }
    image.src = url
  })
}

async function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => {
    canvas.toBlob(resolve, type, quality)
  })
}

async function compressImageFile(file) {
  if (!file?.type?.startsWith('image/')) return file

  const maxSize = 1600
  const quality = 0.74
  const image = await loadImage(file)
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  if (!blob || blob.size >= file.size) return file

  const filename = file.name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${filename}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now()
  })
}

async function photoPayload(photo) {
  if (photo.file) {
    const uploaded = await uploadFile(photo.file)
    return {
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName
    }
  }

  return {
    fileUrl: photo.fileUrl || photo.url || photo.preview || '#',
    fileName: photo.file?.name || photo.name || photo.fileName
  }
}

async function photosPayload(photos = []) {
  return Promise.all(photos.map(photoPayload))
}

export async function listVehicles() {
  const response = await api.get('/vehicles')
  return response.data.map(normalizeVehicle)
}

export async function getDashboardData(query = {}) {
  const response = await api.get('/dashboard', { params: query })
  return response.data
}

export async function listDrivers() {
  const response = await api.get('/auth/drivers')
  return response.data
}

export async function getMyVehicle() {
  const response = await api.get('/vehicles/my-vehicle')
  return [normalizeVehicle(response.data)]
}

export async function saveVehicleApi(vehicle) {
  const uploadedPhoto = vehicle.photo?.file ? await photoPayload(vehicle.photo) : null
  const payload = {
    model: vehicle.model,
    year: vehicle.year ? Number(vehicle.year) : null,
    plate: vehicle.plate,
    currentKm: Number(vehicle.currentKm || 0),
    nextMaintenanceAtKm: vehicle.nextMaintenanceAt ? Number(vehicle.nextMaintenanceAt) : null,
    renavam: vehicle.renavam || null,
    chassis: vehicle.chassis || null,
    photoUrl: uploadedPhoto?.fileUrl || vehicle.photoUrl || null,
    photoName: uploadedPhoto?.fileName || vehicle.photoName || null,
    licenseValidUntil: vehicle.licenseValidUntil || null,
    insuranceValidUntil: vehicle.insuranceValidUntil || null,
    status: vehicleStatusToApi[vehicle.status] || 'OK',
    driverId: vehicle.driverId || null
  }

  const response = vehicle.id
    ? await api.put(`/vehicles/${vehicle.id}`, payload)
    : await api.post('/vehicles', payload)

  return normalizeVehicle(response.data)
}

export async function removeVehicleApi(id) {
  await api.delete(`/vehicles/${id}`)
}

export async function createMaintenanceApi(vehicleId, maintenance) {
  const payload = {
    type: maintenance.type,
    date: maintenance.date,
    km: Number(maintenance.km || 0),
    workshop: maintenance.workshop || null,
    amount: maintenance.amount ? Number(maintenance.amount) : null,
    nextDueKm: maintenance.nextDueKm ? Number(maintenance.nextDueKm) : null,
    note: maintenance.note || null
  }

  await api.post(`/vehicles/${vehicleId}/maintenances`, payload)
}

export async function createDocumentApi(vehicleId, document) {
  const uploaded = document.file ? await uploadFile(document.file) : null
  const payload = {
    name: document.name,
    type: document.type === 'PDF' ? 'OTHER' : document.type || 'OTHER',
    fileUrl: uploaded?.fileUrl || document.fileUrl || document.url || '#',
    expiresAt: document.expiresAt || null
  }

  await api.post(`/vehicles/${vehicleId}/documents`, payload)
}

export async function listRoutes() {
  const response = await api.get('/routes')
  return response.data.map(normalizeRoute)
}

export async function getActiveRoute() {
  const response = await api.get('/routes/active')
  return response.data ? normalizeRoute(response.data) : null
}

export async function startRouteApi(payload) {
  const response = await api.post('/routes/start', {
    vehicleId: payload.vehicleId,
    initialKm: Number(payload.kmInicial),
    date: payload.date
  })
  return normalizeRoute(response.data)
}

export async function createRouteApi(payload) {
  const response = await api.post('/routes', {
    vehicleId: payload.vehicleId,
    date: payload.date,
    initialKm: Number(payload.kmInicial),
    finalKm: payload.kmFinal ? Number(payload.kmFinal) : null,
    freightAmount: payload.freightAmount ? Number(payload.freightAmount) : null,
    cidades: payload.cidades,
    notas: payload.notas,
    status: routeStatusToApi[payload.status]
  })
  return normalizeRoute(response.data)
}

export async function finishRouteApi(id, payload) {
  const response = await api.patch(`/routes/${id}/finish`, {
    finalKm: Number(payload.kmFinal),
    cidades: payload.cidades,
    notas: payload.notas,
    photos: await photosPayload(payload.photos)
  })
  return normalizeRoute(response.data)
}

export async function reviewRouteApi(id, payload) {
  const response = await api.patch(`/routes/${id}/review`, {
    initialKm: Number(payload.kmInicial),
    finalKm: Number(payload.kmFinal),
    freightAmount: payload.freightAmount ? Number(payload.freightAmount) : null,
    cidades: payload.cidades,
    notas: payload.notas,
    status: routeStatusToApi[payload.status]
  })
  return normalizeRoute(response.data)
}

export async function reportRouteErrorApi(id, note) {
  const response = await api.patch(`/routes/${id}/request-correction`, { note })
  return normalizeRoute(response.data)
}

export async function removeRouteApi(id) {
  await api.delete(`/routes/${id}`)
}

export async function downloadFreightPdf(params) {
  const response = await api.get('/routes/freight-pdf', {
    params,
    responseType: 'blob'
  })
  const disposition = response.headers['content-disposition'] || ''
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
  return {
    blob: response.data,
    filename: filenameMatch?.[1]
  }
}

export async function getFreightReportHtml(params) {
  const response = await api.get('/routes/freight-report', {
    params,
    responseType: 'text'
  })
  return response.data
}

export async function listExpenses(query = {}) {
  const response = await api.get('/finance/expenses', { params: query })
  return response.data.map(normalizeExpense)
}

export async function listRevenues(query = {}) {
  const response = await api.get('/finance/revenues', { params: query })
  return response.data.map(normalizeRevenue)
}

export async function saveRevenueApi(revenue) {
  const payload = {
    date: revenue.date,
    description: revenue.description,
    company: revenue.company || null,
    amount: Number(revenue.amount || 0),
    paid: revenue.paid !== false
  }

  const response = revenue.id
    ? await api.put(`/finance/revenues/${revenue.id}`, payload)
    : await api.post('/finance/revenues', payload)

  return normalizeRevenue(response.data)
}

export async function removeRevenueApi(id) {
  await api.delete(`/finance/revenues/${id}`)
}

export async function saveExpenseApi(expense) {
  const payload = {
    vehicleId: expense.vehicleId || null,
    date: expense.date,
    category: expense.category,
    description: expense.description || null,
    amount: Number(expense.amount || 0),
    paid: expense.paid !== false,
    photos: await photosPayload(expense.photos)
  }

  const response = expense.id
    ? await api.put(`/finance/expenses/${expense.id}`, payload)
    : await api.post('/finance/expenses', payload)

  return normalizeExpense(response.data)
}

export async function removeExpenseApi(id) {
  await api.delete(`/finance/expenses/${id}`)
}

export async function listStatementRequests() {
  const response = await api.get('/finance/statement-requests')
  return response.data.map(normalizeStatementRequest)
}

export async function createStatementRequestApi(payload) {
  const response = await api.post('/finance/statement-requests', payload)
  return normalizeStatementRequest(response.data)
}

export async function listUsers() {
  const response = await api.get('/auth/users')
  return response.data
}

export async function saveUserApi(user) {
  const payload = {
    name: user.name,
    email: user.email,
    role: user.role || 'DRIVER',
    active: user.active !== false
  }

  if (!user.id || user.password) payload.password = user.password

  const response = user.id
    ? await api.put(`/auth/users/${user.id}`, payload)
    : await api.post('/auth/users', payload)

  return response.data
}

export async function resetUserPasswordApi(id, password) {
  const response = await api.patch(`/auth/users/${id}/password`, { password })
  return response.data
}

export async function setUserActiveApi(user, active) {
  return saveUserApi({ ...user, active })
}
