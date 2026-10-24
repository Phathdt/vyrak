import { describe, expect, it } from 'vitest'

import { render, screen } from '../../test/test-utils'
import { LoadingSpinner } from './loading-spinner'

describe('LoadingSpinner', () => {
  it('should render spinner with default medium size', () => {
    const { container } = render(<LoadingSpinner />)

    const spinner = container.querySelector('div > div')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveStyle({ width: '32px', height: '32px' })
  })

  it('should render spinner with small size', () => {
    const { container } = render(<LoadingSpinner size='small' />)

    const spinner = container.querySelector('div > div')
    expect(spinner).toHaveStyle({ width: '16px', height: '16px' })
  })

  it('should render spinner with large size', () => {
    const { container } = render(<LoadingSpinner size='large' />)

    const spinner = container.querySelector('div > div')
    expect(spinner).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('should render with message', () => {
    render(<LoadingSpinner message='Loading data...' />)

    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('should not render message when not provided', () => {
    const { container } = render(<LoadingSpinner />)

    const paragraph = container.querySelector('p')
    expect(paragraph).not.toBeInTheDocument()
  })

  it('should render spinner with correct styles', () => {
    const { container } = render(<LoadingSpinner />)

    const spinner = container.querySelector('div > div')
    expect(spinner).toHaveStyle({
      border: '3px solid #1E293B',
      borderTop: '3px solid #38BDF8',
      borderRadius: '50%',
    })
  })

  it('should include spin animation', () => {
    const { container } = render(<LoadingSpinner />)

    const style = container.querySelector('style')
    expect(style?.textContent).toContain('@keyframes spin')
    expect(style?.textContent).toContain('transform: rotate(360deg)')
  })
})
