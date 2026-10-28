import { useState } from 'react'

interface JsonViewerProps {
  data: unknown
  title?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export function JsonViewer({ data, title, collapsible = true, defaultCollapsed = false }: JsonViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [copied, setCopied] = useState(false)

  const jsonString = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-surface-3'>
      <div className='flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3'>
        {collapsible && (
          <button
            type='button'
            onClick={() => setIsCollapsed(!isCollapsed)}
            className='flex h-4 w-4 items-center justify-center text-xs text-muted-foreground transition-colors hover:text-foreground'
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        )}
        {title && <h4 className='flex-1 text-sm font-medium text-foreground'>{title}</h4>}
        <button
          type='button'
          onClick={handleCopy}
          className='rounded border border-border px-3 py-1 text-xs text-muted-foreground transition-all hover:border-accent-cyan hover:bg-surface-3 hover:text-foreground'
          aria-label='Copy to clipboard'
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      {!isCollapsed && (
        <pre className='max-h-[400px] overflow-auto p-4'>
          <code className='font-mono text-[13px] leading-relaxed text-foreground'>{jsonString}</code>
        </pre>
      )}
    </div>
  )
}
