import { describe, it, expect } from 'vitest'

import { TestResultParserService } from '../test-result-parser.service'

describe('TestResultParserService', () => {
  const parser = new TestResultParserService()

  describe('parseJSON', () => {
    it('should parse Jest/Vitest JSON format correctly', () => {
      const json = JSON.stringify({
        testResults: [{ test: 'data' }],
        numPassedTests: 8,
        numFailedTests: 2,
        numPendingTests: 1,
        numTotalTests: 11,
      })

      const result = parser.parseJSON(json)

      expect(result).toEqual({
        passed: 8,
        failed: 2,
        skipped: 1,
        total: 11,
      })
    })

    it('should parse generic format with passed/failed/skipped fields', () => {
      const json = JSON.stringify({
        passed: 15,
        failed: 3,
        skipped: 2,
      })

      const result = parser.parseJSON(json)

      expect(result).toEqual({
        passed: 15,
        failed: 3,
        skipped: 2,
        total: 20,
      })
    })

    it('should handle missing fields gracefully', () => {
      const json = JSON.stringify({
        numPassedTests: 5,
      })

      const result = parser.parseJSON(json)

      expect(result).toEqual({
        passed: 5,
        failed: 0,
        skipped: 0,
        total: 5,
      })
    })

    it('should return zero counts for unparseable JSON structure', () => {
      const json = JSON.stringify({
        unrelated: 'data',
      })

      const result = parser.parseJSON(json)

      expect(result).toEqual({
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      })
    })

    it('should throw error for invalid JSON', () => {
      const invalidJson = 'not valid json {'

      expect(() => parser.parseJSON(invalidJson)).toThrow('Failed to parse JSON test results')
    })
  })

  describe('parseJUnit', () => {
    it('should parse JUnit XML testsuites format correctly', () => {
      const xml = `
        <testsuites tests="20" failures="3" skipped="2">
          <testsuite name="Suite 1">
            <testcase name="test 1" />
          </testsuite>
        </testsuites>
      `

      const result = parser.parseJUnit(xml)

      expect(result).toEqual({
        passed: 15,
        failed: 3,
        skipped: 2,
        total: 20,
      })
    })

    it('should parse JUnit XML testsuite format correctly', () => {
      const xml = `
        <testsuite tests="10" failures="1" skipped="0">
          <testcase name="test 1" />
        </testsuite>
      `

      const result = parser.parseJUnit(xml)

      expect(result).toEqual({
        passed: 9,
        failed: 1,
        skipped: 0,
        total: 10,
      })
    })

    it('should handle missing skipped attribute', () => {
      const xml = `
        <testsuites tests="15" failures="2">
          <testsuite name="Suite 1" />
        </testsuites>
      `

      const result = parser.parseJUnit(xml)

      expect(result).toEqual({
        passed: 13,
        failed: 2,
        skipped: 0,
        total: 15,
      })
    })

    it('should return zero counts for unparseable XML', () => {
      const xml = '<invalid>no test data</invalid>'

      const result = parser.parseJUnit(xml)

      expect(result).toEqual({
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      })
    })
  })

  describe('parseTAP', () => {
    it('should parse TAP format correctly with plan', () => {
      const tap = `
1..5
ok 1 - test one
ok 2 - test two
not ok 3 - test three
ok 4 - test four
ok 5 - test five
      `.trim()

      const result = parser.parseTAP(tap)

      expect(result).toEqual({
        passed: 4,
        failed: 1,
        skipped: 0,
        total: 5,
      })
    })

    it('should handle skipped tests with SKIP directive', () => {
      const tap = `
1..4
ok 1 - test one
not ok 2 - test two # SKIP not implemented
not ok 3 - test three # SKIP not ready
ok 4 - test four
      `.trim()

      const result = parser.parseTAP(tap)

      expect(result).toEqual({
        passed: 2,
        failed: 0,
        skipped: 2,
        total: 4,
      })
    })

    it('should calculate total from results when plan is missing', () => {
      const tap = `
ok 1 - test one
ok 2 - test two
not ok 3 - test three
      `.trim()

      const result = parser.parseTAP(tap)

      expect(result).toEqual({
        passed: 2,
        failed: 1,
        skipped: 0,
        total: 3,
      })
    })

    it('should handle empty TAP output', () => {
      const tap = ''

      const result = parser.parseTAP(tap)

      expect(result).toEqual({
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      })
    })

    it('should handle TAP with only plan line', () => {
      const tap = '1..10'

      const result = parser.parseTAP(tap)

      expect(result).toEqual({
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 10,
      })
    })
  })
})
