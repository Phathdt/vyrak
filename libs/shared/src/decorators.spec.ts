import { describe, expect, it, beforeEach } from 'vitest'
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { TransformedQuery, TransformedBody } from './decorators'

describe('Decorators', () => {
  describe('TransformedQuery', () => {
    let mockContext: ExecutionContext
    let mockRequest: { query: Record<string, any> }

    beforeEach(() => {
      mockRequest = { query: {} }
      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext
    })

    it('should convert snake_case query parameters to camelCase', () => {
      mockRequest.query = { user_name: 'john', first_name: 'John' }

      // TransformedQuery is a decorator function that returns a param decorator
      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should handle empty query', () => {
      mockRequest.query = {}

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({})
    })

    it('should preserve primitive values in query', () => {
      mockRequest.query = {
        page: '1',
        limit: '10',
        active: 'true',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        page: '1',
        limit: '10',
        active: 'true',
      })
    })

    it('should handle nested query parameters', () => {
      mockRequest.query = {
        filter_name: 'test',
        sort_by: 'date',
        pagination_page: '1',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        filterName: 'test',
        sortBy: 'date',
        paginationPage: '1',
      })
    })

    it('should handle multiple underscores', () => {
      mockRequest.query = {
        user_first_name: 'John',
        user_last_name: 'Doe',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userFirstName: 'John',
        userLastName: 'Doe',
      })
    })

    it('should handle hyphens in query parameters', () => {
      mockRequest.query = {
        'user-name': 'john',
        'first-name': 'John',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should not modify parameters already in camelCase', () => {
      mockRequest.query = {
        userName: 'john',
        firstName: 'John',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should handle mixed case query parameters', () => {
      mockRequest.query = {
        user_name: 'john',
        firstName: 'John',
        last_name: 'Doe',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
        lastName: 'Doe',
      })
    })

    it('should handle numeric string values', () => {
      mockRequest.query = {
        page_number: '5',
        limit_items: '100',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        pageNumber: '5',
        limitItems: '100',
      })
    })

    it('should handle boolean string values', () => {
      mockRequest.query = {
        include_details: 'true',
        exclude_archived: 'false',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        includeDetails: 'true',
        excludeArchived: 'false',
      })
    })

    it('should handle array-like query parameters', () => {
      mockRequest.query = {
        tag_ids: ['1', '2', '3'],
        category_names: ['tech', 'science'],
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        tagIds: ['1', '2', '3'],
        categoryNames: ['tech', 'science'],
      })
    })

    it('should not include undefined properties', () => {
      mockRequest.query = {
        user_name: 'john',
        first_name: undefined,
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toHaveProperty('userName')
      expect(result).not.toHaveProperty('firstName')
    })

    it('should handle null values in query', () => {
      mockRequest.query = {
        user_name: null,
        first_name: 'John',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: null,
        firstName: 'John',
      })
    })

    it('should handle special characters in values', () => {
      mockRequest.query = {
        search_query: 'hello@world.com',
        file_path: '/home/user/documents',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        searchQuery: 'hello@world.com',
        filePath: '/home/user/documents',
      })
    })

    it('should handle empty string values', () => {
      mockRequest.query = {
        user_name: '',
        first_name: 'John',
      }

      const decorator = TransformedQuery as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: '',
        firstName: 'John',
      })
    })
  })

  describe('TransformedBody', () => {
    let mockContext: ExecutionContext
    let mockRequest: { body: Record<string, any> }

    beforeEach(() => {
      mockRequest = { body: {} }
      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext
    })

    it('should convert snake_case body parameters to camelCase', () => {
      mockRequest.body = { user_name: 'john', first_name: 'John' }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should handle empty body', () => {
      mockRequest.body = {}

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({})
    })

    it('should handle nested body objects', () => {
      mockRequest.body = {
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
        },
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      })
    })

    it('should handle arrays in body', () => {
      mockRequest.body = {
        user_tags: ['tag1', 'tag2'],
        item_list: [
          { item_name: 'first', item_price: 10 },
          { item_name: 'second', item_price: 20 },
        ],
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userTags: ['tag1', 'tag2'],
        itemList: [
          { itemName: 'first', itemPrice: 10 },
          { itemName: 'second', itemPrice: 20 },
        ],
      })
    })

    it('should preserve numeric values', () => {
      mockRequest.body = {
        user_id: 123,
        page_number: 5,
        total_amount: 99.99,
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userId: 123,
        pageNumber: 5,
        totalAmount: 99.99,
      })
    })

    it('should preserve boolean values', () => {
      mockRequest.body = {
        is_active: true,
        is_verified: false,
        include_details: true,
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        isActive: true,
        isVerified: false,
        includeDetails: true,
      })
    })

    it('should handle null and undefined in body', () => {
      mockRequest.body = {
        user_name: null,
        first_name: undefined,
        last_name: 'Doe',
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result.userName).toBe(null)
      expect(result).not.toHaveProperty('firstName')
      expect(result.lastName).toBe('Doe')
    })

    it('should handle deeply nested structures', () => {
      mockRequest.body = {
        user_data: {
          profile_info: {
            personal_details: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        },
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userData: {
          profileInfo: {
            personalDetails: {
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        },
      })
    })

    it('should handle multiple underscores in field names', () => {
      mockRequest.body = {
        user_first_middle_name: 'John Michael',
        user_last_name_suffix: 'Jr.',
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userFirstMiddleName: 'John Michael',
        userLastNameSuffix: 'Jr.',
      })
    })

    it('should handle hyphens in field names', () => {
      mockRequest.body = {
        'user-name': 'john',
        'first-name': 'John',
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should not modify already camelCase fields', () => {
      mockRequest.body = {
        userName: 'john',
        firstName: 'John',
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should handle mixed case fields', () => {
      mockRequest.body = {
        user_name: 'john',
        firstName: 'John',
        last_name: 'Doe',
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
        lastName: 'Doe',
      })
    })

    it('should handle Date objects in body', () => {
      const date = new Date('2024-01-01')
      mockRequest.body = {
        created_at: date,
        updated_at: new Date('2024-01-02'),
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        createdAt: date,
        updatedAt: new Date('2024-01-02'),
      })
    })

    it('should handle empty strings in body', () => {
      mockRequest.body = {
        user_name: '',
        first_name: 'John',
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: '',
        firstName: 'John',
      })
    })

    it('should handle real-world POST request body', () => {
      mockRequest.body = {
        user_id: 1,
        user_name: 'john_doe',
        user_email: 'john@example.com',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          bio_text: 'Software engineer',
        },
        contact_preferences: {
          receive_email_notifications: true,
          receive_sms_notifications: false,
        },
        tag_ids: [1, 2, 3],
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userId: 1,
        userName: 'john_doe',
        userEmail: 'john@example.com',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
          bioText: 'Software engineer',
        },
        contactPreferences: {
          receiveEmailNotifications: true,
          receiveSmsNotifications: false,
        },
        tagIds: [1, 2, 3],
      })
    })

    it('should handle class instances without transformation', () => {
      class CustomClass {
        public_field = 'value'
      }
      const instance = new CustomClass()
      mockRequest.body = {
        user_name: 'john',
        custom_instance: instance,
      }

      const decorator = TransformedBody as any
      const result = decorator(undefined, mockContext)

      expect(result).toEqual({
        userName: 'john',
        customInstance: instance,
      })
      expect(result.customInstance.public_field).toBe('value')
    })
  })

  describe('Decorator behavior', () => {
    it('should be usable with @nestjs/common createParamDecorator pattern', () => {
      // Verify that TransformedQuery and TransformedBody are valid decorators
      expect(typeof TransformedQuery).toBe('function')
      expect(typeof TransformedBody).toBe('function')
    })

    it('should not mutate original request data', () => {
      const original = { user_name: 'john', first_name: 'John' }
      const mockRequest = { query: { ...original } }
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext

      const result = TransformedQuery(undefined, mockContext)

      // Original should be unchanged
      expect(mockRequest.query).toEqual(original)
      // Result should be transformed
      expect(result).toEqual({
        userName: 'john',
        firstName: 'John',
      })
    })

    it('should work independently on query and body', () => {
      const queryRequest = {
        query: { search_term: 'test' },
        body: undefined,
      }
      const bodyRequest = {
        query: undefined,
        body: { user_name: 'john' },
      }

      const queryContext = {
        switchToHttp: () => ({
          getRequest: () => queryRequest,
        }),
      } as ExecutionContext
      const bodyContext = {
        switchToHttp: () => ({
          getRequest: () => bodyRequest,
        }),
      } as ExecutionContext

      const queryResult = TransformedQuery(undefined, queryContext)
      const bodyResult = TransformedBody(undefined, bodyContext)

      expect(queryResult).toEqual({ searchTerm: 'test' })
      expect(bodyResult).toEqual({ userName: 'john' })
    })
  })
})
