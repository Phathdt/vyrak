import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useApproveWorkflow } from '../../../hooks'
import {
  approveWorkflowSchema,
  toApprovalDecisionDto,
  type ApproveWorkflowFormData,
} from '../../../lib/schemas/approval-schemas'

interface ApproveButtonProps {
  orgId: string
  runId: string
  onSuccess?: () => void
}

/**
 * Approve workflow button with optional comment form
 * Requires checkbox confirmation before submission
 */
export function ApproveButton({ orgId, runId, onSuccess }: ApproveButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { approve, isApproving } = useApproveWorkflow({ orgId, runId })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ApproveWorkflowFormData>({
    resolver: zodResolver(approveWorkflowSchema),
    defaultValues: {
      comment: '',
      confirmed: false,
    },
  })

  const commentValue = watch('comment')

  const handleOpenForm = () => {
    setIsFormOpen(true)
    setError(null)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setError(null)
    reset()
  }

  const onSubmit = async (data: ApproveWorkflowFormData) => {
    setError(null)

    try {
      const dto = toApprovalDecisionDto(data)
      await approve(dto)

      // Success
      handleCloseForm()
      onSuccess?.()
    } catch (err: unknown) {
      const error = err as Error
      if (error.message === 'CONFLICT') {
        setError('This workflow has already been approved by another user.')
      } else if (error.message === 'INVALID_STATE') {
        setError('This workflow is no longer waiting for approval.')
      } else {
        setError(error.message || 'Failed to approve workflow. Please try again.')
      }
    }
  }

  if (!isFormOpen) {
    return (
      <button type='button' onClick={handleOpenForm} className='approve-button' disabled={isApproving}>
        <span className='button-icon' aria-hidden='true'>
          ✓
        </span>
        <span>Approve Plan</span>
      </button>
    )
  }

  return (
    <div className='approve-form-container'>
      <form onSubmit={handleSubmit(onSubmit)} className='approve-form'>
        <h3 className='form-title'>Approve Workflow Plan</h3>

        <div className='form-field'>
          <label htmlFor='approve-comment' className='form-label'>
            Approval Notes (Optional)
          </label>
          <textarea
            id='approve-comment'
            {...register('comment')}
            className='form-textarea'
            placeholder='Add approval notes (optional)...'
            rows={4}
            maxLength={500}
            disabled={isApproving}
          />
          {errors.comment && <p className='form-error'>{errors.comment.message}</p>}
          <p className='form-help'>{commentValue?.length || 0} / 500 characters</p>
        </div>

        <div className='form-field'>
          <label className='form-checkbox-label'>
            <input type='checkbox' {...register('confirmed')} className='form-checkbox' disabled={isApproving} />
            <span>I have reviewed the plan and approve proceeding with implementation</span>
          </label>
          {errors.confirmed && <p className='form-error'>{errors.confirmed.message}</p>}
        </div>

        {error && (
          <div className='form-error-alert' role='alert'>
            {error}
          </div>
        )}

        <div className='form-actions'>
          <button
            type='button'
            onClick={handleCloseForm}
            className='form-button form-button-secondary'
            disabled={isApproving}
          >
            Cancel
          </button>
          <button type='submit' className='form-button form-button-approve' disabled={isApproving}>
            {isApproving ? (
              <>
                <span className='button-spinner' aria-hidden='true' />
                <span>Approving...</span>
              </>
            ) : (
              <>
                <span className='button-icon' aria-hidden='true'>
                  ✓
                </span>
                <span>Confirm Approval</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
