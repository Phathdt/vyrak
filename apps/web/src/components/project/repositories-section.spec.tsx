import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RepositoriesSection } from './repositories-section'

describe('RepositoriesSection', () => {
  it('renders empty state when no repositories', () => {
    render(<RepositoriesSection repositories={[]} />)

    expect(screen.getByText('Git Repositories')).toBeInTheDocument()
    expect(screen.getByText(/No repositories yet/)).toBeInTheDocument()
    expect(screen.getByText(/Epic 12/)).toBeInTheDocument()
  })

  it('shows disabled Add Repository button', () => {
    render(<RepositoriesSection repositories={[]} />)

    const addButton = screen.getByRole('button', { name: /Add Repository/ })
    expect(addButton).toBeDisabled()
    expect(addButton).toHaveAttribute('title', 'Coming in Epic 12')
  })

  it('renders repository list when repositories exist', () => {
    const repos = [
      { id: '1', name: 'frontend-app', url: 'https://github.com/org/frontend' },
      { id: '2', name: 'backend-api', url: 'https://github.com/org/backend' },
    ]

    render(<RepositoriesSection repositories={repos} />)

    expect(screen.getByText('frontend-app')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/org/frontend')).toBeInTheDocument()
    expect(screen.getByText('backend-api')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/org/backend')).toBeInTheDocument()
  })
})
