import { ProjectEditForm } from '@/components/project/project-edit-form'
import { ProjectStats } from '@/components/project/project-stats'
import { RecentWorkflowsSection } from '@/components/project/recent-workflows-section'
import { RepositoryList } from '@/components/repository/repository-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useOrganization } from '@/contexts/organization-context'
import { useProjectDetail } from '@/hooks/use-project-detail'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const { activeOrgId } = useOrganization()

  const { data: project, isLoading, error } = useProjectDetail(id!)

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8 space-y-6'>
        <div className='h-32 bg-accent/50 animate-pulse rounded-lg' />
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className='h-32 bg-accent/50 animate-pulse rounded-lg' />
          ))}
        </div>
        <div className='h-64 bg-accent/50 animate-pulse rounded-lg' />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Card>
          <CardContent className='py-12 text-center'>
            <svg
              className='w-16 h-16 text-muted-foreground mx-auto mb-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
            <h3 className='text-xl font-semibold mb-2'>Project not found</h3>
            <p className='text-muted-foreground mb-6'>
              The project you're looking for doesn't exist or you don't have access.
            </p>
            <Button onClick={() => navigate('/projects')} variant='outline'>
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
    }).format(new Date(dateString))
  }

  return (
    <div className='container mx-auto px-4 py-8 space-y-8'>
      {/* Breadcrumb */}
      <nav className='flex items-center text-sm text-muted-foreground'>
        <button onClick={() => navigate('/projects')} className='hover:text-foreground transition-colors'>
          Projects
        </button>
        <span className='mx-2'>/</span>
        <span className='text-foreground'>{project.name}</span>
      </nav>

      {/* Header */}
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-3 mb-2 flex-wrap'>
            <h1 className='text-3xl font-bold'>{project.name}</h1>
            <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-cyan/10 text-accent-cyan'>
              {project.slug}
            </span>
          </div>
          <p className='text-muted-foreground'>{project.description || 'No description provided'}</p>
          <div className='flex items-center gap-2 mt-2 text-sm text-muted-foreground'>
            <span>Created {formatDate(project.createdAt)}</span>
            {project.updatedAt !== project.createdAt && (
              <>
                <span>•</span>
                <span>Updated {formatDate(project.updatedAt)}</span>
              </>
            )}
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Button onClick={() => setIsEditing(true)} variant='outline'>
            <svg className='w-4 h-4 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
              />
            </svg>
            Edit Project
          </Button>
          <Button disabled variant='destructive' title='Project deletion is not allowed'>
            <svg className='w-4 h-4 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
              />
            </svg>
            Delete
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <ProjectStats
        stats={{
          repositoryCount: project.stats?.repositoryCount || 0,
          totalWorkflowRuns: project.stats?.workflowRunCount || 0,
          activeWorkflowRuns: 0, // TODO: Will be available when backend adds this field
          lastRunDate: undefined, // TODO: Will be available when backend adds this field
        }}
      />

      {/* Git Repositories */}
      {activeOrgId && <RepositoryList organizationId={activeOrgId} projectId={project.id} />}

      {/* Recent Workflows */}
      <RecentWorkflowsSection projectId={project.id} />

      {/* Edit Modal */}
      {isEditing && (
        <ProjectEditForm project={project} onClose={() => setIsEditing(false)} onSuccess={() => setIsEditing(false)} />
      )}
    </div>
  )
}
