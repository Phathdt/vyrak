import '@testing-library/jest-dom'

import { cleanup } from '@testing-library/react'

import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from './msw-server'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Stop MSW server after all tests
afterAll(() => server.close())
