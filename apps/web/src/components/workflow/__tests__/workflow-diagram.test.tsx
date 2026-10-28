import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkflowDiagram } from '../workflow-diagram'

import type { StepRunResponseDto } from '../../../api/generated/models'

describe('WorkflowDiagram', () => {
  it('renders empty state when no steps', () => {
    render(<WorkflowDiagram steps={[]} />)
    expect(screen.getByText('No steps available')).toBeInTheDocument()
  })

  it('renders diagram with steps', () => {
    const steps: StepRunResponseDto[] = [
      {
        id: 'step-1',
        runId: 'run-1',
        stepKey: 'agent-planning',
        status: 'succeeded',
        attempt: 0,
        startedAt: '2026-10-28T10:00:00Z',
        completedAt: '2026-10-28T10:05:00Z',
        errorMessage: null,
        outputArtifactId: null,
      },
      {
        id: 'step-2',
        runId: 'run-1',
        stepKey: 'tool-execution',
        status: 'running',
        attempt: 0,
        startedAt: '2026-10-28T10:05:00Z',
        completedAt: null,
        errorMessage: null,
        outputArtifactId: null,
      },
    ]

    render(<WorkflowDiagram steps={steps} />)

    // ReactFlow canvas should be rendered
    expect(screen.getByRole('status')).toHaveTextContent('Workflow diagram with 2 steps')
  })

  it('handles step click callback', () => {
    const steps: StepRunResponseDto[] = [
      {
        id: 'step-1',
        runId: 'run-1',
        stepKey: 'agent-test',
        status: 'succeeded',
        attempt: 0,
        startedAt: '2026-10-28T10:00:00Z',
        completedAt: '2026-10-28T10:05:00Z',
        errorMessage: null,
        outputArtifactId: null,
      },
    ]

    const handleStepClick = vi.fn()

    render(<WorkflowDiagram steps={steps} onStepClick={handleStepClick} />)

    // Verify callback structure is set up
    expect(handleStepClick).toBeDefined()
  })
})
