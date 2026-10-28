import type { SortOption } from '@/hooks/use-projects-search'

interface ProjectsFiltersProps {
  search: string
  sort: SortOption
  onSearchChange: (search: string) => void
  onSortChange: (sort: SortOption) => void
  onClearSearch: () => void
  isSearching?: boolean
}

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'createdAt', label: 'Oldest First' },
  { value: 'name', label: 'Name A-Z' },
  { value: '-name', label: 'Name Z-A' },
  { value: '-updatedAt', label: 'Recently Updated' },
  { value: 'updatedAt', label: 'Least Recently Updated' },
]

export function ProjectsFilters({
  search,
  sort,
  onSearchChange,
  onSortChange,
  onClearSearch,
  isSearching = false,
}: ProjectsFiltersProps) {
  return (
    <div className='flex flex-col sm:flex-row gap-4 mb-6' data-testid='projects-filters'>
      {/* Search Input */}
      <div className='flex-1'>
        <div className='relative'>
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <svg
              className='h-5 w-5 text-muted-foreground'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </div>
          <input
            type='text'
            placeholder='Search projects by name or slug...'
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className='block w-full pl-10 pr-10 py-2 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-colors'
            aria-label='Search projects'
            data-testid='projects-search'
          />
          {isSearching && (
            <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
              <svg
                className='animate-spin h-4 w-4 text-muted-foreground'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                aria-hidden='true'
              >
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                />
              </svg>
            </div>
          )}
          {search && !isSearching && (
            <button
              onClick={onClearSearch}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors'
              aria-label='Clear search'
              data-testid='projects-search-clear'
            >
              <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Sort Dropdown */}
      <div className='flex items-center gap-2 sm:min-w-[240px]'>
        <label htmlFor='sort-select' className='text-sm text-muted-foreground whitespace-nowrap'>
          Sort by:
        </label>
        <select
          id='sort-select'
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className='flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-colors cursor-pointer'
          data-testid='projects-sort'
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
