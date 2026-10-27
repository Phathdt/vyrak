import { fireEvent, render, screen } from '@testing-library/react'

import { BrowserRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectCard } from './project-card'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ProjectCard', () => {
  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    slug: 'test-project',
    description: 'This is a test project description',
    createdAt: '2024-10-20T10:00:00Z',
    stats: {
      repositoryCount: 5,
      workflowRunCount: 42,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders project information correctly', () => {
    render(
      <BrowserRouter>
        <ProjectCard {...mockProject} />
      </BrowserRouter>
    )

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('test-project')).toBeInTheDocument()
    expect(screen.getByText('This is a test project description')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders "No description" when description is null', () => {
    render(
      <BrowserRouter>
        <ProjectCard {...mockProject} description={null} />
      </BrowserRouter>
    )

    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('formats creation date correctly', () => {
    render(
      <BrowserRouter>
        <ProjectCard {...mockProject} />
      </BrowserRouter>
    )

    // Should contain "Created" and formatted date
    expect(screen.getByText(/Created/i)).toBeInTheDocument()
  })

  it('navigates to detail page on click', () => {
    render(
      <BrowserRouter>
        <ProjectCard {...mockProject} />
      </BrowserRouter>
    )

    const card = screen.getByRole('button', { name: /open project test project/i })
    fireEvent.click(card)

    expect(mockNavigate).toHaveBeenCalledWith('/projects/project-1')
  })

  it('navigates to detail page on Enter key', () => {
    render(
      <BrowserRouter>
        <ProjectCard {...mockProject} />
      </BrowserRouter>
    )

    const card = screen.getByRole('button', { name: /open project test project/i })
    fireEvent.keyDown(card, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledWith('/projects/project-1')
  })

  it('navigates to detail page on Space key', () => {
    render(
      <BrowserRouter>
        <ProjectCard {...mockProject} />
      </BrowserRouter>
    )

    const card = screen.getByRole('button', { name: /open project test project/i })
    fireEvent.keyDown(card, { key: ' ' })

    expect(mockNavigate).toHaveBeenCalledWith('/projects/project-1')
  })

  it('truncates long descriptions', () => {
    const longDescription = 'a'.repeat(200)
    render(
      <BrowserRouter>
        <ProjectCard {...mockProject} description={longDescription} />
      </BrowserRouter>
    )

    const description = screen.getByText(longDescription)
    expect(description).toHaveClass('line-clamp-2')
  })
})
