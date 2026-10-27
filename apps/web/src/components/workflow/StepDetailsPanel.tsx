import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'

import type { StepRunResponseDto } from '../../api/generated/models'

interface StepDetailsProps {
  step: StepRunResponseDto
  onClose: () => void
}

export function StepDetailsPanel({ step, onClose }: StepDetailsProps) {
  const calculateDuration = () => {
    if (!step.startedAt) return null
    const start = new Date(step.startedAt).getTime()
    const end = step.completedAt ? new Date(step.completedAt).getTime() : Date.now()
    return end - start
  }

  const duration = calculateDuration()

  return (
    <div className='fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background p-6 shadow-xl sm:max-w-lg'>
      <div className='mb-6 flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Step Details</h2>
        <Button variant='ghost' size='sm' onClick={onClose}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      <div className='space-y-6'>
        <Card className='p-4'>
          <h3 className='mb-4 font-medium'>Information</h3>
          <div className='space-y-3'>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Step Key</label>
              <span className='text-sm'>{step.stepKey}</span>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Status</label>
              <div>
                <Badge>{step.status}</Badge>
              </div>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm text-muted-foreground'>Attempt</label>
              <span className='text-sm'>{step.attempt + 1}</span>
            </div>
            {duration !== null && (
              <div className='flex flex-col gap-1'>
                <label className='text-sm text-muted-foreground'>Duration</label>
                <span className='text-sm'>{duration}ms</span>
              </div>
            )}
            {step.outputArtifactId && (
              <div className='flex flex-col gap-1'>
                <label className='text-sm text-muted-foreground'>Output Artifact ID</label>
                <span className='font-mono text-sm'>{step.outputArtifactId}</span>
              </div>
            )}
          </div>
        </Card>

        {step.errorMessage && (
          <Card className='border-destructive/50 bg-destructive/10 p-4'>
            <h3 className='mb-2 font-medium text-destructive'>Error</h3>
            <div className='text-sm text-destructive'>{step.errorMessage}</div>
          </Card>
        )}
      </div>
    </div>
  )
}
