import { useEffect } from 'react'

import { MarkdownRenderer } from './markdown-renderer'

interface PlanFullScreenModalProps {
  isOpen: boolean
  planContent: string
  onClose: () => void
}

/**
 * Full-screen modal for viewing plan without distractions
 */
export function PlanFullScreenModal({ isOpen, planContent, onClose }: PlanFullScreenModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Lock body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
    return
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className='plan-modal-overlay'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-labelledby='plan-modal-title'
      data-testid='plan-fullscreen-modal'
    >
      <div className='plan-modal-content' onClick={(e) => e.stopPropagation()}>
        <div className='plan-modal-header' data-testid='plan-modal-header'>
          <h2 id='plan-modal-title'>Implementation Plan</h2>
          <button
            type='button'
            onClick={onClose}
            className='plan-modal-close'
            aria-label='Close full screen view'
            data-testid='plan-modal-close-button'
          >
            ✕
          </button>
        </div>

        <div className='plan-modal-body' data-testid='plan-modal-body'>
          <MarkdownRenderer content={planContent} />
        </div>
      </div>
    </div>
  )
}
