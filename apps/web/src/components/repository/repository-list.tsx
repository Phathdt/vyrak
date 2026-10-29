import { Plus } from 'lucide-react'
import { useState } from 'react'

import { LoadingSkeleton } from '@/components/loading-skeleton'
import { Button } from '@/components/ui/button'
import { useRepositories } from '@/hooks/use-repositories'

import { RemoveRepositoryModal } from './RemoveRepositoryModal'
import { RepositoryCard } from './repository-card'
import { RepositoryForm } from './RepositoryForm'

interface RepositoryListProps {
  organizationId: string
  projectId: string
}

export function RepositoryList({ organizationId, projectId }: RepositoryListProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null)
  const [removingRepoId, setRemovingRepoId] = useState<string | null>(null)

  const { repositories, isLoading, error } = useRepositories(organizationId, projectId)

  if (isLoading) {
    return (
      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <LoadingSkeleton variant='text' className='h-8 w-48' />
          <LoadingSkeleton variant='rectangular' className='h-10 w-36' />
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} variant='rectangular' className='h-48 rounded-lg' />
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-semibold'>Git Repositories</h2>
        </div>
        <div className='rounded-lg border border-destructive/50 bg-destructive/5 p-4'>
          <p className='text-sm text-destructive'>Failed to load repositories. Please try again later.</p>
        </div>
      </section>
    )
  }

  const repositoryCount = repositories.length

  return (
    <section className='space-y-4' data-testid='repository-list'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <h2 className='text-2xl font-semibold'>Git Repositories</h2>
          {repositoryCount > 0 && (
            <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary'>
              {repositoryCount}
            </span>
          )}
        </div>
        <Button onClick={() => setShowAddForm(true)} data-testid='add-repository-button'>
          <Plus className='h-4 w-4 mr-2' />
          Add Repository
        </Button>
      </div>

      {/* Empty State */}
      {repositoryCount === 0 && (
        <div
          className='flex flex-col items-center justify-center py-16 px-4 rounded-lg border-2 border-dashed border-border bg-card/30'
          data-testid='repository-empty-state'
        >
          <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted/30 mb-4'>
            <svg className='h-10 w-10 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium mb-1'>No repositories configured</h3>
          <p className='text-sm text-muted-foreground text-center max-w-md mb-6'>
            Add a Git repository to enable AI workflows to access your codebase for analysis and implementation.
          </p>
          <Button onClick={() => setShowAddForm(true)} size='lg'>
            <Plus className='h-4 w-4 mr-2' />
            Add Your First Repository
          </Button>
        </div>
      )}

      {/* Repository Grid */}
      {repositoryCount > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {repositories.map((repo) => (
            <RepositoryCard
              key={repo.id}
              repository={repo}
              organizationId={organizationId}
              projectId={projectId}
              onEdit={() => setEditingRepoId(repo.id)}
              onRemove={() => setRemovingRepoId(repo.id)}
            />
          ))}
        </div>
      )}

      {/* Add Repository Modal */}
      {showAddForm && (
        <RepositoryForm
          mode='create'
          organizationId={organizationId}
          projectId={projectId}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Repository Modal */}
      {editingRepoId && (
        <RepositoryForm
          mode='edit'
          repositoryId={editingRepoId}
          organizationId={organizationId}
          projectId={projectId}
          onClose={() => setEditingRepoId(null)}
        />
      )}

      {/* Remove Confirmation Modal */}
      {removingRepoId && (
        <RemoveRepositoryModal
          repositoryId={removingRepoId}
          organizationId={organizationId}
          projectId={projectId}
          onClose={() => setRemovingRepoId(null)}
        />
      )}
    </section>
  )
}
