import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const TOKEN_KEY = 'vyrak_access_token'

// Token getter from localStorage
let inMemoryToken: string | null = null

export function setAuthToken(token: string | null) {
  inMemoryToken = token
}

export function getAuthToken(): string | null {
  // Prefer in-memory token, fallback to localStorage
  return inMemoryToken || localStorage.getItem(TOKEN_KEY)
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token from both memory and storage
      setAuthToken(null)
      localStorage.removeItem(TOKEN_KEY)

      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
