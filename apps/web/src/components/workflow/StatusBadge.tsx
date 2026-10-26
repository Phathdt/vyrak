import { WorkflowRunSummaryDtoStatus } from '../../api/generated/models'

interface StatusBadgeProps {
  status: WorkflowRunSummaryDtoStatus | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { color: string; label: string }> = {
    queued: { color: 'hsl(var(--text-secondary))', label: 'Queued' },
    running: { color: 'hsl(var(--accent-cyan))', label: 'Running' },
    waiting_approval: { color: 'hsl(45, 93%, 47%)', label: 'Waiting Approval' },
    succeeded: { color: 'hsl(120, 60%, 50%)', label: 'Succeeded' },
    failed: { color: 'hsl(var(--destructive))', label: 'Failed' },
    cancelled: { color: 'hsl(25, 95%, 53%)', label: 'Cancelled' },
  }

  const badgeConfig = config[status] || { color: 'hsl(var(--text-secondary))', label: status }

  return (
    <span className='status-badge' style={{ '--badge-color': badgeConfig.color } as React.CSSProperties}>
      <span className='status-dot' />
      {badgeConfig.label}
    </span>
  )
}
