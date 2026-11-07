import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { getProjectsControllerFindOneQueryKey } from '@/api/generated/projects/projects'
import {
  getRepositoriesControllerFindAllQueryKey,
  useRepositoriesControllerDelete,
  useRepositoriesControllerFindAll,
} from '@/api/generated/repositories/repositories'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { ConnectRepositoryDialog } from './connect-repository-dialog'

interface RepositoriesTabProps {
  orgId: string
  projectId: string
}

export function RepositoriesTab({ orgId, projectId }: RepositoriesTabProps) {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [repositoryToDelete, setRepositoryToDelete] = useState<{ id: string; name: string } | null>(null)
  const queryClient = useQueryClient()

  const { data: repositories, isLoading } = useRepositoriesControllerFindAll(orgId, projectId)

  const deleteMutation = useRepositoriesControllerDelete({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getRepositoriesControllerFindAllQueryKey(orgId, projectId),
        })
        queryClient.invalidateQueries({
          queryKey: getProjectsControllerFindOneQueryKey(orgId, projectId),
        })
        setDeleteDialogOpen(false)
        setRepositoryToDelete(null)
      },
    },
  })

  const handleDeleteClick = (repoId: string, repoName: string) => {
    setRepositoryToDelete({ id: repoId, name: repoName })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (repositoryToDelete) {
      deleteMutation.mutate({ orgId, projectId, repoId: repositoryToDelete.id })
    }
  }

  const parseRepoName = (url: string): string => {
    // Extract repo name from URL: https://github.com/owner/repo or git@github.com:owner/repo.git
    const match = url.match(/\/([^/]+?)(\.git)?$/) || url.match(/:([^/]+?)(\.git)?$/)
    return match ? match[1] : url
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[300px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading repositories...</p>
        </div>
      </div>
    )
  }

  const repos = repositories?.items || []

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-semibold'>Connected Repositories</h2>
          <p className='text-sm text-muted-foreground'>Manage GitHub repositories connected to this project</p>
        </div>
        <Button onClick={() => setConnectDialogOpen(true)}>Connect Repository</Button>
      </div>

      {/* Repository List */}
      {repos.length === 0 ? (
        <Card>
          <CardContent className='flex min-h-[300px] flex-col items-center justify-center py-12'>
            <svg className='mb-4 h-12 w-12 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
              />
            </svg>
            <h3 className='mb-2 text-lg font-semibold'>No repositories connected</h3>
            <p className='mb-4 text-center text-sm text-muted-foreground'>
              Connect a GitHub repository to start building workflows
            </p>
            <Button onClick={() => setConnectDialogOpen(true)}>Connect Your First Repository</Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {repos.map((repo) => (
            <Card key={repo.id}>
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <CardTitle className='text-lg'>{parseRepoName(repo.url)}</CardTitle>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground hover:text-destructive'
                    onClick={() => handleDeleteClick(repo.id, parseRepoName(repo.url))}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                  </svg>
                  <span className='truncate font-mono text-xs'>{repo.url}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='font-mono text-xs'>
                    {repo.branch}
                  </Badge>
                  <Badge variant={repo.status === 'active' ? 'default' : 'secondary'} className='text-xs'>
                    {repo.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Repository Dialog */}
      <ConnectRepositoryDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        orgId={orgId}
        projectId={projectId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Repository</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect <span className='font-semibold'>{repositoryToDelete?.name}</span> from
              this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
