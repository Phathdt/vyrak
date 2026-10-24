import { writeFileSync } from 'fs'
import { join } from 'path'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import * as yaml from 'js-yaml'

import { OpenApiModule } from './openapi.module'

async function generateOpenApiSpec() {
  // Set placeholder DATABASE__URL to bypass client initialization check
  // The actual connection won't be made because we use mock services
  if (!process.env.DATABASE__URL) {
    process.env.DATABASE__URL = 'postgresql://localhost:5432/placeholder'
  }

  const app = await NestFactory.create(OpenApiModule, {
    logger: false,
  })

  const config = new DocumentBuilder()
    .setTitle('Vyrak API')
    .setDescription('Vyrak API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development')
    .build()

  const document = SwaggerModule.createDocument(app, config)

  // Fix nullable types and exclusiveMinimum for OpenAPI 3.0 compatibility
  const fixOpenApiCompatibility = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj === null) return obj

    const record = obj as Record<string, unknown>

    for (const key in record) {
      const value = record[key]

      if (key === 'type' && Array.isArray(value) && value.includes('null')) {
        // Convert type: [string, null] to type: string, nullable: true
        const nonNullTypes = value.filter((t) => t !== 'null')
        record['type'] = nonNullTypes.length === 1 ? nonNullTypes[0] : nonNullTypes
        record['nullable'] = true
      } else if (key === 'exclusiveMinimum' && typeof value === 'number') {
        // Convert OpenAPI 3.1 exclusiveMinimum (number) to OpenAPI 3.0 (boolean + minimum)
        record['minimum'] = value
        record['exclusiveMinimum'] = true
      } else if (key === 'exclusiveMaximum' && typeof value === 'number') {
        // Convert OpenAPI 3.1 exclusiveMaximum (number) to OpenAPI 3.0 (boolean + maximum)
        record['maximum'] = value
        record['exclusiveMaximum'] = true
      } else if (
        record['x-nestjs_zod-empty-type'] === true &&
        record['type'] === 'array' &&
        typeof record['items'] === 'object' &&
        record['items'] !== null &&
        (record['items'] as Record<string, unknown>)['type'] === 'string'
      ) {
        // Fix nestjs-zod bug: nullable string becomes string[]
        // Should be: type: string, nullable: true
        record['type'] = 'string'
        record['nullable'] = true
        delete record['items']
        delete record['x-nestjs_zod-empty-type']
      } else if (typeof value === 'object') {
        fixOpenApiCompatibility(value)
      }
    }

    return obj
  }

  fixOpenApiCompatibility(document)

  // Write YAML file to apps/api-server/openapi.yml
  const outputPath = join(__dirname, '../../../apps/api-server/openapi.yml')
  writeFileSync(outputPath, yaml.dump(document, { noRefs: true }))

  console.log(`OpenAPI spec generated at: ${outputPath}`)

  await app.close()
}

generateOpenApiSpec()
  .then(() => {
    console.log('✅ OpenAPI generation completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error generating OpenAPI spec:')
    console.error(error)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  })
