import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as workflowsApi from '../../api/generated/workflows/workflows'
import { useApproveWorkflow, useRejectWorkflow } from '../use-workflow-approval'

import type { ReactNode } from 'react'

// Mock the API
vi.mock('../../api/generated/workflows/workflows', () => ({
  useWorkflowsControllerApproveWorkflow: vi.fn(),
  useWorkflowsControllerRejectWorkflow: vi.fn(),
  getWorkflowsControllerGetWorkflowRunQueryKey: vi.fn((orgId, runId) => ['workflows', orgId, runId]),
}))

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useApproveWorkflow', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('returns approve function and isApproving flag', () => {
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.approve).toBeDefined()
    expect(result.current.isApproving).toBe(false)
  })

  it('calls approval mutation with correct parameters', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.approve({ comment: 'Test comment' })

    expect(mockMutate).toHaveBeenCalledWith({
      orgId: 'org-1',
      runId: 'run-1',
      data: { comment: 'Test comment' },
    })
  })

  it('performs optimistic update changing status to running', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    // Set initial data
    const initialData = { id: 'run-1', status: 'waiting_approval' }
    queryClient.setQueryData(['workflows', 'org-1', 'run-1'], initialData)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    const approvePromise = result.current.approve({ comment: 'Test' })

    // Optimistic update should have changed status immediately
    await waitFor(() => {
      const data = queryClient.getQueryData(['workflows', 'org-1', 'run-1']) as any
      expect(data.status).toBe('running')
    })

    await approvePromise
  })

  it('throws error with CONFLICT message on 409', async () => {
    const mockMutate = vi.fn().mockRejectedValue({
      response: { status: 409, data: { message: 'Already approved' } },
    })
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await expect(result.current.approve({ comment: 'Test' })).rejects.toThrow('CONFLICT')
  })

  it('throws error with INVALID_STATE message on 400', async () => {
    const mockMutate = vi.fn().mockRejectedValue({
      response: { status: 400, data: { message: 'Invalid state' } },
    })
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await expect(result.current.approve({ comment: 'Test' })).rejects.toThrow('INVALID_STATE')
  })

  it('rolls back optimistic update on error', async () => {
    const mockMutate = vi.fn().mockRejectedValue({
      response: { status: 409, data: { message: 'Already approved' } },
    })
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const initialData = { id: 'run-1', status: 'waiting_approval' }
    queryClient.setQueryData(['workflows', 'org-1', 'run-1'], initialData)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    try {
      await result.current.approve({ comment: 'Test' })
    } catch {
      // Expected to throw
    }

    await waitFor(() => {
      const data = queryClient.getQueryData(['workflows', 'org-1', 'run-1']) as any
      expect(data.status).toBe('waiting_approval')
    })
  })

  it('invalidates query cache on success', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    const mockInvalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.approve({ comment: 'Test' })

    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: ['workflows', 'org-1', 'run-1'],
    })
  })

  it('invalidates query cache on error', async () => {
    const mockMutate = vi.fn().mockRejectedValue({
      response: { status: 409 },
    })
    const mockInvalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    try {
      await result.current.approve({ comment: 'Test' })
    } catch {
      // Expected to throw
    }

    expect(mockInvalidate).toHaveBeenCalled()
  })

  it('returns success object on successful approval', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    const response = await result.current.approve({ comment: 'Test' })
    expect(response).toEqual({ success: true })
  })

  it('handles undefined comment', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerApproveWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useApproveWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.approve({ comment: undefined })

    expect(mockMutate).toHaveBeenCalledWith({
      orgId: 'org-1',
      runId: 'run-1',
      data: { comment: undefined },
    })
  })
})

describe('useRejectWorkflow', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('returns reject function and isRejecting flag', () => {
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.reject).toBeDefined()
    expect(result.current.isRejecting).toBe(false)
  })

  it('calls rejection mutation with correct parameters', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.reject('Test reason')

    expect(mockMutate).toHaveBeenCalledWith({
      orgId: 'org-1',
      runId: 'run-1',
      data: { comment: 'Test reason' },
    })
  })

  it('performs optimistic update changing status to cancelled', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const initialData = { id: 'run-1', status: 'waiting_approval' }
    queryClient.setQueryData(['workflows', 'org-1', 'run-1'], initialData)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    const rejectPromise = result.current.reject('Test reason')

    // Optimistic update should have changed status immediately
    await waitFor(() => {
      const data = queryClient.getQueryData(['workflows', 'org-1', 'run-1']) as any
      expect(data.status).toBe('cancelled')
    })

    await rejectPromise
  })

  it('sets cancellationReason in optimistic update', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const initialData = { id: 'run-1', status: 'waiting_approval' }
    queryClient.setQueryData(['workflows', 'org-1', 'run-1'], initialData)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    const rejectPromise = result.current.reject('Security issue found')

    await waitFor(() => {
      const data = queryClient.getQueryData(['workflows', 'org-1', 'run-1']) as any
      expect(data.cancellationReason).toBe('Security issue found')
    })

    await rejectPromise
  })

  it('throws error with ALREADY_APPROVED message on 409', async () => {
    const mockMutate = vi.fn().mockRejectedValue({
      response: { status: 409 },
    })
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await expect(result.current.reject('Test reason')).rejects.toThrow('ALREADY_APPROVED')
  })

  it('throws error with INVALID_STATE message on 400', async () => {
    const mockMutate = vi.fn().mockRejectedValue({
      response: { status: 400 },
    })
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await expect(result.current.reject('Test reason')).rejects.toThrow('INVALID_STATE')
  })

  it('rolls back optimistic update on error', async () => {
    const mockMutate = vi.fn().mockRejectedValue({
      response: { status: 409 },
    })
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const initialData = { id: 'run-1', status: 'waiting_approval' }
    queryClient.setQueryData(['workflows', 'org-1', 'run-1'], initialData)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    try {
      await result.current.reject('Test reason')
    } catch {
      // Expected to throw
    }

    await waitFor(() => {
      const data = queryClient.getQueryData(['workflows', 'org-1', 'run-1']) as any
      expect(data.status).toBe('waiting_approval')
    })
  })

  it('invalidates query cache on success', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    const mockInvalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.reject('Test reason')

    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: ['workflows', 'org-1', 'run-1'],
    })
  })

  it('returns success object on successful rejection', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(workflowsApi.useWorkflowsControllerRejectWorkflow).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as any)

    const { result } = renderHook(() => useRejectWorkflow({ orgId: 'org-1', runId: 'run-1' }), {
      wrapper: createWrapper(queryClient),
    })

    const response = await result.current.reject('Test reason')
    expect(response).toEqual({ success: true })
  })
})
