import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getProjectsControllerFindOneQueryKey } from '@/api/generated/projects/projects'
import {
  getRepositoriesControllerFindAllQueryKey,
  useRepositoriesControllerCreate,
} from '@/api/generated/repositories/repositories'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const connectRepositorySchema = z.object({
  url: z
    .string()
    .min(1, 'Repository URL is required')
    .refine(
      (val) => /^https:\/\/github\.com\/|^git@github\.com:|^[^/]+\/[^/]+$/.test(val),
      'Invalid GitHub repository URL. Use: https://github.com/owner/repo, git@github.com:owner/repo.git, or owner/repo'
    ),
  branch: z.string().optional(),
})

type ConnectRepositoryFormData = z.infer<typeof connectRepositorySchema>

interface ConnectRepositoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  projectId: string
}

export function ConnectRepositoryDialog({ open, onOpenChange, orgId, projectId }: ConnectRepositoryDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ConnectRepositoryFormData>({
    resolver: zodResolver(connectRepositorySchema),
  })

  const createMutation = useRepositoriesControllerCreate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getRepositoriesControllerFindAllQueryKey(orgId, projectId),
        })
        queryClient.invalidateQueries({
          queryKey: getProjectsControllerFindOneQueryKey(orgId, projectId),
        })
        onOpenChange(false)
        reset()
      },
    },
  })

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset()
      createMutation.reset()
    }
  }, [open, reset, createMutation])

  const onSubmit = (data: ConnectRepositoryFormData) => {
    createMutation.mutate({
      orgId,
      projectId,
      data: {
        url: data.url,
        branch: data.branch || undefined,
      },
    })
  }

  const getErrorMessage = (error: unknown): string => {
    if (!error) return ''

    // Type guard for error with response
    const err = error as { response?: { status?: number }; message?: string }

    const status = err.response?.status
    const message = err.message || 'An unexpected error occurred'

    switch (status) {
      case 400:
        return 'Invalid repository URL format. Please check the URL and try again.'
      case 403:
        return 'GitHub App cannot access this repository. Please install the app on this repository first.'
      case 404:
        return 'Repository not found. Check the URL and ensure the repository exists on GitHub.'
      case 409:
        return 'This repository is already connected to this project.'
      case 500:
        return 'Failed to connect repository. Please try again later.'
      default:
        return message
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Connect GitHub Repository</DialogTitle>
          <DialogDescription>
            Connect a GitHub repository to this project. The repository will be cloned and made available for workflows.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='url'>
              Repository URL <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='url'
              placeholder='https://github.com/owner/repo or owner/repo'
              {...register('url')}
              disabled={createMutation.isPending}
            />
            {errors.url && <p className='text-sm text-destructive'>{errors.url.message}</p>}
            <p className='text-xs text-muted-foreground'>
              Supported formats: <span className='font-mono'>https://github.com/owner/repo</span>,{' '}
              <span className='font-mono'>git@github.com:owner/repo.git</span>, or{' '}
              <span className='font-mono'>owner/repo</span>
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='branch'>Branch (optional)</Label>
            <Input
              id='branch'
              placeholder='main (default)'
              {...register('branch')}
              disabled={createMutation.isPending}
            />
            <p className='text-xs text-muted-foreground'>Leave empty to use the repository&apos;s default branch</p>
          </div>

          {/* Validation States */}
          {createMutation.isPending && (
            <Alert>
              <div className='flex items-center gap-2'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent'></div>
                <AlertDescription>Validating GitHub App access...</AlertDescription>
              </div>
            </Alert>
          )}

          {createMutation.isSuccess && (
            <Alert className='border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'>
              <CheckCircle2 className='h-4 w-4' />
              <AlertDescription>Repository connected successfully!</AlertDescription>
            </Alert>
          )}

          {createMutation.isError && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{getErrorMessage(createMutation.error)}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Connecting...' : 'Connect Repository'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
