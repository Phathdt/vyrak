/**
 * Vitest setup file - loads before all tests
 * Ensures environment variables are available for integration tests
 */

import { config } from 'dotenv'
// Load environment variables from root .env files
import { resolve } from 'path'

// Load from apps/api-server/.env (where DATABASE__URL is defined)
const envPath = resolve(__dirname, '../../../../apps/api-server/.env')
config({ path: envPath })

// Fallback: set DATABASE__URL if not already set
if (!process.env.DATABASE__URL) {
  process.env.DATABASE__URL = 'postgresql://postgres:postgres@localhost:5433/vyrak'
}

// Set APP_ENV for config loading
if (!process.env.APP_ENV) {
  process.env.APP_ENV = 'local'
}

console.log('Test setup: Environment variables loaded')
console.log(`DATABASE__URL: ${process.env.DATABASE__URL ? '✓ Set' : '✗ Not set'}`)
console.log(`APP_ENV: ${process.env.APP_ENV}`)
