import type { PrioritizedFinding } from '../../domain/interfaces/rework-orchestrator.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'

export interface ReworkContext {
  workflow: {
    id: string
    title: string
  }
  phase: {
    id: string
    key: string
  }
  iterationNumber: number
  file: string
  findings: PrioritizedFinding[]
  artifacts: {
    prd?: string
    technicalSpecs?: string
    implementationPlan?: string
  }
  workspacePath: string
}

export interface ReworkAgentResult {
  file: string
  findingsAddressed: number
  reportContent: string
  success: boolean
}

/**
 * Rework Agent Runner
 * Executes AI agent to fix issues identified by code review and QA
 */
export class ReworkAgentRunner {
  constructor(private readonly aiAgentService: IAIAgentService) {}

  async executeRework(context: ReworkContext): Promise<ReworkAgentResult> {
    const prompt = this.buildReworkPrompt(context)

    try {
      // Execute agent with repository access
      const response = await this.aiAgentService.runAgent({
        messages: [{ role: 'user', content: prompt }],
        workingDirectory: context.workspacePath,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
        timeoutMs: 900000, // 15 minutes
      })

      const reportContent = this.extractReportContent(response.content)

      return {
        file: context.file,
        findingsAddressed: context.findings.length,
        reportContent,
        success: true,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      return {
        file: context.file,
        findingsAddressed: 0,
        reportContent: `Rework failed: ${err.message}`,
        success: false,
      }
    }
  }

  private buildReworkPrompt(context: ReworkContext): string {
    const findingsList = context.findings
      .map(
        (f, idx) => `${idx + 1}. [${f.severity}] ${f.message}${f.suggestion ? `\n   Suggestion: ${f.suggestion}` : ''}`
      )
      .join('\n')

    return `# Rework Task - Iteration ${context.iterationNumber}

## Context
You are fixing issues identified during code review and QA for the workflow: "${context.workflow.title}"

## File to Fix
${context.file}

## Findings to Address (${context.findings.length} issues)
${findingsList}

## Requirements
${context.artifacts.prd ? `### Product Requirements\n${context.artifacts.prd.substring(0, 2000)}...\n` : ''}
${context.artifacts.technicalSpecs ? `### Technical Specifications\n${context.artifacts.technicalSpecs.substring(0, 1500)}...\n` : ''}
${context.artifacts.implementationPlan ? `### Implementation Plan\n${context.artifacts.implementationPlan.substring(0, 1500)}...\n` : ''}

## Your Task
1. Read the file: ${context.file}
2. Fix each finding listed above
3. Ensure fixes align with PRD requirements and technical specs
4. Run relevant tests to verify fixes
5. Document what you changed and why

## Important Guidelines
- Fix issues one at a time, in priority order
- Don't introduce new bugs while fixing existing ones
- Preserve existing functionality
- Follow the project's coding standards
- Run tests after making changes
- If a fix is not possible, document why

## Output Format
Provide a summary of changes in this format:

# Rework Report - ${context.file}

## Iteration ${context.iterationNumber}

### Findings Addressed
- [Finding 1]: Description of fix
- [Finding 2]: Description of fix
- ...

### Changes Made
- File: ${context.file}
  - Line XX: Changed...
  - Line YY: Added...

### Test Results
- [Test name]: PASS/FAIL
- ...

### Notes
Any additional context or blockers

---

Begin fixing the issues now.`
  }

  private extractReportContent(output: string): string {
    // Try to extract markdown report section
    const reportMatch = output.match(/# Rework Report[\s\S]*$/i)
    if (reportMatch) {
      return reportMatch[0]
    }

    // Fallback: use entire output
    return output
  }
}
