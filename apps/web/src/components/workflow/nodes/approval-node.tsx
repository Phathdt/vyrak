import { type NodeProps } from '@xyflow/react'
import { CheckCircle2, Clock, Hand, XCircle } from 'lucide-react'
import { memo } from 'react'

import { formatDuration } from '../../../lib/utils/duration-utils'

export interface ApprovalNodeData {
  stepId: string
  stepKey: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'waiting_approval'
  duration?: number
  attempt?: number
  errorMessage?: string | null
}

function ApprovalNodeComponent({ data, selected }: NodeProps & { data: ApprovalNodeData }) {
  const isRunning = data.status === 'running' || data.status === 'waiting_approval'
  const isFailed = data.status === 'failed'
  const isSucceeded = data.status === 'succeeded'
  const isPending = data.status === 'pending'
  const isWaitingApproval = data.status === 'waiting_approval'

  return (
    <div
      className={`
        relative w-[280px] rounded-lg border-2 bg-surface-2 px-4 py-3 shadow-lg transition-all
        ${isPending ? 'border-border opacity-60' : ''}
        ${isRunning ? 'border-orange-400 shadow-orange-400/20 animate-pulse' : ''}
        ${isSucceeded ? 'border-green-500' : ''}
        ${isFailed ? 'border-red-500' : ''}
        ${selected ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-surface-base' : ''}
      `}
      role='button'
      tabIndex={0}
      aria-label={`Approval step: ${data.stepKey}, status: ${data.status}`}
    >
      {/* Header */}
      <div className='flex items-start gap-3'>
        <div
          className={`
          flex h-10 w-10 items-center justify-center rounded-md transition-colors
          ${isPending ? 'bg-surface-3 text-gray-400' : ''}
          ${isRunning ? 'bg-orange-500/10 text-orange-400' : ''}
          ${isSucceeded ? 'bg-green-500/10 text-green-400' : ''}
          ${isFailed ? 'bg-red-500/10 text-red-400' : ''}
        `}
        >
          <Hand className='h-5 w-5' />
        </div>

        <div className='flex-1 min-w-0'>
          <h4 className='font-semibold text-sm text-foreground truncate'>{data.stepKey}</h4>
          <div className='flex items-center gap-1.5 mt-1'>
            {isRunning && <Clock className='h-3.5 w-3.5 text-orange-400' />}
            {isSucceeded && <CheckCircle2 className='h-3.5 w-3.5 text-green-400' />}
            {isFailed && <XCircle className='h-3.5 w-3.5 text-red-400' />}
            <span
              className={`
              text-xs font-medium capitalize
              ${isPending ? 'text-gray-400' : ''}
              ${isRunning ? 'text-orange-400' : ''}
              ${isSucceeded ? 'text-green-400' : ''}
              ${isFailed ? 'text-red-400' : ''}
            `}
            >
              {isWaitingApproval ? 'Waiting Approval' : data.status}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      {(data.duration !== undefined || data.attempt !== undefined) && (
        <div className='mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2'>
          {data.duration !== undefined && <span>{formatDuration(data.duration)}</span>}
          {data.attempt !== undefined && data.attempt > 0 && (
            <span className='text-orange-400'>Retry #{data.attempt + 1}</span>
          )}
        </div>
      )}

      {/* Error indicator */}
      {isFailed && data.errorMessage && (
        <div className='mt-2 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400 truncate'>
          Error: Click for details
        </div>
      )}

      {/* Waiting indicator */}
      {isWaitingApproval && (
        <div className='mt-2 rounded-md bg-orange-500/10 px-2 py-1 text-xs text-orange-400'>Action required</div>
      )}
    </div>
  )
}

export const ApprovalNode = memo(ApprovalNodeComponent)
