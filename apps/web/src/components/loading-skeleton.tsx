import { cn } from '@/lib/utils'

interface Props {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
}

export function LoadingSkeleton({ className, variant = 'rectangular' }: Props) {
  return (
    <div
      className={cn(
        'animate-pulse bg-secondary',
        variant === 'text' && 'h-4 rounded',
        variant === 'rectangular' && 'rounded-lg',
        variant === 'circular' && 'rounded-full aspect-square',
        className
      )}
      aria-hidden='true'
    />
  )
}

export function TableLoadingSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className='flex flex-col gap-4'>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className='flex gap-4 items-center'>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} className='h-6 flex-1' />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardLoadingSkeleton() {
  return (
    <div className='p-6 bg-card border border-border rounded-lg'>
      <LoadingSkeleton className='h-6 w-3/5 mb-4' />
      <LoadingSkeleton className='h-4 w-full mb-2' />
      <LoadingSkeleton className='h-4 w-4/5 mb-4' />
      <div className='flex gap-4 mt-4'>
        <LoadingSkeleton className='h-9 w-24' />
        <LoadingSkeleton className='h-9 w-24' />
      </div>
    </div>
  )
}
