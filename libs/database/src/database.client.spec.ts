import { describe, expect, it } from 'vitest'

describe('Database Client', () => {
  describe('Module Export', () => {
    it('should export prisma instance', async () => {
      // Dynamically import to allow module resolution
      const module = await import('./database.client')
      expect(module.prisma).toBeDefined()
    })

    it('should have prisma as an object', async () => {
      const module = await import('./database.client')
      expect(typeof module.prisma).toBe('object')
    })

    it('should export named export prisma', async () => {
      const module = await import('./database.client')
      expect('prisma' in module).toBe(true)
    })
  })
})
