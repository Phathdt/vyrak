import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CancelWorkflowModalProps {
  workflowId: string
  workflowName: string
  onConfirm: (reason?: string) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  error: string | null
}

export function CancelWorkflowModal({ workflowId, onConfirm, onCancel, isLoading, error }: CancelWorkflowModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [reason, setReason] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!acknowledged) return

    try {
      await onConfirm(reason.trim() || undefined)
    } catch (_err) {
      // Error handled by parent
    }
  }

  const handleBackdropClick = () => {
    if (!isLoading) {
      onCancel()
    }
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
      onClick={handleBackdropClick}
    >
      <div
        className='max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-2xl'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-labelledby='cancel-modal-title'
        aria-describedby='cancel-modal-description'
      >
        <div className='flex items-center justify-between border-b p-6'>
          <h2 id='cancel-modal-title' className='text-xl font-semibold text-destructive'>
            Cancel Workflow?
          </h2>
          <button
            type='button'
            onClick={onCancel}
            className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
            aria-label='Close'
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col gap-6 p-6'>
          <div className='flex flex-col gap-4'>
            <p id='cancel-modal-description' className='text-sm text-muted-foreground'>
              This will stop the workflow execution. Any in-progress steps will be interrupted.
            </p>
            <div className='flex items-center gap-2 rounded-md bg-muted p-3'>
              <span className='text-xs font-medium text-muted-foreground'>Workflow ID:</span>
              <code className='rounded bg-muted-foreground/20 px-2 py-0.5 font-mono text-xs'>
                {workflowId.slice(0, 8)}...
              </code>
            </div>
          </div>

          {error && (
            <div className='rounded-md border border-destructive/50 bg-destructive/10 p-4'>
              <p className='text-sm text-destructive'>{error}</p>
            </div>
          )}

          <div className='flex flex-col gap-2'>
            <Label htmlFor='cancellation-reason'>
              Cancellation Reason <span className='text-muted-foreground'>(optional)</span>
            </Label>
            <Textarea
              id='cancellation-reason'
              rows={3}
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder='Why are you cancelling this workflow?'
              disabled={isLoading}
              maxLength={500}
            />
            <p className='text-xs text-muted-foreground'>{reason.length} / 500 characters</p>
          </div>

          <div className='flex items-center gap-3 rounded-md border bg-muted/50 p-4'>
            <Checkbox
              id='acknowledge'
              checked={acknowledged}
              onCheckedChange={(checked: boolean) => setAcknowledged(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor='acknowledge' className='cursor-pointer text-sm font-normal'>
              I understand this action cannot be undone
            </Label>
          </div>

          <div className='flex justify-end gap-3 border-t pt-6'>
            <Button type='button' variant='outline' onClick={onCancel} disabled={isLoading}>
              Go Back
            </Button>
            <Button type='submit' variant='destructive' disabled={!acknowledged || isLoading}>
              {isLoading ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
