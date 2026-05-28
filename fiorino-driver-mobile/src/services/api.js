import axios from 'axios';

const api = axios.create({
  // ajuste para seu backend em produção/local
  baseURL: 'https://adminlog-1.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

export function setToken(token) {
  if (token) api.defaults.headers.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.Authorization;
}

export default api;
