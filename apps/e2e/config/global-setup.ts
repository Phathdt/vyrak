import { execSync } from 'child_process'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Global setup for E2E tests
 * Ensures database is migrated and seeded before any tests run
 */
async function globalSetup() {
  console.log('🌱 Running E2E global setup...')

  try {
    const rootDir = path.resolve(__dirname, '../../..')

    // Run database migrations
    console.log('📦 Running database migrations...')
    execSync('yarn db:migrate', {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE__URL: process.env.DATABASE__URL },
    })

    // Seed the database with E2E test data
    console.log('🌱 Seeding E2E test data...')
    execSync('yarn db:seed:e2e', {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE__URL: process.env.DATABASE__URL },
    })

    console.log('✅ E2E global setup completed')
  } catch (error) {
    console.error('❌ E2E global setup failed:', error)
    throw error
  }
}

export default globalSetup
