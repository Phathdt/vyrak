import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApproveButton } from '../approve-button'

// Mock the entire hooks module
const mockApprove = vi.fn()
const mockIsApproving = false

vi.mock('../../../../hooks', () => ({
  useApproveWorkflow: () => ({
    approve: mockApprove,
    isApproving: mockIsApproving,
  }),
  useRejectWorkflow: vi.fn(),
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

describe('ApproveButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApprove.mockReset()
  })

  it('renders button when form is closed', () => {
    render(<ApproveButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText('Approve Plan')).toBeInTheDocument()
  })

  it('opens form when button clicked', async () => {
    const user = userEvent.setup()

    render(<ApproveButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Approve Plan'))
    expect(screen.getByText('Approve Workflow Plan')).toBeInTheDocument()
  })

  it('closes form when cancel button clicked', async () => {
    const user = userEvent.setup()

    render(<ApproveButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Approve Plan'))
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Approve Workflow Plan')).not.toBeInTheDocument()
  })

  it('calls approve mutation on form submit', async () => {
    const user = userEvent.setup()
    mockApprove.mockResolvedValue({ success: true })

    render(<ApproveButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Approve Plan'))
    const textarea = screen.getByPlaceholderText(/approval notes/i)
    await user.type(textarea, 'Looks good')
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /Confirm Approval/i }))

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith({ comment: 'Looks good' })
    })
  })

  it('shows CONFLICT error when already approved', async () => {
    const user = userEvent.setup()
    mockApprove.mockRejectedValue(new Error('CONFLICT'))

    render(<ApproveButton orgId='org-123' runId='run-123' />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByText('Approve Plan'))
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /Confirm Approval/i }))

    await waitFor(() => {
      expect(screen.getByText(/already been approved by another user/i)).toBeInTheDocument()
    })
  })

  it('calls onSuccess callback after successful submission', async () => {
    const user = userEvent.setup()
    mockApprove.mockResolvedValue({ success: true })
    const mockOnSuccess = vi.fn()

    render(<ApproveButton orgId='org-123' runId='run-123' onSuccess={mockOnSuccess} />, { wrapper: createWrapper() })

    await user.click(screen.getByText('Approve Plan'))
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: /Confirm Approval/i }))

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })
})
