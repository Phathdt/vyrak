import { describe, expect, it } from 'vitest'

import { render } from '../../test/test-utils'
import { CardLoadingSkeleton, LoadingSkeleton, TableLoadingSkeleton } from './loading-skeleton'

describe('LoadingSkeleton', () => {
  describe('LoadingSkeleton', () => {
    it('should render with default props', () => {
      const { container } = render(<LoadingSkeleton />)

      const skeleton = container.querySelector('div')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveStyle({
        width: '100%',
        height: '20px',
        backgroundColor: '#1E293B',
      })
    })

    it('should render with custom width and height', () => {
      const { container } = render(<LoadingSkeleton width='200px' height='40px' />)

      const skeleton = container.querySelector('div')
      expect(skeleton).toHaveStyle({
        width: '200px',
        height: '40px',
      })
    })

    it('should render text variant', () => {
      const { container } = render(<LoadingSkeleton variant='text' />)

      const skeleton = container.querySelector('div')
      expect(skeleton).toHaveStyle({
        borderRadius: '4px',
        height: '1em',
      })
    })

    it('should render rectangular variant', () => {
      const { container } = render(<LoadingSkeleton variant='rectangular' />)

      const skeleton = container.querySelector('div')
      expect(skeleton).toHaveStyle({
        borderRadius: '8px',
      })
    })

    it('should render circular variant', () => {
      const { container } = render(<LoadingSkeleton variant='circular' height='50px' />)

      const skeleton = container.querySelector('div')
      expect(skeleton).toHaveStyle({
        borderRadius: '50%',
        width: '50px',
      })
    })

    it('should include pulse animation', () => {
      const { container } = render(<LoadingSkeleton />)

      const style = container.querySelector('style')
      expect(style?.textContent).toContain('@keyframes pulse')
      expect(style?.textContent).toContain('opacity: 0.5')
    })
  })

  describe('TableLoadingSkeleton', () => {
    it('should render with default 5 rows and 4 columns', () => {
      const { container } = render(<TableLoadingSkeleton />)

      const rows = container.querySelectorAll('div > div')
      expect(rows).toHaveLength(5)

      const firstRowColumns = rows[0].querySelectorAll('div')
      expect(firstRowColumns).toHaveLength(4)
    })

    it('should render with custom rows and columns', () => {
      const { container } = render(<TableLoadingSkeleton rows={3} columns={6} />)

      const rows = container.querySelectorAll('div > div')
      expect(rows).toHaveLength(3)

      const firstRowColumns = rows[0].querySelectorAll('div')
      expect(firstRowColumns).toHaveLength(6)
    })

    it('should render all skeletons with correct height', () => {
      const { container } = render(<TableLoadingSkeleton rows={2} columns={2} />)

      const skeletons = container.querySelectorAll('div > div > div')
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveStyle({ height: '24px' })
      })
    })
  })

  describe('CardLoadingSkeleton', () => {
    it('should render card structure', () => {
      const { container } = render(<CardLoadingSkeleton />)

      const card = container.querySelector('div')
      expect(card).toHaveStyle({
        padding: '1.5rem',
        backgroundColor: '#1E2636',
        borderRadius: '8px',
        border: '1px solid #2D3748',
      })
    })

    it('should render multiple skeleton elements', () => {
      const { container } = render(<CardLoadingSkeleton />)

      // Should have title (60% width) + 2 text lines + 2 buttons
      const skeletons = container.querySelectorAll('div > div')
      expect(skeletons.length).toBeGreaterThanOrEqual(5)
    })

    it('should render title skeleton with 60% width', () => {
      const { container } = render(<CardLoadingSkeleton />)

      const skeletons = container.querySelectorAll('div > div')
      const titleSkeleton = skeletons[0]
      expect(titleSkeleton).toHaveStyle({
        height: '24px',
        width: '60%',
      })
    })

    it('should render text skeletons with different widths', () => {
      const { container } = render(<CardLoadingSkeleton />)

      const skeletons = container.querySelectorAll('div > div')

      // Second skeleton should be 100% width
      expect(skeletons[1]).toHaveStyle({ width: '100%' })

      // Third skeleton should be 80% width
      expect(skeletons[2]).toHaveStyle({ width: '80%' })
    })

    it('should render button skeletons', () => {
      const { container } = render(<CardLoadingSkeleton />)

      const skeletons = container.querySelectorAll('div > div')

      // Last two should be button skeletons with 100px width
      const buttonSkeletons = Array.from(skeletons).slice(-2)
      buttonSkeletons.forEach((skeleton) => {
        expect(skeleton).toHaveStyle({
          height: '36px',
          width: '100px',
        })
      })
    })
  })
})
