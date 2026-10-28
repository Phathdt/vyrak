import { useCallback, useState } from 'react'

import type { Toast } from '../components/ui/toast'

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  // Backward compatible helper method
  const toast = useCallback(
    (options: {
      title: string
      message?: string
      description?: string // Alias for message
      type?: 'success' | 'error' | 'warning' | 'info'
      duration?: number
    }) => {
      return addToast({
        type: options.type || 'info',
        title: options.title,
        message: options.message || options.description,
        duration: options.duration,
      })
    },
    [addToast]
  )

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    toast, // Backward compatible
    showToast: toast, // Alias for backward compatibility
  }
}
