import type { ITestResultParser, TestResults } from '../../application/services/tool-step-executor.service'

/**
 * Test result parser service
 *
 * Parses test output in various formats (JSON, JUnit XML, TAP)
 * and normalizes to common TestResults structure.
 *
 * NO @Injectable() decorator - plain TypeScript class registered via factory
 */
export class TestResultParserService implements ITestResultParser {
  /**
   * Parse JSON test results (Jest, Vitest --json format)
   */
  parseJSON(json: string): TestResults {
    try {
      const data = JSON.parse(json)

      // Jest/Vitest format
      if (data.testResults !== undefined || data.numTotalTests !== undefined || data.numPassedTests !== undefined) {
        const passed = data.numPassedTests || 0
        const failed = data.numFailedTests || 0
        const skipped = data.numPendingTests || 0
        const total = data.numTotalTests !== undefined ? data.numTotalTests : passed + failed + skipped

        return {
          passed,
          failed,
          skipped,
          total,
        }
      }

      // Generic format with test counts
      if (data.passed !== undefined || data.failed !== undefined) {
        const passed = data.passed || 0
        const failed = data.failed || 0
        const skipped = data.skipped || 0
        return {
          passed,
          failed,
          skipped,
          total: passed + failed + skipped,
        }
      }

      // Could not parse
      return { passed: 0, failed: 0, skipped: 0, total: 0 }
    } catch (error) {
      throw new Error(`Failed to parse JSON test results: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse JUnit XML test results
   */
  parseJUnit(xml: string): TestResults {
    try {
      // Simple regex-based parsing for JUnit format
      // Extract tests, failures, skipped attributes (order-independent)
      const testsMatch = xml.match(/tests="(\d+)"/)
      const failuresMatch = xml.match(/failures="(\d+)"/)
      const skippedMatch = xml.match(/skipped="(\d+)"/)

      if (testsMatch && failuresMatch) {
        const total = parseInt(testsMatch[1], 10)
        const failed = parseInt(failuresMatch[1], 10)
        const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0
        const passed = total - failed - skipped

        return {
          passed: Math.max(0, passed),
          failed,
          skipped,
          total,
        }
      }

      // Could not parse
      return { passed: 0, failed: 0, skipped: 0, total: 0 }
    } catch (error) {
      throw new Error(`Failed to parse JUnit test results: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse TAP (Test Anything Protocol) test results
   */
  parseTAP(tap: string): TestResults {
    try {
      const lines = tap.split('\n')
      let total = 0
      let passed = 0
      let failed = 0
      let skipped = 0

      for (const line of lines) {
        const trimmed = line.trim()

        // Plan line: 1..10
        if (trimmed.match(/^1\.\.(\d+)$/)) {
          const match = trimmed.match(/^1\.\.(\d+)$/)
          if (match) {
            total = parseInt(match[1], 10)
          }
        }
        // Success: ok 1 test description
        else if (trimmed.startsWith('ok ')) {
          passed++
        }
        // Failure: not ok 1 test description
        else if (trimmed.startsWith('not ok ')) {
          // Check if it's a skip directive
          if (trimmed.includes('# SKIP') || trimmed.includes('# skip')) {
            skipped++
          } else {
            failed++
          }
        }
      }

      // If total not declared, calculate from results
      if (total === 0) {
        total = passed + failed + skipped
      }

      return {
        passed,
        failed,
        skipped,
        total,
      }
    } catch (error) {
      throw new Error(`Failed to parse TAP test results: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
