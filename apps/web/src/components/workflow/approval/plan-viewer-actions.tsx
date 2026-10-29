import { useState } from 'react'

interface PlanViewerActionsProps {
  planContent: string
  runId: string
  onFullScreen: () => void
}

/**
 * Action buttons for plan viewer: download, copy, full-screen
 */
export function PlanViewerActions({ planContent, runId, onFullScreen }: PlanViewerActionsProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleDownload = () => {
    const blob = new Blob([planContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plan-${runId}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(planContent)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  return (
    <div className='plan-actions' data-testid='plan-actions'>
      <button
        type='button'
        onClick={handleDownload}
        className='plan-action-btn'
        aria-label='Download plan as markdown file'
        data-testid='plan-download-button'
      >
        <span aria-hidden='true'>⬇️</span>
        <span>Download</span>
      </button>

      <button
        type='button'
        onClick={handleCopy}
        className='plan-action-btn'
        aria-label='Copy plan to clipboard'
        data-testid='plan-copy-button'
      >
        <span aria-hidden='true'>{copyStatus === 'copied' ? '✓' : '📋'}</span>
        <span>{copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy'}</span>
      </button>

      <button
        type='button'
        onClick={onFullScreen}
        className='plan-action-btn'
        aria-label='View plan in full screen'
        data-testid='plan-fullscreen-button'
      >
        <span aria-hidden='true'>⛶</span>
        <span>Full Screen</span>
      </button>
    </div>
  )
}
