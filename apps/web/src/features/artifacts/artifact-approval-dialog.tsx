import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type ArtifactApprovalDialogProps = {
  open: boolean
  artifactTitle: string
  onClose: () => void
  onReject: (reason: string) => void
}

export function ArtifactApprovalDialog({ open, artifactTitle, onClose, onReject }: ArtifactApprovalDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('Rejection reason is required')
      return
    }
    if (reason.trim().length < 10) {
      setError('Rejection reason must be at least 10 characters')
      return
    }

    onReject(reason.trim())
    setReason('')
    setError('')
  }

  const handleClose = () => {
    setReason('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Artifact</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting &quot;{artifactTitle}&quot;. This will help the team understand what
            needs to be improved.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-2'>
          <Textarea
            placeholder='Enter rejection reason...'
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError('')
            }}
            rows={4}
            className={error ? 'border-destructive' : ''}
          />
          {error && <p className='text-sm text-destructive'>{error}</p>}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleClose}>
            Cancel
          </Button>
          <Button variant='destructive' onClick={handleSubmit}>
            Reject Artifact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
