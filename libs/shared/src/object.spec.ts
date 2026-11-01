import { describe, expect, it } from 'vitest'

import { toObject, toString } from './object'

describe('object utilities', () => {
  describe('toString', () => {
    it('should stringify regular objects', () => {
      const obj = { name: 'test', age: 30 }
      expect(toString(obj)).toBe('{"name":"test","age":30}')
    })

    it('should handle bigint values', () => {
      const obj = { id: BigInt(123456789012345678901234567890n) }
      const str = toString(obj)
      expect(str).toContain('$bigint')
      expect(str).toContain('123456789012345678901234567890')
    })

    it('should handle nested objects with bigint', () => {
      const obj = {
        data: {
          amount: BigInt(999999999999999999n),
          name: 'test',
        },
      }
      const str = toString(obj)
      expect(str).toContain('$bigint')
      expect(str).toContain('999999999999999999')
    })

    it('should handle arrays', () => {
      const obj = { items: [1, 2, 3] }
      expect(toString(obj)).toBe('{"items":[1,2,3]}')
    })

    it('should handle null and undefined', () => {
      expect(toString({ a: null })).toBe('{"a":null}')
      expect(toString({ b: undefined })).toBe('{}')
    })
  })

  describe('toObject', () => {
    it('should parse regular JSON', () => {
      const str = '{"name":"test","age":30}'
      expect(toObject(str)).toEqual({ name: 'test', age: 30 })
    })

    it('should restore bigint values', () => {
      const str = '{"id":{"$bigint":"123456789012345678901234567890"}}'
      const obj = toObject(str)
      expect(obj.id).toBe(BigInt(123456789012345678901234567890n))
    })

    it('should handle nested bigint restoration', () => {
      const str = '{"data":{"amount":{"$bigint":"999999999999999999"},"name":"test"}}'
      const obj = toObject(str)
      expect(obj.data.amount).toBe(BigInt(999999999999999999n))
      expect(obj.data.name).toBe('test')
    })

    it('should roundtrip bigint values', () => {
      const original = {
        id: BigInt(123456789n),
        data: { count: BigInt(987654321n) },
      }
      const str = toString(original)
      const restored = toObject(str)
      expect(restored.id).toBe(original.id)
      expect(restored.data.count).toBe(original.data.count)
    })

    it('should handle arrays', () => {
      const str = '{"items":[1,2,3]}'
      expect(toObject(str)).toEqual({ items: [1, 2, 3] })
    })

    it('should handle null', () => {
      const str = '{"a":null}'
      expect(toObject(str)).toEqual({ a: null })
    })
  })
})
