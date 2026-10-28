import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RejectButton } from '../reject-button'

// Mock the entire hooks module
const mockReject = vi.fn()
const mockIsRejecting = false

vi.mock('../../../../hooks', () => ({
  useRejectWorkflow: () => ({
    reject: mockReject,
    isRejecting: mockIsRejecting,
  }),
  useApproveWorkflow: vi.fn(),
  useApprovalCount: vi.fn(),
  useBrowserNotification: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('RejectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReject.mockReset()
  })

  it('renders button in closed state', () => {
    render(<RejectButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText('Reject Plan')).toBeInTheDocument()
    expect(screen.queryByText('Reject Workflow Plan')).not.toBeInTheDocument()
  })

  it('opens modal when button clicked', async () => {
    const user = userEvent.setup()

    render(<RejectButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Reject Plan'))
    expect(screen.getByText('Reject Workflow Plan')).toBeInTheDocument()
  })

  it('closes modal when cancel button clicked', async () => {
    const user = userEvent.setup()

    render(<RejectButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Reject Plan'))
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Reject Workflow Plan')).not.toBeInTheDocument()
  })

  it('calls reject mutation on form submit', async () => {
    const user = userEvent.setup()
    mockReject.mockResolvedValue({ success: true })

    render(<RejectButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Reject Plan'))
    const textarea = screen.getByPlaceholderText(/explain why/i)
    await user.type(textarea, 'Plan has security issues')
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /Confirm Rejection/i }))

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('Plan has security issues')
    })
  })

  it('shows ALREADY_APPROVED error', async () => {
    const user = userEvent.setup()
    mockReject.mockRejectedValue(new Error('ALREADY_APPROVED'))

    render(<RejectButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Reject Plan'))
    const textarea = screen.getByPlaceholderText(/explain why/i)
    await user.type(textarea, 'Valid reason')
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /Confirm Rejection/i }))

    await waitFor(() => {
      expect(screen.getByText(/already been approved by another user/i)).toBeInTheDocument()
    })
  })

  it('calls onSuccess callback after successful rejection', async () => {
    const user = userEvent.setup()
    mockReject.mockResolvedValue({ success: true })
    const mockOnSuccess = vi.fn()

    render(<RejectButton orgId='org-123' runId='run-123' onSuccess={mockOnSuccess} />, { wrapper: createWrapper() })

    await user.click(screen.getByText('Reject Plan'))
    const textarea = screen.getByPlaceholderText(/explain why/i)
    await user.type(textarea, 'Valid reason for rejection')
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /Confirm Rejection/i }))

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })
})
