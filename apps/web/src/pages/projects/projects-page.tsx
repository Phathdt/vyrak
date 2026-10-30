import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useProjectsControllerCreate, useProjectsControllerFindAll } from '@/api/generated/projects/projects'
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
import { useOrganization } from '@/contexts/organization-context'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description too long').optional().or(z.literal('')),
})

type CreateProjectFormData = z.infer<typeof createProjectSchema>

export function ProjectsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const { activeOrgId } = useOrganization()

  const {
    data: projectsData,
    isLoading,
    refetch,
  } = useProjectsControllerFindAll(activeOrgId!, undefined, {
    query: {
      enabled: !!activeOrgId,
    },
  })
  const { mutateAsync: createProject, isPending } = useProjectsControllerCreate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
  })

  const onSubmit = async (data: CreateProjectFormData) => {
    if (!activeOrgId) return

    try {
      await createProject({
        orgId: activeOrgId,
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description || undefined,
        },
      })
      reset()
      setIsCreating(false)
      await refetch()
    } catch (err) {
      console.error('Failed to create project:', err)
    }
  }

  if (!activeOrgId) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Card className='max-w-md'>
          <CardContent className='p-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
              <svg className='h-6 w-6 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <h2 className='mb-2 text-xl font-semibold'>No Organization Selected</h2>
            <p className='mb-4 text-muted-foreground'>Please select an organization from the dashboard first</p>
            <Button onClick={() => (window.location.href = '/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading projects...</p>
        </div>
      </div>
    )
  }

  const projects = projectsData?.items || []

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Projects</h1>
          <p className='text-muted-foreground'>Manage your projects and repositories</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>Create Project</Button>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Add a new project to manage code repositories</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Project Name</Label>
                <Input id='name' {...register('name')} placeholder='My Awesome Project' disabled={isPending} />
                {errors.name && <p className='text-sm text-destructive'>{errors.name.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='slug'>Slug (URL-friendly)</Label>
                <Input id='slug' {...register('slug')} placeholder='my-awesome-project' disabled={isPending} />
                {errors.slug && <p className='text-sm text-destructive'>{errors.slug.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Description (optional)</Label>
                <Input
                  id='description'
                  {...register('description')}
                  placeholder='A brief description of your project'
                  disabled={isPending}
                />
                {errors.description && <p className='text-sm text-destructive'>{errors.description.message}</p>}
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

      {/* Projects Grid */}
      {!projects || projects.length === 0 ? (
        <Card className='p-12'>
          <div className='text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
              <svg className='h-6 w-6 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
                />
              </svg>
            </div>
            <h3 className='mb-2 text-lg font-semibold'>No projects yet</h3>
            <p className='mb-4 text-muted-foreground'>Create your first project to start managing repositories</p>
            <Button onClick={() => setIsCreating(true)}>Create Project</Button>
          </div>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {projects.map((project) => (
            <Card key={project.id} className='cursor-pointer transition-colors hover:border-primary'>
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div className='min-w-0 flex-1'>
                    <h3 className='truncate font-semibold'>{project.name}</h3>
                    {project.description && (
                      <p className='mt-1 line-clamp-2 text-sm text-muted-foreground'>{project.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2'
                    />
                  </svg>
                  <span>{project.stats?.repositoryCount || 0} repositories</span>
                  {project.slug && (
                    <Badge variant='outline' className='ml-auto font-mono text-xs'>
                      {project.slug}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
