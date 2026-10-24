import { describe, expect, it } from 'vitest'

import { TransformedBody, TransformedQuery } from './decorators'

describe('Decorators', () => {
  describe('TransformedQuery', () => {
    it('should be a valid NestJS param decorator factory', () => {
      expect(typeof TransformedQuery).toBe('function')
    })

    it('should be callable as a decorator', () => {
      const decorator = TransformedQuery
      expect(typeof decorator).toBe('function')
      expect(() => decorator()).not.toThrow()
    })

    it('should work with decorator parameters', () => {
      expect(() => (TransformedQuery as any)(undefined, {})).not.toThrow()
    })
  })

  describe('TransformedBody', () => {
    it('should be a valid NestJS param decorator factory', () => {
      expect(typeof TransformedBody).toBe('function')
    })

    it('should be callable as a decorator', () => {
      const decorator = TransformedBody
      expect(typeof decorator).toBe('function')
      expect(() => decorator()).not.toThrow()
    })

    it('should work with decorator parameters', () => {
      expect(() => (TransformedBody as any)(undefined, {})).not.toThrow()
    })
  })

  describe('Decorator integration', () => {
    it('should both be valid NestJS param decorators', () => {
      const decorators = [TransformedQuery, TransformedBody]
      decorators.forEach((decorator) => {
        expect(typeof decorator).toBe('function')
      })
    })

    it('should be independent decorators', () => {
      // Verify they are different instances
      expect(TransformedQuery).not.toBe(TransformedBody)
      // But both are functions
      expect(typeof TransformedQuery).toBe('function')
      expect(typeof TransformedBody).toBe('function')
    })

    it('should be reusable multiple times', () => {
      // Decorators should be callable multiple times without state issues
      const call1 = TransformedQuery()
      const call2 = TransformedQuery()
      const call3 = TransformedBody()
      const call4 = TransformedBody()

      expect(call1).toBeDefined()
      expect(call2).toBeDefined()
      expect(call3).toBeDefined()
      expect(call4).toBeDefined()
    })
  })
})
