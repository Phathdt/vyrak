import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useRepositories } from '@/hooks/use-repositories'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RemoveRepositoryModalProps {
  repositoryId: string
  organizationId: string
  projectId: string
  onClose: () => void
}

export function RemoveRepositoryModal({
  repositoryId,
  organizationId,
  projectId,
  onClose,
}: RemoveRepositoryModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [affectedWorkflows, setAffectedWorkflows] = useState<number>(0)
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true)

  const { showToast } = useToast()
  const { repositories, remove } = useRepositories(organizationId, projectId)

  const repository = repositories.find((r) => r.id === repositoryId)
  const isConfirmValid = confirmText === 'DELETE'

  // Fetch affected workflows count
  useEffect(() => {
    const fetchAffectedWorkflows = async () => {
      setIsLoadingWorkflows(true)
      try {
        // Endpoint should return count of workflows using this repo
        const token = localStorage.getItem('token')
        const response = await fetch(
          `/api/organizations/${organizationId}/projects/${projectId}/repositories/${repositoryId}/workflows`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setAffectedWorkflows(data.count || 0)
        }
      } catch (error) {
        console.error('Failed to fetch affected workflows:', error)
        // Continue without count
      } finally {
        setIsLoadingWorkflows(false)
      }
    }

    fetchAffectedWorkflows()
  }, [organizationId, projectId, repositoryId])

  const handleRemove = async () => {
    if (!isConfirmValid) return

    try {
      await remove.mutateAsync({
        orgId: organizationId,
        projectId,
        repoId: repositoryId,
      })

      showToast({
        title: 'Repository removed successfully',
        type: 'success',
      })
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove repository'
      showToast({
        title: `Error: ${errorMessage}`,
        type: 'error',
      })
    }
  }

  if (!repository) {
    return null
  }

  return (
    <Modal open onClose={onClose} size='md'>
      <ModalHeader onClose={onClose}>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10'>
            <AlertTriangle className='h-5 w-5 text-destructive' />
          </div>
          <ModalTitle>Remove Repository?</ModalTitle>
        </div>
      </ModalHeader>

      <ModalBody className='space-y-5'>
        {/* Warning Message */}
        <div className='rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 space-y-3'>
          <p className='text-sm font-medium'>
            Are you sure you want to remove <span className='font-semibold'>{repository.name}</span>?
          </p>
          <p className='text-sm text-muted-foreground'>
            This action cannot be undone. The repository configuration will be permanently deleted.
          </p>
        </div>

        {/* Affected Workflows Warning */}
        {isLoadingWorkflows ? (
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Checking for affected workflows...
          </div>
        ) : affectedWorkflows > 0 ? (
          <div className='rounded-lg border-2 border-yellow-500/50 bg-yellow-500/5 p-4 space-y-2'>
            <div className='flex items-start gap-2'>
              <AlertTriangle className='h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5' />
              <div className='space-y-1'>
                <p className='text-sm font-medium text-yellow-500'>
                  Warning: {affectedWorkflows} {affectedWorkflows === 1 ? 'workflow is' : 'workflows are'} using this
                  repository
                </p>
                <p className='text-xs text-muted-foreground'>
                  These workflows will fail if you proceed with removal. Consider deactivating the repository instead.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <svg className='h-4 w-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                clipRule='evenodd'
              />
            </svg>
            No active workflows are using this repository
          </div>
        )}

        {/* Repository Details */}
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>Repository</span>
            <span className='font-medium'>{repository.name}</span>
          </div>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>URL</span>
            <code className='text-xs'>{repository.url}</code>
          </div>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>Branch</span>
            <span className='font-mono text-xs'>{repository.branch}</span>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className='space-y-3'>
          <Label htmlFor='confirm-delete' className='text-sm font-medium'>
            Type <span className='font-mono font-bold text-destructive'>DELETE</span> to confirm
          </Label>
          <Input
            id='confirm-delete'
            type='text'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='DELETE'
            className='font-mono'
            autoComplete='off'
            autoFocus
          />
        </div>

        {/* Help Text */}
        <p className='text-xs text-muted-foreground'>
          <strong>Tip:</strong> If you need to temporarily disable this repository, use the status toggle instead of
          removing it.
        </p>
      </ModalBody>

      <ModalFooter>
        <Button type='button' variant='outline' onClick={onClose} disabled={remove.isPending}>
          Cancel
        </Button>
        <Button
          type='button'
          variant='destructive'
          onClick={handleRemove}
          disabled={!isConfirmValid || remove.isPending}
        >
          {remove.isPending && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
          <Trash2 className='h-4 w-4 mr-2' />
          Remove Repository
        </Button>
      </ModalFooter>
    </Modal>
  )
}
