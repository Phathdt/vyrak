import { AxiosError, AxiosRequestConfig } from 'axios'

import { apiClient } from '../lib/api-client'

// Custom instance for orval - uses the shared apiClient with proper auth
export const customInstance = <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> => {
  const promise = apiClient({
    ...config,
    ...options,
  }).then(({ data }) => {
    // Handle wrapped response from ResponseInterceptor
    // If response has { data: actual_data, trace_id: string }, extract the data
    if (data && typeof data === 'object' && 'data' in data && 'trace_id' in data) {
      return data.data as T
    }
    return data
  })

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
