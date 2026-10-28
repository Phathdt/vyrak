import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProjectsFilters } from './projects-filters'

describe('ProjectsFilters', () => {
  it('renders search input and sort dropdown', () => {
    render(
      <ProjectsFilters
        search=''
        sort='-createdAt'
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearSearch={vi.fn()}
      />
    )

    expect(screen.getByPlaceholderText(/search projects/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
  })

  it('calls onSearchChange when typing', () => {
    const onSearchChange = vi.fn()

    render(
      <ProjectsFilters
        search=''
        sort='-createdAt'
        onSearchChange={onSearchChange}
        onSortChange={vi.fn()}
        onClearSearch={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/search projects/i)
    fireEvent.change(input, { target: { value: 'test' } })

    expect(onSearchChange).toHaveBeenCalledWith('test')
  })

  it('shows clear button when search is active', () => {
    render(
      <ProjectsFilters
        search='test'
        sort='-createdAt'
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearSearch={vi.fn()}
      />
    )

    const clearButton = screen.getByLabelText(/clear search/i)
    expect(clearButton).toBeInTheDocument()
  })

  it('hides clear button when search is empty', () => {
    render(
      <ProjectsFilters
        search=''
        sort='-createdAt'
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearSearch={vi.fn()}
      />
    )

    expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument()
  })

  it('calls onClearSearch when clear button clicked', () => {
    const onClearSearch = vi.fn()

    render(
      <ProjectsFilters
        search='test'
        sort='-createdAt'
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearSearch={onClearSearch}
      />
    )

    const clearButton = screen.getByLabelText(/clear search/i)
    fireEvent.click(clearButton)

    expect(onClearSearch).toHaveBeenCalled()
  })

  it('shows loading spinner when searching', () => {
    const { container } = render(
      <ProjectsFilters
        search='test'
        sort='-createdAt'
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearSearch={vi.fn()}
        isSearching={true}
      />
    )

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('calls onSortChange when sort selection changes', () => {
    const onSortChange = vi.fn()

    render(
      <ProjectsFilters
        search=''
        sort='-createdAt'
        onSearchChange={vi.fn()}
        onSortChange={onSortChange}
        onClearSearch={vi.fn()}
      />
    )

    const sortSelect = screen.getByLabelText(/sort by/i)
    fireEvent.change(sortSelect, { target: { value: 'name' } })

    expect(onSortChange).toHaveBeenCalledWith('name')
  })

  it('displays current sort value', () => {
    render(
      <ProjectsFilters search='' sort='name' onSearchChange={vi.fn()} onSortChange={vi.fn()} onClearSearch={vi.fn()} />
    )

    const sortSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement
    expect(sortSelect.value).toBe('name')
  })

  it('displays current search value', () => {
    render(
      <ProjectsFilters
        search='my project'
        sort='-createdAt'
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearSearch={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search projects/i) as HTMLInputElement
    expect(searchInput.value).toBe('my project')
  })
})
