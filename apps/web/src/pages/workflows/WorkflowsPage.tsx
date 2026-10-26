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
    <div className='workflows-page'>
      <header className='page-header'>
        <h1>Workflows</h1>
      </header>

      <WorkflowFilters filters={filters} onChange={handleFilterChange} />

      {isLoading && (
        <div className='page-loading'>
          <div className='loading-spinner' />
          <p>Loading workflows...</p>
        </div>
      )}

      {error && (
        <div className='page-error'>
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
  )
}
