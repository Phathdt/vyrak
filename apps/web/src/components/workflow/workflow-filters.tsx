import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface WorkflowFiltersProps {
  filters: {
    status?: string
    search?: string
    projectId?: string
    dateRange?: string
    dateFrom?: string
    dateTo?: string
    page?: number
  }
  onChange: (filters: Partial<WorkflowFiltersProps['filters']>) => void
  projectOptions?: Array<{ id: string; name: string }>
}

const STATUS_OPTIONS = [
  { value: 'queued', label: 'Queued', icon: '⏳' },
  { value: 'running', label: 'Running', icon: '▶️' },
  { value: 'waiting_approval', label: 'Waiting Approval', icon: '⏸️' },
  { value: 'succeeded', label: 'Succeeded', icon: '✅' },
  { value: 'failed', label: 'Failed', icon: '❌' },
  { value: 'cancelled', label: 'Cancelled', icon: '🚫' },
]

export function WorkflowFilters({ filters, onChange, projectOptions = [] }: WorkflowFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [showCustomDateRange, setShowCustomDateRange] = useState(filters.dateRange === 'custom')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input (300ms)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      onChange({ search: searchInput || undefined, page: 1 })
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const handleStatusChange = (status: string) => {
    const currentStatuses = filters.status?.split(',') || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status]

    onChange({
      status: newStatuses.length > 0 ? newStatuses.join(',') : undefined,
      page: 1,
    })
  }

  const handleDateRangeChange = (range: string) => {
    if (range === 'custom') {
      setShowCustomDateRange(true)
      onChange({ dateRange: range, page: 1 })
    } else {
      setShowCustomDateRange(false)
      const dates = calculateDateRange(range)
      onChange({
        dateRange: range,
        dateFrom: dates.from,
        dateTo: dates.to,
        page: 1,
      })
    }
  }

  const handleCustomDateChange = (from: string, to: string) => {
    onChange({
      dateRange: 'custom',
      dateFrom: from || undefined,
      dateTo: to || undefined,
      page: 1,
    })
  }

  const clearFilters = () => {
    setSearchInput('')
    setShowCustomDateRange(false)
    onChange({
      status: undefined,
      search: undefined,
      projectId: undefined,
      dateRange: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
    })
  }

  const hasActiveFilters = filters.status || filters.search || filters.projectId || filters.dateRange

  const selectedStatuses = filters.status?.split(',') || []

  return (
    <div className='flex flex-col gap-6 rounded-lg border bg-card p-6' data-testid='workflows-filters'>
      <div className='flex flex-wrap items-end gap-4'>
        {/* Search Input */}
        <div className='flex flex-1 flex-col gap-2' style={{ minWidth: '300px' }}>
          <Label
            htmlFor='workflow-search'
            className='text-xs font-medium uppercase tracking-wide text-muted-foreground'
          >
            Search
          </Label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              id='workflow-search'
              type='text'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search by requirement or run ID...'
              className='pl-10'
              data-testid='workflows-search'
            />
            {searchInput && (
              <button
                type='button'
                onClick={() => setSearchInput('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                aria-label='Clear search'
                data-testid='workflows-search-clear'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
        </div>

        {/* Project Filter */}
        {projectOptions.length > 0 && (
          <div className='flex flex-col gap-2' style={{ minWidth: '200px' }}>
            <Label
              htmlFor='project-filter'
              className='text-xs font-medium uppercase tracking-wide text-muted-foreground'
            >
              Project
            </Label>
            <select
              id='project-filter'
              value={filters.projectId || ''}
              onChange={(e) => onChange({ projectId: e.target.value || undefined, page: 1 })}
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              data-testid='workflows-filter-project'
            >
              <option value=''>All Projects</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range Filter */}
        <div className='flex flex-col gap-2' style={{ minWidth: '200px' }}>
          <Label
            htmlFor='date-range-filter'
            className='text-xs font-medium uppercase tracking-wide text-muted-foreground'
          >
            Date Range
          </Label>
          <select
            id='date-range-filter'
            value={filters.dateRange || ''}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            data-testid='workflows-filter-date-range'
          >
            <option value=''>All Time</option>
            <option value='24h'>Last 24 Hours</option>
            <option value='7d'>Last 7 Days</option>
            <option value='30d'>Last 30 Days</option>
            <option value='custom'>Custom Range</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            type='button'
            variant='outline'
            onClick={clearFilters}
            className='h-10'
            data-testid='workflows-clear-filters'
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Custom Date Range */}
      {showCustomDateRange && (
        <div className='flex gap-4 rounded-md border bg-muted/50 p-4' data-testid='workflows-filter-custom-date'>
          <div className='flex flex-1 flex-col gap-2'>
            <Label htmlFor='date-from' className='text-xs font-medium'>
              From
            </Label>
            <Input
              id='date-from'
              type='date'
              value={filters.dateFrom?.split('T')[0] || ''}
              onChange={(e) =>
                handleCustomDateChange(
                  e.target.value ? new Date(e.target.value).toISOString() : '',
                  filters.dateTo || ''
                )
              }
              max={filters.dateTo?.split('T')[0] || new Date().toISOString().split('T')[0]}
              data-testid='workflows-filter-date-from'
            />
          </div>
          <div className='flex flex-1 flex-col gap-2'>
            <Label htmlFor='date-to' className='text-xs font-medium'>
              To
            </Label>
            <Input
              id='date-to'
              type='date'
              value={filters.dateTo?.split('T')[0] || ''}
              onChange={(e) =>
                handleCustomDateChange(
                  filters.dateFrom || '',
                  e.target.value ? new Date(e.target.value).toISOString() : ''
                )
              }
              min={filters.dateFrom?.split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
              data-testid='workflows-filter-date-to'
            />
          </div>
        </div>
      )}

      {/* Status Filter (Multi-select chips) */}
      <div className='flex flex-col gap-3'>
        <Label className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Status</Label>
        <div className='flex flex-wrap gap-2' data-testid='workflows-filter-status'>
          {STATUS_OPTIONS.map((statusOption) => (
            <button
              key={statusOption.value}
              type='button'
              onClick={() => handleStatusChange(statusOption.value)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                selectedStatuses.includes(statusOption.value)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
              aria-pressed={selectedStatuses.includes(statusOption.value)}
              data-testid={`workflows-filter-status-${statusOption.value}`}
            >
              <span>{statusOption.icon}</span>
              <span>{statusOption.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate date range
function calculateDateRange(range: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  const from = new Date()

  switch (range) {
    case '24h':
      from.setHours(now.getHours() - 24)
      break
    case '7d':
      from.setDate(now.getDate() - 7)
      break
    case '30d':
      from.setDate(now.getDate() - 30)
      break
    default:
      return { from: '', to: '' }
  }

  return {
    from: from.toISOString(),
    to,
  }
}
