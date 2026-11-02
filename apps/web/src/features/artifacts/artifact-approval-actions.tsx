import { CheckCircle, Send, XCircle } from 'lucide-react'
import { useState } from 'react'

import {
  useArtifactsControllerApprove,
  useArtifactsControllerReject,
  useArtifactsControllerRequestApproval,
} from '@/api/generated/artifacts/artifacts'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

import { ArtifactApprovalDialog } from './artifact-approval-dialog'

import type { ArtifactResponse } from '@/api/generated/models'

type ArtifactApprovalActionsProps = {
  artifact: ArtifactResponse
  orgId: string
  onStatusChange?: () => void
}

export function ArtifactApprovalActions({ artifact, orgId, onStatusChange }: ArtifactApprovalActionsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const { toast } = useToast()

  const { mutate: requestApproval, isPending: isRequesting } = useArtifactsControllerRequestApproval({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Approval requested', description: 'Artifact submitted for approval' })
        onStatusChange?.()
      },
      onError: (error) => {
        toast({
          title: 'Failed to request approval',
          description: error.message || 'An error occurred',
          variant: 'destructive',
        })
      },
    },
  })

  const { mutate: approve, isPending: isApproving } = useArtifactsControllerApprove({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Artifact approved', description: 'Artifact has been approved successfully' })
        onStatusChange?.()
      },
      onError: (error) => {
        toast({
          title: 'Failed to approve',
          description: error.message || 'An error occurred',
          variant: 'destructive',
        })
      },
    },
  })

  const { mutate: reject, isPending: isRejecting } = useArtifactsControllerReject({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Artifact rejected', description: 'Artifact has been rejected' })
        setShowRejectDialog(false)
        onStatusChange?.()
      },
      onError: (error) => {
        toast({
          title: 'Failed to reject',
          description: error.message || 'An error occurred',
          variant: 'destructive',
        })
      },
    },
  })

  const handleRequestApproval = () => {
    requestApproval({ orgId, id: artifact.id })
  }

  const handleApprove = () => {
    approve({ orgId, id: artifact.id })
  }

  const handleReject = (reason: string) => {
    reject({ orgId, id: artifact.id, data: { reason } })
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
