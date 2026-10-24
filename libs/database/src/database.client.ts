import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client'

// Allow placeholder URL for OpenAPI generation (no actual connection will be made)
const databaseUrl = process.env.DATABASE__URL || 'postgresql://localhost:5432/placeholder'

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})

export const prisma = new PrismaClient({ adapter })
