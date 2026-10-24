import { describe, expect, it } from 'vitest'

import { camelToSnakeCase, convertToCamelCase, snakeToCamelCase } from './utils'

describe('camelToSnakeCase', () => {
  it('should convert camelCase to snake_case', () => {
    expect(camelToSnakeCase('camelCase')).toBe('camel_case')
    expect(camelToSnakeCase('myVariable')).toBe('my_variable')
    expect(camelToSnakeCase('HTTPResponse')).toBe('_h_t_t_p_response')
  })

  it('should handle single words', () => {
    expect(camelToSnakeCase('hello')).toBe('hello')
    expect(camelToSnakeCase('world')).toBe('world')
  })

  it('should handle empty string', () => {
    expect(camelToSnakeCase('')).toBe('')
  })

  it('should handle already snake_case', () => {
    expect(camelToSnakeCase('snake_case')).toBe('snake_case')
  })

  it('should handle consecutive capitals', () => {
    expect(camelToSnakeCase('XMLParser')).toBe('_x_m_l_parser')
  })
})

describe('snakeToCamelCase', () => {
  it('should convert snake_case to camelCase', () => {
    expect(snakeToCamelCase('snake_case')).toBe('snakeCase')
    expect(snakeToCamelCase('my_variable')).toBe('myVariable')
    expect(snakeToCamelCase('DATABASE_URL')).toBe('databaseUrl')
  })

  it('should handle single words', () => {
    expect(snakeToCamelCase('hello')).toBe('hello')
    expect(snakeToCamelCase('world')).toBe('world')
  })

  it('should handle empty string', () => {
    expect(snakeToCamelCase('')).toBe('')
  })

  it('should handle already camelCase', () => {
    expect(snakeToCamelCase('camelCase')).toBe('camelcase')
  })

  it('should handle multiple underscores', () => {
    expect(snakeToCamelCase('my_long_variable_name')).toBe('myLongVariableName')
  })

  it('should handle leading underscores', () => {
    expect(snakeToCamelCase('_private_var')).toBe('PrivateVar')
  })
})

describe('convertToCamelCase', () => {
  it('should convert flat object keys to camelCase', () => {
    const obj = { snake_case: 'value', another_key: 'test' }
    const result = convertToCamelCase(obj)
    expect(result).toEqual({ snakeCase: 'value', anotherKey: 'test' })
  })

  it('should handle nested objects', () => {
    const obj = {
      database_config: {
        db_host: 'localhost',
        db_port: 5432,
      },
      log_level: 'info',
    }
    const result = convertToCamelCase(obj)
    expect(result).toEqual({
      databaseConfig: {
        dbHost: 'localhost',
        dbPort: 5432,
      },
      logLevel: 'info',
    })
  })

  it('should handle arrays of objects', () => {
    const obj = {
      user_list: [
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Smith' },
      ],
    }
    const result = convertToCamelCase(obj)
    expect(result).toEqual({
      userList: [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ],
    })
  })

  it('should handle arrays of primitives', () => {
    const obj = { simple_array: [1, 2, 3], string_array: ['a', 'b', 'c'] }
    const result = convertToCamelCase(obj)
    expect(result).toEqual({
      simpleArray: [1, 2, 3],
      stringArray: ['a', 'b', 'c'],
    })
  })

  it('should handle null values', () => {
    const obj = { null_value: null, normal_key: 'value' }
    const result = convertToCamelCase(obj)
    expect(result).toEqual({ nullValue: null, normalKey: 'value' })
  })

  it('should handle deeply nested objects', () => {
    const obj = {
      level_one: {
        level_two: {
          level_three: { deep_value: 'test' },
        },
      },
    }
    const result = convertToCamelCase(obj)
    expect(result).toEqual({
      levelOne: {
        levelTwo: {
          levelThree: { deepValue: 'test' },
        },
      },
    })
  })

  it('should return non-object values unchanged', () => {
    expect(convertToCamelCase(null as any)).toBe(null)
    expect(convertToCamelCase(undefined as any)).toBe(undefined)
  })

  it('should preserve empty objects', () => {
    const result = convertToCamelCase({})
    expect(result).toEqual({})
  })

  it('should handle mixed nested structures', () => {
    const obj = {
      user_data: {
        name: 'John',
        settings_list: [
          { setting_key: 'theme', setting_value: 'dark' },
          { setting_key: 'lang', setting_value: 'en' },
        ],
        nested_config: {
          enable_notifications: true,
        },
      },
    }
    const result = convertToCamelCase(obj)
    expect(result).toEqual({
      userData: {
        name: 'John',
        settingsList: [
          { settingKey: 'theme', settingValue: 'dark' },
          { settingKey: 'lang', settingValue: 'en' },
        ],
        nestedConfig: {
          enableNotifications: true,
        },
      },
    })
  })
})
