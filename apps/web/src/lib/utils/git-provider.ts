export type GitProvider = 'github' | 'gitlab' | 'bitbucket'

export interface ProviderInfo {
  name: string
  icon: string // Lucide icon name
  tokenPattern: RegExp
  docsUrl: string
}

const PROVIDER_CONFIG: Record<GitProvider, ProviderInfo> = {
  github: {
    name: 'GitHub',
    icon: 'Github',
    tokenPattern: /^ghp_[A-Za-z0-9]{36}$/,
    docsUrl:
      'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
  },
  gitlab: {
    name: 'GitLab',
    icon: 'Gitlab',
    tokenPattern: /^glpat-[A-Za-z0-9_-]{20,}$/,
    docsUrl: 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html',
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: 'Server', // Placeholder, use custom SVG if available
    tokenPattern: /^[A-Za-z0-9]{32,}$/,
    docsUrl: 'https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/',
  },
}

/**
 * Auto-detect Git provider from repository URL
 * @param url Git repository URL (HTTPS)
 * @returns Detected provider or null
 */
export function detectProvider(url: string): GitProvider | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    if (hostname.includes('github.com')) return 'github'
    if (hostname.includes('gitlab.com') || hostname.includes('gitlab')) return 'gitlab'
    if (hostname.includes('bitbucket.org') || hostname.includes('bitbucket')) return 'bitbucket'

    return null
  } catch {
    return null
  }
}

/**
 * Get provider configuration
 */
export function getProviderInfo(provider: GitProvider): ProviderInfo {
  return PROVIDER_CONFIG[provider]
}

/**
 * Validate token format for specific provider
 */
export function validateTokenFormat(token: string, provider: GitProvider): boolean {
  if (!token) return false
  return PROVIDER_CONFIG[provider].tokenPattern.test(token)
}

/**
 * Format URL for display (truncate if too long)
 */
export function formatRepoUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url

  const start = url.substring(0, maxLength - 10)
  const end = url.substring(url.length - 7)
  return `${start}...${end}`
}

/**
 * Get provider icon component name
 */
export function getProviderIcon(provider: GitProvider): string {
  return PROVIDER_CONFIG[provider].icon
}
