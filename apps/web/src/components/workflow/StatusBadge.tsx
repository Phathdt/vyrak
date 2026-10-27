import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'secondary'; label: string }> =
    {
      // WorkflowRun statuses
      queued: { variant: 'secondary', label: 'Queued' },
      running: { variant: 'default', label: 'Running' },
      waiting_approval: { variant: 'warning', label: 'Waiting Approval' },
      succeeded: { variant: 'success', label: 'Succeeded' },
      failed: { variant: 'error', label: 'Failed' },
      cancelled: { variant: 'warning', label: 'Cancelled' },
      // StepRun statuses
      pending: { variant: 'secondary', label: 'Pending' },
      skipped: { variant: 'secondary', label: 'Skipped' },
    }

  const badgeConfig = config[status] || { variant: 'secondary' as const, label: status }

  return (
    <Badge variant={badgeConfig.variant} size={size} className='gap-1.5'>
      <span className='h-1.5 w-1.5 rounded-full bg-current' />
      {badgeConfig.label}
    </Badge>
  )
}
