import { useQueryClient } from '@tanstack/react-query'

import { Modal, ModalBody, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { useOrganization } from '@/contexts/organization-context'
import { useUpdateProject } from '@/hooks/use-project-detail'
import type { Project } from '@/api/types/projects'
import type { CreateProjectInput } from '@/lib/schemas/project-schema'
import { useState } from 'react'

import { ProjectForm } from './project-form'

interface ProjectEditFormProps {
  project: {
    id: string
    name: string
    slug: string
    description?: string | null
  }
  onClose: () => void
  onSuccess: () => void
}

export function ProjectEditForm({ project, onClose, onSuccess }: ProjectEditFormProps) {
  const queryClient = useQueryClient()
  const { activeOrgId } = useOrganization()
  const updateMutation = useUpdateProject()
  const [conflictError, setConflictError] = useState(false)

  const handleSubmit = async (data: CreateProjectInput) => {
    // Save current data before optimistic update
    const previousData = queryClient.getQueryData(['projects', 'detail', activeOrgId, project.id])

    try {
      setConflictError(false)

      // Optimistic update
      queryClient.setQueryData(['projects', 'detail', activeOrgId, project.id], (old: Project | undefined) => ({
        ...old,
        ...data,
      }))

      await updateMutation.mutateAsync({
        projectId: project.id,
        data: {
          name: data.name,
          description: data.description || null,
        },
      })

      onSuccess()
    } catch (error: unknown) {
      // Rollback on error
      if (previousData) {
        queryClient.setQueryData(['projects', 'detail', activeOrgId, project.id], previousData)
      }

      // Handle 409 Conflict
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { status?: number } }
        if (apiError.response?.status === 409) {
          setConflictError(true)
        } else {
          console.error('Failed to update project:', error)
        }
      } else {
        console.error('Failed to update project:', error)
      }
    }
  }

  const handleConflictReload = () => {
    queryClient.invalidateQueries({
      queryKey: ['projects', 'detail', activeOrgId, project.id],
    })
    setConflictError(false)
  }

  return (
    <>
      <Modal open={true} onClose={onClose} size='lg'>
        <ModalHeader onClose={onClose}>
          <ModalTitle>Edit Project</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <ProjectForm
            mode='edit'
            defaultValues={{
              name: project.name,
              slug: project.slug,
              description: project.description || '',
            }}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={updateMutation.isPending}
          />
        </ModalBody>
      </Modal>

      {conflictError && (
        <Modal open={true} onClose={() => setConflictError(false)} size='sm'>
          <ModalHeader onClose={() => setConflictError(false)}>
            <ModalTitle>Conflict Detected</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className='text-muted-foreground mb-4'>
              This project was updated by another user. Would you like to reload and try again?
            </p>
            <div className='flex items-center justify-end gap-3'>
              <button onClick={() => setConflictError(false)} className='px-4 py-2 text-sm rounded-md hover:bg-accent'>
                Cancel
              </button>
              <button
                onClick={handleConflictReload}
                className='px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
              >
                Reload
              </button>
            </div>
          </ModalBody>
        </Modal>
      )}
    </>
  )
}
