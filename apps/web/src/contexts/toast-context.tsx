import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

import { ToastContainer } from '../components/ui/toast'
import { setGlobalToast } from '../lib/global-error-handler'

import type { Toast } from '../components/ui/toast'

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  dismissToast: (id: string) => void
  dismissAll: () => void
  toast: (options: {
    title: string
    message?: string
    description?: string
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number
  }) => string
  showToast: (options: {
    title: string
    message?: string
    description?: string
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number
  }) => string
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
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

  const toast = useCallback(
    (options: {
      title: string
      message?: string
      description?: string
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

  // Register global toast function for axios interceptor
  useEffect(() => {
    setGlobalToast(toast)
  }, [toast])

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        dismissToast,
        dismissAll,
        toast,
        showToast: toast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useGlobalToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useGlobalToast must be used within ToastProvider')
  }
  return context
}
