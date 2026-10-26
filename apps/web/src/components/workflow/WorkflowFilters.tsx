import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

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
    <div className='flex flex-col gap-4 sm:flex-row'>
      <div className='relative flex-1'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='text'
          placeholder='Search workflows...'
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className='pl-10'
        />
      </div>

      <select
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        className='flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48'
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
