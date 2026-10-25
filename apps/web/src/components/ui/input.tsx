import { cn } from '@/lib/utils'
import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  success?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, error, success, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'min-h-[44px] md:min-h-[36px]',
        error && 'border-destructive focus-visible:ring-destructive',
        success && 'border-green-500 focus-visible:ring-green-500',
        !error && !success && 'border-border',
        className
      )}
      ref={ref}
      aria-invalid={error ? 'true' : 'false'}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
