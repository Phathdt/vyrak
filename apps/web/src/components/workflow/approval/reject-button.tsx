import { zodResolver } from '@hookform/resolvers/zod'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useRejectWorkflow } from '../../../hooks/use-workflow-approval'
import {
  rejectWorkflowSchema,
  toRejectDecisionDto,
  type RejectWorkflowFormData,
} from '../../../lib/schemas/approval-schemas'

interface RejectButtonProps {
  orgId: string
  runId: string
  onSuccess?: () => void
}

/**
 * Reject workflow button with modal form
 * Requires reason (min 10 chars) and checkbox confirmation
 * Rejection is terminal - workflow cannot proceed after rejection
 */
export function RejectButton({ orgId, runId, onSuccess }: RejectButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { reject, isRejecting } = useRejectWorkflow({ orgId, runId })

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<RejectWorkflowFormData>({
    resolver: zodResolver(rejectWorkflowSchema),
    mode: 'onChange', // Validate on change for live feedback
    defaultValues: {
      reason: '',
      confirmed: false,
    },
  })

  const reasonLength = watch('reason')?.length || 0

  const handleOpenModal = () => {
    setIsModalOpen(true)
    setError(null)
  }

  const handleCloseModal = () => {
    if (isRejecting) return // Prevent closing while submitting
    setIsModalOpen(false)
    setError(null)
    reset()
  }

  const onSubmit = async (data: RejectWorkflowFormData) => {
    setError(null)

    try {
      const dto = toRejectDecisionDto(data)
      await reject(dto.comment)

      // Success
      handleCloseModal()
      onSuccess?.()
    } catch (err: unknown) {
      const error = err as Error
      if (error.message === 'ALREADY_APPROVED') {
        setError('Cannot reject - this workflow has already been approved by another user.')
      } else if (error.message === 'INVALID_STATE') {
        setError('This workflow is no longer waiting for approval.')
      } else {
        setError(error.message || 'Failed to reject workflow. Please try again.')
      }
    }
  }

  // Prevent accidental form submission with Enter key (force explicit button click)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLTextAreaElement) {
      e.preventDefault()
    }
    // Close modal on ESC
    if (e.key === 'Escape' && !isRejecting) {
      handleCloseModal()
    }
  }

  return (
    <>
      <button type='button' onClick={handleOpenModal} className='reject-button' disabled={isRejecting}>
        <span className='button-icon' aria-hidden='true'>
          ✕
        </span>
        <span>Reject Plan</span>
      </button>

      {isModalOpen && (
        <div
          className='reject-modal-overlay'
          onClick={handleCloseModal}
          role='dialog'
          aria-modal='true'
          aria-labelledby='reject-modal-title'
          onKeyDown={handleKeyDown}
        >
          <div className='reject-modal-content' onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
              <div className='reject-modal-header'>
                <h3 id='reject-modal-title' className='modal-title'>
                  Reject Workflow Plan
                </h3>
                <button
                  type='button'
                  onClick={handleCloseModal}
                  className='modal-close-button'
                  aria-label='Close modal'
                  disabled={isRejecting}
                >
                  ✕
                </button>
              </div>

              <div className='reject-modal-body'>
                <div className='reject-warning'>
                  <span className='warning-icon' aria-hidden='true'>
                    ⚠️
                  </span>
                  <p>
                    This will terminate the workflow. The plan will not be implemented. This action cannot be undone.
                  </p>
                </div>

                <div className='form-field'>
                  <label htmlFor='reject-reason' className='form-label'>
                    Rejection Reason <span className='required-marker'>*</span>
                  </label>
                  <textarea
                    id='reject-reason'
                    {...register('reason')}
                    className={`form-textarea ${errors.reason ? 'textarea-error' : ''}`}
                    placeholder='Explain why this plan should not proceed...'
                    rows={6}
                    maxLength={1000}
                    disabled={isRejecting}
                    aria-required='true'
                    aria-invalid={!!errors.reason}
                    aria-describedby={errors.reason ? 'reject-reason-error' : undefined}
                  />
                  {errors.reason && (
                    <p id='reject-reason-error' className='form-error' role='alert'>
                      {errors.reason.message}
                    </p>
                  )}
                  <p className='form-help'>{reasonLength} / 1000 characters (minimum 10 required)</p>
                </div>

                <div className='form-field'>
                  <label className='form-checkbox-label'>
                    <input
                      type='checkbox'
                      {...register('confirmed')}
                      className='form-checkbox'
                      disabled={isRejecting}
                      aria-required='true'
                    />
                    <span>I understand this will terminate the workflow</span>
                  </label>
                  {errors.confirmed && (
                    <p className='form-error' role='alert'>
                      {errors.confirmed.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className='form-error-alert' role='alert'>
                    {error}
                  </div>
                )}
              </div>

              <div className='reject-modal-footer'>
                <button
                  type='button'
                  onClick={handleCloseModal}
                  className='form-button form-button-secondary'
                  disabled={isRejecting}
                >
                  Cancel
                </button>
                <button type='submit' className='form-button form-button-reject' disabled={isRejecting || !isValid}>
                  {isRejecting ? (
                    <>
                      <span className='button-spinner' aria-hidden='true' />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <>
                      <span className='button-icon' aria-hidden='true'>
                        ✕
                      </span>
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
