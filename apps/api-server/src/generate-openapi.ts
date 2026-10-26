/**
 * Standalone script: boots the NestJS app without listening on a port,
 * generates the OpenAPI document, writes it as YAML to docs/openapi.yaml,
 * then exits cleanly.
 *
 * This script generates the OpenAPI specification (openapi.yml) from NestJS decorators
 * without requiring a real database connection.
 *
 * How it works:
 * 1. Set SKIP_DB_CONNECTION=true to prevent DatabaseService from connecting
 * 2. Set placeholder DATABASE__URL to bypass Prisma client initialization check
 * 3. Create NestJS app (controllers will be instantiated with their dependencies,
 *    but no actual database operations will occur)
 * 4. Extract OpenAPI metadata from controller decorators using SwaggerModule
 * 5. cleanupOpenApiDoc resolves nestjs-zod schemas into proper OpenAPI definitions
 * 6. Write the specification to openapi.yml
 *
 * This approach allows CI/CD to generate API docs without database setup,
 * while keeping all service implementations intact (no mocking needed).
 *
 * Usage: node --import @swc-node/register/esm-register src/generate-openapi.ts
 */
import 'dotenv/config'

import fs from 'node:fs'
import path from 'node:path'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { dump as yamlDump } from 'js-yaml'

import { AppModule } from './app'

// IMPORTANT: Set environment flags BEFORE any imports
// This prevents database connection attempts during module initialization
process.env.SKIP_DB_CONNECTION = 'true'
if (!process.env.DATABASE__URL) {
  process.env.DATABASE__URL = 'postgresql://localhost:5432/placeholder'
}

// Runs under CJS register (@swc-node/register), so __dirname is available.
const currentDir = __dirname

async function generateOpenApiSpec() {
  console.log('[OpenAPI] Starting generation...')
  console.log('[OpenAPI] Current directory:', currentDir)
  console.log('[OpenAPI] SKIP_DB_CONNECTION:', process.env.SKIP_DB_CONNECTION)
  console.log('[OpenAPI] DATABASE__URL:', process.env.DATABASE__URL ? 'SET' : 'NOT SET')

  console.log('[OpenAPI] Creating NestJS app...')
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Enable more logging
  })

  console.log('[OpenAPI] Building Swagger configuration...')
  const config = new DocumentBuilder()
    .setTitle('Vyrak API')
    .setDescription('Vyrak API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development')
    .build()

  console.log('[OpenAPI] Creating document...')
  const document = SwaggerModule.createDocument(app, config)

  // currentDir = apps/api-server/src → go up 3 levels to monorepo root
  const outputPath = path.resolve(currentDir, '..', '..', '..', 'docs', 'openapi.yaml')
  console.log('[OpenAPI] Output path:', outputPath)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, yamlDump(document, { lineWidth: 120 }), 'utf8')

  console.log(`✅ OpenAPI spec generated at: ${outputPath}`)

  await app.close()
}

generateOpenApiSpec().catch((error) => {
  console.error('❌ Error generating OpenAPI spec:')
  console.error(error)
  if (error.stack) {
    console.error('\nStack trace:')
    console.error(error.stack)
  }
  process.exit(1)
})
