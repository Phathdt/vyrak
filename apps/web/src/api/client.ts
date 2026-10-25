import { AxiosError, AxiosRequestConfig } from 'axios'

import { apiClient } from '../lib/api-client'

// Custom instance for orval - uses the shared apiClient with proper auth
export const customInstance = <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> => {
  const promise = apiClient({
    ...config,
    ...options,
  }).then(({ data }) => data)

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
