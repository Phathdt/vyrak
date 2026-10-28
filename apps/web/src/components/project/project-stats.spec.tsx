import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectStats } from './project-stats'

describe('ProjectStats', () => {
  it('renders all stat cards with correct values', () => {
    const stats = {
      repositoryCount: 5,
      totalWorkflowRuns: 42,
      activeWorkflowRuns: 3,
      lastRunDate: '2026-10-27T10:30:00Z',
    }

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('Repositories')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    expect(screen.getByText('Total Workflow Runs')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()

    expect(screen.getByText('Active Runs')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    expect(screen.getByText('Last Activity')).toBeInTheDocument()
  })

  it('displays "Never" when no last run date', () => {
    const stats = {
      repositoryCount: 0,
      totalWorkflowRuns: 0,
      activeWorkflowRuns: 0,
    }

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('formats date correctly', () => {
    const stats = {
      repositoryCount: 1,
      totalWorkflowRuns: 1,
      activeWorkflowRuns: 0,
      lastRunDate: '2026-10-27T10:30:00Z',
    }

    render(<ProjectStats stats={stats} />)

    const lastActivity = screen.getByText(/Oct 27, 2026/)
    expect(lastActivity).toBeInTheDocument()
  })
})
