import { describe, expect, it } from 'vitest'
import { toObject, toString } from './object'

describe('Object Utilities', () => {
  describe('toString', () => {
    it('should serialize plain objects to JSON string', () => {
      const obj = { name: 'John', age: 30 }
      const result = toString(obj)
      expect(result).toBe('{"name":"John","age":30}')
    })

    it('should serialize arrays', () => {
      const arr = [1, 2, 3]
      const result = toString(arr)
      expect(result).toBe('[1,2,3]')
    })

    it('should serialize nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          address: {
            city: 'New York',
          },
        },
      }
      const result = toString(obj)
      const parsed = JSON.parse(result)
      expect(parsed.user.address.city).toBe('New York')
    })

    it('should handle null and undefined values', () => {
      expect(toString({ a: null })).toBe('{"a":null}')
      expect(toString({ a: undefined })).toBe('{}')
      expect(toString(null)).toBe('null')
    })

    it('should serialize BigInt values with custom replacer', () => {
      const obj = { count: BigInt(9007199254740991) }
      const result = toString(obj)
      const parsed = JSON.parse(result)
      expect(parsed.count).toEqual({ $bigint: '9007199254740991' })
    })

    it('should handle arrays of BigInts', () => {
      const obj = {
        values: [BigInt(100), BigInt(200), BigInt(300)],
      }
      const result = toString(obj)
      const parsed = JSON.parse(result)
      expect(parsed.values[0]).toEqual({ $bigint: '100' })
      expect(parsed.values[1]).toEqual({ $bigint: '200' })
      expect(parsed.values[2]).toEqual({ $bigint: '300' })
    })

    it('should serialize strings and numbers', () => {
      expect(toString('hello')).toBe('"hello"')
      expect(toString(42)).toBe('42')
      expect(toString(3.14)).toBe('3.14')
    })

    it('should serialize booleans', () => {
      expect(toString(true)).toBe('true')
      expect(toString(false)).toBe('false')
    })

    it('should handle empty objects and arrays', () => {
      expect(toString({})).toBe('{}')
      expect(toString([])).toBe('[]')
    })

    it('should serialize mixed types in arrays', () => {
      const arr = [1, 'string', true, null, { key: 'value' }]
      const result = toString(arr)
      const parsed = JSON.parse(result)
      expect(parsed).toEqual([1, 'string', true, null, { key: 'value' }])
    })

    it('should handle deeply nested structures', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: BigInt(123456),
              },
            },
          },
        },
      }
      const result = toString(obj)
      const parsed = JSON.parse(result)
      expect(parsed.level1.level2.level3.level4.value).toEqual({
        $bigint: '123456',
      })
    })

    it('should serialize multiple BigInts in single object', () => {
      const obj = {
        id: BigInt(1),
        count: BigInt(100),
        timestamp: BigInt(1704067200000),
      }
      const result = toString(obj)
      const parsed = JSON.parse(result)
      expect(parsed.id.$bigint).toBe('1')
      expect(parsed.count.$bigint).toBe('100')
      expect(parsed.timestamp.$bigint).toBe('1704067200000')
    })
  })

  describe('toObject', () => {
    it('should deserialize JSON string to object', () => {
      const json = '{"name":"John","age":30}'
      const result = toObject(json)
      expect(result).toEqual({ name: 'John', age: 30 })
    })

    it('should deserialize arrays', () => {
      const json = '[1,2,3]'
      const result = toObject(json)
      expect(result).toEqual([1, 2, 3])
    })

    it('should deserialize nested objects', () => {
      const json = '{"user":{"name":"John","address":{"city":"New York"}}}'
      const result = toObject(json)
      expect(result.user.address.city).toBe('New York')
    })

    it('should deserialize BigInt values with custom reviver', () => {
      const json = '{"count":{"$bigint":"9007199254740991"}}'
      const result = toObject(json)
      expect(typeof result.count).toBe('bigint')
      expect(result.count).toBe(BigInt(9007199254740991))
    })

    it('should handle arrays of BigInts', () => {
      const json = '{"values":[{"$bigint":"100"},{"$bigint":"200"},{"$bigint":"300"}]}'
      const result = toObject(json)
      expect(result.values[0]).toBe(BigInt(100))
      expect(result.values[1]).toBe(BigInt(200))
      expect(result.values[2]).toBe(BigInt(300))
    })

    it('should deserialize null and undefined values', () => {
      expect(toObject('{"a":null}')).toEqual({ a: null })
      expect(toObject('null')).toBe(null)
    })

    it('should deserialize primitives', () => {
      expect(toObject('"hello"')).toBe('hello')
      expect(toObject('42')).toBe(42)
      expect(toObject('3.14')).toBe(3.14)
      expect(toObject('true')).toBe(true)
      expect(toObject('false')).toBe(false)
    })

    it('should handle empty objects and arrays', () => {
      expect(toObject('{}')).toEqual({})
      expect(toObject('[]')).toEqual([])
    })

    it('should deserialize mixed types in arrays', () => {
      const json = '[1,"string",true,null,{"key":"value"}]'
      const result = toObject(json)
      expect(result).toEqual([1, 'string', true, null, { key: 'value' }])
    })

    it('should handle deeply nested structures with BigInt', () => {
      const json =
        '{"level1":{"level2":{"level3":{"level4":{"value":{"$bigint":"123456"}}}}}}'
      const result = toObject(json)
      expect(typeof result.level1.level2.level3.level4.value).toBe('bigint')
      expect(result.level1.level2.level3.level4.value).toBe(BigInt(123456))
    })

    it('should deserialize multiple BigInts in single object', () => {
      const json =
        '{"id":{"$bigint":"1"},"count":{"$bigint":"100"},"timestamp":{"$bigint":"1704067200000"}}'
      const result = toObject(json)
      expect(result.id).toBe(BigInt(1))
      expect(result.count).toBe(BigInt(100))
      expect(result.timestamp).toBe(BigInt(1704067200000))
    })

    it('should throw on invalid JSON', () => {
      expect(() => toObject('invalid json')).toThrow()
      expect(() => toObject('{ broken')).toThrow()
    })

    it('should handle escaped characters', () => {
      const json = '{"message":"Hello\\"World"}'
      const result = toObject(json)
      expect(result.message).toBe('Hello"World')
    })
  })

  describe('Round-trip serialization', () => {
    it('should serialize and deserialize plain objects', () => {
      const original = { name: 'John', age: 30, active: true }
      const serialized = toString(original)
      const deserialized = toObject(serialized)
      expect(deserialized).toEqual(original)
    })

    it('should serialize and deserialize nested objects', () => {
      const original = {
        user: {
          name: 'John',
          contacts: [
            { type: 'email', value: 'john@example.com' },
            { type: 'phone', value: '123-456-7890' },
          ],
        },
      }
      const serialized = toString(original)
      const deserialized = toObject(serialized)
      expect(deserialized).toEqual(original)
    })

    it('should preserve BigInt through round-trip', () => {
      const original = {
        userId: BigInt(12345),
        timestamp: BigInt(1704067200000),
        nested: {
          count: BigInt(999),
        },
      }
      const serialized = toString(original)
      const deserialized = toObject(serialized)
      expect(deserialized.userId).toBe(BigInt(12345))
      expect(deserialized.timestamp).toBe(BigInt(1704067200000))
      expect(deserialized.nested.count).toBe(BigInt(999))
    })

    it('should handle arrays with BigInt in round-trip', () => {
      const original = {
        ids: [BigInt(1), BigInt(2), BigInt(3)],
        mixed: [BigInt(100), 'string', true, null, { value: BigInt(50) }],
      }
      const serialized = toString(original)
      const deserialized = toObject(serialized)
      expect(deserialized.ids[0]).toBe(BigInt(1))
      expect(deserialized.ids[1]).toBe(BigInt(2))
      expect(deserialized.mixed[0]).toBe(BigInt(100))
      expect(deserialized.mixed[4].value).toBe(BigInt(50))
    })

    it('should handle complex real-world structure', () => {
      const original = {
        transaction: {
          id: BigInt(9007199254740991),
          amount: 99.99,
          currency: 'USD',
          timestamp: BigInt(1704067200000),
          items: [
            {
              name: 'Item 1',
              quantity: 5,
              unitPrice: 19.99,
            },
            {
              name: 'Item 2',
              quantity: 2,
              unitPrice: 29.99,
            },
          ],
          metadata: {
            orderId: BigInt(123),
            userId: BigInt(456),
            processed: true,
          },
        },
      }
      const serialized = toString(original)
      const deserialized = toObject(serialized)
      expect(deserialized.transaction.id).toBe(BigInt(9007199254740991))
      expect(deserialized.transaction.timestamp).toBe(BigInt(1704067200000))
      expect(deserialized.transaction.items[0].name).toBe('Item 1')
      expect(deserialized.transaction.metadata.orderId).toBe(BigInt(123))
    })
  })

  describe('Edge cases', () => {
    it('should handle special numbers', () => {
      const obj = {
        zero: 0,
        negative: -42,
        decimal: 3.14159,
        scientific: 1e10,
      }
      const serialized = toString(obj)
      const deserialized = toObject(serialized)
      expect(deserialized).toEqual(obj)
    })

    it('should handle unicode characters', () => {
      const obj = { emoji: '😀', chinese: '你好', arabic: 'مرحبا' }
      const serialized = toString(obj)
      const deserialized = toObject(serialized)
      expect(deserialized).toEqual(obj)
    })

    it('should handle very large strings', () => {
      const largeString = 'x'.repeat(10000)
      const obj = { data: largeString }
      const serialized = toString(obj)
      const deserialized = toObject(serialized)
      expect(deserialized.data).toBe(largeString)
    })

    it('should handle very large BigInts', () => {
      const hugeBigInt = BigInt(
        '99999999999999999999999999999999999999999999999999'
      )
      const obj = { huge: hugeBigInt }
      const serialized = toString(obj)
      const deserialized = toObject(serialized)
      expect(deserialized.huge).toBe(hugeBigInt)
    })

    it('should handle objects with many keys', () => {
      const obj: Record<string, number> = {}
      for (let i = 0; i < 100; i++) {
        obj[`key${i}`] = i
      }
      const serialized = toString(obj)
      const deserialized = toObject(serialized)
      expect(Object.keys(deserialized)).toHaveLength(100)
      expect(deserialized.key50).toBe(50)
    })
  })
})
