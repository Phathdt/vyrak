import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type PhaseExecutionView = {
  status: string
  runType?: string
  branch?: string
  workspacePath?: string
  pullRequestUrl?: string
  pullRequestNumber?: number
  lastError?: string
  updatedAt?: string
}

type PhaseAutomationPanelProps = {
  phaseName: string
  phaseKey: string
  execution?: PhaseExecutionView | null
  reviewSummary?: string
  isCurrentPhase: boolean
  onSendBack?: () => void
  sendBackBusy?: boolean
}

function statusLabel(status: string): string {
  switch (status) {
    case 'RUNNING':
      return 'Running'
    case 'AWAITING_USER':
      return 'Ready for you'
    case 'SUCCEEDED':
      return 'Succeeded'
    case 'FAILED':
      return 'Failed'
    default:
      return status
  }
}

export function PhaseAutomationPanel({
  phaseName,
  phaseKey,
  execution,
  reviewSummary,
  isCurrentPhase,
  onSendBack,
  sendBackBusy,
}: PhaseAutomationPanelProps) {
  const status = execution?.status ?? 'IDLE'

  return (
    <div className='mt-4 space-y-3 rounded-lg border bg-muted/30 p-4 text-sm'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='font-medium'>{phaseName} automation</span>
        <Badge variant={status === 'RUNNING' ? 'default' : 'outline'}>{statusLabel(status)}</Badge>
      </div>

      {status === 'RUNNING' && (
        <p className='text-muted-foreground'>
          Agent is working (workspace / Claude Code). This page refreshes while running.
        </p>
      )}

      {execution?.branch && (
        <p>
          <span className='text-muted-foreground'>Branch: </span>
          <code className='rounded bg-background px-1'>{execution.branch}</code>
        </p>
      )}

      {execution?.pullRequestUrl && (
        <p>
          <a
            href={execution.pullRequestUrl}
            target='_blank'
            rel='noreferrer'
            className='font-medium text-primary underline-offset-4 hover:underline'
          >
            Open pull request
            {execution.pullRequestNumber != null ? ` #${execution.pullRequestNumber}` : ''}
          </a>
        </p>
      )}

      {execution?.workspacePath && (
        <p className='text-xs text-muted-foreground break-all'>Workspace: {execution.workspacePath}</p>
      )}

      {reviewSummary && (
        <div className='rounded-md border bg-background p-3'>
          <p className='mb-1 font-medium'>Review summary</p>
          <p className='whitespace-pre-wrap text-muted-foreground'>{reviewSummary}</p>
        </div>
      )}

      {execution?.lastError && <p className='text-destructive'>{execution.lastError}</p>}

      {isCurrentPhase && status === 'AWAITING_USER' && (phaseKey === 'review' || phaseKey === 'qc') && onSendBack && (
        <div className='flex justify-end border-t pt-3'>
          <Button type='button' variant='outline' size='sm' disabled={sendBackBusy} onClick={onSendBack}>
            Request changes → Implementation
          </Button>
        </div>
      )}

      {isCurrentPhase && status === 'AWAITING_USER' && phaseKey === 'implementation' && (
        <p className='text-muted-foreground'>
          Review the PR and chat here when implementation follow-up is wired. When satisfied, use Approve to move to
          Review.
        </p>
      )}
    </div>
  )
}
