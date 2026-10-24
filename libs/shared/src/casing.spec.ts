import { describe, expect, it } from 'vitest'

import { camelToSnakeCase, convertToCamelCase, convertToSnakeCase, snakeToCamelCase } from './casing'

describe('Casing Utilities', () => {
  describe('snakeToCamelCase', () => {
    it('should convert single underscore to camelCase', () => {
      expect(snakeToCamelCase('user_name')).toBe('userName')
      expect(snakeToCamelCase('first_name')).toBe('firstName')
    })

    it('should convert multiple underscores', () => {
      expect(snakeToCamelCase('user_first_name')).toBe('userFirstName')
      expect(snakeToCamelCase('a_b_c_d')).toBe('aBCD')
    })

    it('should handle hyphens like underscores', () => {
      expect(snakeToCamelCase('user-name')).toBe('userName')
      expect(snakeToCamelCase('first-name')).toBe('firstName')
    })

    it('should handle mixed hyphens and underscores', () => {
      expect(snakeToCamelCase('user_first-name')).toBe('userFirstName')
      expect(snakeToCamelCase('user-first_name')).toBe('userFirstName')
    })

    it('should ignore leading underscores/hyphens', () => {
      expect(snakeToCamelCase('_private')).toBe('Private')
      expect(snakeToCamelCase('-leading')).toBe('Leading')
    })

    it('should handle edge cases', () => {
      expect(snakeToCamelCase('')).toBe('')
      expect(snakeToCamelCase('a')).toBe('a')
      expect(snakeToCamelCase('A')).toBe('A')
      expect(snakeToCamelCase('ab')).toBe('ab')
    })

    it('should not convert if no separator present', () => {
      expect(snakeToCamelCase('userName')).toBe('userName')
      expect(snakeToCamelCase('FirstName')).toBe('FirstName')
    })

    it('should handle consecutive separators', () => {
      expect(snakeToCamelCase('user__name')).toBe('user_Name')
      expect(snakeToCamelCase('user---name')).toBe('user--Name')
    })
  })

  describe('camelToSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(camelToSnakeCase('userName')).toBe('user_name')
      expect(camelToSnakeCase('firstName')).toBe('first_name')
    })

    it('should handle multiple capital letters', () => {
      expect(camelToSnakeCase('userFirstName')).toBe('user_first_name')
      expect(camelToSnakeCase('XMLParser')).toBe('_x_m_l_parser')
    })

    it('should handle leading capitals', () => {
      expect(camelToSnakeCase('UserName')).toBe('_user_name')
      expect(camelToSnakeCase('FirstName')).toBe('_first_name')
    })

    it('should handle edge cases', () => {
      expect(camelToSnakeCase('')).toBe('')
      expect(camelToSnakeCase('a')).toBe('a')
      expect(camelToSnakeCase('A')).toBe('_a')
      expect(camelToSnakeCase('ab')).toBe('ab')
      expect(camelToSnakeCase('AB')).toBe('_a_b')
    })

    it('should not convert if no capitals', () => {
      expect(camelToSnakeCase('username')).toBe('username')
      expect(camelToSnakeCase('user_name')).toBe('user_name')
    })

    it('should handle numbers', () => {
      expect(camelToSnakeCase('user123Name')).toBe('user123_name')
      expect(camelToSnakeCase('user123')).toBe('user123')
    })
  })

  describe('convertToCamelCase', () => {
    it('should convert object keys from snake_case to camelCase', () => {
      const input = { user_name: 'john', first_name: 'John' }
      expect(convertToCamelCase(input)).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should recursively convert nested objects', () => {
      const input = {
        user_name: 'john',
        user_address: {
          street_name: 'Main St',
          zip_code: '12345',
        },
      }
      expect(convertToCamelCase(input)).toEqual({
        userName: 'john',
        userAddress: {
          streetName: 'Main St',
          zipCode: '12345',
        },
      })
    })

    it('should convert arrays of objects', () => {
      const input = [{ user_name: 'john' }, { user_name: 'jane' }]
      expect(convertToCamelCase(input)).toEqual([{ userName: 'john' }, { userName: 'jane' }])
    })

    it('should handle deeply nested structures', () => {
      const input = {
        level_one: {
          level_two: {
            level_three: {
              deep_value: 'test',
            },
          },
        },
      }
      expect(convertToCamelCase(input)).toEqual({
        levelOne: {
          levelTwo: {
            levelThree: {
              deepValue: 'test',
            },
          },
        },
      })
    })

    it('should handle arrays with mixed types', () => {
      const input = {
        items: [{ item_name: 'first' }, 'string', 123, null, undefined],
      }
      expect(convertToCamelCase(input)).toEqual({
        items: [{ itemName: 'first' }, 'string', 123, null, undefined],
      })
    })

    it('should preserve primitive values', () => {
      expect(convertToCamelCase(null)).toBe(null)
      expect(convertToCamelCase(undefined)).toBe(undefined)
      expect(convertToCamelCase('string')).toBe('string')
      expect(convertToCamelCase(123)).toBe(123)
      expect(convertToCamelCase(true)).toBe(true)
    })

    it('should not convert class instances', () => {
      class CustomClass {
        public_field = 'value'
      }
      const instance = new CustomClass()
      const result = convertToCamelCase(instance)
      expect(result).toBe(instance)
      expect(result.public_field).toBe('value')
    })

    it('should handle empty objects and arrays', () => {
      expect(convertToCamelCase({})).toEqual({})
      expect(convertToCamelCase([])).toEqual([])
    })

    it('should handle special characters in keys', () => {
      const input = { user_name_123: 'value', _private_field: 'secret' }
      expect(convertToCamelCase(input)).toEqual({
        userName_123: 'value',
        PrivateField: 'secret',
      })
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01')
      const input = { created_at: date }
      const result = convertToCamelCase(input)
      expect(result).toEqual({ createdAt: date })
      expect(result.createdAt).toBe(date)
    })
  })

  describe('convertToSnakeCase', () => {
    it('should convert object keys from camelCase to snake_case', () => {
      const input = { userName: 'john', firstName: 'John' }
      expect(convertToSnakeCase(input)).toEqual({
        user_name: 'john',
        first_name: 'John',
      })
    })

    it('should recursively convert nested objects', () => {
      const input = {
        userName: 'john',
        userAddress: {
          streetName: 'Main St',
          zipCode: '12345',
        },
      }
      expect(convertToSnakeCase(input)).toEqual({
        user_name: 'john',
        user_address: {
          street_name: 'Main St',
          zip_code: '12345',
        },
      })
    })

    it('should convert arrays of objects', () => {
      const input = [{ userName: 'john' }, { userName: 'jane' }]
      expect(convertToSnakeCase(input)).toEqual([{ user_name: 'john' }, { user_name: 'jane' }])
    })

    it('should handle deeply nested structures', () => {
      const input = {
        levelOne: {
          levelTwo: {
            levelThree: {
              deepValue: 'test',
            },
          },
        },
      }
      expect(convertToSnakeCase(input)).toEqual({
        level_one: {
          level_two: {
            level_three: {
              deep_value: 'test',
            },
          },
        },
      })
    })

    it('should preserve primitive values', () => {
      expect(convertToSnakeCase(null)).toBe(null)
      expect(convertToSnakeCase(undefined)).toBe(undefined)
      expect(convertToSnakeCase('string')).toBe('string')
      expect(convertToSnakeCase(123)).toBe(123)
      expect(convertToSnakeCase(true)).toBe(true)
    })

    it('should not convert class instances', () => {
      class CustomClass {
        public_field = 'value'
      }
      const instance = new CustomClass()
      const result = convertToSnakeCase(instance)
      expect(result).toBe(instance)
    })

    it('should handle arrays with mixed types', () => {
      const input = {
        myItems: [{ itemName: 'first' }, 'string', 123, null],
      }
      expect(convertToSnakeCase(input)).toEqual({
        my_items: [{ item_name: 'first' }, 'string', 123, null],
      })
    })

    it('should handle empty objects and arrays', () => {
      expect(convertToSnakeCase({})).toEqual({})
      expect(convertToSnakeCase([])).toEqual([])
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01')
      const input = { createdAt: date }
      const result = convertToSnakeCase(input)
      expect(result).toEqual({ created_at: date })
      expect(result.created_at).toBe(date)
    })
  })

  describe('Round-trip conversions', () => {
    it('should convert camelCase → snake_case → camelCase', () => {
      const original = { userName: 'john', firstName: 'John' }
      const toSnake = convertToSnakeCase(original)
      const backToCamel = convertToCamelCase(toSnake)
      expect(backToCamel).toEqual(original)
    })

    it('should convert snake_case → camelCase → snake_case', () => {
      const original = { user_name: 'john', first_name: 'John' }
      const toCamel = convertToCamelCase(original)
      const backToSnake = convertToSnakeCase(toCamel)
      expect(backToSnake).toEqual(original)
    })

    it('should handle complex round-trip with nested data', () => {
      const original = {
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          contact_info: {
            phone_number: '123-456-7890',
            email_address: 'john@example.com',
          },
        },
        created_at: '2024-01-01',
      }
      const toCamel = convertToCamelCase(original)
      const backToSnake = convertToSnakeCase(toCamel)
      expect(backToSnake).toEqual(original)
    })
  })
})
