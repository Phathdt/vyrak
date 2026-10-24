import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client'

// Allow placeholder URL for OpenAPI generation (no actual connection will be made)
const databaseUrl = process.env.DATABASE__URL || 'postgresql://localhost:5432/placeholder'

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
})

// Log all queries in development
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    console.log('[Prisma Query]', {
      query: e.query,
      params: e.params,
      duration: e.duration + 'ms',
    })
  })
}
