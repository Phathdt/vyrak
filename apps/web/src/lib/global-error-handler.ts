import { AxiosError } from 'axios'

type ToastFunction = (options: {
  title: string
  message?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}) => void

let globalToast: ToastFunction | null = null

export function setGlobalToast(toastFn: ToastFunction) {
  globalToast = toastFn
}

export function handleGlobalError(error: unknown) {
  if (!globalToast) {
    console.error('Global toast not initialized', error)
    return
  }

  let title = 'Error'
  let message = 'An unexpected error occurred'

  if (error instanceof AxiosError) {
    // Handle network timeout or aborted requests
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('timeout') ||
      error.message?.includes('aborted')
    ) {
      title = 'Request Timeout'
      message = 'The request took too long to complete. Please try again.'
    }
    // Handle network errors (no response from server)
    else if (!error.response) {
      title = 'Network Error'
      message = 'Unable to connect to the server. Please check your internet connection.'
    }
    // Handle API errors
    else if (error.response?.data?.message) {
      title = `Error ${error.response.status}`
      message = error.response.data.message
    }
    // Handle other axios errors
    else if (error.message) {
      message = error.message
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  globalToast({
    title,
    message,
    type: 'error',
    duration: 5000,
  })
}
