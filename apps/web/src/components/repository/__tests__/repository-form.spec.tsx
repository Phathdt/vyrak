import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RepositoryForm } from '../RepositoryForm'

const mockUseRepositories = vi.fn()
const mockUseToast = vi.fn()

vi.mock('@/hooks/use-repositories', () => ({
  useRepositories: () => mockUseRepositories(),
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => mockUseToast(),
}))

describe('RepositoryForm', () => {
  const mockOnClose = vi.fn()
  const mockCreate = { mutateAsync: vi.fn() }
  const mockUpdate = { mutateAsync: vi.fn() }
  const mockTestConnection = { mutateAsync: vi.fn() }
  const mockShowToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRepositories.mockReturnValue({
      create: mockCreate,
      update: mockUpdate,
      testConnection: mockTestConnection,
      repositories: [],
    })
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    })
  })

  describe('create mode', () => {
    it('should render form with create title', () => {
      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      expect(screen.getByText('Add Git Repository')).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      expect(screen.getByLabelText(/Repository Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Git URL/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Default Branch/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Provider/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Access Token/)).toBeInTheDocument()
    })

    it('should disable submit button until connection tested', () => {
      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      const submitButton = screen.getByRole('button', { name: /Add Repository/i })
      expect(submitButton).toBeDisabled()
    })

    it('should toggle token visibility', () => {
      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      const tokenInput = screen.getByLabelText(/Access Token/) as HTMLInputElement
      const toggleButton = screen.getByLabelText(/Show token/)

      expect(tokenInput.type).toBe('password')

      fireEvent.click(toggleButton)
      expect(tokenInput.type).toBe('text')

      fireEvent.click(toggleButton)
      expect(tokenInput.type).toBe('password')
    })

    it('should handle test connection success', async () => {
      mockTestConnection.mutateAsync.mockResolvedValueOnce({ success: true })

      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      const urlInput = screen.getByLabelText(/Git URL/)
      const branchInput = screen.getByLabelText(/Default Branch/)
      const testButton = screen.getByRole('button', { name: /Test Connection/i })

      fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } })
      fireEvent.change(branchInput, { target: { value: 'main' } })
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Repository connection successful',
          type: 'success',
        })
      })
    })

    it('should handle test connection failure', async () => {
      mockTestConnection.mutateAsync.mockRejectedValueOnce(new Error('Connection refused'))

      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      const urlInput = screen.getByLabelText(/Git URL/)
      const branchInput = screen.getByLabelText(/Default Branch/)
      const testButton = screen.getByRole('button', { name: /Test Connection/i })

      fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } })
      fireEvent.change(branchInput, { target: { value: 'main' } })
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Connection failed'),
            type: 'error',
          })
        )
      })
    })

    it('should disable test button when URL or branch is empty', () => {
      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      const testButton = screen.getByRole('button', { name: /Test Connection/i })
      expect(testButton).toBeDisabled()
    })

    it('should create repository after successful test', async () => {
      mockTestConnection.mutateAsync.mockResolvedValueOnce({ success: true })
      mockCreate.mutateAsync.mockResolvedValueOnce({ id: 'repo-1' })

      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      const nameInput = screen.getByLabelText(/Repository Name/)
      const urlInput = screen.getByLabelText(/Git URL/)
      const branchInput = screen.getByLabelText(/Default Branch/)
      const testButton = screen.getByRole('button', { name: /Test Connection/i })

      fireEvent.change(nameInput, { target: { value: 'my-repo' } })
      fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } })
      fireEvent.change(branchInput, { target: { value: 'main' } })

      fireEvent.click(testButton)

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Repository connection successful',
          type: 'success',
        })
      })

      const submitButton = screen.getByRole('button', { name: /Add Repository/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreate.mutateAsync).toHaveBeenCalled()
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Repository added successfully',
          type: 'success',
        })
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('edit mode', () => {
    it('should render form with edit title', () => {
      mockUseRepositories.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        testConnection: mockTestConnection,
        repositories: [
          {
            id: 'repo-1',
            name: 'existing-repo',
            url: 'https://github.com/user/repo.git',
            branch: 'main',
            provider: 'github',
            status: 'active',
            updatedAt: '2024-10-26T10:00:00Z',
          },
        ],
      })

      render(
        <RepositoryForm
          mode='edit'
          organizationId='org-1'
          projectId='proj-1'
          repositoryId='repo-1'
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/Edit Repository: existing-repo/)).toBeInTheDocument()
    })

    it('should disable URL and provider fields in edit mode', async () => {
      mockUseRepositories.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        testConnection: mockTestConnection,
        repositories: [
          {
            id: 'repo-1',
            name: 'existing-repo',
            url: 'https://github.com/user/repo.git',
            branch: 'main',
            provider: 'github',
            status: 'active',
            updatedAt: '2024-10-26T10:00:00Z',
          },
        ],
      })

      render(
        <RepositoryForm
          mode='edit'
          organizationId='org-1'
          projectId='proj-1'
          repositoryId='repo-1'
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/Git URL/) as HTMLInputElement
        const providerSelect = screen.getByLabelText(/Provider/) as HTMLSelectElement
        expect(urlInput.disabled).toBe(true)
        expect(providerSelect.disabled).toBe(true)
      })
    })

    it('should pre-fill form with existing data', async () => {
      mockUseRepositories.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        testConnection: mockTestConnection,
        repositories: [
          {
            id: 'repo-1',
            name: 'existing-repo',
            url: 'https://github.com/user/repo.git',
            branch: 'develop',
            provider: 'github',
            status: 'active',
            updatedAt: '2024-10-26T10:00:00Z',
          },
        ],
      })

      render(
        <RepositoryForm
          mode='edit'
          organizationId='org-1'
          projectId='proj-1'
          repositoryId='repo-1'
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect((screen.getByLabelText(/Repository Name/) as HTMLInputElement).value).toBe('existing-repo')
        expect((screen.getByLabelText(/Default Branch/) as HTMLInputElement).value).toBe('develop')
      })
    })

    it('should not pre-fill token in edit mode', async () => {
      mockUseRepositories.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        testConnection: mockTestConnection,
        repositories: [
          {
            id: 'repo-1',
            name: 'existing-repo',
            url: 'https://github.com/user/repo.git',
            branch: 'main',
            provider: 'github',
            status: 'active',
            updatedAt: '2024-10-26T10:00:00Z',
          },
        ],
      })

      render(
        <RepositoryForm
          mode='edit'
          organizationId='org-1'
          projectId='proj-1'
          repositoryId='repo-1'
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect((screen.getByLabelText(/Access Token/) as HTMLInputElement).value).toBe('')
      })
    })

    it('should update repository on submit', async () => {
      mockUseRepositories.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        testConnection: mockTestConnection,
        repositories: [
          {
            id: 'repo-1',
            name: 'existing-repo',
            url: 'https://github.com/user/repo.git',
            branch: 'main',
            provider: 'github',
            status: 'active',
            updatedAt: '2024-10-26T10:00:00Z',
          },
        ],
      })

      mockUpdate.mutateAsync.mockResolvedValueOnce({ success: true })

      render(
        <RepositoryForm
          mode='edit'
          organizationId='org-1'
          projectId='proj-1'
          repositoryId='repo-1'
          onClose={mockOnClose}
        />
      )

      const nameInput = screen.getByLabelText(/Repository Name/)
      fireEvent.change(nameInput, { target: { value: 'updated-repo' } })

      const submitButton = screen.getByRole('button', { name: /Save Changes/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockUpdate.mutateAsync).toHaveBeenCalled()
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Repository updated successfully',
          type: 'success',
        })
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('helper text', () => {
    it('should display field helper text', () => {
      render(<RepositoryForm mode='create' organizationId='org-1' projectId='proj-1' onClose={mockOnClose} />)

      expect(screen.getByText(/Alphanumeric characters, hyphens, and underscores only/)).toBeInTheDocument()
      expect(screen.getByText(/Must use HTTPS and end with .git/)).toBeInTheDocument()
      expect(screen.getByText(/Connection test required before saving/)).toBeInTheDocument()
    })
  })
})
