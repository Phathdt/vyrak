/**
 * Dependency injection tokens for workflow-core module
 *
 * Symbol-based tokens prevent injection conflicts and enable
 * framework-independent business logic
 */

/**
 * Workflow repository token
 */
export const WORKFLOW_REPOSITORY = Symbol('WORKFLOW_REPOSITORY')

/**
 * Step repository token
 */
export const STEP_REPOSITORY = Symbol('STEP_REPOSITORY')

/**
 * Event repository token
 */
export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY')

/**
 * Job queue token (BullMQ)
 */
export const JOB_QUEUE = Symbol('JOB_QUEUE')

/**
 * Agent step executor token
 * Executes agent steps in workflows
 */
export const AGENT_STEP_EXECUTOR = Symbol('AGENT_STEP_EXECUTOR')

/**
 * Agent executor token (re-exported from agent-runtime)
 */
export const AGENT_EXECUTOR = Symbol('AGENT_EXECUTOR')

/**
 * Workspace manager token (re-exported from agent-runtime)
 */
export const WORKSPACE_MANAGER = Symbol('WORKSPACE_MANAGER')

/**
 * Artifact manager token (re-exported from agent-runtime)
 */
export const ARTIFACT_MANAGER = Symbol('ARTIFACT_MANAGER')

/**
 * Main repository manager token (re-exported from agent-runtime)
 */
export const MAIN_REPO_MANAGER = Symbol('MAIN_REPO_MANAGER')
