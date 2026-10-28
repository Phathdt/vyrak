import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import { useWorkflowsControllerCreateWorkflowRun } from '../api/generated'
import { useAuth } from '../contexts/auth-context'
import { useOrganization } from '../contexts/organization-context'
import type { CreateWorkflowFormData } from '../lib/schemas/workflow-schemas'
import { clearWorkflowDraft } from '../lib/utils/local-storage'

export function useWorkflowCreate() {
  const navigate = useNavigate()
  const { activeOrgId } = useOrganization()
  const { user } = useAuth()

  const createMutation = useWorkflowsControllerCreateWorkflowRun()

  const createWorkflow = async (formData: CreateWorkflowFormData) => {
    if (!activeOrgId) {
      throw new Error('No active organization')
    }

    // Generate idempotency key if not provided
    const idempotencyKey = formData.idempotencyKey || uuidv4()

    // Call API
    const result = await createMutation.mutateAsync({
      orgId: activeOrgId,
      projectId: formData.projectId,
      data: {
        repositoryId: formData.repositoryId,
        branch: formData.branch,
        requirement: formData.requirement.trim(),
        idempotencyKey,
      },
    })

    // Clear localStorage draft on success
    if (user?.id) {
      clearWorkflowDraft(user.id, formData.projectId)
    }

    // Navigate to detail page
    navigate(`/workflows/${result.id}`)

    return result
  }

  return {
    createWorkflow,
    isLoading: createMutation.isPending,
    error: createMutation.error,
    reset: createMutation.reset,
  }
}
