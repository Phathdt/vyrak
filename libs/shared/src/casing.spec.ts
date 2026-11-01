import { describe, expect, it } from 'vitest'

import { camelToSnakeCase, convertToCamelCase, convertToSnakeCase, snakeToCamelCase } from './casing'

describe('casing utilities', () => {
  describe('snakeToCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(snakeToCamelCase('user_name')).toBe('userName')
      expect(snakeToCamelCase('first_name')).toBe('firstName')
    })

    it('should convert kebab-case to camelCase', () => {
      expect(snakeToCamelCase('user-name')).toBe('userName')
      expect(snakeToCamelCase('first-name')).toBe('firstName')
    })

    it('should handle multiple underscores', () => {
      expect(snakeToCamelCase('user_full_name')).toBe('userFullName')
      expect(snakeToCamelCase('api_key_id')).toBe('apiKeyId')
    })

    it('should return unchanged if no underscores or dashes', () => {
      expect(snakeToCamelCase('username')).toBe('username')
      expect(snakeToCamelCase('UsErNaMe')).toBe('UsErNaMe')
    })

    it('should handle empty string', () => {
      expect(snakeToCamelCase('')).toBe('')
    })
  })

  describe('camelToSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(camelToSnakeCase('userName')).toBe('user_name')
      expect(camelToSnakeCase('firstName')).toBe('first_name')
    })

    it('should handle multiple capital letters', () => {
      expect(camelToSnakeCase('userFullName')).toBe('user_full_name')
      expect(camelToSnakeCase('apiKeyID')).toBe('api_key_i_d')
    })

    it('should handle PascalCase', () => {
      expect(camelToSnakeCase('UserName')).toBe('_user_name')
      expect(camelToSnakeCase('FirstName')).toBe('_first_name')
    })

    it('should return unchanged if no capital letters', () => {
      expect(camelToSnakeCase('username')).toBe('username')
    })

    it('should handle empty string', () => {
      expect(camelToSnakeCase('')).toBe('')
    })
  })

  describe('convertToCamelCase', () => {
    it('should convert object keys from snake_case to camelCase', () => {
      const input = { user_name: 'john', first_name: 'John' }
      expect(convertToCamelCase(input)).toEqual({ userName: 'john', firstName: 'John' })
    })

    it('should handle nested objects', () => {
      const input = {
        user_data: {
          first_name: 'John',
          last_name: 'Doe',
        },
      }
      expect(convertToCamelCase(input)).toEqual({
        userData: {
          firstName: 'John',
          lastName: 'Doe',
        },
      })
    })

    it('should handle arrays', () => {
      const input = [{ user_name: 'john' }, { user_name: 'jane' }]
      expect(convertToCamelCase(input)).toEqual([{ userName: 'john' }, { userName: 'jane' }])
    })

    it('should handle arrays within objects', () => {
      const input = {
        user_list: [{ user_name: 'john' }, { user_name: 'jane' }],
      }
      expect(convertToCamelCase(input)).toEqual({
        userList: [{ userName: 'john' }, { userName: 'jane' }],
      })
    })

    it('should handle primitive values', () => {
      expect(convertToCamelCase('test')).toBe('test')
      expect(convertToCamelCase(123)).toBe(123)
      expect(convertToCamelCase(true)).toBe(true)
      expect(convertToCamelCase(null)).toBe(null)
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01')
      expect(convertToCamelCase(date)).toBe(date)
    })

    it('should handle empty objects and arrays', () => {
      expect(convertToCamelCase({})).toEqual({})
      expect(convertToCamelCase([])).toEqual([])
    })
  })

  describe('convertToSnakeCase', () => {
    it('should convert object keys from camelCase to snake_case', () => {
      const input = { userName: 'john', firstName: 'John' }
      expect(convertToSnakeCase(input)).toEqual({ user_name: 'john', first_name: 'John' })
    })

    it('should handle nested objects', () => {
      const input = {
        userData: {
          firstName: 'John',
          lastName: 'Doe',
        },
      }
      expect(convertToSnakeCase(input)).toEqual({
        user_data: {
          first_name: 'John',
          last_name: 'Doe',
        },
      })
    })

    it('should handle arrays', () => {
      const input = [{ userName: 'john' }, { userName: 'jane' }]
      expect(convertToSnakeCase(input)).toEqual([{ user_name: 'john' }, { user_name: 'jane' }])
    })

    it('should handle arrays within objects', () => {
      const input = {
        userList: [{ userName: 'john' }, { userName: 'jane' }],
      }
      expect(convertToSnakeCase(input)).toEqual({
        user_list: [{ user_name: 'john' }, { user_name: 'jane' }],
      })
    })

    it('should handle primitive values', () => {
      expect(convertToSnakeCase('test')).toBe('test')
      expect(convertToSnakeCase(123)).toBe(123)
      expect(convertToSnakeCase(true)).toBe(true)
      expect(convertToSnakeCase(null)).toBe(null)
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01')
      expect(convertToSnakeCase(date)).toBe(date)
    })

    it('should handle empty objects and arrays', () => {
      expect(convertToSnakeCase({})).toEqual({})
      expect(convertToSnakeCase([])).toEqual([])
    })
  })

  describe('round-trip conversion', () => {
    it('should preserve data through snake->camel->snake conversion', () => {
      const original = {
        user_name: 'john',
        user_data: {
          first_name: 'John',
          last_name: 'Doe',
        },
      }
      const camel = convertToCamelCase(original)
      const snake = convertToSnakeCase(camel)
      expect(snake).toEqual(original)
    })

    it('should preserve data through camel->snake->camel conversion', () => {
      const original = {
        userName: 'john',
        userData: {
          firstName: 'John',
          lastName: 'Doe',
        },
      }
      const snake = convertToSnakeCase(original)
      const camel = convertToCamelCase(snake)
      expect(camel).toEqual(original)
    })
  })
})
