import { cn } from 'cn'
import { FileTextIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getErrorMessage } from '@/api/client'
import { useArtifactsControllerList } from '@/api/generated/artifacts/artifacts'
import { Button } from '@/components/ui/button'

import { ArtifactApprovalActions } from './artifact-approval-actions'
import { ArtifactBadge } from './artifact-badge'
import { ArtifactStatusBadge } from './artifact-status-badge'
import { ArtifactViewerModal } from './artifact-viewer-modal'

import type { ArtifactResponse } from '@/api/generated/models'

type ArtifactListProps = {
  orgId: string
  workflowId: string
  /** Only show artifacts attached to this phase. Omitted means every artifact in the workflow. */
  phaseId?: string | null
  title?: string
  emptyMessage?: string
  /** Render nothing at all when the query resolves with no matching artifacts. */
  hideWhenEmpty?: boolean
  className?: string
}

/**
 * Keeps the newest version of each artifact key. The API returns every version,
 * so a doc revised three times would otherwise appear three times.
 */
function latestPerKey(artifacts: ArtifactResponse[]): ArtifactResponse[] {
  const byKey = new Map<string, ArtifactResponse>()

  for (const artifact of artifacts) {
    const current = byKey.get(artifact.key)
    if (!current || artifact.version > current.version) {
      byKey.set(artifact.key, artifact)
    }
  }

  return [...byKey.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function ArtifactList({
  orgId,
  workflowId,
  phaseId,
  title = 'Artifacts',
  emptyMessage = 'No artifacts yet. Planning and refinement produce PRD, ADR, and ARD documents here.',
  hideWhenEmpty = false,
  className,
}: ArtifactListProps) {
  const [selected, setSelected] = useState<ArtifactResponse | null>(null)

  const query = useArtifactsControllerList(orgId, workflowId, undefined)
  const artifacts = useMemo(() => latestPerKey(query.data?.items ?? []), [query.data])

  const visible = useMemo(
    () => (phaseId ? artifacts.filter((artifact) => artifact.phaseId === phaseId) : artifacts),
    [artifacts, phaseId]
  )

  const handleStatusChange = () => {
    query.refetch()
  }

  if (hideWhenEmpty && !query.isPending && !query.isError && visible.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      {title && <p className='text-sm font-medium'>{title}</p>}

      {query.isPending ? (
        <div className='space-y-2' aria-busy='true' aria-label='Loading artifacts'>
          <div className='h-10 w-full animate-pulse rounded-lg bg-muted' />
          <div className='h-10 w-full animate-pulse rounded-lg bg-muted' />
        </div>
      ) : query.isError ? (
        <p className='text-sm text-destructive'>Could not load artifacts: {getErrorMessage(query.error)}</p>
      ) : visible.length === 0 ? (
        <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
      ) : (
        <ul className='space-y-2'>
          {visible.map((artifact) => (
            <li key={artifact.id} className='space-y-2'>
              <Button
                variant='outline'
                className='h-auto w-full justify-start gap-3 px-3 py-2.5 text-left font-normal'
                onClick={() => setSelected(artifact)}
              >
                <FileTextIcon className='size-4 shrink-0 text-muted-foreground' aria-hidden />
                <span className='min-w-0 flex-1'>
                  <span className='flex items-center gap-2'>
                    <span className='block truncate text-sm font-medium'>{artifact.title}</span>
                    <ArtifactStatusBadge status={artifact.approvalStatus} />
                  </span>
                  <span className='block truncate text-xs text-muted-foreground'>
                    {artifact.key}
                    {artifact.contentSize != null ? ` · ${artifact.contentSize} B` : ''}
                  </span>
                </span>
                <ArtifactBadge type={artifact.type} version={artifact.version} showVersion className='shrink-0' />
              </Button>
              <div className='flex justify-end'>
                <ArtifactApprovalActions artifact={artifact} orgId={orgId} onStatusChange={handleStatusChange} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ArtifactViewerModal
        artifact={selected}
        orgId={orgId}
        workflowId={workflowId}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </div>
  )
}
