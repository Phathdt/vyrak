import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { useRepositoriesControllerFindAll } from '@/api/generated/repositories/repositories'
import { useWorkflowsControllerCreate, useWorkflowsControllerFindAll } from '@/api/generated/workflows/workflows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { routes } from '@/lib/routes'

const createWorkflowSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional().or(z.literal('')),
  repositoryIds: z.array(z.string()).min(1, 'At least one repository is required'),
})

type CreateWorkflowFormData = z.infer<typeof createWorkflowSchema>

export function WorkflowsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>()
  const navigate = useNavigate()

  const {
    data: workflowsData,
    isLoading,
    refetch,
  } = useWorkflowsControllerFindAll(
    orgId!,
    projectId!,
    {
      page: 1,
      limit: 20,
    },
    {
      query: {
        enabled: !!orgId && !!projectId,
      },
    }
  )

  const { mutateAsync: createWorkflow, isPending } = useWorkflowsControllerCreate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<CreateWorkflowFormData>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      repositoryIds: [],
    },
  })

  const selectedRepositoryIds = useWatch({ control, name: 'repositoryIds' }) ?? []

  const { data: repositoriesData, isLoading: isLoadingRepositories } = useRepositoriesControllerFindAll(
    orgId!,
    projectId!,
    {
      query: {
        enabled: isCreating && !!orgId && !!projectId,
      },
    }
  )

  const repositories = repositoriesData?.items ?? []

  const toggleRepository = (repositoryId: string, checked: boolean) => {
    const next = checked
      ? [...selectedRepositoryIds, repositoryId]
      : selectedRepositoryIds.filter((id) => id !== repositoryId)
    setValue('repositoryIds', next, { shouldValidate: true })
  }

  const onSubmit = async (data: CreateWorkflowFormData) => {
    if (!orgId || !projectId) return

    try {
      await createWorkflow({
        orgId,
        projectId,
        data: {
          title: data.title,
          description: data.description || undefined,
          type: 'STORY',
          repositoryIds: data.repositoryIds,
        },
      })
      reset()
      setIsCreating(false)
      await refetch()
    } catch (err) {
      console.error('Failed to create workflow:', err)
    }
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading workflows...</p>
        </div>
      </div>
    )
  }

  const workflows = workflowsData?.items || []

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary'
      case 'BRAINSTORMING':
      case 'CLASSIFICATION_PENDING':
        return 'default'
      case 'ACTIVE':
        return 'default'
      case 'COMPLETED':
        return 'default'
      case 'FAILED':
        return 'destructive'
      case 'CANCELLED':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getTypeBadgeVariant = (type: string | null) => {
    if (!type) return 'outline'
    switch (type) {
      case 'HOTFIX':
        return 'destructive'
      case 'STORY':
        return 'default'
      case 'EPIC':
        return 'default'
      default:
        return 'outline'
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          {orgId && (
            <Button
              variant='ghost'
              size='sm'
              className='mb-2 -ml-2'
              onClick={() => navigate(routes.orgProjects(orgId))}
            >
              ← Back to projects
            </Button>
          )}
          <h1 className='text-3xl font-bold tracking-tight'>Workflows</h1>
          <p className='text-muted-foreground'>Manage your AI-powered software development workflows</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>Create Workflow</Button>
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>Start a new AI-assisted development workflow</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='title'>Workflow Title</Label>
                <Input
                  id='title'
                  {...register('title')}
                  placeholder='Implement user authentication'
                  disabled={isPending}
                />
                {errors.title && <p className='text-sm text-destructive'>{errors.title.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Description (optional)</Label>
                <Textarea
                  id='description'
                  {...register('description')}
                  placeholder='Add JWT-based authentication with refresh tokens'
                  disabled={isPending}
                  rows={3}
                />
                {errors.description && <p className='text-sm text-destructive'>{errors.description.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label>Repositories</Label>
                <p className='text-xs text-muted-foreground'>Select one or more repositories for this workflow</p>
                {isLoadingRepositories ? (
                  <p className='text-sm text-muted-foreground'>Loading repositories...</p>
                ) : repositories.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    No repositories linked to this project yet. Add repositories in project settings first.
                  </p>
                ) : (
                  <div
                    className='max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3'
                    data-testid='workflow-repositoryIds-input'
                  >
                    {repositories.map((repo) => {
                      const isActive = repo.status === 'active'
                      const checked = selectedRepositoryIds.includes(repo.id)
                      return (
                        <label
                          key={repo.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50 ${!isActive ? 'opacity-60' : ''}`}
                        >
                          <input
                            type='checkbox'
                            className='mt-1 h-4 w-4 rounded border-border'
                            checked={checked}
                            disabled={isPending || !isActive}
                            onChange={(e) => toggleRepository(repo.id, e.target.checked)}
                          />
                          <span className='min-w-0 flex-1'>
                            <span className='block font-medium'>{repo.name}</span>
                            <span className='block truncate text-xs text-muted-foreground'>
                              {repo.branch} · {repo.provider}
                              {repo.status !== 'active' ? ` · ${repo.status}` : ''}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
                {errors.repositoryIds && <p className='text-sm text-destructive'>{errors.repositoryIds.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setIsCreating(false)
                  reset()
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Workflows List */}
      {!workflows || workflows.length === 0 ? (
        <Card className='p-12'>
          <div className='text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
              <svg className='h-6 w-6 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                />
              </svg>
            </div>
            <h3 className='mb-2 text-lg font-semibold'>No workflows yet</h3>
            <p className='mb-4 text-muted-foreground'>Create your first workflow to start AI-assisted development</p>
            <Button onClick={() => setIsCreating(true)}>Create Workflow</Button>
          </div>
        </Card>
      ) : (
        <div className='space-y-4'>
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className='cursor-pointer transition-colors hover:border-primary'
              onClick={() => orgId && navigate(routes.workflowDetail(orgId, projectId!, workflow.id))}
            >
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0 flex-1'>
                    <div className='mb-2 flex items-center gap-2'>
                      <h3 className='truncate font-semibold'>{workflow.title}</h3>
                      {workflow.type && (
                        <Badge variant={getTypeBadgeVariant(workflow.type)} className='shrink-0'>
                          {workflow.type}
                        </Badge>
                      )}
                    </div>
                    {workflow.description && (
                      <p className='line-clamp-2 text-sm text-muted-foreground'>{workflow.description}</p>
                    )}
                  </div>
                  <Badge variant={getStatusBadgeVariant(workflow.status)} className='shrink-0'>
                    {workflow.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                  <div className='flex items-center gap-1'>
                    <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    <span>{new Date(workflow.createdAt).toLocaleDateString()}</span>
                  </div>
                  {workflow.currentPhaseKey && (
                    <div className='flex items-center gap-1'>
                      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M13 10V3L4 14h7v7l9-11h-7z'
                        />
                      </svg>
                      <span>{workflow.currentPhaseKey}</span>
                    </div>
                  )}
                  <div className='ml-auto flex items-center gap-1'>
                    <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
                      />
                    </svg>
                    <span>{workflow.repositories?.length || 0} repos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
