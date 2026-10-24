import Axios, { AxiosError, AxiosRequestConfig } from 'axios'

export const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
})

// Request interceptor for auth token
AXIOS_INSTANCE.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status

      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('access_token')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      } else if (status === 403) {
        console.error('Access forbidden:', error.response.data)
      } else if (status === 404) {
        console.error('Resource not found:', error.config?.url)
      } else if (status >= 500) {
        console.error('Server error:', error.response.data)
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - no response received')
    } else {
      // Error in request configuration
      console.error('Request configuration error:', error.message)
    }

    return Promise.reject(error)
  }
)

// Custom instance for orval
export const customInstance = <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source()

  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data)

  // @ts-expect-error - Adding cancel method to promise
  promise.cancel = () => {
    source.cancel('Query was cancelled')
  }

  return promise
}

export type ErrorType<Error> = AxiosError<Error>

// Export helper for handling API errors
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    if (error.message) {
      return error.message
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
