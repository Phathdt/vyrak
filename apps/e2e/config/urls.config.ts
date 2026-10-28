const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const API_URL = process.env.API_URL || 'http://localhost:3000'

export const URLS = {
  BASE: BASE_URL,
  API: API_URL,
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
    DASHBOARD: '/',
    WORKFLOWS: '/workflows',
    WORKFLOWS_CREATE: '/workflows/create',
    WORKFLOWS_DETAIL: (runId: string) => `/workflows/${runId}`,
  },
  API_ENDPOINTS: {
    LOGIN: `${API_URL}/api/auth/login`,
    HEALTH: `${API_URL}/health`,
    WORKFLOWS: `${API_URL}/api/workflows`,
    WORKFLOWS_DETAIL: (runId: string) => `${API_URL}/api/workflows/${runId}`,
    WORKFLOWS_CANCEL: (runId: string) => `${API_URL}/api/workflows/${runId}/cancel`,
    WORKFLOWS_SSE: (runId: string) => `${API_URL}/api/workflows/runs/${runId}/sse`,
  },
} as const

export function getAppUrl(route: string): string {
  return `${BASE_URL}${route}`
}

export function getApiUrl(endpoint: string): string {
  return endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`
}

export function getWorkflowDetailUrl(runId: string): string {
  return getAppUrl(URLS.ROUTES.WORKFLOWS_DETAIL(runId))
}
