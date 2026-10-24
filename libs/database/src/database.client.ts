import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client'

const databaseUrl = process.env.DATABASE__URL

if (!databaseUrl) {
  throw new Error('DATABASE__URL is not set')
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})

export const prisma = new PrismaClient({ adapter })
