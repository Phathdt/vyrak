import { createAppAuth } from '@octokit/auth-app'
import { readFileSync } from 'node:fs'

import { GitHubAppConfigError, GitHubTokenGenerationError } from '../../domain/exceptions/github-auth.exceptions'

import type { IGitHubAppTokenGenerator } from '../../domain/interfaces/github-auth.interface'
import type { IConfigService } from '@vyrak/custom-config'

/**
 * GitHub App installation access token generator using @octokit/auth-app.
 *
 * Plain TypeScript class (no @Injectable()) registered via DI in WorkflowCoreModule.
 */
export class OctokitTokenGenerator implements IGitHubAppTokenGenerator {
  private readonly auth: ReturnType<typeof createAppAuth>

  constructor(configService: IConfigService) {
    const githubApp = configService.git?.githubApp

    if (!githubApp?.appId || !githubApp?.installationId) {
      throw new GitHubAppConfigError('GitHub App configuration is incomplete: appId and installationId are required')
    }

    // Load private key: file path takes precedence over inline value
    let privateKey: string
    if (githubApp.privateKeyPath) {
      try {
        privateKey = readFileSync(githubApp.privateKeyPath, 'utf-8')
      } catch (error) {
        throw new GitHubAppConfigError(
          `Failed to read private key from ${githubApp.privateKeyPath}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    } else if (githubApp.privateKey) {
      privateKey = githubApp.privateKey
    } else {
      throw new GitHubAppConfigError('GitHub App configuration is incomplete: privateKey or privateKeyPath is required')
    }

    this.auth = createAppAuth({
      appId: githubApp.appId,
      privateKey,
    })
  }

  async generate(installationId: number): Promise<string> {
    try {
      const result = await this.auth({
        type: 'installation',
        installationId,
      })

      return result.token
    } catch (error) {
      throw new GitHubTokenGenerationError(installationId, error instanceof Error ? error.message : String(error))
    }
  }
}
