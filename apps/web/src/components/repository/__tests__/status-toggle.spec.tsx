import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StatusToggle } from '../status-toggle'

const mockUseRepositories = vi.fn()
const mockUseToast = vi.fn()

vi.mock('@/hooks/use-repositories', () => ({
  useRepositories: () => mockUseRepositories(),
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => mockUseToast(),
}))

describe('StatusToggle', () => {
  const mockShowToast = vi.fn()
  const mockUpdateMutate = { mutateAsync: vi.fn(), isPending: false }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRepositories.mockReturnValue({
      update: mockUpdateMutate,
    })
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    })
  })

  describe('rendering', () => {
    it('should render toggle switch', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toBeInTheDocument()
    })

    it('should show active state when status is active', () => {
      const { container } = render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'true')
      expect(toggle).toHaveClass('bg-green-500')
    })

    it('should show inactive state when status is inactive', () => {
      const { container } = render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='inactive'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      expect(toggle).toHaveClass('bg-gray-500')
    })

    it('should have proper accessibility label', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-label')
      expect(toggle.getAttribute('aria-label')).toContain('active')
    })
  })

  describe('deactivation', () => {
    it('should show confirmation modal when toggled to inactive', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(screen.getByText('Deactivate Repository?')).toBeInTheDocument()
      expect(screen.getByText(/my-repo/)).toBeInTheDocument()
    })

    it('should display warning when deactivating with active workflows', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
          affectedWorkflowsCount={3}
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(screen.getByText(/Warning: 3 active workflows are using this repository/)).toBeInTheDocument()
      expect(
        screen.getByText(/These workflows will fail when they attempt to access the repository/)
      ).toBeInTheDocument()
    })

    it('should not display workflow warning when no workflows affected', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
          affectedWorkflowsCount={0}
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(screen.queryByText(/active workflows are using this repository/)).not.toBeInTheDocument()
    })

    it('should handle single workflow warning text correctly', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
          affectedWorkflowsCount={1}
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(screen.getByText(/1 active workflow is using this repository/)).toBeInTheDocument()
    })

    it('should call update when confirming deactivation', async () => {
      mockUpdateMutate.mutateAsync.mockResolvedValueOnce({ success: true })

      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      const confirmButton = screen.getByRole('button', { name: /Deactivate/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockUpdateMutate.mutateAsync).toHaveBeenCalledWith({
          orgId: 'org-1',
          projectId: 'proj-1',
          repoId: 'repo-1',
          data: { status: 'inactive' },
        })
        expect(mockShowToast).toHaveBeenCalledWith('Repository deactivated successfully', 'success')
      })
    })

    it('should close modal on cancel', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(screen.getByText('Deactivate Repository?')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(screen.queryByText('Deactivate Repository?')).not.toBeInTheDocument()
    })
  })

  describe('activation', () => {
    it('should show confirmation modal when toggled to active', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='inactive'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(screen.getByText('Activate Repository?')).toBeInTheDocument()
      expect(screen.getByText(/my-repo/)).toBeInTheDocument()
    })

    it('should display info message when activating', () => {
      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='inactive'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(screen.getByText(/Activating will make this repository available/)).toBeInTheDocument()
    })

    it('should call update when confirming activation', async () => {
      mockUpdateMutate.mutateAsync.mockResolvedValueOnce({ success: true })

      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='inactive'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      const confirmButton = screen.getByRole('button', { name: /Activate/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockUpdateMutate.mutateAsync).toHaveBeenCalledWith({
          orgId: 'org-1',
          projectId: 'proj-1',
          repoId: 'repo-1',
          data: { status: 'active' },
        })
        expect(mockShowToast).toHaveBeenCalledWith('Repository activated successfully', 'success')
      })
    })
  })

  describe('error handling', () => {
    it('should show error toast on update failure', async () => {
      mockUpdateMutate.mutateAsync.mockRejectedValueOnce(new Error('Network error'))

      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      const confirmButton = screen.getByRole('button', { name: /Deactivate/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Error'), 'error')
      })
    })

    it('should disable buttons while updating', () => {
      mockUpdateMutate.isPending = true

      render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
        />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toBeDisabled()
    })
  })

  describe('custom className', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(
        <StatusToggle
          repositoryId='repo-1'
          repositoryName='my-repo'
          currentStatus='active'
          organizationId='org-1'
          projectId='proj-1'
          className='custom-class'
        />
      )

      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveClass('custom-class')
    })
  })
})
