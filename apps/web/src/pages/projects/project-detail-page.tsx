import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useProjectsControllerFindOne } from '@/api/generated/projects/projects'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { routes } from '@/lib/routes'

import { RepositoriesTab } from '../../components/projects/repositories-tab'

type TabValue = 'overview' | 'repositories' | 'workflows'

export function ProjectDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabValue>('overview')

  const { data: project, isLoading } = useProjectsControllerFindOne(orgId!, projectId!, undefined, {
    query: {
      enabled: !!orgId && !!projectId,
    },
  })

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project || !orgId || !projectId) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <h3 className='mb-2 text-lg font-semibold'>Project not found</h3>
          <p className='mb-4 text-muted-foreground'>The project you are looking for does not exist.</p>
          <Button onClick={() => navigate(routes.orgProjects(orgId!))}>Back to Projects</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto py-8'>
      {/* Breadcrumb */}
      <div className='mb-6 flex items-center gap-2 text-sm text-muted-foreground'>
        <button onClick={() => navigate(routes.organizations())} className='hover:text-foreground'>
          Organizations
        </button>
        <span>/</span>
        <button onClick={() => navigate(routes.orgProjects(orgId))} className='hover:text-foreground'>
          Projects
        </button>
        <span>/</span>
        <span className='text-foreground'>{project.name}</span>
      </div>

      {/* Page Header */}
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>{project.name}</h1>
        {project.description && <p className='mt-2 text-muted-foreground'>{project.description}</p>}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className='space-y-6'>
        <TabsList>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='repositories'>Repositories</TabsTrigger>
          <TabsTrigger value='workflows'>Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-6'>
          <div className='rounded-lg border bg-card p-6'>
            <h2 className='mb-4 text-xl font-semibold'>Project Information</h2>
            <dl className='space-y-3'>
              <div>
                <dt className='text-sm font-medium text-muted-foreground'>Name</dt>
                <dd className='mt-1'>{project.name}</dd>
              </div>
              {project.slug && (
                <div>
                  <dt className='text-sm font-medium text-muted-foreground'>Slug</dt>
                  <dd className='mt-1 font-mono text-sm'>{project.slug}</dd>
                </div>
              )}
              {project.description && (
                <div>
                  <dt className='text-sm font-medium text-muted-foreground'>Description</dt>
                  <dd className='mt-1'>{project.description}</dd>
                </div>
              )}
              <div>
                <dt className='text-sm font-medium text-muted-foreground'>Repositories</dt>
                <dd className='mt-1'>{project.stats?.repositoryCount || 0} connected</dd>
              </div>
              <div>
                <dt className='text-sm font-medium text-muted-foreground'>Workflows</dt>
                <dd className='mt-1'>{project.stats?.workflowCount || 0} total</dd>
              </div>
            </dl>
          </div>
        </TabsContent>

        <TabsContent value='repositories'>
          <RepositoriesTab orgId={orgId} projectId={projectId} />
        </TabsContent>

        <TabsContent value='workflows' className='space-y-6'>
          <div className='flex min-h-[300px] items-center justify-center rounded-lg border bg-card'>
            <div className='text-center'>
              <p className='text-muted-foreground'>Workflows view coming soon</p>
              <Button
                variant='outline'
                className='mt-4'
                onClick={() => navigate(routes.projectWorkflows(orgId, projectId))}
              >
                View Workflows List
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
