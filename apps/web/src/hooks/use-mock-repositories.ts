/**
 * TEMPORARY MOCK: Epic 12 repositories API not ready yet
 * Replace this with real useRepositoriesControllerFindAll when available
 */

interface MockRepository {
  id: string
  name: string
  provider: 'github' | 'gitlab'
  defaultBranch: string
  status: 'active' | 'inactive'
}

export function useMockRepositories(projectId: string | undefined) {
  // Return empty if no project selected
  if (!projectId) {
    return {
      data: [],
      isLoading: false,
      error: null,
    }
  }

  // Mock data for demo
  const mockRepositories: MockRepository[] = [
    {
      id: 'repo-1',
      name: 'vyrak',
      provider: 'github',
      defaultBranch: 'main',
      status: 'active',
    },
    {
      id: 'repo-2',
      name: 'vyrak-frontend',
      provider: 'github',
      defaultBranch: 'develop',
      status: 'active',
    },
    {
      id: 'repo-3',
      name: 'vyrak-backend',
      provider: 'github',
      defaultBranch: 'main',
      status: 'active',
    },
    {
      id: 'repo-4',
      name: 'archived-repo',
      provider: 'github',
      defaultBranch: 'main',
      status: 'inactive',
    },
  ]

  return {
    data: mockRepositories,
    isLoading: false,
    error: null,
  }
}
