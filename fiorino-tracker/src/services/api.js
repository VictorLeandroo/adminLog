import axios from 'axios'

const isProduction = process.env.NODE_ENV === 'production'

const defaultApiUrl = isProduction
    ? 'https://adminlog-1.onrender.com/api'
    : '/api'

const api = axios.create({
    baseURL: isProduction ? process.env.VUE_APP_API_URL || defaultApiUrl : defaultApiUrl,
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
