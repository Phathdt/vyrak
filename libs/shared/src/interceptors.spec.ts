import { CallHandler, ExecutionContext } from '@nestjs/common'
import { of } from 'rxjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { SnakeToCamelInterceptor } from './interceptors'

describe('SnakeToCamelInterceptor', () => {
  let interceptor: SnakeToCamelInterceptor
  let mockContext: ExecutionContext
  let mockHandler: CallHandler

  beforeEach(() => {
    interceptor = new SnakeToCamelInterceptor()
    mockContext = {} as ExecutionContext
  })

  describe('intercept', () => {
    it('should transform simple object keys from camelCase to snake_case', async () => {
      const responseData = { userName: 'john', firstName: 'John' }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        user_name: 'john',
        first_name: 'John',
      })
    })

    it('should transform nested objects', async () => {
      const responseData = {
        userName: 'john',
        userAddress: {
          streetName: 'Main St',
          zipCode: '12345',
        },
      }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        user_name: 'john',
        user_address: {
          street_name: 'Main St',
          zip_code: '12345',
        },
      })
    })

    it('should handle arrays of objects', async () => {
      const responseData = [{ userName: 'john' }, { userName: 'jane' }]
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual([{ user_name: 'john' }, { user_name: 'jane' }])
    })

    it('should preserve primitive values', async () => {
      const responseData = { id: 123, active: true, name: 'test' }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        id: 123,
        active: true,
        name: 'test',
      })
    })

    it('should handle null values', async () => {
      const responseData = { userName: null, firstName: 'John' }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        user_name: null,
        first_name: 'John',
      })
    })

    it('should handle undefined values', async () => {
      const responseData = { userName: undefined, firstName: 'John' }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        user_name: undefined,
        first_name: 'John',
      })
    })

    it('should return primitive values as-is', async () => {
      mockHandler = {
        handle: () => of('string'),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toBe('string')
    })

    it('should return null as-is', async () => {
      mockHandler = {
        handle: () => of(null),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toBe(null)
    })

    it('should return number as-is', async () => {
      mockHandler = {
        handle: () => of(42),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toBe(42)
    })

    it('should handle deeply nested structures', async () => {
      const responseData = {
        levelOne: {
          levelTwo: {
            levelThree: {
              deepValue: 'test',
              nestedArray: [{ itemName: 'first' }],
            },
          },
        },
      }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        level_one: {
          level_two: {
            level_three: {
              deep_value: 'test',
              nested_array: [{ item_name: 'first' }],
            },
          },
        },
      })
    })

    it('should not transform class instances', async () => {
      class User {
        userName = 'value'
      }
      const user = new User()
      mockHandler = {
        handle: () => of(user),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toBe(user)
      expect(result.userName).toBe('value')
    })

    it('should handle Date objects', async () => {
      const date = new Date('2024-01-01')
      const responseData = { createdAt: date }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({ created_at: date })
      expect(result.created_at).toBe(date)
    })

    it('should handle empty object', async () => {
      mockHandler = {
        handle: () => of({}),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({})
    })

    it('should handle empty array', async () => {
      mockHandler = {
        handle: () => of([]),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual([])
    })

    it('should handle arrays with mixed types', async () => {
      const responseData = {
        myItems: [{ itemName: 'first' }, 'string', 123, null, true],
      }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        my_items: [{ item_name: 'first' }, 'string', 123, null, true],
      })
    })

    it('should handle multiple consecutive capitals', async () => {
      const responseData = { userID: 'test', privateField: 'value' }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result).toEqual({
        user_i_d: 'test',
        private_field: 'value',
      })
    })

    it('should handle complex real-world API response', async () => {
      const responseData = {
        statusCode: 200,
        responseData: {
          userId: 1,
          userName: 'john_doe',
          userProfile: {
            firstName: 'John',
            lastName: 'Doe',
            createdAt: '2024-01-01',
            verifiedEmail: true,
          },
          contactList: [
            {
              contactType: 'email',
              contactValue: 'john@example.com',
            },
            {
              contactType: 'phone',
              contactValue: '555-1234',
            },
          ],
        },
      }
      mockHandler = {
        handle: () => of(responseData),
      } as CallHandler

      const result = await interceptor.intercept(mockContext, mockHandler).toPromise()

      expect(result.status_code).toBe(200)
      expect(result.response_data.user_id).toBe(1)
      expect(result.response_data.user_profile.first_name).toBe('John')
      expect(result.response_data.contact_list[0].contact_type).toBe('email')
    })
  })

  describe('camelToSnakeCase private method', () => {
    it('should convert camelCase to snake_case', () => {
      const method = (interceptor as any).camelToSnakeCase
      expect(method('userName')).toBe('user_name')
      expect(method('firstName')).toBe('first_name')
    })

    it('should handle multiple capitals', () => {
      const method = (interceptor as any).camelToSnakeCase
      expect(method('userFirstName')).toBe('user_first_name')
    })

    it('should handle leading capitals', () => {
      const method = (interceptor as any).camelToSnakeCase
      expect(method('UserName')).toBe('_user_name')
    })
  })
})
