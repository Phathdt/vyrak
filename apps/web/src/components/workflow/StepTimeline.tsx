import { useState } from 'react'

import { StatusBadge } from './StatusBadge'
import { StepDetailsPanel } from './StepDetailsPanel'

import { StepRunResponseDto } from '../../api/generated/models'

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
    <div className='step-timeline-container'>
      <div className='timeline'>
        {steps.map((step, index) => {
          const duration = calculateDuration(step.startedAt, step.completedAt)

          return (
            <div key={step.id} className={`timeline-item ${step.status}`} onClick={() => setSelectedStepId(step.id)}>
              <div className='timeline-marker'>
                <div className={`timeline-dot ${step.status}`} />
                {index < steps.length - 1 && <div className='timeline-line' />}
              </div>

              <div className='timeline-content'>
                <div className='step-header'>
                  <h3 className='step-title'>{step.stepKey}</h3>
                  <StatusBadge status={step.status} />
                </div>

                <div className='step-meta'>
                  {step.startedAt && <span className='step-time'>{formatTime(step.startedAt)}</span>}
                  {duration !== null && <span className='step-duration'>{formatDuration(duration)}</span>}
                  {step.attempt > 0 && <span className='retry-badge'>Attempt: {step.attempt + 1}</span>}
                </div>

                {step.errorMessage && (
                  <div className='step-error'>
                    <span>❌ {step.errorMessage.slice(0, 100)}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedStep && <StepDetailsPanel step={selectedStep} onClose={() => setSelectedStepId(null)} />}
    </div>
  )
}
