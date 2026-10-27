import { z } from 'zod'

export const gitRepositorySchema = z.object({
  name: z
    .string()
    .min(1, 'Repository name is required')
    .max(100, 'Repository name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only alphanumeric, hyphens, and underscores allowed'),

  url: z
    .string()
    .url('Invalid URL format')
    .refine((url) => url.startsWith('https://') && url.endsWith('.git'), 'Git URL must use HTTPS and end with .git')
    .refine((url) => {
      // Prevent localhost/internal network SSRF attacks
      try {
        const hostname = new URL(url).hostname
        return (
          !['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) &&
          !hostname.startsWith('192.168.') &&
          !hostname.startsWith('10.') &&
          !hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
        )
      } catch {
        return false
      }
    }, 'Cannot use local or private network URLs'),

  branch: z
    .string()
    .min(1, 'Branch name is required')
    .max(100, 'Branch name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9/_-]+$/, 'Invalid branch name format'),

  provider: z.enum(['github', 'gitlab', 'bitbucket']),

  accessToken: z
    .string()
    .optional()
    .refine((token) => {
      if (!token) return true // Optional
      return token.length >= 20 && token.length <= 256
    }, 'Access token must be between 20 and 256 characters'),
})

export type GitRepositoryFormData = z.infer<typeof gitRepositorySchema>

// Update schema (partial, URL/provider immutable)
export const updateGitRepositorySchema = gitRepositorySchema.partial().omit({
  url: true,
  provider: true,
})

export type UpdateGitRepositoryFormData = z.infer<typeof updateGitRepositorySchema>

// Test connection schema
export const testConnectionSchema = z.object({
  url: gitRepositorySchema.shape.url,
  branch: gitRepositorySchema.shape.branch,
  accessToken: z.string().optional(),
})

export type TestConnectionFormData = z.infer<typeof testConnectionSchema>
