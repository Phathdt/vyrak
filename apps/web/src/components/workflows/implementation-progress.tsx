import { CheckCircle2, ChevronDown, ChevronRight, CircleDot, Clock, Loader2, XCircle } from 'lucide-react'
import { type ComponentType, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import type { ImplementationStatusResponseDto } from '@/api/generated/models/implementationStatusResponseDto'
import type { ImplementationStatusResponseDtoTasksItem } from '@/api/generated/models/implementationStatusResponseDtoTasksItem'

type TaskStatus = ImplementationStatusResponseDtoTasksItem['status']

const STATUS_META: Record<
  TaskStatus,
  {
    label: string
    icon: ComponentType<{ className?: string }>
    iconClass: string
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  COMPLETED: { label: 'Completed', icon: CheckCircle2, iconClass: 'text-emerald-500', badgeVariant: 'secondary' },
  IN_PROGRESS: { label: 'In progress', icon: Loader2, iconClass: 'text-sky-400 animate-spin', badgeVariant: 'default' },
  READY: { label: 'Ready', icon: CircleDot, iconClass: 'text-blue-500', badgeVariant: 'outline' },
  PENDING: { label: 'Pending', icon: CircleDot, iconClass: 'text-muted-foreground', badgeVariant: 'outline' },
  WAITING_DEPENDENCY: { label: 'Waiting', icon: Clock, iconClass: 'text-muted-foreground', badgeVariant: 'outline' },
  FAILED: { label: 'Failed', icon: XCircle, iconClass: 'text-red-500', badgeVariant: 'destructive' },
  BLOCKED: { label: 'Blocked', icon: XCircle, iconClass: 'text-amber-500', badgeVariant: 'destructive' },
}

const DEPENDENCY_LABEL: Record<ImplementationStatusResponseDtoTasksItem['dependencyType'], string> = {
  INDEPENDENT: 'Independent',
  SEQUENTIAL: 'Sequential',
  DEPENDENT: 'Depends on prior tasks',
}

type ImplementationProgressProps = {
  status: ImplementationStatusResponseDto | undefined
  isLoading: boolean
  isError: boolean
  errorMessage?: string | null
}

export function ImplementationProgress({ status, isLoading, isError, errorMessage }: ImplementationProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading && !status) {
    return <div className='text-sm text-muted-foreground'>Loading implementation status...</div>
  }

  if (isError && !status) {
    return (
      <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
        {errorMessage || 'Failed to load implementation status.'}
      </div>
    )
  }

  if (!status) return null

  const { totalTasks, completedTasks, failedTasks, inProgressTasks, readyTasks, pendingTasks, tasks } = status
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  if (totalTasks === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No sub-tasks yet</CardTitle>
          <CardDescription>Generate sub-tasks in Tech Refinement before starting implementation.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardContent className='space-y-3 pt-6'>
          <div className='flex items-center justify-between text-sm'>
            <span className='font-medium'>
              {completedTasks} / {totalTasks} tasks completed
            </span>
            <span className='tabular-nums text-muted-foreground'>{percent}%</span>
          </div>
          <div
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className='h-2 w-full overflow-hidden rounded-full bg-muted'
          >
            <div className='h-full rounded-full bg-emerald-500 transition-all' style={{ width: `${percent}%` }} />
          </div>
          <div className='flex flex-wrap gap-2 text-xs'>
            <Badge variant='secondary'>Completed {completedTasks}</Badge>
            <Badge variant='default'>In progress {inProgressTasks}</Badge>
            <Badge variant='outline'>Ready {readyTasks}</Badge>
            <Badge variant='outline'>Pending {pendingTasks}</Badge>
            {failedTasks > 0 && <Badge variant='destructive'>Failed {failedTasks}</Badge>}
          </div>
        </CardContent>
      </Card>

      <ul className='divide-y rounded-lg border bg-card'>
        {tasks.map((task) => {
          const meta = STATUS_META[task.status]
          const Icon = meta.icon
          const isExpanded = expandedId === task.id
          const Chevron = isExpanded ? ChevronDown : ChevronRight
          return (
            <li key={task.id}>
              <button
                type='button'
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
                aria-expanded={isExpanded}
                className='flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50'
              >
                <Chevron className='size-4 shrink-0 text-muted-foreground' />
                <Icon className={cn('size-4 shrink-0', meta.iconClass)} aria-label={meta.label} />
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-sm font-medium'>{task.title}</div>
                  <div className='text-xs text-muted-foreground'>
                    {task.key} · {DEPENDENCY_LABEL[task.dependencyType]}
                  </div>
                </div>
                <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              </button>
              {isExpanded && (
                <div className='space-y-2 px-11 pb-4 text-sm'>
                  <p className='whitespace-pre-wrap text-muted-foreground'>
                    {task.description || 'No description provided.'}
                  </p>
                  <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs'>
                    <dt className='text-muted-foreground'>Execution order</dt>
                    <dd>{task.executionOrder}</dd>
                    <dt className='text-muted-foreground'>Dependency</dt>
                    <dd>{DEPENDENCY_LABEL[task.dependencyType]}</dd>
                  </dl>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
