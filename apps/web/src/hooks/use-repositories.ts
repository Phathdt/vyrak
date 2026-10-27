import { useQueryClient } from '@tanstack/react-query'

// NOTE: These imports will be available after running `yarn generate:api`
// The hooks will be generated from the backend OpenAPI spec
// Placeholder types until generation completes

// TODO: Replace with backend-generated type after API implementation
export interface Repository {
  id: string
  name: string
  url: string
  branch: string
  provider: 'github' | 'gitlab' | 'bitbucket'
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

type UseQueryResult<T> = {
  data?: T
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

type UseMutationResult<T> = {
  mutateAsync: (data: unknown) => Promise<T>
  isPending: boolean
  error: Error | null
}

// Placeholder hook functions - will be replaced with Orval-generated imports
// TODO: Replace with actual imports after backend API is generated:
// import {
//   useGitRepositoriesControllerList,
//   useGitRepositoriesControllerCreate,
//   useGitRepositoriesControllerUpdate,
//   useGitRepositoriesControllerDelete,
//   useGitRepositoriesControllerTestConnection,
//   useGitRepositoriesControllerTest,
// } from '@/api/generated/git-repositories/git-repositories'

const useGitRepositoriesControllerList = (
  _orgId: string,
  _projectId: string,
  _options?: unknown
): UseQueryResult<Repository[]> => {
  throw new Error('Orval hooks not generated yet. Run: yarn generate:api')
}

const useGitRepositoriesControllerCreate = (_options?: unknown): UseMutationResult<Repository> => {
  throw new Error('Orval hooks not generated yet. Run: yarn generate:api')
}

const useGitRepositoriesControllerUpdate = (_options?: unknown): UseMutationResult<Repository> => {
  throw new Error('Orval hooks not generated yet. Run: yarn generate:api')
}

const useGitRepositoriesControllerDelete = (_options?: unknown): UseMutationResult<void> => {
  throw new Error('Orval hooks not generated yet. Run: yarn generate:api')
}

const useGitRepositoriesControllerTestConnection = (): UseMutationResult<{ success: boolean; message: string }> => {
  throw new Error('Orval hooks not generated yet. Run: yarn generate:api')
}

const useGitRepositoriesControllerTest = (): UseMutationResult<{ success: boolean; message: string }> => {
  throw new Error('Orval hooks not generated yet. Run: yarn generate:api')
}

export function useRepositories(orgId: string, projectId: string) {
  const queryClient = useQueryClient()

  const list = useGitRepositoriesControllerList(orgId, projectId, {
    query: {
      enabled: !!orgId && !!projectId,
      staleTime: 30000, // 30 seconds
    },
  })

  const create = useGitRepositoriesControllerCreate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['gitRepositories', orgId, projectId],
        })
      },
    },
  })

  const update = useGitRepositoriesControllerUpdate({
    mutation: {
      onMutate: async (variables: unknown) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ['gitRepositories', orgId, projectId],
        })

        // Snapshot previous value
        const previousRepos = queryClient.getQueryData<unknown[]>(['gitRepositories', orgId, projectId])

        // Optimistically update
        if (previousRepos) {
          queryClient.setQueryData<unknown[]>(
            ['gitRepositories', orgId, projectId],
            previousRepos.map((repo: unknown) => {
              const r = repo as { id: string }
              const v = variables as { repoId: string; data: Record<string, unknown> }
              return r.id === v.repoId ? { ...r, ...v.data } : repo
            })
          )
        }

        return { previousRepos }
      },
      onError: (_err: unknown, _variables: unknown, context: unknown) => {
        // Rollback on error
        const ctx = context as { previousRepos?: unknown[] } | undefined
        if (ctx?.previousRepos) {
          queryClient.setQueryData(['gitRepositories', orgId, projectId], ctx.previousRepos)
        }
      },
      onSettled: () => {
        // Always refetch to ensure sync
        queryClient.invalidateQueries({
          queryKey: ['gitRepositories', orgId, projectId],
        })
      },
    },
  })

  const remove = useGitRepositoriesControllerDelete({
    mutation: {
      onMutate: async (variables: unknown) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ['gitRepositories', orgId, projectId],
        })

        // Snapshot previous value
        const previousRepos = queryClient.getQueryData(['gitRepositories', orgId, projectId])

        // Optimistically update to remove repository
        queryClient.setQueryData(['gitRepositories', orgId, projectId], (old: unknown) => {
          const oldRepos = old as unknown[] | undefined
          const v = variables as { repoId: string }
          return oldRepos ? oldRepos.filter((r) => (r as { id: string }).id !== v.repoId) : []
        })

        // Return context with snapshot
        return { previousRepos }
      },
      onError: (_err: unknown, _variables: unknown, context: unknown) => {
        // Rollback on error
        const ctx = context as { previousRepos?: unknown } | undefined
        if (ctx?.previousRepos) {
          queryClient.setQueryData(['gitRepositories', orgId, projectId], ctx.previousRepos)
        }
      },
      onSettled: () => {
        // Refetch to ensure sync
        queryClient.invalidateQueries({
          queryKey: ['gitRepositories', orgId, projectId],
        })
      },
    },
  })

  const testConnection = useGitRepositoriesControllerTestConnection()
  const testExisting = useGitRepositoriesControllerTest()

  return {
    repositories: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error,
    create,
    update,
    remove,
    testConnection,
    testExisting,
    refetch: list.refetch,
  }
}
