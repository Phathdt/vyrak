import { useNavigate, useSearchParams } from 'react-router-dom'

import { WorkflowForm } from '../../components/workflow/workflow-form'

export function WorkflowCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Allow pre-selecting project from URL: /workflows/create?projectId=xxx
  const initialProjectId = searchParams.get('projectId') || undefined

  const handleCancel = () => {
    navigate('/workflows')
  }

  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      {/* Breadcrumb */}
      <nav className='flex items-center text-sm text-muted-foreground mb-6'>
        <button onClick={() => navigate('/workflows')} className='hover:text-foreground transition-colors'>
          Workflows
        </button>
        <span className='mx-2'>/</span>
        <span className='text-foreground'>Create</span>
      </nav>

      {/* Page Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>Create Workflow</h1>
        <p className='text-muted-foreground'>
          Submit a development requirement to start an AI-powered workflow
        </p>
      </div>

      {/* Workflow Form */}
      <div className='bg-card border border-border rounded-lg p-6'>
        <WorkflowForm initialProjectId={initialProjectId} onCancel={handleCancel} />
      </div>
    </div>
  )
}
