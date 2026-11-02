import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { CriterionResult, QAVerificationResult } from '../../domain/interfaces/qa-verification.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'

export interface QAContext {
  workflow: {
    id: string
    title: string
    description: string | null
  }
  phase: {
    id: string
    key: string
  }
  artifacts: {
    prd?: string
    technicalSpecs?: string
    implementationPlan?: string
  }
  workspacePath: string
}

const QA_VERIFICATION_PROMPT = `You are verifying the implementation against acceptance criteria from the PRD.

## Context

**Workflow:** {workflowTitle}
{workflowDescription}

## Available Artifacts

{artifactsContext}

## Instructions

1. Read the PRD artifact first to extract acceptance criteria
2. Review the Technical Specifications and Implementation Plan
3. Run existing tests if they exist (use Bash tool: npm test, yarn test, etc.)
4. Verify each acceptance criterion:
   - Check if the feature works as specified
   - Test edge cases mentioned in the PRD
   - Verify error handling requirements
   - Check performance requirements if specified
5. For each criterion, determine: PASS, FAIL, or SKIPPED (if not testable)

## Test Execution

If tests exist in the repository:
- Run the test suite using the appropriate command (npm test, yarn test, pytest, etc.)
- Check test results and map them to acceptance criteria
- Include test output in your verification

If tests don't exist:
- Manually verify functionality by reading the implementation
- Check if code follows the specifications
- Note which criteria cannot be fully verified without tests

## Deliverables

Provide a structured QA report with:

<qa-report>
## QA Verification Report

### Overall Status
[PASS | FAIL | PARTIAL]

### Acceptance Criteria Results

#### 1. [Criterion Title]
- **Status:** PASS | FAIL | SKIPPED
- **Details:** [How you verified it, what you found]
- **Error:** [If FAIL, describe the issue]

#### 2. [Next Criterion]
...

### Test Execution Summary
- Tests run: [Yes/No]
- Test command: [command used]
- Test results: [summary of test output]

### Edge Cases Verified
- [List any edge cases tested]

### Issues Found
- [List any bugs, issues, or concerns discovered]

### Recommendations
- [Suggestions for improvement, missing tests, etc.]
</qa-report>

Working directory: {workspacePath}
`

/**
 * QA Agent Runner
 * Verifies implementation against PRD acceptance criteria using Claude Agent SDK
 */
export class QAAgentRunner {
  constructor(private readonly aiAgentService: IAIAgentService) {}

