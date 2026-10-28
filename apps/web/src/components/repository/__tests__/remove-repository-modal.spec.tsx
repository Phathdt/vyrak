import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RemoveRepositoryModal } from '../RemoveRepositoryModal'

const mockUseRepositories = vi.fn()
const mockUseToast = vi.fn()

vi.mock('@/hooks/use-repositories', () => ({
  useRepositories: () => mockUseRepositories(),
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => mockUseToast(),
}))

describe('RemoveRepositoryModal', () => {
  const mockOnClose = vi.fn()
  const mockShowToast = vi.fn()
  const mockRemoveMutate = { mutateAsync: vi.fn(), isPending: false }

  const mockRepository = {
    id: 'repo-1',
    name: 'my-backend',
    url: 'https://github.com/user/repo.git',
    branch: 'main',
    provider: 'github' as const,
    status: 'active' as const,
    updatedAt: '2024-10-26T10:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRepositories.mockReturnValue({
      repositories: [mockRepository],
      remove: mockRemoveMutate,
    })
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    })
    localStorage.setItem('token', 'test-token')
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ count: 0 }),
        })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('rendering', () => {
    it('should render remove confirmation modal', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      expect(screen.getByText('Remove Repository?')).toBeInTheDocument()
    })

    it('should display repository information', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      expect(screen.getAllByText('my-backend').length).toBeGreaterThan(0)
      expect(screen.getByText('https://github.com/user/repo.git')).toBeInTheDocument()
      expect(screen.getByText('main')).toBeInTheDocument()
    })

    it('should render confirmation input field', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const confirmInput = screen.getByPlaceholderText('DELETE')
      expect(confirmInput).toBeInTheDocument()
    })

    it('should return null if repository not found', () => {
      mockUseRepositories.mockReturnValue({
        repositories: [],
        remove: mockRemoveMutate,
      })

      const { container } = render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('confirmation logic', () => {
    it('should disable remove button when confirmation text is empty', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })
      expect(removeButton).toBeDisabled()
    })

    it('should disable remove button for partial match', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('DELETE')
      fireEvent.change(input, { target: { value: 'DEL' } })

      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })
      expect(removeButton).toBeDisabled()
    })

    it('should enable remove button only with exact DELETE text', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('DELETE')
      fireEvent.change(input, { target: { value: 'DELETE' } })

      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })
      expect(removeButton).not.toBeDisabled()
    })

    it('should disable remove button for incorrect casing', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('DELETE')
      fireEvent.change(input, { target: { value: 'delete' } })

      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })
      expect(removeButton).toBeDisabled()
    })
  })

  describe('removal', () => {
    it('should call remove mutation when confirmation is valid', async () => {
      mockRemoveMutate.mutateAsync.mockResolvedValueOnce({ success: true })

      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('DELETE')
      fireEvent.change(input, { target: { value: 'DELETE' } })

      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(mockRemoveMutate.mutateAsync).toHaveBeenCalledWith({
          orgId: 'org-1',
          projectId: 'proj-1',
          repoId: 'repo-1',
        })
      })
    })

    it('should show success toast on successful removal', async () => {
      mockRemoveMutate.mutateAsync.mockResolvedValueOnce({ success: true })

      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('DELETE')
      fireEvent.change(input, { target: { value: 'DELETE' } })

      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Repository removed successfully',
          type: 'success',
        })
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should show error toast on removal failure', async () => {
      mockRemoveMutate.mutateAsync.mockRejectedValueOnce(new Error('Delete failed'))

      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('DELETE')
      fireEvent.change(input, { target: { value: 'DELETE' } })

      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Error'),
            type: 'error',
          })
        )
      })
    })

    it('should disable buttons while removing', () => {
      mockRemoveMutate.isPending = true

      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      const removeButton = screen.getByRole('button', { name: /Remove Repository/i })

      expect(cancelButton).toBeDisabled()
      expect(removeButton).toBeDisabled()
    })
  })

  describe('modal actions', () => {
    it('should have cancel button in footer', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should show helpful tip about status toggle', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      expect(screen.getByText(/If you need to temporarily disable this repository/)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper labels', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      expect(screen.getByText(/Type/)).toBeInTheDocument()
      expect(screen.getByText('DELETE')).toBeInTheDocument()
    })

    it('should autofocus confirmation input', () => {
      render(
        <RemoveRepositoryModal repositoryId='repo-1' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('DELETE') as HTMLInputElement
      expect(input).toHaveFocus()
    })
  })
})
