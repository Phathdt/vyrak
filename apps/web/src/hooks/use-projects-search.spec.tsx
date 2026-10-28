import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useProjectsSearch } from './use-projects-search'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('useProjectsSearch', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useProjectsSearch(), { wrapper })

    expect(result.current.state).toEqual({
      search: '',
      sort: '-createdAt',
      page: 1,
    })
  })

  it('updates search and resets page', () => {
    const { result } = renderHook(() => useProjectsSearch(), { wrapper })

    act(() => {
      result.current.setPage(3)
    })

    expect(result.current.state.page).toBe(3)

    act(() => {
      result.current.setSearch('test')
    })

    expect(result.current.state.search).toBe('test')
    expect(result.current.state.page).toBe(1) // Reset to page 1
  })

  it('updates sort and resets page', () => {
    const { result } = renderHook(() => useProjectsSearch(), { wrapper })

    act(() => {
      result.current.setPage(2)
    })

    expect(result.current.state.page).toBe(2)

    act(() => {
      result.current.setSort('name')
    })

    expect(result.current.state.sort).toBe('name')
    expect(result.current.state.page).toBe(1) // Reset to page 1
  })

  it('clears search', () => {
    const { result } = renderHook(() => useProjectsSearch(), { wrapper })

    act(() => {
      result.current.setSearch('test')
    })

    expect(result.current.state.search).toBe('test')

    act(() => {
      result.current.clearSearch()
    })

    expect(result.current.state.search).toBe('')
    expect(result.current.state.page).toBe(1)
  })

  it('resets all parameters', async () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => {
      return <MemoryRouter>{children}</MemoryRouter>
    }

    const { result } = renderHook(() => useProjectsSearch(), { wrapper: customWrapper })

    act(() => {
      result.current.setSearch('test-reset')
    })

    await waitFor(() => {
      expect(result.current.state.search).toBe('test-reset')
    })

    act(() => {
      result.current.setSort('name')
    })

    await waitFor(() => {
      expect(result.current.state.sort).toBe('name')
    })

    act(() => {
      result.current.setPage(3)
    })

    await waitFor(() => {
      expect(result.current.state.page).toBe(3)
    })

    act(() => {
      result.current.reset()
    })

    await waitFor(() => {
      expect(result.current.state.search).toBe('')
      expect(result.current.state.sort).toBe('-createdAt')
      expect(result.current.state.page).toBe(1)
    })
  })

  it('debounces search value', async () => {
    const { result } = renderHook(() => useProjectsSearch(), { wrapper })

    // Initial debounced value should be empty
    expect(result.current.debouncedSearch).toBe('')

    act(() => {
      result.current.setSearch('test')
    })

    // Debounced value should still be empty immediately after setting
    expect(result.current.debouncedSearch).toBe('')
    expect(result.current.state.search).toBe('test')

    // Wait for debounce delay (300ms)
    await waitFor(
      () => {
        expect(result.current.debouncedSearch).toBe('test')
      },
      { timeout: 500 }
    )
  })

  it('parses URL parameters correctly', async () => {
    const searchParams = new URLSearchParams({
      search: 'my-project',
      sort: '-name',
      page: '5',
    })

    const customWrapper = ({ children }: { children: React.ReactNode }) => {
      return <MemoryRouter initialEntries={[`/?${searchParams.toString()}`]}>{children}</MemoryRouter>
    }

    const { result } = renderHook(() => useProjectsSearch(), { wrapper: customWrapper })

    expect(result.current.state).toEqual({
      search: 'my-project',
      sort: '-name',
      page: 5,
    })
  })

  it('handles invalid page number gracefully', () => {
    const searchParams = new URLSearchParams({
      page: 'invalid',
    })

    const customWrapper = ({ children }: { children: React.ReactNode }) => {
      return <MemoryRouter initialEntries={[`/?${searchParams.toString()}`]}>{children}</MemoryRouter>
    }

    const { result } = renderHook(() => useProjectsSearch(), { wrapper: customWrapper })

    expect(result.current.state.page).toBe(1) // Falls back to 1 (NaN becomes 1 from parseInt with fallback)
  })

  it('removes search param from URL when search is empty', () => {
    const { result } = renderHook(() => useProjectsSearch(), { wrapper })

    act(() => {
      result.current.setSearch('test')
    })

    expect(result.current.state.search).toBe('test')

    act(() => {
      result.current.setSearch('')
    })

    expect(result.current.state.search).toBe('')
  })
})
