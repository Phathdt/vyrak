export interface ParsedImplementationTask {
  key: string
  title: string
  description: string
  acceptanceCriteria: string[]
  dependencyKeys: string[]
  phaseKey: string
  phaseTitle: string
  phaseOrder: number
  taskOrder: number
  executionOrder: number
  isParallel: boolean
  estimate: string | null
  files: string[]
}

export interface ParsedImplementationPlan {
  tasks: ParsedImplementationTask[]
}

const PHASE_HEADER = /^#{2,4}\s+Phase\s+(\d+)\s*:\s*(.+?)\s*$/i
const TASK_LINE = /^(?:\d+\.|[-*])\s+\[[ xX]?\]\s+(.+?)\s*$/
const TASK_ID_PREFIX = /^(?:Task\s+)?(\d+(?:\.\d+)?)\s*[:.)-]\s*/i
const DEPENDS_ON = /(?:depends\s+on|dependencies|blocked\s+by)\s*:?\s*(.+)$/i
const DEPENDENCY_REF = /(?:task\s+)?(\d+(?:\.\d+)?)/gi
const ESTIMATE = /(\d+(?:\.\d+)?\s*(?:h|hours?|d|days?))\b/i
const FILE_REF = /`([^`\s]+\.[a-z0-9]+)`/gi

/**
 * Parses an Implementation Plan written as markdown.
 *
 * Expected structure:
 *   ## Phase 1: Backend          -> phase header (2 to 4 hashes)
 *   1. [ ] Task title            -> task (checkbox list item)
 *      - Details / Description   -> optional description
 *      - Acceptance: ...         -> acceptance criteria (bullets under "Acceptance")
 *      - Depends on: Task 1.2    -> explicit dependencies (keys like "1.2")
 *      - Estimate: 2h            -> estimate
 *      - Files: `path/file.ts`   -> referenced files
 *
 * Execution model: phases run in order (executionOrder grows across phases). Tasks inside
 * one phase have no implicit ordering and are marked parallel, unless a task declares
 * explicit dependencies, in which case it is sequential within the phase.
 */
export function parseImplementationPlan(markdown: string): ParsedImplementationPlan {
  const lines = markdown.split(/\r?\n/)
  const tasks: ParsedImplementationTask[] = []

  let phaseOrder = 0
  let phaseKey = ''
  let phaseTitle = ''
  let taskOrder = 0
  let executionOrder = 0
  let current: ParsedImplementationTask | null = null
  let inAcceptance = false

  const finishCurrent = (): void => {
    current = null
    inAcceptance = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    const phaseMatch = trimmed.match(PHASE_HEADER)
    if (phaseMatch) {
      finishCurrent()
      phaseOrder += 1
      phaseKey = `phase-${phaseMatch[1]}`
      phaseTitle = phaseMatch[2].trim()
      taskOrder = 0
      executionOrder += 1
      continue
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      finishCurrent()
      continue
    }

    const taskMatch = trimmed.match(TASK_LINE)
    if (taskMatch) {
      finishCurrent()
      taskOrder += 1
      executionOrder += 1
      const rawTitle = taskMatch[1].trim()
      const explicitId = rawTitle.match(TASK_ID_PREFIX)
      const title = explicitId ? rawTitle.slice(explicitId[0].length).trim() : rawTitle
      const key = explicitId ? explicitId[1] : `${phaseOrder}.${taskOrder}`

      current = {
        key: `${phaseKey || 'task'}-${key}`.toLowerCase(),
        title: title || rawTitle,
        description: '',
        acceptanceCriteria: [],
        dependencyKeys: [],
        phaseKey: phaseKey || 'task',
        phaseTitle,
        phaseOrder,
        taskOrder,
        executionOrder,
        isParallel: true,
        estimate: null,
        files: [],
      }
      tasks.push(current)
      continue
    }

    if (!current || trimmed === '') {
      continue
    }

    const detail = trimmed.replace(/^[-*]\s+/, '').replace(/^\*\*([^*]+)\*\*:?\s*/, '$1: ')

    if (/^acceptance/i.test(detail)) {
      inAcceptance = true
      const inline = detail.replace(/^acceptance[^:]*:\s*/i, '')
      if (inline && inline !== detail) current.acceptanceCriteria.push(inline)
      continue
    }

    if (/^(details?|description)\s*:/i.test(detail)) {
      inAcceptance = false
      current.description = detail.replace(/^(details?|description)\s*:\s*/i, '')
      continue
    }

    if (/^estimate\s*:/i.test(detail)) {
      inAcceptance = false
      const est = detail.match(ESTIMATE)
      if (est) current.estimate = est[1]
      continue
    }

    if (/^files?\s*:/i.test(detail)) {
      inAcceptance = false
      current.files.push(...extractFiles(detail))
      continue
    }

    const depMatch = detail.match(DEPENDS_ON)
    if (depMatch) {
      inAcceptance = false
      const refs = Array.from(depMatch[1].matchAll(DEPENDENCY_REF)).map((m) => m[1])
      for (const ref of refs) {
        const depKey = `${phaseKey || 'task'}-${ref}`.toLowerCase()
        if (!current.dependencyKeys.includes(depKey)) current.dependencyKeys.push(depKey)
      }
      continue
    }

    // Bullet under an "Acceptance" heading is an acceptance criterion.
    if (inAcceptance && trimmed.match(/^[-*]\s+/)) {
      current.acceptanceCriteria.push(detail)
      continue
    }

    // Free text following the task line is treated as description.
    if (!current.description && !/^[-*]\s/.test(trimmed)) {
      current.description = detail
    }
  }

  for (const task of tasks) {
    task.isParallel = task.dependencyKeys.length === 0
  }

  return { tasks }
}

function extractFiles(line: string): string[] {
  return Array.from(line.matchAll(FILE_REF)).map((m) => m[1])
}
