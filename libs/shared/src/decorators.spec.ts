import { describe, expect, it } from 'vitest'

describe('Decorators - Case Conversion Logic', () => {
  // Helper function mirroring the actual implementation - with defensive check
  function snakeToCamelCase(str: string): string {
    return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
  }

  function convertToCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((v) => convertToCamelCase(v))
    } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
      return Object.keys(obj).reduce(
        (result, key) => ({
          ...result,
          [snakeToCamelCase(key)]: convertToCamelCase(obj[key]),
        }),
        {}
      )
    }
    return obj
  }

  describe('snakeToCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(snakeToCamelCase('user_name')).toBe('userName')
      expect(snakeToCamelCase('created_at')).toBe('createdAt')
    })

    it('should convert hyphenated keys to camelCase', () => {
      expect(snakeToCamelCase('user-name')).toBe('userName')
    })

    it('should preserve already camelCase keys', () => {
      expect(snakeToCamelCase('normalKey')).toBe('normalKey')
    })
  })

  describe('convertToCamelCase', () => {
    it('should transform flat snake_case objects', () => {
      const input = { user_name: 'john', user_age: 30 }
      const result = convertToCamelCase(input)
      expect(result).toEqual({ userName: 'john', userAge: 30 })
    })

    it('should preserve primitive values', () => {
      const input = { user_count: 42, is_verified: true, name: 'test' }
      const result = convertToCamelCase(input)
      expect(result.userCount).toBe(42)
      expect(result.isVerified).toBe(true)
      expect(result.name).toBe('test')
    })

    it('should handle empty objects', () => {
      expect(convertToCamelCase({})).toEqual({})
    })

    it('should handle nested objects', () => {
      const input = { user_profile: { first_name: 'john', last_name: 'doe' } }
      const result = convertToCamelCase(input)
      expect(result.userProfile.firstName).toBe('john')
      expect(result.userProfile.lastName).toBe('doe')
    })

    it('should handle arrays of objects', () => {
      const input = { user_list: [{ user_id: '1', user_name: 'john' }] }
      const result = convertToCamelCase(input)
      expect(result.userList[0].userId).toBe('1')
      expect(result.userList[0].userName).toBe('john')
    })

    it('should handle arrays of primitives', () => {
      const input = { user_ids: ['1', '2', '3'] }
      const result = convertToCamelCase(input)
      expect(result.userIds).toEqual(['1', '2', '3'])
    })

    it('should handle deeply nested objects', () => {
      const input = { user_data: { profile: { personal_info: { first_name: 'john' } } } }
      const result = convertToCamelCase(input)
      expect(result.userData.profile.personalInfo.firstName).toBe('john')
    })

    it('should handle null values', () => {
      const input = { user_name: null, active: true }
      const result = convertToCamelCase(input)
      expect(result.userName).toBeNull()
      expect(result.active).toBe(true)
    })

    it('should not transform non-object primitives', () => {
      expect(convertToCamelCase('string')).toBe('string')
      expect(convertToCamelCase(42)).toBe(42)
      expect(convertToCamelCase(true)).toBe(true)
      expect(convertToCamelCase(null)).toBeNull()
    })

    it('should handle mixed nested structures', () => {
      const input = {
        user_list: [{ user_id: 1, contact_info: { email_address: 'john@example.com' } }],
      }
      const result = convertToCamelCase(input)
      expect(result.userList[0].userId).toBe(1)
      expect(result.userList[0].contactInfo.emailAddress).toBe('john@example.com')
    })
  })
})
