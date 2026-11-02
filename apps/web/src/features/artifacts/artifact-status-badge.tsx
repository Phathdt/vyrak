import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

type ArtifactApprovalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

type ArtifactStatusBadgeProps = {
  status: ArtifactApprovalStatus
  className?: string
}

export function ArtifactStatusBadge({ status, className }: ArtifactStatusBadgeProps) {
  const config: Record<
    ArtifactApprovalStatus,
    {
      label: string
      variant: 'secondary' | 'default' | 'destructive'
      icon: typeof FileText
      className?: string
    }
  > = {
    DRAFT: {
      label: 'Draft',
      variant: 'secondary' as const,
      icon: FileText,
    },
    PENDING_APPROVAL: {
      label: 'Pending Approval',
      variant: 'default' as const,
      icon: Clock,
    },
    APPROVED: {
      label: 'Approved',
      variant: 'default' as const,
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
    },
    REJECTED: {
      label: 'Rejected',
      variant: 'destructive' as const,
      icon: XCircle,
    },
  }

  const statusConfig = config[status]
  const { label, variant, icon: Icon, className: statusClassName } = statusConfig

  return (
    <Badge variant={variant} className={`${statusClassName || ''} ${className || ''} gap-1`}>
      <Icon className='h-3 w-3' />
      {label}
    </Badge>
  )
}
