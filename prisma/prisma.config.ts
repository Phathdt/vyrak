import 'dotenv/config'

import path from 'node:path'

import { defineConfig } from 'prisma/config'

// Prisma 7 configuration file
// Migrations work automatically with driver adapters in v7
export default defineConfig({
  schema: path.join(import.meta.dirname, 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE__URL!,
  },
})
