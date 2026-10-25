const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const API_URL = process.env.API_URL || 'http://localhost:3000'

export const URLS = {
  BASE: BASE_URL,
  API: API_URL,
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/',
  },
  API_ENDPOINTS: {
    LOGIN: `${API_URL}/api/auth/login`,
    REGISTER: `${API_URL}/api/auth/register`,
    HEALTH: `${API_URL}/health`,
  },
} as const

export function getAppUrl(route: string): string {
  return `${BASE_URL}${route}`
}

export function getApiUrl(endpoint: string): string {
  return endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`
}
