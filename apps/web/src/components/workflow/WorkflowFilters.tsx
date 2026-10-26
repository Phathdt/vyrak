interface WorkflowFiltersProps {
  filters: {
    status?: string
    search?: string
    projectId?: string
  }
  onChange: (filters: { status?: string; search?: string; projectId?: string }) => void
}

export function WorkflowFilters({ filters, onChange }: WorkflowFiltersProps) {
  return (
    <div className='workflow-filters'>
      <input
        type='text'
        placeholder='Search workflows...'
        value={filters.search || ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        className='search-input'
      />

      <select
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        className='filter-select'
      >
        <option value=''>All Status</option>
        <option value='queued'>Queued</option>
        <option value='running'>Running</option>
        <option value='waiting_approval'>Waiting Approval</option>
        <option value='succeeded'>Succeeded</option>
        <option value='failed'>Failed</option>
        <option value='cancelled'>Cancelled</option>
      </select>
    </div>
  )
}
