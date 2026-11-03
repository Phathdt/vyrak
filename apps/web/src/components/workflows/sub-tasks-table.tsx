import { CheckCircle2, Circle, CircleDashed, Clock, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'

import type { SubTasksListResponseDtoTasksItem } from '@/api/generated/models'

type SubTaskRow = SubTasksListResponseDtoTasksItem

const STATUS_META: Record<string, { label: string; className: string; icon: typeof Circle }> = {
  PENDING: { label: 'Pending', className: 'text-muted-foreground', icon: Circle },
  READY: { label: 'Ready', className: 'text-sky-600 dark:text-sky-400', icon: CircleDashed },
  WAITING_DEPENDENCY: { label: 'Waiting', className: 'text-amber-600 dark:text-amber-400', icon: Clock },
  IN_PROGRESS: { label: 'In progress', className: 'text-blue-600 dark:text-blue-400', icon: Loader2 },
  COMPLETED: { label: 'Completed', className: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
  FAILED: { label: 'Failed', className: 'text-red-600 dark:text-red-400', icon: XCircle },
  BLOCKED: { label: 'Blocked', className: 'text-orange-600 dark:text-orange-400', icon: XCircle },
}

function StatusCell({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, className: 'text-muted-foreground', icon: Circle }
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.className}`}>
      <Icon className={`h-4 w-4 ${status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} aria-hidden='true' />
      {meta.label}
    </span>
  )
}

type SubTasksTableProps = {
  tasks: SubTaskRow[]
  isLoading?: boolean
  onDelete?: (taskId: string) => void
}

export function SubTasksTable({ tasks, isLoading, onDelete }: SubTasksTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = tasks.length > 0 && selected.size === tasks.length

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center gap-2 rounded-lg border p-6 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
        Loading sub-tasks…
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
        No sub-tasks yet. Generate them from the Implementation Plan.
      </div>
    )
  }

  return (
    <div className='overflow-x-auto rounded-lg border bg-background'>
      <table className='w-full min-w-[640px] text-left text-sm'>
        <thead className='border-b bg-muted/50 text-xs uppercase text-muted-foreground'>
          <tr>
            <th className='w-10 px-3 py-2'>
              <input
                type='checkbox'
                aria-label='Select all sub-tasks'
                checked={allSelected}
                onChange={toggleAll}
                className='h-4 w-4 cursor-pointer'
              />
            </th>
            <th className='w-12 px-3 py-2'>#</th>
            <th className='px-3 py-2'>Title</th>
            <th className='w-32 px-3 py-2'>Status</th>
            <th className='px-3 py-2'>Dependencies</th>
            <th className='w-20 px-3 py-2 text-right'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className='border-b last:border-b-0 hover:bg-muted/30'>
              <td className='px-3 py-2'>
                <input
                  type='checkbox'
                  aria-label={`Select ${task.title}`}
                  checked={selected.has(task.id)}
                  onChange={() => toggle(task.id)}
                  className='h-4 w-4 cursor-pointer'
                />
              </td>
              <td className='px-3 py-2 font-mono text-xs text-muted-foreground'>{task.executionOrder + 1}</td>
              <td className='px-3 py-2'>
                <div className='font-medium'>{task.title}</div>
                <div className='font-mono text-xs text-muted-foreground'>{task.key}</div>
              </td>
              <td className='px-3 py-2'>
                <StatusCell status={task.status} />
              </td>
              <td className='px-3 py-2'>
                {task.dependencies.length === 0 ? (
                  <span className='text-xs text-muted-foreground'>None</span>
                ) : (
                  <div className='flex flex-wrap gap-1'>
                    {task.dependencies.map((dep) => (
                      <span key={dep} className='rounded-full border px-2 py-0.5 font-mono text-[11px]'>
                        {dep}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className='px-3 py-2 text-right'>
                {onDelete && (
                  <button
                    type='button'
                    onClick={() => onDelete(task.id)}
                    className='rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
