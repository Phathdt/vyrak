import { StatsCard } from '@/components/ui/stats-card'

interface ProjectStatsProps {
  stats: {
    repositoryCount: number
    totalWorkflowRuns: number
    activeWorkflowRuns: number
    lastRunDate?: string
  }
}

export function ProjectStats({ stats }: ProjectStatsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString))
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      <StatsCard
        title='Repositories'
        value={stats.repositoryCount}
        variant='default'
        icon={
          <svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
            />
          </svg>
        }
      />

      <StatsCard
        title='Total Workflow Runs'
        value={stats.totalWorkflowRuns}
        variant='default'
        icon={
          <svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
            />
          </svg>
        }
      />

      <StatsCard
        title='Active Runs'
        value={stats.activeWorkflowRuns}
        variant={stats.activeWorkflowRuns > 0 ? 'success' : 'default'}
        icon={
          <svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
          </svg>
        }
      />

      <StatsCard
        title='Last Activity'
        value={formatDate(stats.lastRunDate)}
        variant='default'
        icon={
          <svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        }
      />
    </div>
  )
}
