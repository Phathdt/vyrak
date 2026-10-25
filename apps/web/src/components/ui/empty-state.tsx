import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  variant?: 'default' | 'no-data' | 'no-results' | 'error'
  className?: string
}

const variantStyles = {
  default: {
    iconBg: 'bg-muted-foreground/10',
    iconColor: 'text-muted-foreground',
  },
  'no-data': {
    iconBg: 'bg-accent-cyan/10',
    iconColor: 'text-accent-cyan',
  },
  'no-results': {
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
  error: {
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
}

export function EmptyState({ icon, title, description, action, variant = 'default', className }: EmptyStateProps) {
  const styles = variantStyles[variant]

  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 md:p-12', className)}>
      {icon && (
        <div
          className={cn('w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4', styles.iconBg)}
        >
          <div className={cn('w-8 h-8 md:w-10 md:h-10', styles.iconColor)}>{icon}</div>
        </div>
      )}
      <h3 className='text-lg font-semibold mb-2'>{title}</h3>
      {description && <p className='text-sm text-muted-foreground mb-6 max-w-md'>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
