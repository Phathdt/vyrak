import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getErrorMessage } from '@/api/client'
import { createProject } from '@/api/projects-api'
import { Modal, ModalBody, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { useOrganization } from '@/contexts/organization-context'
import { useToast } from '@/hooks/use-toast'
import type { CreateProjectInput } from '@/lib/schemas/project-schema'
import { useNavigate } from 'react-router-dom'

import { ProjectForm } from './project-form'

interface ProjectCreateModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: (projectId: string) => void
}

export function ProjectCreateModal({ open, onClose, onSuccess }: ProjectCreateModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeOrgId } = useOrganization()
  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      if (!activeOrgId) throw new Error('No active organization')
      return createProject(activeOrgId, data)
    },
    onSuccess: (result) => {
      // Invalidate list cache
      queryClient.invalidateQueries({ queryKey: ['projects', 'list'] })

      // Show success toast
      toast({
        title: 'Project created',
        description: `${result.name} has been created successfully.`,
        variant: 'default',
      })

      // Close modal
      onClose()

      // Navigate to detail page
      navigate(`/projects/${result.id}`)

      // Call success callback
      onSuccess?.(result.id)
    },
    onError: (error) => {
      toast({
        title: 'Failed to create project',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: CreateProjectInput) => {
    await createMutation.mutateAsync(data)
  }

  return (
    <Modal open={open} onClose={onClose} size='lg'>
      <ModalHeader onClose={onClose}>
        <ModalTitle>Create New Project</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <ProjectForm mode='create' onSubmit={handleSubmit} onCancel={onClose} isSubmitting={createMutation.isPending} />
      </ModalBody>
    </Modal>
  )
}
