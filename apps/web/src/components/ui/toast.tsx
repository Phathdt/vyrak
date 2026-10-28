import { useEffect } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number // milliseconds, default 5000
}

// Re-export useToast for convenience
export { useToast } from '../../hooks/use-toast'

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

export function ToastItem({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ⓘ',
  }

  const colorClasses = {
    success: 'bg-green-500/15 border-green-500',
    error: 'bg-red-500/15 border-red-500',
    warning: 'bg-orange-500/15 border-orange-500',
    info: 'bg-cyan-500/15 border-cyan-500',
  }

  const iconColorClasses = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-orange-400',
    info: 'text-cyan-400',
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-xl ${colorClasses[toast.type]}`}
      role='alert'
    >
      <div className={`text-xl leading-none ${iconColorClasses[toast.type]}`}>{icons[toast.type]}</div>
      <div className='flex-1'>
        <p className='text-sm font-medium text-foreground'>{toast.title}</p>
        {toast.message && <p className='mt-1 text-sm text-muted-foreground'>{toast.message}</p>}
      </div>
      <button
        type='button'
        onClick={() => onDismiss(toast.id)}
        className='text-muted-foreground opacity-70 transition-opacity hover:opacity-100'
        aria-label='Dismiss'
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className='pointer-events-none fixed right-4 top-4 z-[1000] flex max-w-[400px] flex-col gap-3'>
      {toasts.map((toast) => (
        <div key={toast.id} className='pointer-events-auto animate-slide-in'>
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
