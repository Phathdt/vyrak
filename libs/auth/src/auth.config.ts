import { prisma } from '@vyrak/database'

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'

const isDevelopment = process.env.NODE_ENV !== 'production'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:5173'],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
  },

  advanced: {
    useSecureCookies: !isDevelopment,
    crossSubDomainCookies: {
      enabled: true,
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
    expiresIn: 60 * 60 * 24 * 7,
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 48,
      sendInvitationEmail: async () => {
        // TODO: Implement email sending
      },
    }),
  ],
})

export type Auth = typeof auth
