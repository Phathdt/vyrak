import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  plugins: [organizationClient()],
})

export const { signIn, signUp, signOut, useSession, useActiveOrganization, organization } = authClient
