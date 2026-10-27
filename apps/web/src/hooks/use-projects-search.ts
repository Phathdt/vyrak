import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useDebounce } from './use-debounce'

export type SortOption = 'name' | '-name' | 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt'

export interface ProjectsSearchState {
  search: string
  sort: SortOption
  page: number
}

export function useProjectsSearch() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse current state from URL
  const state = useMemo<ProjectsSearchState>(
    () => ({
      search: searchParams.get('search') || '',
      sort: (searchParams.get('sort') as SortOption) || '-createdAt',
      page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)) || 1,
    }),
    [searchParams]
  )

  // Debounced search value for API calls
  const debouncedSearch = useDebounce(state.search, 300)

  // Update functions
  const setSearch = (search: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (search) {
      newParams.set('search', search)
    } else {
      newParams.delete('search')
    }
    newParams.set('page', '1') // Reset to first page
    setSearchParams(newParams)
  }

  const setSort = (sort: SortOption) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('sort', sort)
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const setPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', page.toString())
    setSearchParams(newParams)
  }

  const clearSearch = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('search')
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const reset = () => {
    setSearchParams({})
  }

  return {
    state,
    debouncedSearch,
    setSearch,
    setSort,
    setPage,
    clearSearch,
    reset,
  }
}
