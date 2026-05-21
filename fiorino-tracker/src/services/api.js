import axios from 'axios'

const defaultApiUrl = process.env.NODE_ENV === 'production'
    ? '/api'
    : 'http://localhost:4000/api'

const api = axios.create({
    baseURL: process.env.VUE_APP_API_URL || defaultApiUrl,
    headers: {
        'Content-Type': 'application/json'
    }
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('profileType')
            if (window.location.pathname !== '/login') window.location.href = '/login'
        }

        return Promise.reject(error)
    }
)

export default api
