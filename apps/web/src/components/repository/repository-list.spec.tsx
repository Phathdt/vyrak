import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RepositoryList } from './repository-list'

const mockRepositories = [
  {
    id: 'repo-1',
    name: 'backend-api',
    url: 'https://github.com/org/backend.git',
    branch: 'main',
    provider: 'github' as const,
    status: 'active' as const,
    updatedAt: '2024-10-26T10:00:00Z',
  },
  {
    id: 'repo-2',
    name: 'frontend-app',
    url: 'https://gitlab.com/org/frontend.git',
    branch: 'develop',
    provider: 'gitlab' as const,
    status: 'active' as const,
    updatedAt: '2024-10-25T15:00:00Z',
  },
]

const mockUseRepositories = vi.fn()

vi.mock('@/hooks/use-repositories', () => ({
  useRepositories: () => mockUseRepositories(),
}))

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}))

describe('RepositoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton while loading', () => {
    mockUseRepositories.mockReturnValue({
      repositories: [],
      isLoading: true,
      error: null,
      testExisting: { mutateAsync: vi.fn() },
    })

    render(<RepositoryList organizationId='org-1' projectId='project-1' />)

    expect(screen.queryByText('Git Repositories')).not.toBeInTheDocument()
  })

  it('shows error message when loading fails', () => {
    mockUseRepositories.mockReturnValue({
      repositories: [],
      isLoading: false,
      error: new Error('Failed to load'),
      testExisting: { mutateAsync: vi.fn() },
    })

    render(<RepositoryList organizationId='org-1' projectId='project-1' />)

    expect(screen.getByText('Git Repositories')).toBeInTheDocument()
    expect(screen.getByText(/failed to load repositories/i)).toBeInTheDocument()
  })

  it('shows empty state when no repositories exist', () => {
    mockUseRepositories.mockReturnValue({
      repositories: [],
      isLoading: false,
      error: null,
      testExisting: { mutateAsync: vi.fn() },
    })

    render(<RepositoryList organizationId='org-1' projectId='project-1' />)

    expect(screen.getByText('No repositories configured')).toBeInTheDocument()
    expect(screen.getByText(/add a git repository to enable ai workflows/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first repository/i })).toBeInTheDocument()
  })

  it('renders repository cards when repositories exist', () => {
    mockUseRepositories.mockReturnValue({
      repositories: mockRepositories,
      isLoading: false,
      error: null,
      testExisting: { mutateAsync: vi.fn() },
    })

    render(<RepositoryList organizationId='org-1' projectId='project-1' />)

    expect(screen.getByText('backend-api')).toBeInTheDocument()
    expect(screen.getByText('frontend-app')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('GitLab')).toBeInTheDocument()
  })

  it('displays repository count badge when repositories exist', () => {
    mockUseRepositories.mockReturnValue({
      repositories: mockRepositories,
      isLoading: false,
      error: null,
      testExisting: { mutateAsync: vi.fn() },
    })

    render(<RepositoryList organizationId='org-1' projectId='project-1' />)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows Add Repository button in header', () => {
    mockUseRepositories.mockReturnValue({
      repositories: mockRepositories,
      isLoading: false,
      error: null,
      testExisting: { mutateAsync: vi.fn() },
    })

    render(<RepositoryList organizationId='org-1' projectId='project-1' />)

    const addButtons = screen.getAllByRole('button', { name: /add repository/i })
    expect(addButtons.length).toBeGreaterThan(0)
  })
})
