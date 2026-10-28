import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { ErrorMessage, FormField, HelperText, Label } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useRepositories } from '@/hooks/use-repositories'
import { gitRepositorySchema, type GitRepositoryFormData } from '@/lib/schemas/repository-schema'
import { detectProvider, getProviderInfo, type GitProvider } from '@/lib/utils/git-provider'

interface RepositoryFormProps {
  mode: 'create' | 'edit'
  organizationId: string
  projectId: string
  repositoryId?: string
  onClose: () => void
}

export function RepositoryForm({ mode, organizationId, projectId, repositoryId, onClose }: RepositoryFormProps) {
  const [showToken, setShowToken] = useState(false)
  const [detectedProvider, setDetectedProvider] = useState<GitProvider | null>(null)
  const [connectionTested, setConnectionTested] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)

  const { showToast } = useToast()
  const { create, update, testConnection, repositories } = useRepositories(organizationId, projectId)

  // For edit mode, find the repository
  const existingRepo = mode === 'edit' ? repositories.find((r) => r.id === repositoryId) : null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GitRepositoryFormData>({
    resolver: zodResolver(gitRepositorySchema),
    defaultValues: {
      name: '',
      url: '',
      branch: 'main',
      provider: 'github',
      accessToken: '',
    },
  })

  const watchedUrl = watch('url')
  const watchedProvider = watch('provider')
  const watchedBranch = watch('branch')

  // Auto-detect provider from URL
  useEffect(() => {
    if (mode === 'create' && watchedUrl) {
      const provider = detectProvider(watchedUrl)
      if (provider && provider !== watchedProvider) {
        setDetectedProvider(provider)
        setValue('provider', provider)
      }
    }
  }, [watchedUrl, mode, watchedProvider, setValue])

  // Pre-fill form for edit mode
  useEffect(() => {
    if (mode === 'edit' && existingRepo) {
      reset({
        name: existingRepo.name,
        url: existingRepo.url,
        branch: existingRepo.branch,
        provider: existingRepo.provider,
        accessToken: '', // Never pre-fill token
      })
    }
  }, [mode, existingRepo, reset])

  const handleTestConnection = async () => {
    const formValues = watch()

    if (!formValues.url || !formValues.branch) {
      showToast({
        title: 'Please fill in URL and branch before testing',
        type: 'warning',
      })
      return
    }

    setIsTestingConnection(true)
    setConnectionTested(false)
    setTestSuccess(false)

    try {
      await testConnection.mutateAsync({
        orgId: organizationId,
        projectId,
        data: {
          url: formValues.url,
          branch: formValues.branch,
          accessToken: formValues.accessToken,
        },
      })
      setConnectionTested(true)
      setTestSuccess(true)
      showToast({
        title: 'Repository connection successful',
        type: 'success',
      })
    } catch (error) {
      setConnectionTested(true)
      setTestSuccess(false)
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      showToast({
        title: `Connection failed: ${errorMessage}`,
        type: 'error',
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const onSubmit = async (data: GitRepositoryFormData) => {
    // Require successful test connection for create mode
    if (mode === 'create' && !connectionTested) {
      showToast({
        title: 'Please test the connection before saving',
        type: 'warning',
      })
      return
    }

    if (mode === 'create' && !testSuccess) {
      showToast({
        title: 'Connection test must succeed before saving',
        type: 'error',
      })
      return
    }

    try {
      if (mode === 'create') {
        await create.mutateAsync({
          orgId: organizationId,
          projectId,
          data,
        })
        showToast({
          title: 'Repository added successfully',
          type: 'success',
        })
      } else {
        // Edit mode - only send changed fields, omit empty token
        const updateData = {
          name: data.name !== existingRepo?.name ? data.name : undefined,
          branch: data.branch !== existingRepo?.branch ? data.branch : undefined,
          accessToken: data.accessToken || undefined, // Only if provided
        }

        await update.mutateAsync({
          orgId: organizationId,
          projectId,
          repoId: repositoryId!,
          data: updateData,
        })
        showToast({
          title: 'Repository updated successfully',
          type: 'success',
        })
      }
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      showToast({
        title: `Failed to ${mode === 'create' ? 'add' : 'update'} repository: ${errorMessage}`,
        type: 'error',
      })
    }
  }

  const providerInfo = watchedProvider ? getProviderInfo(watchedProvider) : null

  return (
    <Modal open onClose={onClose} size='lg'>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader onClose={onClose}>
          <ModalTitle>{mode === 'create' ? 'Add Git Repository' : `Edit Repository: ${existingRepo?.name}`}</ModalTitle>
          <ModalDescription>
            {mode === 'create'
              ? 'Configure a Git repository for AI workflows to access your codebase.'
              : 'Update repository configuration. URL and provider cannot be changed.'}
          </ModalDescription>
        </ModalHeader>

        <ModalBody className='space-y-5'>
          {/* Repository Name */}
          <FormField>
            <Label htmlFor='name' required>
              Repository Name
            </Label>
            <Input
              id='name'
              type='text'
              placeholder='my-project'
              {...register('name')}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && <ErrorMessage id='name-error'>{errors.name.message}</ErrorMessage>}
            <HelperText>Alphanumeric characters, hyphens, and underscores only</HelperText>
          </FormField>

          {/* Git URL */}
          <FormField>
            <Label htmlFor='url' required>
              Git URL
            </Label>
            <Input
              id='url'
              type='url'
              placeholder='https://github.com/username/repository.git'
              {...register('url')}
              disabled={mode === 'edit'}
              aria-invalid={!!errors.url}
              aria-describedby={errors.url ? 'url-error' : undefined}
              className={mode === 'edit' ? 'bg-muted/50 cursor-not-allowed' : ''}
            />
            {errors.url && <ErrorMessage id='url-error'>{errors.url.message}</ErrorMessage>}
            {!errors.url && (
              <HelperText>
                {mode === 'edit' ? 'URL cannot be changed after creation' : 'Must use HTTPS and end with .git'}
              </HelperText>
            )}
          </FormField>

          {/* Default Branch */}
          <FormField>
            <Label htmlFor='branch' required>
              Default Branch
            </Label>
            <Input
              id='branch'
              type='text'
              placeholder='main'
              {...register('branch')}
              aria-invalid={!!errors.branch}
              aria-describedby={errors.branch ? 'branch-error' : undefined}
            />
            {errors.branch && <ErrorMessage id='branch-error'>{errors.branch.message}</ErrorMessage>}
            <HelperText>The branch workflows will use by default</HelperText>
          </FormField>

          {/* Provider */}
          <FormField>
            <Label htmlFor='provider' required>
              Provider
            </Label>
            <select
              id='provider'
              {...register('provider')}
              disabled={mode === 'edit'}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] md:min-h-[36px] ${
                mode === 'edit' ? 'bg-muted/50' : ''
              }`}
              aria-invalid={!!errors.provider}
            >
              <option value='github'>GitHub</option>
              <option value='gitlab'>GitLab</option>
              <option value='bitbucket'>Bitbucket</option>
            </select>
            {detectedProvider && mode === 'create' && <HelperText>Auto-detected from URL</HelperText>}
            {mode === 'edit' && <HelperText>Provider cannot be changed after creation</HelperText>}
          </FormField>

          {/* Access Token */}
          <FormField>
            <Label htmlFor='accessToken'>
              Access Token
              {mode === 'create' && (
                <span className='text-xs text-muted-foreground ml-2'>(optional for public repos)</span>
              )}
            </Label>
            <div className='relative'>
              <Input
                id='accessToken'
                type={showToken ? 'text' : 'password'}
                placeholder={
                  mode === 'edit'
                    ? 'Enter new token or leave empty to keep current'
                    : 'ghp_xxxxxxxxxxxx (required for private repositories)'
                }
                {...register('accessToken')}
                aria-invalid={!!errors.accessToken}
                className='pr-10 border-yellow-500/50 focus-visible:ring-yellow-500/50'
              />
              <button
                type='button'
                onClick={() => setShowToken(!showToken)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
            {errors.accessToken && <ErrorMessage>{errors.accessToken.message}</ErrorMessage>}
            {!errors.accessToken && (
              <HelperText>
                {mode === 'edit' ? (
                  'Leave empty to keep the current token'
                ) : (
                  <>
                    Required for private repositories. Token needs read access.{' '}
                    {providerInfo && (
                      <a
                        href={providerInfo.docsUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 text-primary hover:underline'
                      >
                        Create token
                        <ExternalLink className='h-3 w-3' />
                      </a>
                    )}
                  </>
                )}
              </HelperText>
            )}
          </FormField>

          {/* Test Connection Section */}
          <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <h4 className='text-sm font-medium'>Test Connection</h4>
                <p className='text-xs text-muted-foreground'>Verify repository accessibility before saving</p>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleTestConnection}
                disabled={isTestingConnection || !watchedUrl || !watchedBranch}
              >
                {isTestingConnection && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            {connectionTested && (
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  testSuccess
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {testSuccess ? (
                  <>
                    <svg className='h-4 w-4 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Repository accessible
                  </>
                ) : (
                  <>
                    <AlertTriangle className='h-4 w-4 flex-shrink-0' />
                    Connection failed. Check URL, branch, and token.
                  </>
                )}
              </div>
            )}

            {mode === 'create' && !connectionTested && (
              <div className='flex items-start gap-2 text-xs text-muted-foreground'>
                <AlertTriangle className='h-4 w-4 flex-shrink-0 mt-0.5' />
                Connection test required before saving
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type='submit' disabled={isSubmitting || (mode === 'create' && (!connectionTested || !testSuccess))}>
            {isSubmitting && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
            {mode === 'create' ? 'Add Repository' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
