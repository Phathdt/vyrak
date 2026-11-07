import { z } from 'zod'

import { GitHubAppConfigSchema } from './github.config'

import type { GitHubAppConfig } from './github.config'

/**
 * Git credentials and commit identity used by workers that clone, commit and push.
 *
 * GitHub App authentication is required for all git operations.
 *
 * Environment overrides:
 * - GIT__GITHUB_APP__APP_ID → githubApp.appId
 * - GIT__GITHUB_APP__INSTALLATION_ID → githubApp.installationId
 * - GIT__GITHUB_APP__PRIVATE_KEY → githubApp.privateKey
 * - GIT__GITHUB_APP__PRIVATE_KEY_PATH → githubApp.privateKeyPath
 * - GIT__USER_NAME → userName
 * - GIT__USER_EMAIL → userEmail
 */
export const GitConfigSchema = z.object({
  githubApp: GitHubAppConfigSchema,
  userName: z.string().min(1),
  userEmail: z.string().min(1),
})

export type GitConfig = z.infer<typeof GitConfigSchema>

// Re-export for convenience
export type { GitHubAppConfig }
