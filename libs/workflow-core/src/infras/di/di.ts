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
 * Workflow approval repository token
 */
export const WORKFLOW_APPROVAL_REPOSITORY = Symbol('WORKFLOW_APPROVAL_REPOSITORY')

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
 * Approval step executor token
 * Executes approval steps in workflows
 */
export const APPROVAL_STEP_EXECUTOR = Symbol('APPROVAL_STEP_EXECUTOR')

/**
 * Artifact repository token
 */
export const ARTIFACT_REPOSITORY = Symbol('ARTIFACT_REPOSITORY')

/**
 * Approval validator service token
 * Validates plan versions to prevent stale approvals
 */
export const APPROVAL_VALIDATOR_SERVICE = Symbol('APPROVAL_VALIDATOR_SERVICE')

/**
 * Authorization service token
 * Handles authorization checks for workflow operations
 */
export const AUTHORIZATION_SERVICE = Symbol('AUTHORIZATION_SERVICE')

/**
 * Approve workflow use case token
 * Handles approval decision workflow
 */
export const APPROVE_WORKFLOW_USE_CASE = Symbol('APPROVE_WORKFLOW_USE_CASE')

/**
 * Tool step executor token
 * Executes tool/command steps in workflows
 */
export const TOOL_STEP_EXECUTOR = Symbol('TOOL_STEP_EXECUTOR')

/**
 * Test result parser token
 * Parses test results from various formats
 */
export const TEST_RESULT_PARSER = Symbol('TEST_RESULT_PARSER')
