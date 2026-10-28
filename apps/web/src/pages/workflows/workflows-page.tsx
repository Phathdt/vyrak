import { Loader2, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

import { WorkflowFilters } from '../../components/workflow/workflow-filters'
import { WorkflowTable } from '../../components/workflow/workflow-table'
import { useWorkflowList } from '../../hooks/use-workflow-list'

export function WorkflowsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = {
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    projectId: searchParams.get('projectId') || undefined,
    dateRange: searchParams.get('dateRange') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
  }

  const { data, isLoading, error } = useWorkflowList(filters)

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    const params = new URLSearchParams()
    const merged = { ...filters, ...newFilters }

    Object.entries(merged).forEach(([key, value]) => {
      if (value && key !== 'limit') {
        params.set(key, String(value))
      }
    })

    setSearchParams(params)
  }

  const hasWorkflows = data && data.items.length > 0
  const noWorkflowsAtAll =
    data && data.total === 0 && !filters.status && !filters.search && !filters.projectId && !filters.dateRange
  const noResultsForFilters =
    data && data.items.length === 0 && (filters.status || filters.search || filters.projectId || filters.dateRange)

  return (
    <div className='container py-8' data-testid='workflows-page'>
      <header className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Workflows</h1>
          <p className='mt-2 text-muted-foreground'>Monitor and manage your AI-powered development workflows</p>
        </div>
        <Button asChild data-testid='create-workflow-button'>
          <Link to='/workflows/create'>
            <Plus className='mr-2 h-4 w-4' />
            Create Workflow
          </Link>
        </Button>
      </header>

      <div className='space-y-6'>
        <WorkflowFilters
          filters={filters}
          onChange={handleFilterChange}
          projectOptions={[]}
          data-testid='workflows-filters'
        />

        {isLoading && (
          <div className='flex flex-col items-center justify-center py-16' data-testid='workflows-loading'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <p className='mt-4 text-muted-foreground'>Loading workflows...</p>
          </div>
        )}

        {error && (
          <div
            className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive'
            data-testid='workflows-error'
          >
            <p>Error loading workflows: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        )}

        {noWorkflowsAtAll && (
          <div
            className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center'
            data-testid='workflows-empty-state'
          >
            <div className='mb-4 text-6xl opacity-50'>📋</div>
            <h2 className='mb-2 text-2xl font-semibold'>No workflows yet</h2>
            <p className='mb-6 max-w-md text-muted-foreground'>
              Get started by creating your first AI-powered workflow
            </p>
            <Button asChild>
              <Link to='/workflows/create'>
                <Plus className='mr-2 h-4 w-4' />
                Create Your First Workflow
              </Link>
            </Button>
          </div>
        )}

        {noResultsForFilters && (
          <div
            className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center'
            data-testid='workflows-no-results'
          >
            <div className='mb-4 text-6xl opacity-50'>🔍</div>
            <h2 className='mb-2 text-2xl font-semibold'>No workflows match your filters</h2>
            <p className='mb-6 max-w-md text-muted-foreground'>
              Try adjusting your search criteria or clearing the filters
            </p>
            <Button
              variant='outline'
              onClick={() =>
                handleFilterChange({
                  status: undefined,
                  search: undefined,
                  projectId: undefined,
                  dateRange: undefined,
                  dateFrom: undefined,
                  dateTo: undefined,
                  page: 1,
                })
              }
              data-testid='workflows-clear-filters'
            >
              Clear Filters
            </Button>
          </div>
        )}

        {hasWorkflows && (
          <WorkflowTable
            workflows={data.items}
            total={data.total}
            page={filters.page}
            limit={filters.limit}
            onPageChange={(page) => handleFilterChange({ page })}
          />
        )}
      </div>
    </div>
  )
}
