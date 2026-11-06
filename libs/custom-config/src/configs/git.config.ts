import { z } from 'zod'

/**
 * Git credentials and commit identity used by workers that clone, commit and push.
 *
 * `token` may be empty: public repositories clone without it, and api-server never needs it.
 *
 * Environment overrides (applied only because the YAML defines every key):
 * - GIT__TOKEN → token
 * - GIT__USER_NAME → userName
 * - GIT__USER_EMAIL → userEmail
 */
export const GitConfigSchema = z.object({
  token: z.string().default(''),
  userName: z.string().min(1),
  userEmail: z.string().min(1),
})

export type GitConfig = z.infer<typeof GitConfigSchema>
