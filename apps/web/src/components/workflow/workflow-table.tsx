import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useNavigate } from 'react-router-dom'

import { StatusBadge } from './StatusBadge'
import { useDurationCounter } from '../../hooks/use-duration-counter'
import { formatDuration, formatRelativeTime } from '../../lib/utils/duration-utils'

import type { WorkflowRunSummaryDto } from '../../api/generated/models'

interface WorkflowTableProps {
  workflows: WorkflowRunSummaryDto[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

export function WorkflowTable({ workflows, total, page, limit, onPageChange }: WorkflowTableProps) {
  const navigate = useNavigate()

  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  if (workflows.length === 0) {
    return null // Empty state handled by parent
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Run ID</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>User</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((workflow) => (
              <WorkflowRow key={workflow.id} workflow={workflow} navigate={navigate} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between rounded-lg border bg-card p-4'>
        <p className='text-sm text-muted-foreground'>
          Showing {startIndex}-{endIndex} of {total} workflows
        </p>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            ← Previous
          </Button>

          <div className='flex items-center gap-1'>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, current, and adjacent pages
                return (
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1
                )
              })
              .map((p, index, array) => {
                const showEllipsis = index > 0 && p - array[index - 1] > 1

                return (
                  <div key={p} className='flex items-center gap-1'>
                    {showEllipsis && <span className='px-2 text-muted-foreground'>...</span>}
                    <Button
                      variant={p === page ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => onPageChange(p)}
                      className='min-w-10'
                    >
                      {p}
                    </Button>
                  </div>
                )
              })}
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  )
}

function WorkflowRow({ workflow, navigate }: { workflow: WorkflowRunSummaryDto; navigate: (path: string) => void }) {
  const isActive = workflow.status === 'running' || workflow.status === 'queued'
  const duration = useDurationCounter(
    workflow.startedAt,
    workflow.completedAt,
    isActive
  )

  return (
    <TableRow
      onClick={() => navigate(`/workflows/${workflow.id}`)}
      className='cursor-pointer hover:bg-accent/50'
    >
      <TableCell>
        <StatusBadge status={workflow.status} size='sm' />
      </TableCell>
      <TableCell className='font-medium'>{workflow.workflowKey}</TableCell>
      <TableCell className='font-mono text-sm'>{workflow.id.slice(0, 8)}</TableCell>
      <TableCell>
        {workflow.startedAt ? (
          <span title={new Date(workflow.startedAt).toLocaleString()}>
            {formatRelativeTime(workflow.startedAt)}
          </span>
        ) : (
          <span className='text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell>
        {duration !== null ? (
          <span className={isActive ? 'text-cyan-400 font-medium' : ''}>
            {formatDuration(duration)}
          </span>
        ) : (
          <span className='text-muted-foreground'>-</span>
        )}
      </TableCell>
      <TableCell>{workflow.initiatedByUserId?.slice(0, 8) || 'System'}</TableCell>
      <TableCell className='text-right'>
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/workflows/${workflow.id}`)
          }}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  )
}
