import { X } from 'lucide-react'

import { useDurationCounter } from '../../hooks/use-duration-counter'
import { formatAbsoluteTime, formatDuration } from '../../lib/utils/duration-utils'
import { JsonViewer } from '../ui/json-viewer'
import { StatusBadge } from './StatusBadge'

import type { StepRunResponseDto } from '../../api/generated/models'

interface StepDetailsProps {
  step: StepRunResponseDto
  onClose: () => void
}

export function StepDetailsPanel({ step, onClose }: StepDetailsProps) {
  const isActive = step.status === 'running'
  const duration = useDurationCounter(step.startedAt, step.completedAt, isActive)

  const hasOutput = step.outputArtifactId
  const hasError = step.status === 'failed' && step.errorMessage

  return (
    <div className='fixed inset-0 z-[100] flex justify-end'>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />

      {/* Panel */}
      <div className='relative flex max-w-[600px] flex-col bg-surface-1 shadow-2xl animate-slide-in-right'>
        {/* Header */}
        <div className='flex items-start justify-between border-b border-border bg-surface-2 p-6'>
          <div className='flex flex-col gap-2'>
            <h2 className='text-xl font-semibold text-foreground'>{step.stepKey}</h2>
            <StatusBadge status={step.status} />
          </div>
          <button
            type='button'
            onClick={onClose}
            className='flex h-8 w-8 items-center justify-center rounded-md text-xl text-muted-foreground transition-all hover:bg-surface-3 hover:text-foreground'
            aria-label='Close panel'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Body */}
        <div className='flex-1 space-y-6 overflow-y-auto p-6'>
          {/* Overview Section */}
          <section className='space-y-3'>
            <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>Overview</h3>
            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-1'>
                <span className='text-xs uppercase tracking-wider text-muted-foreground'>Type</span>
                <span className='text-sm text-foreground'>{step.stepKey}</span>
              </div>

              {step.startedAt && (
                <div className='flex flex-col gap-1'>
                  <span className='text-xs uppercase tracking-wider text-muted-foreground'>Started At</span>
                  <span className='text-sm text-foreground' title={formatAbsoluteTime(step.startedAt)}>
                    {formatAbsoluteTime(step.startedAt)}
                  </span>
                </div>
              )}

              {step.completedAt && (
                <div className='flex flex-col gap-1'>
                  <span className='text-xs uppercase tracking-wider text-muted-foreground'>Completed At</span>
                  <span className='text-sm text-foreground' title={formatAbsoluteTime(step.completedAt)}>
                    {formatAbsoluteTime(step.completedAt)}
                  </span>
                </div>
              )}

              {duration !== null && (
                <div className='flex flex-col gap-1'>
                  <span className='text-xs uppercase tracking-wider text-muted-foreground'>Duration</span>
                  <span className='text-sm text-foreground'>{formatDuration(duration)}</span>
                </div>
              )}

              {step.attempt > 0 && (
                <div className='flex flex-col gap-1'>
                  <span className='text-xs uppercase tracking-wider text-muted-foreground'>Attempt</span>
                  <span className='text-sm text-foreground'>{step.attempt + 1}</span>
                </div>
              )}
            </div>
          </section>

          {/* Output Section */}
          {hasOutput && (
            <section className='space-y-3'>
              <JsonViewer
                data={{ outputArtifactId: step.outputArtifactId }}
                title='Output'
                collapsible
                defaultCollapsed={false}
              />
            </section>
          )}

          {/* Error Section */}
          {hasError && (
            <section className='space-y-3'>
              <div className='space-y-4 rounded-xl border border-red-400 bg-red-500/10 p-4'>
                <h3 className='text-xs font-semibold uppercase tracking-wider text-red-400'>Error Details</h3>

                {step.errorMessage && (
                  <div className='space-y-2'>
                    <span className='text-xs font-semibold uppercase tracking-wider text-red-300'>Message</span>
                    <p className='text-sm leading-relaxed text-foreground'>{step.errorMessage}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
