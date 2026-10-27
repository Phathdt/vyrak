import { Button } from '@/components/ui/button'
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useRepositories } from '@/hooks/use-repositories'
import { cn } from '@/lib/utils'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface StatusToggleProps {
  repositoryId: string
  repositoryName: string
  currentStatus: 'active' | 'inactive'
  organizationId: string
  projectId: string
  affectedWorkflowsCount?: number
  className?: string
}

export function StatusToggle({
  repositoryId,
  repositoryName,
  currentStatus,
  organizationId,
  projectId,
  affectedWorkflowsCount = 0,
  className,
}: StatusToggleProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<'active' | 'inactive' | null>(null)

  const { showToast } = useToast()
  const { update } = useRepositories(organizationId, projectId)

  const isActive = currentStatus === 'active'
  const nextStatus = isActive ? 'inactive' : 'active'

  const handleToggleClick = () => {
    setPendingStatus(nextStatus)
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    if (!pendingStatus) return

    try {
      await update.mutateAsync({
        orgId: organizationId,
        projectId,
        repoId: repositoryId,
        data: {
          status: pendingStatus,
        },
      })

      showToast(`Repository ${pendingStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success')
      setShowConfirmation(false)
      setPendingStatus(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
      showToast(`Error: ${errorMessage}`, 'error')
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setPendingStatus(null)
  }

  return (
    <>
      {/* Toggle Switch */}
      <button
        type='button'
        role='switch'
        aria-checked={isActive}
        aria-label={`Repository status: ${currentStatus}. Click to ${nextStatus === 'active' ? 'activate' : 'deactivate'}`}
        onClick={handleToggleClick}
        disabled={update.isPending}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isActive ? 'bg-green-500' : 'bg-gray-500',
          className
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            isActive ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>

      {/* Confirmation Modal */}
      {showConfirmation && pendingStatus && (
        <Modal open onClose={handleCancel} size='md'>
          <ModalHeader onClose={handleCancel}>
            <ModalTitle>{pendingStatus === 'active' ? 'Activate' : 'Deactivate'} Repository?</ModalTitle>
          </ModalHeader>

          <ModalBody className='space-y-4'>
            {/* Main Message */}
            <div className='rounded-lg border border-border bg-muted/20 p-4'>
              <p className='text-sm'>
                {pendingStatus === 'active' ? (
                  <>
                    Activate <span className='font-semibold'>{repositoryName}</span>?
                    <br />
                    <span className='text-muted-foreground'>Workflows will be able to use this repository.</span>
                  </>
                ) : (
                  <>
                    Deactivate <span className='font-semibold'>{repositoryName}</span>?
                    <br />
                    <span className='text-muted-foreground'>Active workflows using this repository will fail.</span>
                  </>
                )}
              </p>
            </div>

            {/* Warning for Deactivation with Active Workflows */}
            {pendingStatus === 'inactive' && affectedWorkflowsCount > 0 && (
              <div className='rounded-lg border-2 border-yellow-500/50 bg-yellow-500/5 p-4'>
                <div className='flex items-start gap-3'>
                  <AlertTriangle className='h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5' />
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-yellow-500'>
                      Warning: {affectedWorkflowsCount} active{' '}
                      {affectedWorkflowsCount === 1 ? 'workflow is' : 'workflows are'} using this repository
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      These workflows will fail when they attempt to access the repository. Consider waiting until
                      workflows complete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info for Activation */}
            {pendingStatus === 'active' && (
              <div className='flex items-start gap-2 text-sm text-muted-foreground'>
                <svg className='h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Activating will make this repository available for new and existing workflows.</span>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button type='button' variant='outline' onClick={handleCancel} disabled={update.isPending}>
              Cancel
            </Button>
            <Button
              type='button'
              variant={pendingStatus === 'inactive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={update.isPending}
            >
              {update.isPending && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              {pendingStatus === 'active' ? 'Activate' : 'Deactivate'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}
