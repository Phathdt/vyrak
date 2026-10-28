import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectForm } from './project-form'

describe('ProjectForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all fields', () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={false} />)

    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('auto-generates slug from name in create mode', async () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={false} />)

    const nameInput = screen.getByLabelText(/project name/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'My Test Project' } })

    await waitFor(() => {
      const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
      expect(slugInput.value).toBe('my-test-project')
    })
  })

  it('does not auto-generate slug in edit mode', async () => {
    render(
      <ProjectForm
        mode='edit'
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        defaultValues={{ name: 'Existing', slug: 'existing' }}
      />
    )

    const nameInput = screen.getByLabelText(/project name/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    await waitFor(() => {
      const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
      expect(slugInput.value).toBe('existing')
    })
  })

  it('validates required fields', async () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={false} />)

    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates slug format', async () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={false} />)

    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
    fireEvent.change(slugInput, { target: { value: 'Invalid Slug!' } })

    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/slug must be lowercase alphanumeric/i)).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates description length', async () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={false} />)

    const nameInput = screen.getByLabelText(/project name/i) as HTMLInputElement
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement

    fireEvent.change(nameInput, { target: { value: 'Test Project' } })
    fireEvent.change(descriptionInput, { target: { value: 'a'.repeat(501) } })

    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/description too long/i)).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('shows character count for description', () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={false} />)

    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement
    fireEvent.change(descriptionInput, { target: { value: 'Hello World' } })

    expect(screen.getByText(/11 \/ 500 characters/i)).toBeInTheDocument()
  })

  it('calls onSubmit with valid data', async () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={false} />)

    const nameInput = screen.getByLabelText(/project name/i) as HTMLInputElement
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement

    fireEvent.change(nameInput, { target: { value: 'Test Project' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } })

    const submitButton = screen.getByRole('button', { name: /create project/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Project',
          slug: 'test-project',
          description: 'Test description',
        }),
        expect.anything()
      )
    })
  })

  it('disables inputs when submitting', () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} isSubmitting={true} />)

    const nameInput = screen.getByLabelText(/project name/i) as HTMLInputElement
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement
    const submitButton = screen.getByRole('button', { name: /creating/i })

    expect(nameInput).toBeDisabled()
    expect(slugInput).toBeDisabled()
    expect(descriptionInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('calls onCancel when cancel button clicked', () => {
    render(<ProjectForm mode='create' onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={false} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('disables slug input in edit mode', () => {
    render(
      <ProjectForm
        mode='edit'
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        defaultValues={{ name: 'Test', slug: 'test' }}
      />
    )

    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
    expect(slugInput).toBeDisabled()
  })
})
