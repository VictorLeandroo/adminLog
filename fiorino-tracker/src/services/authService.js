import api from './api'

export async function loginUser(email, senha) {
  const response = await api.post('/auth/login', { email, senha })
  return response.data
}

export async function registerUser(nome, email, senha) {
  const response = await api.post('/auth/register', { nome, email, senha })
  return response.data
}

export async function verifyToken() {
  const response = await api.get('/auth/verify')
  return response.data
}
