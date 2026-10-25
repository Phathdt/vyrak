import { faker } from '@faker-js/faker'

export interface TestUser {
  email: string
  password: string
  name?: string
}

export class TestDataFactory {
  /**
   * Generate random user data
   */
  static createUser(overrides?: Partial<TestUser>): TestUser {
    return {
      email: faker.internet.email().toLowerCase(),
      password: `Test${faker.string.alphanumeric(8)}!`,
      name: faker.person.fullName(),
      ...overrides,
    }
  }

  /**
   * Generate unique email with prefix
   */
  static uniqueEmail(prefix = 'test'): string {
    return `${prefix}-${faker.string.uuid()}@example.com`
  }

  /**
   * Generate valid password
   */
  static validPassword(): string {
    return `Test${faker.string.alphanumeric(8)}!`
  }
}
