import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import type { WorkflowRunSummaryDto } from '../../api/generated/models'
import { StatusBadge } from './StatusBadge'

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  }

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return '-'
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    const duration = end - start

    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className='space-y-4'>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='h-24 text-center'>
                  No workflows found
                </TableCell>
              </TableRow>
            ) : (
              workflows.map((workflow) => (
                <TableRow
                  key={workflow.id}
                  onClick={() => navigate(`/workflows/${workflow.id}`)}
                  className='cursor-pointer hover:bg-accent/50'
                >
                  <TableCell>
                    <StatusBadge status={workflow.status} size='sm' />
                  </TableCell>
                  <TableCell className='font-medium'>{workflow.workflowKey}</TableCell>
                  <TableCell className='font-mono text-sm'>{workflow.id.slice(0, 8)}</TableCell>
                  <TableCell>{workflow.startedAt ? formatDate(workflow.startedAt) : '-'}</TableCell>
                  <TableCell>{formatDuration(workflow.startedAt, workflow.completedAt)}</TableCell>
                  <TableCell>{workflow.initiatedByUserId?.slice(0, 8) || 'System'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <Button variant='outline' disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span className='text-sm text-muted-foreground'>
            Page {page} of {totalPages}
          </span>
          <Button variant='outline' disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
