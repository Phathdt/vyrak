import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface ProjectCardProps {
  id: string
  name: string
  slug: string
  description?: string | null
  createdAt: string
  stats: {
    repositoryCount: number
    workflowRunCount: number
  }
}

export function ProjectCard({ id, name, slug, description, createdAt, stats }: ProjectCardProps) {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
    }).format(new Date(dateString))
  }

  const handleClick = () => {
    navigate(`/projects/${id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(`/projects/${id}`)
    }
  }

  return (
    <Card
      variant='interactive'
      className='h-full flex flex-col'
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role='button'
      tabIndex={0}
      aria-label={`Open project ${name}`}
    >
      <div className='p-6 flex-1 flex flex-col'>
        {/* Header */}
        <div className='mb-4'>
          <h3 className='text-xl font-semibold mb-2'>{name}</h3>
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-cyan/10 text-accent-cyan'>
            {slug}
          </span>
        </div>

        {/* Description */}
        <p className={cn('text-sm text-muted-foreground mb-4 flex-1', description ? 'line-clamp-2' : 'italic')}>
          {description || 'No description'}
        </p>

        {/* Stats */}
        <div className='grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-border'>
          <div className='space-y-1'>
            <p className='text-xs text-muted-foreground'>Repositories</p>
            <p className='text-2xl font-semibold'>{stats.repositoryCount}</p>
          </div>
          <div className='space-y-1'>
            <p className='text-xs text-muted-foreground'>Workflow Runs</p>
            <p className='text-2xl font-semibold'>{stats.workflowRunCount}</p>
          </div>
        </div>

        {/* Footer */}
        <div className='text-xs text-muted-foreground'>Created {formatDate(createdAt)}</div>
      </div>
    </Card>
  )
}
