interface ProgressBarProps {
  completed: number
  total: number
  status: 'queued' | 'running' | 'waiting_approval' | 'succeeded' | 'failed' | 'cancelled'
  className?: string
}

export function ProgressBar({ completed, total, status, className = '' }: ProgressBarProps) {
  const percentage = total > 0 ? Math.floor((completed / total) * 100) : 0

  const isAnimated = status === 'running'
  const barColorClass = {
    queued: 'bg-gray-400',
    running: 'bg-gradient-to-r from-cyan-400 to-cyan-600',
    waiting_approval: 'bg-orange-400',
    succeeded: 'bg-green-400',
    failed: 'bg-red-400',
    cancelled: 'bg-gray-400',
  }[status]

  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid='epic-progress-bar'>
      <div className='flex items-center justify-between'>
        <span className='text-sm text-muted-foreground'>
          {completed} of {total} steps completed
        </span>
        <span className='text-sm font-semibold text-foreground'>{percentage}%</span>
      </div>

      <div className='h-2 w-full overflow-hidden rounded-full bg-surface-3'>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass} ${
            isAnimated ? 'relative overflow-hidden' : ''
          }`}
          style={{ width: `${percentage}%` }}
          role='progressbar'
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid={`epic-progress-fill-${status}`}
        >
          {isAnimated && (
            <div className='absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent' />
          )}
        </div>
      </div>
    </div>
  )
}
