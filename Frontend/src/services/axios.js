// src/services/axios.js (créer ce fichier)
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: 'http://localhost:5001'
})
// API calls
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const response = await axios.post(`${API_URL}/api/sonex/auth/login`, payload);
// Intercepteur de requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const response = await axios.post('/api/auth/refresh', { refreshToken })
        
        localStorage.setItem('accessToken', response.data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`
        
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh token expiré, déconnexion
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        toast.error('Session expirée, veuillez vous reconnecter')
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api