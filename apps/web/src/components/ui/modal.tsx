import * as React from 'react'
import { useEffect } from 'react'

import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200'
      aria-modal='true'
      role='dialog'
    >
      {/* Backdrop */}
      <div className='absolute inset-0 bg-background/80 backdrop-blur-sm' onClick={onClose} aria-hidden='true' />

      {/* Modal Content */}
      <div
        className={cn(
          'relative w-full bg-card border border-border rounded-lg shadow-2xl animate-in zoom-in-95 duration-200',
          sizeStyles[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

export function ModalHeader({ children, className, onClose }: ModalHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between p-6 border-b border-border', className)}>
      <div className='flex-1'>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className='flex-shrink-0 ml-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          aria-label='Close dialog'
        >
          <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      )}
    </div>
  )
}

interface ModalTitleProps {
  children: React.ReactNode
  className?: string
}

export function ModalTitle({ children, className }: ModalTitleProps) {
  return <h2 className={cn('text-xl font-semibold', className)}>{children}</h2>
}

interface ModalDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function ModalDescription({ children, className }: ModalDescriptionProps) {
  return <p className={cn('text-sm text-muted-foreground mt-1', className)}>{children}</p>
}

interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn('p-6', className)}>{children}</div>
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 border-t border-border', className)}>{children}</div>
  )
}
