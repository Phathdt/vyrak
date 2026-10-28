import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RepositoryCard } from './repository-card'

const mockMutateAsync = vi.fn()
const mockUseRepositories = vi.fn()

vi.mock('@/hooks/use-repositories', () => ({
  useRepositories: () => mockUseRepositories(),
}))

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}))

describe('RepositoryCard', () => {
  const mockRepository = {
    id: 'repo-1',
    name: 'my-backend-api',
    url: 'https://github.com/org/repo.git',
    branch: 'main',
    provider: 'github' as const,
    status: 'active' as const,
    updatedAt: '2024-10-26T10:00:00Z',
  }

  const mockOnEdit = vi.fn()
  const mockOnRemove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRepositories.mockReturnValue({
      testExisting: {
        mutateAsync: mockMutateAsync,
      },
    })
  })

  it('renders repository information correctly', () => {
    render(
      <RepositoryCard
        repository={mockRepository}
        organizationId='org-1'
        projectId='project-1'
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByText('my-backend-api')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText(/Updated 2 hours ago/)).toBeInTheDocument()
  })

  it('displays inactive status correctly', () => {
    render(
      <RepositoryCard
        repository={{ ...mockRepository, status: 'inactive' }}
        organizationId='org-1'
        projectId='project-1'
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    render(
      <RepositoryCard
        repository={mockRepository}
        organizationId='org-1'
        projectId='project-1'
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    )

    const allButtons = screen.getAllByRole('button')
    const editButton = allButtons.find((btn) => btn.querySelector('.lucide-edit'))
    expect(editButton).toBeDefined()

    if (editButton) {
      fireEvent.click(editButton)
      expect(mockOnEdit).toHaveBeenCalledTimes(1)
    }
  })

  it('calls onRemove when remove button is clicked', () => {
    render(
      <RepositoryCard
        repository={mockRepository}
        organizationId='org-1'
        projectId='project-1'
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    )

    const removeButtons = screen.getAllByRole('button')
    const removeButton = removeButtons.find((btn) => btn.querySelector('.lucide-trash-2'))
    expect(removeButton).toBeDefined()

    if (removeButton) {
      fireEvent.click(removeButton)
      expect(mockOnRemove).toHaveBeenCalledTimes(1)
    }
  })

  it('disables test connection button when repository is inactive', () => {
    render(
      <RepositoryCard
        repository={{ ...mockRepository, status: 'inactive' }}
        organizationId='org-1'
        projectId='project-1'
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    )

    const testButton = screen.getByRole('button', { name: /test connection/i })
    expect(testButton).toBeDisabled()
  })

  it('enables test connection button when repository is active', () => {
    render(
      <RepositoryCard
        repository={mockRepository}
        organizationId='org-1'
        projectId='project-1'
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    )

    const testButton = screen.getByRole('button', { name: /test connection/i })
    expect(testButton).not.toBeDisabled()
  })
})
