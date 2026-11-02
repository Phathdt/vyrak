import { CheckCircle, Send, XCircle } from 'lucide-react'
import { useState } from 'react'

import {
  useArtifactsControllerApprove,
  useArtifactsControllerReject,
  useArtifactsControllerRequestApproval,
} from '@/api/generated/artifacts/artifacts'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

import { ArtifactApprovalDialog } from './artifact-approval-dialog'

import type { ArtifactResponse } from '@/api/generated/models'

type ArtifactApprovalActionsProps = {
  artifact: ArtifactResponse
  orgId: string
  workflowId: string
  onStatusChange?: () => void
}

export function ArtifactApprovalActions({ artifact, orgId, workflowId, onStatusChange }: ArtifactApprovalActionsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const { user } = useAuth()

  const { mutate: requestApproval, isPending: isRequesting } = useArtifactsControllerRequestApproval({
    mutation: {
      onSuccess: () => {
        console.log('Approval requested successfully')
        onStatusChange?.()
      },
      onError: (error) => {
        console.error('Failed to request approval:', error)
        alert('Failed to request approval: ' + (error.message || 'An error occurred'))
      },
    },
  })

  const { mutate: approve, isPending: isApproving } = useArtifactsControllerApprove({
    mutation: {
      onSuccess: () => {
        console.log('Artifact approved successfully')
        onStatusChange?.()
      },
      onError: (error) => {
        console.error('Failed to approve:', error)
        alert('Failed to approve: ' + (error.message || 'An error occurred'))
      },
    },
  })

  const { mutate: reject, isPending: isRejecting } = useArtifactsControllerReject({
    mutation: {
      onSuccess: () => {
        console.log('Artifact rejected successfully')
        setShowRejectDialog(false)
        onStatusChange?.()
      },
      onError: (error) => {
        console.error('Failed to reject:', error)
        alert('Failed to reject: ' + (error.message || 'An error occurred'))
      },
    },
  })

  const handleRequestApproval = () => {
    if (!user?.id) return
    requestApproval({
      orgId,
      workflowId,
      artifactId: artifact.id,
      data: { requesterId: user.id },
    })
  }

  const handleApprove = () => {
    if (!user?.id) return
    approve({
      orgId,
      workflowId,
      artifactId: artifact.id,
      data: { approverId: user.id },
    })
  }

  const handleReject = (reason: string) => {
    if (!user?.id) return
    reject({
      orgId,
      workflowId,
      artifactId: artifact.id,
      data: { rejectorId: user.id, reason },
    })
  }

  const isLoading = isRequesting || isApproving || isRejecting

  // DRAFT status - show Request Approval button
  if (artifact.approvalStatus === 'DRAFT') {
    return (
      <Button size='sm' onClick={handleRequestApproval} disabled={isLoading}>
        <Send className='mr-2 h-4 w-4' />
        Request Approval
      </Button>
    )
  }

  // PENDING_APPROVAL status - show Approve and Reject buttons
  if (artifact.approvalStatus === 'PENDING_APPROVAL') {
    return (
      <div className='flex gap-2'>
        <Button size='sm' variant='default' onClick={handleApprove} disabled={isLoading}>
          <CheckCircle className='mr-2 h-4 w-4' />
          Approve
        </Button>
        <Button size='sm' variant='destructive' onClick={() => setShowRejectDialog(true)} disabled={isLoading}>
          <XCircle className='mr-2 h-4 w-4' />
          Reject
        </Button>

        <ArtifactApprovalDialog
          open={showRejectDialog}
          artifactTitle={artifact.title}
          onClose={() => setShowRejectDialog(false)}
          onReject={handleReject}
        />
      </div>
    )
  }

  // APPROVED or REJECTED - no actions
  return null
}
