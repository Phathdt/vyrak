import type { CodeReviewFinding, CodeReviewResult } from '../../domain/interfaces/code-review.interface'

/**
 * Pure helpers that turn a markdown code review report into structured findings.
 */

export function parseCodeReviewFindings(reportContent: string): CodeReviewFinding[] {
  const findings: CodeReviewFinding[] = []

  // Parse markdown-style findings from report
  // Expected format: ## Findings or ### {Severity} Issues
  const findingPattern = /###?\s+(CRITICAL|HIGH|MEDIUM|LOW|INFO)[:\s]+(.+?)(?=\n###?|\n##|$)/gis

  let match
  while ((match = findingPattern.exec(reportContent)) !== null) {
    const severity = match[1].toUpperCase() as CodeReviewFinding['severity']
    const content = match[2].trim()

    // Parse individual findings within the section
    const itemPattern = /[-*]\s+(?:\*\*)?(.+?)(?:\*\*)?:\s+(.+?)(?:\n|$)/gi
    let itemMatch

    while ((itemMatch = itemPattern.exec(content)) !== null) {
      const file = itemMatch[1].trim()
      const message = itemMatch[2].trim()

      findings.push({
        file,
        severity,
        category: inferFindingCategory(message),
        message,
      })
    }
  }

  // Fallback: parse simple bullet list if structured format not found
  if (findings.length === 0) {
    const bulletPattern = /[-*]\s+(?:\[(.+?)\])?\s*(.+?):\s+(.+?)(?:\n|$)/gi
    let bulletMatch

    while ((bulletMatch = bulletPattern.exec(reportContent)) !== null) {
      const severity = (bulletMatch[1]?.toUpperCase() || 'MEDIUM') as CodeReviewFinding['severity']
      const file = bulletMatch[2].trim()
      const message = bulletMatch[3].trim()

      findings.push({
        file,
        severity,
        category: inferFindingCategory(message),
        message,
      })
    }
  }

  return findings
}

export function inferFindingCategory(message: string): CodeReviewFinding['category'] {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('security') ||
    lowerMessage.includes('vulnerability') ||
    lowerMessage.includes('injection') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('authorization')
  ) {
    return 'security'
  }

  if (
    lowerMessage.includes('performance') ||
    lowerMessage.includes('slow') ||
    lowerMessage.includes('optimization') ||
    lowerMessage.includes('memory') ||
    lowerMessage.includes('cache')
  ) {
    return 'performance'
  }

  if (
    lowerMessage.includes('requirement') ||
    lowerMessage.includes('acceptance') ||
    lowerMessage.includes('spec') ||
    lowerMessage.includes('prd')
  ) {
    return 'requirements'
  }

  if (
    lowerMessage.includes('best practice') ||
    lowerMessage.includes('convention') ||
    lowerMessage.includes('style') ||
    lowerMessage.includes('pattern')
  ) {
    return 'best-practices'
  }

  return 'quality'
}

export function summarizeCodeReviewFindings(findings: CodeReviewFinding[]): CodeReviewResult['summary'] {
  return {
    totalFindings: findings.length,
    criticalCount: findings.filter((f) => f.severity === 'CRITICAL').length,
    highCount: findings.filter((f) => f.severity === 'HIGH').length,
    mediumCount: findings.filter((f) => f.severity === 'MEDIUM').length,
    lowCount: findings.filter((f) => f.severity === 'LOW').length,
    infoCount: findings.filter((f) => f.severity === 'INFO').length,
  }
}
