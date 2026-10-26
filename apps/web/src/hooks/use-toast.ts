// Simple toast hook using the existing toast component
// This is a minimal implementation for the project creation flow

import { useCallback } from 'react'

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    // For now, we'll use console logging
    // TODO: Integrate with actual toast component from ui/toast.tsx
    if (options.variant === 'destructive') {
      console.error(`[Toast Error] ${options.title}${options.description ? ': ' + options.description : ''}`)
    } else {
      console.log(`[Toast] ${options.title}${options.description ? ': ' + options.description : ''}`)
    }

    // You can also dispatch a custom event that the toast component listens to
    const event = new CustomEvent('show-toast', { detail: options })
    window.dispatchEvent(event)
  }, [])

  return { toast }
}
