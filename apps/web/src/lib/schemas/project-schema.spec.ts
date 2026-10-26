import { describe, expect, it } from 'vitest'

import { createProjectSchema, generateSlug } from './project-schema'

describe('generateSlug', () => {
  it('converts name to lowercase slug', () => {
    expect(generateSlug('My Project')).toBe('my-project')
  })

  it('removes special characters', () => {
    expect(generateSlug('My @ Project!')).toBe('my-project')
  })

  it('collapses multiple hyphens', () => {
    expect(generateSlug('My   --  Project')).toBe('my-project')
  })

  it('trims leading/trailing hyphens', () => {
    expect(generateSlug('  My Project  ')).toBe('my-project')
  })

  it('handles unicode characters', () => {
    expect(generateSlug('Prøject Tëst')).toBe('prject-tst')
  })

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  it('handles already valid slug', () => {
    expect(generateSlug('my-project')).toBe('my-project')
  })
})

describe('createProjectSchema', () => {
  it('validates correct input', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
      slug: 'test-project',
      description: 'Test description',
    })
    expect(result.success).toBe(true)
  })

  it('validates correct input without description', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
      slug: 'test-project',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid slug with uppercase', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      slug: 'Test-Project',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug with underscores', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      slug: 'test_project',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug with special characters', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      slug: 'test@project',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createProjectSchema.safeParse({
      name: '',
      slug: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty slug', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      slug: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name too long', () => {
    const result = createProjectSchema.safeParse({
      name: 'a'.repeat(256),
      slug: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects slug too long', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      slug: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejects description too long', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      slug: 'test',
      description: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})
