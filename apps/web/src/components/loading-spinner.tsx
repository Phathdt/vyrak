import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
}

export function LoadingSpinner({ size = 'md', message, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div
        className={cn('animate-spin rounded-full border-secondary border-t-accent-cyan', sizeClasses[size])}
        role='status'
        aria-label='Loading'
      >
        <span className='sr-only'>Loading...</span>
      </div>
      {message && <p className='text-sm text-muted-foreground'>{message}</p>}
    </div>
  )
}
