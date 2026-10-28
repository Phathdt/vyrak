import { useReactFlow } from '@xyflow/react'
import { Maximize2, Minimize2, Minus, Plus, ZoomIn } from 'lucide-react'
import { useState } from 'react'

interface DiagramControlsProps {
  showMinimap: boolean
  onToggleMinimap: () => void
}

export function DiagramControls({ showMinimap, onToggleMinimap }: DiagramControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className='absolute bottom-6 right-6 z-10 flex flex-col gap-2'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Zoom controls */}
      <div className='flex flex-col gap-1 rounded-lg border border-border bg-surface-2 p-1 shadow-lg'>
        <button
          type='button'
          onClick={() => zoomIn({ duration: 300 })}
          className='flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground'
          aria-label='Zoom in'
          title='Zoom in'
        >
          <Plus className='h-4 w-4' />
        </button>

        <div className='h-px bg-border' />

        <button
          type='button'
          onClick={() => zoomOut({ duration: 300 })}
          className='flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground'
          aria-label='Zoom out'
          title='Zoom out'
        >
          <Minus className='h-4 w-4' />
        </button>

        <div className='h-px bg-border' />

        <button
          type='button'
          onClick={() => fitView({ duration: 300, padding: 0.2 })}
          className='flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground'
          aria-label='Fit view'
          title='Fit view'
        >
          <Maximize2 className='h-4 w-4' />
        </button>
      </div>

      {/* Minimap toggle */}
      <button
        type='button'
        onClick={onToggleMinimap}
        className={`
          flex h-8 items-center gap-2 rounded-lg border border-border px-3 shadow-lg transition-colors
          ${showMinimap ? 'bg-cyan-500/10 text-cyan-400' : 'bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground'}
        `}
        aria-label={showMinimap ? 'Hide minimap' : 'Show minimap'}
        title={showMinimap ? 'Hide minimap' : 'Show minimap'}
      >
        {showMinimap ? <Minimize2 className='h-4 w-4' /> : <ZoomIn className='h-4 w-4' />}
        {isHovered && <span className='text-xs font-medium'>Minimap</span>}
      </button>

      {/* Keyboard shortcuts hint */}
      {isHovered && (
        <div className='rounded-lg border border-border bg-surface-2 p-2 text-xs text-muted-foreground shadow-lg animate-slide-in'>
          <div className='space-y-1'>
            <div className='flex items-center justify-between gap-4'>
              <span>Zoom in</span>
              <kbd className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]'>+</kbd>
            </div>
            <div className='flex items-center justify-between gap-4'>
              <span>Zoom out</span>
              <kbd className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]'>-</kbd>
            </div>
            <div className='flex items-center justify-between gap-4'>
              <span>Fit view</span>
              <kbd className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]'>F</kbd>
            </div>
            <div className='flex items-center justify-between gap-4'>
              <span>Pan</span>
              <kbd className='rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]'>Drag</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