  /**
   * Execute QA verification for a workflow
   * Verifies acceptance criteria, runs tests if available
   */
  async executeQA(context: QAContext): Promise<QAVerificationResult> {
    const executedAt = new Date()

    try {
      // Prepare prompt with QA context
      const prompt = this.buildPrompt(context)

      // Write artifacts to workspace for easy reference
      await this.writeArtifactsToWorkspace(context)

      // Execute agent with Bash tool enabled for running tests
      const response = await this.aiAgentService.runAgent({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        systemPrompt: this.buildSystemPrompt(context),
        workingDirectory: context.workspacePath,
        allowedTools: ['Read', 'Bash', 'Grep', 'Glob'],
        maxTokens: 8192,
      })

      // Parse QA report from response
      const reportContent = response.content
      const criteriaResults = this.parseQAReport(reportContent)

      // Determine overall status
      const overallStatus = this.determineOverallStatus(criteriaResults)

      return {
        workflowId: context.workflow.id,
        phaseId: context.phase.id,
        criteriaResults,
        overallStatus,
        executedAt,
        usage: {
          inputTokens: response.usage?.inputTokens || 0,
          outputTokens: response.usage?.outputTokens || 0,
        },
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Return failed result with error details
      return {
        workflowId: context.workflow.id,
        phaseId: context.phase.id,
        criteriaResults: [
          {
            criterion: 'QA Execution',
            status: 'fail',
            errorMessage: `QA execution failed: ${err.message}`,
          },
        ],
        overallStatus: 'failed',
        executedAt,
      }
    }
  }

  private buildPrompt(context: QAContext): string {
    let prompt = QA_VERIFICATION_PROMPT.replace('{workflowTitle}', context.workflow.title)
      .replace('{workflowDescription}', context.workflow.description || 'No description provided')
      .replace('{workspacePath}', context.workspacePath)

    // Build artifacts context
    let artifactsContext = ''
    if (context.artifacts.prd) {
      artifactsContext += `### PRD (Product Requirements Document)\nSee: .vyrak-artifacts/prd.md\n\n`
    }
    if (context.artifacts.technicalSpecs) {
      artifactsContext += `### Technical Specifications\nSee: .vyrak-artifacts/technical-specs.md\n\n`
    }
    if (context.artifacts.implementationPlan) {
      artifactsContext += `### Implementation Plan\nSee: .vyrak-artifacts/implementation-plan.md\n\n`
    }

    if (!artifactsContext) {
      artifactsContext = 'No artifacts available. Cannot perform comprehensive QA verification.'
    }

    prompt = prompt.replace('{artifactsContext}', artifactsContext)

    return prompt
  }

  private buildSystemPrompt(context: QAContext): string {
    return [
      'You are Claude, an AI assistant specialized in quality assurance and testing.',
      'You have access to tools for reading code and running tests.',
      '',
      `Verifying workflow: ${context.workflow.title}`,
      `Working directory: ${context.workspacePath}`,
      '',
      'Your goal is to verify the implementation against the PRD acceptance criteria.',
      'Run tests if they exist, and manually verify functionality by reading the code.',
      'Be thorough but pragmatic - focus on the acceptance criteria.',
      '',
      'IMPORTANT: Provide your findings in a structured format using the <qa-report> tag.',
    ].join('\n')
  }

  private async writeArtifactsToWorkspace(context: QAContext): Promise<void> {
    const artifactsDir = path.join(context.workspacePath, '.vyrak-artifacts')

    // Write PRD if available
    if (context.artifacts.prd) {
      const prdPath = path.join(artifactsDir, 'prd.md')
      await writeFile(prdPath, context.artifacts.prd, 'utf8').catch(() => {
        // Ignore write errors for artifacts
      })
    }

    // Write technical specs if available
    if (context.artifacts.technicalSpecs) {
      const specsPath = path.join(artifactsDir, 'technical-specs.md')
      await writeFile(specsPath, context.artifacts.technicalSpecs, 'utf8').catch(() => {
        // Ignore write errors
      })
    }

    // Write implementation plan if available
    if (context.artifacts.implementationPlan) {
      const planPath = path.join(artifactsDir, 'implementation-plan.md')
      await writeFile(planPath, context.artifacts.implementationPlan, 'utf8').catch(() => {
        // Ignore write errors
      })
    }
  }

  /**
   * Parse QA report from agent response
   * Extracts criterion results from structured output
   */
  private parseQAReport(reportContent: string): CriterionResult[] {
    const results: CriterionResult[] = []

    // Extract qa-report section
    const qaReportMatch = reportContent.match(/<qa-report>([\s\S]*?)<\/qa-report>/i)
    const reportText = qaReportMatch ? qaReportMatch[1] : reportContent

    // Parse acceptance criteria results
    // Look for patterns like:
    // #### 1. [Criterion Title]
    // - **Status:** PASS | FAIL | SKIPPED
    const criterionPattern = /####\s+\d+\.\s+(.+?)\n[\s\S]*?-\s+\*\*Status:\*\*\s+(PASS|FAIL|SKIPPED)/gi

    let match
    while ((match = criterionPattern.exec(reportText)) !== null) {
      const criterion = match[1].trim()
      const status = match[2].toLowerCase() as 'pass' | 'fail' | 'skipped'

      // Extract details and error for this criterion
      const criterionSection = this.extractCriterionSection(reportText, match.index)
      const details = this.extractDetails(criterionSection)
      const errorMessage = this.extractError(criterionSection)

      results.push({
        criterion,
        status,
        details,
        errorMessage,
      })
    }

    // If no structured results found, create a generic result
    if (results.length === 0) {
      // Check if report mentions overall status
      const overallPassMatch = reportContent.match(/overall\s+status[:\s]+pass/i)
      const overallFailMatch = reportContent.match(/overall\s+status[:\s]+fail/i)

      results.push({
        criterion: 'Overall Verification',
        status: overallPassMatch ? 'pass' : overallFailMatch ? 'fail' : 'skipped',
        details: reportContent.slice(0, 500), // First 500 chars as details
      })
    }

    return results
  }

  private extractCriterionSection(reportText: string, startIndex: number): string {
    // Extract text from current criterion to next criterion or end
    const nextCriterionMatch = reportText.slice(startIndex + 1).match(/####\s+\d+\./)
    if (nextCriterionMatch && nextCriterionMatch.index !== undefined) {
      return reportText.slice(startIndex, startIndex + 1 + nextCriterionMatch.index)
    }
    return reportText.slice(startIndex)
  }

  private extractDetails(criterionSection: string): string | undefined {
    const detailsMatch = criterionSection.match(/-\s+\*\*Details:\*\*\s+(.+?)(?:\n|$)/i)
    return detailsMatch ? detailsMatch[1].trim() : undefined
  }

  private extractError(criterionSection: string): string | undefined {
    const errorMatch = criterionSection.match(/-\s+\*\*Error:\*\*\s+(.+?)(?:\n|$)/i)
    return errorMatch ? errorMatch[1].trim() : undefined
  }

  private determineOverallStatus(criteriaResults: CriterionResult[]): 'passed' | 'failed' | 'partial' {
    if (criteriaResults.length === 0) {
      return 'failed'
    }

    const failedCount = criteriaResults.filter((r) => r.status === 'fail').length
    const passedCount = criteriaResults.filter((r) => r.status === 'pass').length

    if (failedCount === 0 && passedCount > 0) {
      return 'passed'
    } else if (failedCount > 0 && passedCount > 0) {
      return 'partial'
    } else {
      return 'failed'
    }
  }
}
