import api from './api'
import { normalizeUser } from './backendService'

export async function loginUser(email, password) {
  const response = await api.post('/auth/login', { email, password })
  return {
    ...response.data,
    user: normalizeUser(response.data.user)
  }
}

export async function registerUser(name, email, password, role = 'DRIVER') {
  const response = await api.post('/auth/register', { name, email, password, role })
  return response.data
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me')
  return {
    ...response.data,
    user: normalizeUser(response.data.user)
  }
}
