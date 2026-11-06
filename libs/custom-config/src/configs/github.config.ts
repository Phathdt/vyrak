import { z } from 'zod'

/**
 * GitHub App credentials for installation access token generation.
 *
 * Environment overrides:
 * - GIT__GITHUB_APP__APP_ID → appId
 * - GIT__GITHUB_APP__INSTALLATION_ID → installationId
 * - GIT__GITHUB_APP__PRIVATE_KEY → privateKey (multi-line string with \n)
 * - GIT__GITHUB_APP__PRIVATE_KEY_PATH → privateKeyPath (file path, takes precedence)
 *
 * All three fields (appId, installationId, privateKey or privateKeyPath) are required together.
 */
export const GitHubAppConfigSchema = z
  .object({
    appId: z.coerce.number().int().positive().optional(),
    installationId: z.coerce.number().int().positive().optional(),
    privateKey: z.string().optional(),
    privateKeyPath: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasAppId = data.appId !== undefined
      const hasInstallation = data.installationId !== undefined
      const hasPrivateKey = data.privateKey !== undefined || data.privateKeyPath !== undefined

      // All or none
      return (hasAppId && hasInstallation && hasPrivateKey) || (!hasAppId && !hasInstallation && !hasPrivateKey)
    },
    {
      message: 'GitHub App requires appId, installationId, and (privateKey or privateKeyPath) together, or none at all',
    }
  )

export type GitHubAppConfig = z.infer<typeof GitHubAppConfigSchema>
