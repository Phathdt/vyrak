import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { IAIAgentService } from '@vyrak/ai-agent'

export interface CodeReviewContext {
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
    implementationReports: string[]
  }
  workspacePath: string
}

export interface CodeReviewAgentResult {
  reviewedFiles: string[]
  reportContent: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

const CODE_REVIEW_PROMPT = `You are conducting a comprehensive code review for a recently implemented workflow.

## Context

**Workflow:** {workflowTitle}
{workflowDescription}

**Phase:** Code Review

## Implementation Reports Available

{implementationReportsSummary}

## Review Dimensions

Analyze the code changes across these dimensions:

### 1. Code Quality
- Code clarity and readability
- Proper error handling
- Code organization and structure
- Naming conventions
- Code duplication
- Comments and documentation

### 2. Security
- Input validation
- Authentication and authorization
- SQL injection prevention
- XSS prevention
- Sensitive data exposure
- Dependency vulnerabilities

### 3. Performance
- Database query optimization
- Algorithmic efficiency
- Memory leaks
- Resource management
- Caching opportunities
- N+1 queries

### 4. Requirements Compliance
- PRD acceptance criteria coverage
- Technical specifications adherence
- Edge cases handling
- Error scenarios coverage

## Review Process

1. Read the Implementation Plan and PRD to understand requirements
2. Identify changed files from Implementation Reports
3. Review each changed file thoroughly using Read tool
4. Run tests if available (yarn test or npm test)
5. Check type safety (yarn typecheck or tsc)
6. Document findings with severity levels

## Output Format

Generate a comprehensive Code Review Report with:

### Summary
- Total files reviewed: X
- Total findings: Y
- Critical issues: Z

### Findings by Severity

#### CRITICAL Issues
- **file.ts**: Description of critical issue
- **file2.ts**: Another critical issue

#### HIGH Issues
- **file.ts**: Description of high priority issue

#### MEDIUM Issues
- **file.ts**: Description of medium priority issue

#### LOW Issues
- **file.ts**: Description of low priority issue

#### INFO (Suggestions)
- **file.ts**: Suggestion for improvement

### Recommendations
1. Primary recommendation
2. Secondary recommendation

### Approval Status
- [ ] Approved (no critical/high issues)
- [ ] Approved with minor issues (only low/info)
- [ ] Changes requested (critical/high issues found)

Working directory: {workspacePath}
`

/**
 * Code Review Agent Runner
 * Executes automated code review using Claude Agent SDK
 */
export class CodeReviewAgentRunner {
  constructor(private readonly aiAgentService: IAIAgentService) {}

  /**
   * Execute code review on implemented changes
   */
  async executeReview(context: CodeReviewContext): Promise<CodeReviewAgentResult> {
    try {
      // Prepare prompt with context
      const prompt = this.buildPrompt(context)

      // Write artifacts to workspace for easy reference
      await this.writeArtifactsToWorkspace(context)

      // Execute agent with read-only tools (Read, Bash for tests, Grep, Glob)
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
        maxTokens: 16384, // Larger token limit for comprehensive review
      })

      // Extract reviewed files from response (parse from report content)
      const reviewedFiles = this.extractReviewedFiles(response.content)

      return {
        reviewedFiles,
        reportContent: response.content,
        usage: {
          inputTokens: response.usage?.inputTokens || 0,
          outputTokens: response.usage?.outputTokens || 0,
        },
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw new Error(`Code review execution failed: ${err.message}`)
    }
  }

  private buildPrompt(context: CodeReviewContext): string {
    let prompt = CODE_REVIEW_PROMPT.replace('{workflowTitle}', context.workflow.title)
      .replace('{workflowDescription}', context.workflow.description || 'No description provided')
      .replace('{workspacePath}', context.workspacePath)

    // Summarize implementation reports
    const reportCount = context.artifacts.implementationReports.length
    let reportsSummary = ''

    if (reportCount > 0) {
      reportsSummary = `${reportCount} implementation report(s) available in .vyrak-artifacts/implementation-reports/\n`
      reportsSummary += `Review these reports to understand what was implemented and which files were changed.\n`
    } else {
      reportsSummary = 'No implementation reports found. Use git diff to identify changes.'
    }

    prompt = prompt.replace('{implementationReportsSummary}', reportsSummary)

    return prompt
  }

  private buildSystemPrompt(context: CodeReviewContext): string {
    return [
      'You are Claude, an AI assistant specialized in code review.',
      'You have access to tools for reading code and running tests.',
      '',
      `Conducting code review for workflow: ${context.workflow.title}`,
      `Working directory: ${context.workspacePath}`,
      '',
      'Your goal is to identify issues across code quality, security, performance, and requirements compliance.',
      'Categorize findings by severity: CRITICAL, HIGH, MEDIUM, LOW, INFO.',
      '',
      'CRITICAL: Security vulnerabilities, data corruption risks, production-breaking bugs',
      'HIGH: Significant quality issues, performance problems, missing requirements',
      'MEDIUM: Code quality issues, minor bugs, maintainability concerns',
      'LOW: Style issues, minor optimizations, non-critical improvements',
      'INFO: Suggestions, best practices, educational notes',
      '',
      'Be thorough but fair. Focus on real issues, not nitpicking.',
    ].join('\n')
  }

  private async writeArtifactsToWorkspace(context: CodeReviewContext): Promise<void> {
    const artifactsDir = path.join(context.workspacePath, '.vyrak-artifacts')

    // Write PRD
    if (context.artifacts.prd) {
      const prdPath = path.join(artifactsDir, 'prd.md')
      await writeFile(prdPath, context.artifacts.prd, 'utf8').catch(() => {})
    }

    // Write technical specs
    if (context.artifacts.technicalSpecs) {
      const specsPath = path.join(artifactsDir, 'technical-specs.md')
      await writeFile(specsPath, context.artifacts.technicalSpecs, 'utf8').catch(() => {})
    }

    // Write implementation plan
    if (context.artifacts.implementationPlan) {
      const planPath = path.join(artifactsDir, 'implementation-plan.md')
      await writeFile(planPath, context.artifacts.implementationPlan, 'utf8').catch(() => {})
    }

    // Write implementation reports
    const reportsDir = path.join(artifactsDir, 'implementation-reports')
    for (let i = 0; i < context.artifacts.implementationReports.length; i++) {
      const reportPath = path.join(reportsDir, `report-${i + 1}.md`)
      await writeFile(reportPath, context.artifacts.implementationReports[i], 'utf8').catch(() => {})
    }
  }

  private extractReviewedFiles(reportContent: string): string[] {
    const files: string[] = []

    // Extract file names from markdown bold patterns like **file.ts**
    const filePattern = /\*\*([a-zA-Z0-9_\-./]+\.[a-z]{2,4})\*\*/g
    let match

    while ((match = filePattern.exec(reportContent)) !== null) {
      const file = match[1]
      if (!files.includes(file)) {
        files.push(file)
      }
    }

    return files
  }
}
