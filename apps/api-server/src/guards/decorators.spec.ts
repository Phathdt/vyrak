import { describe, expect, it } from 'vitest'

import { IS_PUBLIC_KEY, Public } from './decorators'

describe('Guard Decorators', () => {
  describe('@Public decorator', () => {
    it('should set IS_PUBLIC_KEY metadata to true on class', () => {
      class PublicController {}

      Public()(PublicController)

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, PublicController)
      expect(metadata).toBe(true)
    })

    it('should work on multiple classes in same suite', () => {
      class Controller1 {}
      class Controller2 {}
      class Controller3 {}

      Public()(Controller1)
      Public()(Controller2)
      Public()(Controller3)

      const meta1 = Reflect.getMetadata(IS_PUBLIC_KEY, Controller1)
      const meta2 = Reflect.getMetadata(IS_PUBLIC_KEY, Controller2)
      const meta3 = Reflect.getMetadata(IS_PUBLIC_KEY, Controller3)

      expect(meta1).toBe(true)
      expect(meta2).toBe(true)
      expect(meta3).toBe(true)
    })

    it('should return a valid decorator function', () => {
      const decorator = Public()
      expect(typeof decorator).toBe('function')
    })

    it('should preserve class functionality', () => {
      class TestController {
        add(a: number, b: number) {
          return a + b
        }
      }

      Public()(TestController)
      const instance = new TestController()
      expect(instance.add(2, 3)).toBe(5)
    })

    it('should preserve method with parameters', () => {
      class TestController {
        greet(name: string, greeting: string = 'Hello') {
          return `${greeting}, ${name}`
        }
      }

      Public()(TestController)
      const instance = new TestController()
      expect(instance.greet('John')).toBe('Hello, John')
      expect(instance.greet('Jane', 'Hi')).toBe('Hi, Jane')
    })

    it('should preserve async methods', async () => {
      class TestController {
        async fetchData() {
          return Promise.resolve('data')
        }
      }

      Public()(TestController)
      const instance = new TestController()
      const result = await instance.fetchData()
      expect(result).toBe('data')
    })

    it('should be reusable on multiple classes', () => {
      class A {}
      class B {}
      class C {}

      Public()(A)
      Public()(B)
      Public()(C)

      expect(Reflect.getMetadata(IS_PUBLIC_KEY, A)).toBe(true)
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, B)).toBe(true)
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, C)).toBe(true)
    })
  })

  describe('IS_PUBLIC_KEY constant', () => {
    it('should be a string', () => {
      expect(typeof IS_PUBLIC_KEY).toBe('string')
    })

    it('should be the value "isPublic"', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic')
    })

    it('should be consistent across multiple uses', () => {
      const key1 = IS_PUBLIC_KEY
      const key2 = IS_PUBLIC_KEY
      expect(key1).toBe(key2)
    })
  })

  describe('Decorator metadata reflection', () => {
    it('should use Reflect API correctly on classes', () => {
      class Controller {}

      Public()(Controller)
      const hasMetadata = Reflect.hasMetadata(IS_PUBLIC_KEY, Controller)
      expect(hasMetadata).toBe(true)
    })

    it('should allow reading metadata after decorator application on classes', () => {
      class Controller1 {}
      class Controller2 {}

      Public()(Controller1)
      Public()(Controller2)

      expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller1)).toBe(true)
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller2)).toBe(true)
    })
  })
})
