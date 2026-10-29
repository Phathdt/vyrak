import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { useDurationCounter } from '../../hooks/use-duration-counter'
import { formatDuration, formatRelativeTime } from '../../lib/utils/duration-utils'
import { StatusBadge } from './StatusBadge'
import { StepDetailsPanel } from './StepDetailsPanel'

import type { StepRunResponseDto } from '../../api/generated/models'

interface StepTimelineProps {
  steps: StepRunResponseDto[]
  selectedStepId?: string | null
  onStepClick?: (stepId: string) => void
}

export function StepTimeline({ steps, selectedStepId: externalSelectedStepId, onStepClick }: StepTimelineProps) {
  const [internalSelectedStepId, setInternalSelectedStepId] = useState<string | null>(null)

  const selectedStepId = externalSelectedStepId !== undefined ? externalSelectedStepId : internalSelectedStepId

  const handleStepClick = (stepId: string) => {
    if (onStepClick) {
      onStepClick(stepId)
    } else {
      setInternalSelectedStepId(stepId)
    }
  }

  const selectedStep = steps.find((s) => s.id === selectedStepId)

  return (
    <div className='relative'>
      <div className='space-y-4'>
        {steps.map((step, index) => {
          const isActive = step.status === 'running'
          const isPastStep = step.status === 'succeeded' || step.status === 'skipped'
          const isFutureStep = step.status === 'pending'
          const isFailed = step.status === 'failed'
          const isSelected = step.id === selectedStepId

          return (
            <StepCard
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
              isActive={isActive}
              isPastStep={isPastStep}
              isFutureStep={isFutureStep}
              isFailed={isFailed}
              isSelected={isSelected}
              onClick={() => handleStepClick(step.id)}
            />
          )
        })}
      </div>

      {selectedStep && (
        <StepDetailsPanel
          step={selectedStep}
          onClose={() => (onStepClick ? onStepClick(null as unknown as string) : setInternalSelectedStepId(null))}
        />
      )}
    </div>
  )
}

interface StepCardProps {
  step: StepRunResponseDto
  isLast: boolean
  isActive: boolean
  isPastStep: boolean
  isFutureStep: boolean
  isFailed: boolean
  isSelected: boolean
  onClick: () => void
}

function StepCard({ step, isLast, isActive, isPastStep, isFutureStep, isFailed, isSelected, onClick }: StepCardProps) {
  const duration = useDurationCounter(step.startedAt, step.completedAt, isActive)

  const icons = {
    pending: '⏳',
    running: '▶️',
    succeeded: '✅',
    failed: '❌',
    skipped: '⏭️',
  }

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg border bg-card p-4 transition-all hover:border-accent-cyan/50 hover:bg-accent/5',
        isSelected && 'border-accent-cyan bg-accent/10',
        isPastStep && 'opacity-70',
        isFutureStep && 'opacity-50'
      )}
      onClick={onClick}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      data-testid={`story-item-${step.id}`}
    >
      <div className='flex gap-4'>
        {/* Timeline connector */}
        <div className='relative flex flex-col items-center'>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-lg',
              isActive && 'animate-pulse'
            )}
            data-testid={`story-status-icon-${step.id}`}
          >
            {icons[step.status as keyof typeof icons] || '⏸️'}
          </div>
          {!isLast && <div className='mt-1 h-full w-px bg-border' />}
        </div>

        {/* Step content */}
        <div className='flex-1 space-y-2'>
          <div className='flex items-start justify-between gap-4'>
            <h3 className='font-medium text-foreground'>{step.stepKey}</h3>
            <StatusBadge status={step.status} size='sm' />
          </div>

          <div className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
            {step.startedAt && <span>Started {formatRelativeTime(step.startedAt)}</span>}
            {duration !== null && <span>Duration: {formatDuration(duration)}</span>}
            {step.attempt > 0 && (
              <Badge variant='outline' className='text-orange-400'>
                Attempt {step.attempt + 1}
              </Badge>
            )}
          </div>

          {isFailed && step.errorMessage && (
            <div className='flex items-start gap-2 rounded-md border border-red-400 bg-red-500/10 p-3'>
              <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-red-400' />
              <div className='flex-1'>
                <p className='line-clamp-2 text-sm text-red-400'>{step.errorMessage}</p>
                <span className='mt-1 text-xs text-muted-foreground'>Click for details →</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
