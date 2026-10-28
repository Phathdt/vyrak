import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { server } from './msw-server'

// Ensure jsdom globals are available
if (typeof global.document === 'undefined') {
  throw new Error('jsdom environment not initialized')
}

// Mock ResizeObserver for ReactFlow
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as any

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Stop MSW server after all tests
afterAll(() => server.close())
