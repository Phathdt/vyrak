import { cn } from '@/lib/utils'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, message, variant, duration }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, duration)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, dismissToast }: { toasts: Toast[]; dismissToast: (id: string) => void }) {
  return (
    <div
      className='fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 pointer-events-none md:bottom-4 md:right-4'
      aria-live='polite'
      aria-atomic='true'
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}

const variantStyles = {
  success: 'bg-green-500/10 border-green-500/50 text-green-400',
  error: 'bg-destructive/10 border-destructive/50 text-destructive',
  warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
  info: 'bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan',
}

const icons = {
  success: (
    <svg className='h-5 w-5 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      />
    </svg>
  ),
  error: (
    <svg className='h-5 w-5 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
      />
    </svg>
  ),
  warning: (
    <svg className='h-5 w-5 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      />
    </svg>
  ),
  info: (
    <svg className='h-5 w-5 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      />
    </svg>
  ),
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-right duration-300',
        'max-w-sm w-full md:w-auto',
        variantStyles[toast.variant]
      )}
      role={toast.variant === 'error' ? 'alert' : 'status'}
    >
      <div className='flex-shrink-0'>{icons[toast.variant]}</div>
      <p className='flex-1 text-sm font-medium'>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className='flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity'
        aria-label='Dismiss notification'
      >
        <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
        </svg>
      </button>
    </div>
  )
}
