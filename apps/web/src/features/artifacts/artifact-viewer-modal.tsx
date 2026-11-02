import { DownloadIcon, XIcon } from 'lucide-react'
import { useCallback } from 'react'

import { getErrorMessage } from '@/api/client'
import { useArtifactsControllerGetContent } from '@/api/generated/artifacts/artifacts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { ArtifactBadge } from './artifact-badge'
import { ArtifactMarkdown } from './artifact-markdown'

import type { ArtifactResponse } from '@/api/generated/models'

type ArtifactViewerModalProps = {
  artifact: ArtifactResponse | null
  orgId: string
  workflowId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatBytes(bytes: number | null): string | null {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadMarkdown(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function ArtifactViewerModal({ artifact, orgId, workflowId, open, onOpenChange }: ArtifactViewerModalProps) {
  const artifactId = artifact?.id ?? ''

  const { data, isPending, isError, error } = useArtifactsControllerGetContent(orgId, workflowId, artifactId, {
    query: { enabled: open && artifactId.length > 0 },
  })

  const content = data?.content ?? ''
  const fileName = artifact?.fileName ?? `${artifact?.key ?? 'artifact'}.md`

  const handleDownload = useCallback(() => {
    if (!content) return
    downloadMarkdown(content, fileName)
  }, [content, fileName])

  if (!artifact) return null

  const sizeLabel = formatBytes(artifact.contentSize)
  const metaLine = [artifact.key, sizeLabel, `v${artifact.version}`].filter(Boolean).join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl'
      >
        <div className='flex items-start justify-between gap-3 border-b px-5 py-4 sm:gap-4 sm:px-6'>
          <div className='min-w-0 space-y-1.5'>
            <div className='flex flex-wrap items-center gap-2'>
              <ArtifactBadge type={artifact.type} version={artifact.version} showVersion />
              <span className='text-xs text-muted-foreground'>{metaLine}</span>
            </div>
            <DialogTitle className='truncate text-base sm:text-lg'>{artifact.title}</DialogTitle>
            <DialogDescription className='text-xs'>
              {artifact.mimeType ?? 'text/markdown'}
              {artifact.createdAt ? ` · created ${new Date(artifact.createdAt).toLocaleDateString()}` : ''}
            </DialogDescription>
          </div>
          <div className='flex shrink-0 items-center gap-1'>
            <Button
              size='sm'
              variant='outline'
              onClick={handleDownload}
              disabled={!content}
              title={`Download ${fileName}`}
            >
              <DownloadIcon />
              <span className='hidden sm:inline'>Download</span>
            </Button>
            <Button size='icon-sm' variant='ghost' onClick={() => onOpenChange(false)} aria-label='Close'>
              <XIcon />
            </Button>
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6'>
          {isPending ? (
            <div className='space-y-3' aria-busy='true' aria-label='Loading artifact content'>
              <div className='h-5 w-2/3 animate-pulse rounded bg-muted' />
              <div className='h-4 w-full animate-pulse rounded bg-muted' />
              <div className='h-4 w-11/12 animate-pulse rounded bg-muted' />
              <div className='h-4 w-4/5 animate-pulse rounded bg-muted' />
            </div>
          ) : isError ? (
            <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm'>
              <p className='font-medium'>Could not load artifact content</p>
              <p className='mt-1 text-muted-foreground'>{getErrorMessage(error)}</p>
            </div>
          ) : content.trim().length === 0 ? (
            <p className='text-sm text-muted-foreground'>This artifact has no content.</p>
          ) : (
            <ArtifactMarkdown content={content} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
