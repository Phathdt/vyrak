import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

interface ProjectsEmptyStateProps {
  onCreateClick: () => void
}

export function ProjectsEmptyState({ onCreateClick }: ProjectsEmptyStateProps) {
  return (
    <EmptyState
      variant='no-data'
      icon={
        <svg className='w-full h-full' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
          />
        </svg>
      }
      title='No projects yet'
      description='Get started by creating your first project to organize repositories and workflows.'
      action={
        <Button onClick={onCreateClick} variant='default'>
          Create Your First Project
        </Button>
      }
    />
  )
}
