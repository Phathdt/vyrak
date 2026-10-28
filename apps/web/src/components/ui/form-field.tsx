import * as React from 'react'

import { cn } from '@/lib/utils'

interface FormFieldProps {
  children: React.ReactNode
  className?: string
  label?: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ children, className, label, required, error, hint, htmlFor }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <Label htmlFor={htmlFor} required={required}>
            {label}
          </Label>
        )}
        {children}
        {hint && !error && <HelperText>{hint}</HelperText>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    )
  }
)
FormField.displayName = 'FormField'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, children, required, ...props }, ref) => {
  return (
    <label ref={ref} className={cn('text-sm font-medium text-muted-foreground', className)} {...props}>
      {children}
      {required && <span className='ml-1 text-destructive'>*</span>}
    </label>
  )
})
Label.displayName = 'Label'

interface HelperTextProps {
  children: React.ReactNode
  className?: string
}

const HelperText = ({ children, className }: HelperTextProps) => {
  return <p className={cn('text-xs text-muted-foreground', className)}>{children}</p>
}

interface ErrorMessageProps {
  children?: React.ReactNode
  className?: string
  id?: string
}

const ErrorMessage = ({ children, className, id }: ErrorMessageProps) => {
  if (!children) return null

  return (
    <p
      id={id}
      className={cn('text-xs text-destructive flex items-center gap-1', className)}
      role='alert'
      data-testid={id ? `${id}-error-message` : 'error-message'}
    >
      <svg
        className='h-3.5 w-3.5 flex-shrink-0'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
        aria-hidden='true'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        />
      </svg>
      <span>{children}</span>
    </p>
  )
}

export { ErrorMessage, FormField, HelperText, Label }
