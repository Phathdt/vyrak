import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { useProjectsControllerFindAll } from '../../api/generated'
import { useAuth } from '../../contexts/auth-context'
import { useOrganization } from '../../contexts/organization-context'
import { useMockRepositories } from '../../hooks/use-mock-repositories'
import { useWorkflowCreate } from '../../hooks/use-workflow-create'
import { createWorkflowSchema, type CreateWorkflowFormData } from '../../lib/schemas/workflow-schemas'
import { loadWorkflowDraft, saveWorkflowDraft } from '../../lib/utils/local-storage'

interface WorkflowFormProps {
  initialProjectId?: string
  onCancel?: () => void
}

export function WorkflowForm({ initialProjectId, onCancel }: WorkflowFormProps) {
  const { activeOrgId } = useOrganization()
  const { user } = useAuth()
  const { createWorkflow, isLoading, error, reset } = useWorkflowCreate()

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [charCount, setCharCount] = useState(0)

  // Fetch projects for dropdown
  const { data: projectsData } = useProjectsControllerFindAll(
    activeOrgId || '',
    {},
    {
      query: { enabled: !!activeOrgId },
    }
  )

  // Fetch repositories when project selected (MOCK for now)
  const { data: repositoriesData } = useMockRepositories(selectedProjectId)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreateWorkflowFormData>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      projectId: initialProjectId || '',
      repositoryId: '',
      branch: '',
      requirement: '',
      idempotencyKey: undefined,
    },
  })

  const projectId = watch('projectId')
  const repositoryId = watch('repositoryId')
  const requirement = watch('requirement')

  // Load draft on mount
  useEffect(() => {
    if (user?.id && projectId) {
      const draft = loadWorkflowDraft(user.id, projectId)
      if (draft) {
        if (draft.repositoryId) setValue('repositoryId', draft.repositoryId)
        if (draft.branch) setValue('branch', draft.branch)
        if (draft.requirement) setValue('requirement', draft.requirement)
      }
    }
  }, [user?.id, projectId, setValue])

  // Auto-save draft every 30s
  useEffect(() => {
    if (!user?.id || !projectId || !isDirty) return

    const interval = setInterval(() => {
      saveWorkflowDraft(user.id!, projectId, {
        repositoryId,
        branch: watch('branch'),
        requirement,
      })
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [user?.id, projectId, repositoryId, requirement, isDirty, watch])

  // Update project selection
  useEffect(() => {
    setSelectedProjectId(projectId)
    // Reset repository when project changes
    if (projectId !== initialProjectId) {
      setValue('repositoryId', '')
      setValue('branch', '')
    }
  }, [projectId, initialProjectId, setValue])

  // Auto-fill branch when repository selected
  useEffect(() => {
    if (repositoryId && repositoriesData) {
      const repo = repositoriesData.find((r) => r.id === repositoryId)
      if (repo?.defaultBranch) {
        setValue('branch', repo.defaultBranch)
      }
    }
  }, [repositoryId, repositoriesData, setValue])

  // Track character count
  useEffect(() => {
    setCharCount(requirement?.length || 0)
  }, [requirement])

  const onSubmit = async (data: CreateWorkflowFormData) => {
    try {
      await createWorkflow(data)
      // Navigation handled in useWorkflowCreate hook
    } catch (err) {
      // Error displayed via error state
      console.error('Failed to create workflow:', err)
    }
  }

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirmed) return
    }
    onCancel?.()
  }

  const activeRepositories = repositoriesData?.filter((r) => r.status === 'active') || []
  const projects = projectsData?.items || []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='workflow-form' data-testid='workflow-create-form'>
      {/* Error Banner */}
      {error && (
        <div
          className='rounded-lg border border-destructive bg-destructive/10 p-4 mb-6'
          data-testid='workflow-error-banner'
        >
          <div className='flex items-start justify-between'>
            <div>
              <p className='font-medium text-destructive'>Failed to create workflow</p>
              <p className='text-sm text-destructive/90 mt-1'>
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
            <button
              type='button'
              onClick={() => reset()}
              className='text-destructive hover:text-destructive/80 text-sm font-medium'
              data-testid='workflow-error-dismiss'
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Project Selection */}
      <div className='space-y-2'>
        <label htmlFor='projectId' className='text-sm font-medium' data-testid='workflow-projectId-label'>
          Project <span className='text-destructive'>*</span>
        </label>
        <select
          id='projectId'
          {...register('projectId')}
          disabled={isLoading || !!initialProjectId}
          className='w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed'
          data-testid='workflow-projectId-input'
        >
          <option value=''>Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.slug})
            </option>
          ))}
        </select>
        {errors.projectId && (
          <p className='text-sm text-destructive' data-testid='workflow-projectId-error'>
            {errors.projectId.message}
          </p>
        )}
      </div>

      {/* Repository Selection */}
      <div className='space-y-2'>
        <label htmlFor='repositoryId' className='text-sm font-medium' data-testid='workflow-repositoryId-label'>
          Repository <span className='text-destructive'>*</span>
        </label>
        <select
          id='repositoryId'
          {...register('repositoryId')}
          disabled={isLoading || !selectedProjectId || activeRepositories.length === 0}
          className='w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed'
          data-testid='workflow-repositoryId-input'
        >
          <option value=''>Select a repository</option>
          {activeRepositories.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.provider === 'github' && '🔷 '}
              {repo.provider === 'gitlab' && '🟠 '}
              {repo.name}
            </option>
          ))}
        </select>
        {!selectedProjectId && <p className='text-xs text-muted-foreground'>Select a project first</p>}
        {selectedProjectId && activeRepositories.length === 0 && (
          <p className='text-xs text-orange-500'>No active repositories. Add one in project settings.</p>
        )}
        {errors.repositoryId && (
          <p className='text-sm text-destructive' data-testid='workflow-repositoryId-error'>
            {errors.repositoryId.message}
          </p>
        )}
      </div>

      {/* Branch Input */}
      <div className='space-y-2'>
        <label htmlFor='branch' className='text-sm font-medium' data-testid='workflow-branch-label'>
          Branch <span className='text-destructive'>*</span>
        </label>
        <input
          id='branch'
          type='text'
          placeholder='main'
          {...register('branch')}
          disabled={isLoading}
          className='w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
          data-testid='workflow-branch-input'
        />
        <p className='text-xs text-muted-foreground'>Auto-filled from repository default branch</p>
        {errors.branch && (
          <p className='text-sm text-destructive' data-testid='workflow-branch-error'>
            {errors.branch.message}
          </p>
        )}
      </div>

      {/* Requirement Textarea */}
      <div className='space-y-2'>
        <label htmlFor='requirement' className='text-sm font-medium' data-testid='workflow-requirement-label'>
          Requirement <span className='text-destructive'>*</span>
        </label>
        <textarea
          id='requirement'
          rows={10}
          placeholder='Describe the feature, bug fix, or change you want implemented...'
          {...register('requirement')}
          disabled={isLoading}
          className='w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-y min-h-[200px]'
          data-testid='workflow-requirement-input'
        />
        <div className='flex justify-end'>
          <p className='text-xs text-muted-foreground'>
            {charCount} / 5000 characters
            {charCount < 20 && <span className='text-destructive ml-1'>(min 20)</span>}
          </p>
        </div>
        {errors.requirement && (
          <p className='text-sm text-destructive' data-testid='workflow-requirement-error'>
            {errors.requirement.message}
          </p>
        )}
      </div>

      {/* Advanced Options */}
      <div className='border-t pt-4'>
        <button
          type='button'
          onClick={() => setShowAdvanced(!showAdvanced)}
          className='text-sm font-medium text-primary hover:text-primary/80 transition-colors'
          data-testid='workflow-advanced-options'
        >
          Advanced Options {showAdvanced ? '▲' : '▼'}
        </button>

        {showAdvanced && (
          <div className='mt-4 p-4 bg-muted/50 rounded-lg space-y-2'>
            <div className='space-y-2'>
              <label
                htmlFor='idempotencyKey'
                className='text-sm font-medium'
                data-testid='workflow-idempotencyKey-label'
              >
                Idempotency Key
              </label>
              <input
                id='idempotencyKey'
                type='text'
                placeholder='Auto-generated UUID'
                {...register('idempotencyKey')}
                disabled={isLoading}
                className='w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
                data-testid='workflow-idempotencyKey-input'
              />
              <p className='text-xs text-muted-foreground'>
                Prevents duplicate submissions. Leave blank for auto-generated key.
              </p>
              {errors.idempotencyKey && (
                <p className='text-sm text-destructive' data-testid='workflow-idempotencyKey-error'>
                  {errors.idempotencyKey.message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className='flex justify-end gap-3 pt-4 border-t'>
        <button
          type='button'
          onClick={handleCancel}
          disabled={isLoading}
          className='px-4 py-2 border border-input rounded-full text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          data-testid='workflow-cancel-button'
        >
          Cancel
        </button>
        <button
          type='submit'
          disabled={isLoading}
          className='px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          data-testid='workflow-submit-button'
        >
          {isLoading ? 'Creating...' : 'Create Workflow'}
        </button>
      </div>
    </form>
  )
}
