import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { StepRunResponseDto } from '../../api/generated/models'
import { StatusBadge } from './StatusBadge'
import { StepDetailsPanel } from './StepDetailsPanel'

interface StepTimelineProps {
  steps: StepRunResponseDto[]
}

export function StepTimeline({ steps }: StepTimelineProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      timeStyle: 'medium',
    }).format(new Date(dateString))
  }

  const calculateDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return null
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    return end - start
  }

  const formatDuration = (durationMs: number | null) => {
    if (!durationMs) return '-'

    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const selectedStep = steps.find((s) => s.id === selectedStepId)

  return (
    <div className='relative'>
      <div className='space-y-4'>
        {steps.map((step, index) => {
          const duration = calculateDuration(step.startedAt, step.completedAt)

          return (
            <div
              key={step.id}
              className={cn(
                'group relative cursor-pointer rounded-lg border bg-card p-4 transition-all hover:border-accent-cyan/50 hover:bg-accent/5',
                selectedStepId === step.id && 'border-accent-cyan bg-accent/10'
              )}
              onClick={() => setSelectedStepId(step.id)}
            >
              <div className='flex gap-4'>
                {/* Timeline dot and line */}
                <div className='relative flex flex-col items-center'>
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full',
                      step.status === 'succeeded' && 'bg-green-500',
                      step.status === 'failed' && 'bg-destructive',
                      step.status === 'running' && 'animate-pulse bg-accent-cyan',
                      step.status === 'pending' && 'bg-secondary',
                      step.status === 'skipped' && 'bg-muted'
                    )}
                  />
                  {index < steps.length - 1 && <div className='mt-1 h-full w-px bg-border' />}
                </div>

                {/* Step content */}
                <div className='flex-1 space-y-2'>
                  <div className='flex items-start justify-between gap-4'>
                    <h3 className='font-medium'>{step.stepKey}</h3>
                    <StatusBadge status={step.status} size='sm' />
                  </div>

                  <div className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
                    {step.startedAt && <span>{formatTime(step.startedAt)}</span>}
                    {duration !== null && <span>Duration: {formatDuration(duration)}</span>}
                    {step.attempt > 0 && <Badge variant='outline'>Attempt: {step.attempt + 1}</Badge>}
                  </div>

                  {step.errorMessage && (
                    <div className='flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                      <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0' />
                      <span className='line-clamp-2'>{step.errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedStep && <StepDetailsPanel step={selectedStep} onClose={() => setSelectedStepId(null)} />}
    </div>
  )
}
