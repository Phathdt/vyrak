import type { WorkflowDraft } from '../schemas/workflow-schemas'
import { workflowDraftSchema } from '../schemas/workflow-schemas'

const WORKFLOW_DRAFT_KEY_PREFIX = 'workflow-draft'

/**
 * Generate localStorage key for workflow draft
 * Format: workflow-draft-${userId}-${projectId}
 */
export function getWorkflowDraftKey(userId: string, projectId: string): string {
  return `${WORKFLOW_DRAFT_KEY_PREFIX}-${userId}-${projectId}`
}

/**
 * Save workflow draft to localStorage
 */
export function saveWorkflowDraft(
  userId: string,
  projectId: string,
  draft: Omit<WorkflowDraft, 'savedAt'>
): void {
  try {
    const key = getWorkflowDraftKey(userId, projectId)
    const data: WorkflowDraft = {
      ...draft,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('[localStorage] Failed to save workflow draft:', error)
  }
}

/**
 * Load workflow draft from localStorage
 * Returns null if not found or invalid
 */
export function loadWorkflowDraft(userId: string, projectId: string): WorkflowDraft | null {
  try {
    const key = getWorkflowDraftKey(userId, projectId)
    const raw = localStorage.getItem(key)

    if (!raw) return null

    const data = JSON.parse(raw)
    const validated = workflowDraftSchema.parse(data)

    // Expire drafts older than 7 days
    const savedAt = new Date(validated.savedAt)
    const now = new Date()
    const daysDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 7) {
      clearWorkflowDraft(userId, projectId)
      return null
    }

    return validated
  } catch (error) {
    console.error('[localStorage] Failed to load workflow draft:', error)
    return null
  }
}

/**
 * Clear workflow draft from localStorage
 */
export function clearWorkflowDraft(userId: string, projectId: string): void {
  try {
    const key = getWorkflowDraftKey(userId, projectId)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('[localStorage] Failed to clear workflow draft:', error)
  }
}

/**
 * List all workflow drafts for a user (across all projects)
 */
export function listWorkflowDrafts(
  userId: string
): Array<{
  projectId: string
  draft: WorkflowDraft
}> {
  const drafts: Array<{ projectId: string; draft: WorkflowDraft }> = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(`${WORKFLOW_DRAFT_KEY_PREFIX}-${userId}-`)) continue

      const projectId = key.split('-').slice(3).join('-')
      const raw = localStorage.getItem(key)

      if (!raw) continue

      try {
        const data = JSON.parse(raw)
        const validated = workflowDraftSchema.parse(data)
        drafts.push({ projectId, draft: validated })
      } catch {
        // Skip invalid drafts
        continue
      }
    }
  } catch (error) {
    console.error('[localStorage] Failed to list workflow drafts:', error)
  }

  return drafts
}
