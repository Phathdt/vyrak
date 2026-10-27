import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { WorkflowFilters } from '../../components/workflow/WorkflowFilters'
import { WorkflowTable } from '../../components/workflow/WorkflowTable'
import { useWorkflowList } from '../../hooks/use-workflow-list'

export function WorkflowsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = {
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    projectId: searchParams.get('projectId') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
  }

  const { data, isLoading, error } = useWorkflowList(filters)

  const handleFilterChange = (newFilters: {
    status?: string
    search?: string
    projectId?: string
    page?: number
    limit?: number
  }) => {
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && key !== 'limit') {
        params.set(key, String(value))
      }
    })
    setSearchParams(params)
  }

  return (
    <div className='container py-8'>
      <header className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Workflows</h1>
        <p className='mt-2 text-muted-foreground'>Manage and monitor workflow executions</p>
      </header>

      <div className='space-y-6'>
        <WorkflowFilters filters={filters} onChange={handleFilterChange} />

        {isLoading && (
          <div className='flex flex-col items-center justify-center py-16'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <p className='mt-4 text-muted-foreground'>Loading workflows...</p>
          </div>
        )}

        {error && (
          <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive'>
            <p>Error loading workflows: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        )}

        {data && (
          <WorkflowTable
            workflows={data.items}
            total={data.total}
            page={filters.page}
            limit={filters.limit}
            onPageChange={(page) => handleFilterChange({ ...filters, page })}
          />
        )}
      </div>
    </div>
  )
}
