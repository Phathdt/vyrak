import { useState } from 'react'

import { ProjectCard } from '@/components/project/project-card'
import { ProjectCreateModal } from '@/components/project/project-create-modal'
import { ProjectsEmptyState } from '@/components/project/projects-empty-state'
import { ProjectsFilters } from '@/components/project/projects-filters'
import { Button } from '@/components/ui/button'
import { useProjectList } from '@/hooks/use-project-list'
import { useProjectsSearch } from '@/hooks/use-projects-search'

export function ProjectsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Search and filter state from URL
  const { state, debouncedSearch, setSearch, setSort, setPage, clearSearch } = useProjectsSearch()

  // Fetch projects with search/filter params
  const { data, isLoading, error, refetch, isFetching } = useProjectList({
    page: state.page,
    limit: 12,
    search: debouncedSearch,
    sort: state.sort,
  })

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl font-bold mb-2'>Projects</h1>
            <p className='text-muted-foreground'>Loading...</p>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-64 bg-card border border-border rounded-lg animate-pulse' />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex flex-col items-center justify-center min-h-[400px] text-center'>
          <div className='w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4'>
            <svg className='w-8 h-8 text-destructive' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold mb-2'>Failed to load projects</h3>
          <p className='text-sm text-muted-foreground mb-6'>{error.message || 'An unexpected error occurred'}</p>
          <Button onClick={() => refetch()} variant='outline'>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const projects = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  const hasSearchOrFilter = state.search || state.sort !== '-createdAt'
  const showEmptyState = projects.length === 0 && !hasSearchOrFilter

  return (
    <div className='container mx-auto px-4 py-8' data-testid='projects-page'>
      {/* Header */}
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-bold mb-2'>Projects</h1>
          <p className='text-muted-foreground'>
            {total === 0 ? 'No projects' : total === 1 ? '1 project' : `${total} projects`}
            {state.search && ` • Searching for "${state.search}"`}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} variant='default' data-testid='create-project-button'>
          Create Project
        </Button>
      </div>

      {/* Filters */}
      <ProjectsFilters
        search={state.search}
        sort={state.sort}
        onSearchChange={setSearch}
        onSortChange={setSort}
        onClearSearch={clearSearch}
        isSearching={isFetching}
        data-testid='projects-filters'
      />

      {/* Content */}
      {showEmptyState ? (
        <ProjectsEmptyState onCreateClick={() => setIsCreateModalOpen(true)} />
      ) : projects.length === 0 ? (
        <div
          className='flex flex-col items-center justify-center min-h-[300px] text-center'
          data-testid='projects-no-results'
        >
          <div className='w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4'>
            <svg className='w-8 h-8 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold mb-2'>No projects found</h3>
          <p className='text-sm text-muted-foreground mb-6'>Try adjusting your search or filters.</p>
          <Button onClick={clearSearch} variant='outline' data-testid='projects-clear-search'>
            Clear Search
          </Button>
        </div>
      ) : (
        <>
          {/* Projects Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8' data-testid='projects-list'>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                slug={project.slug}
                description={project.description}
                createdAt={project.createdAt}
                stats={{
                  repositoryCount: project.stats.repositoryCount,
                  workflowRunCount: project.stats.workflowRunCount,
                }}
                data-testid={`project-card-${project.id}`}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-4' data-testid='projects-pagination'>
              <Button
                disabled={state.page === 1}
                onClick={() => setPage(state.page - 1)}
                variant='outline'
                data-testid='projects-pagination-prev'
              >
                Previous
              </Button>
              <span className='text-sm text-muted-foreground'>
                Page {state.page} of {totalPages}
              </span>
              <Button
                disabled={state.page >= totalPages}
                onClick={() => setPage(state.page + 1)}
                variant='outline'
                data-testid='projects-pagination-next'
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <ProjectCreateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setIsCreateModalOpen(false)}
        data-testid='project-create-modal'
      />
    </div>
  )
}
