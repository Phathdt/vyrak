import { describe, expect, it } from 'vitest'

import { calculateStepDuration, getLayoutedElements, stepsToEdges, stepsToNodes } from '../workflow-layout'

import type { Edge, Node } from '@xyflow/react'

describe('workflow-layout', () => {
  describe('stepsToNodes', () => {
    it('converts steps to ReactFlow nodes', () => {
      const steps = [
        { id: 'step-1', stepKey: 'agent-plan', status: 'succeeded' },
        { id: 'step-2', stepKey: 'tool-execute', status: 'running' },
      ]

      const nodes = stepsToNodes(steps)

      expect(nodes).toHaveLength(2)
      expect(nodes[0].id).toBe('step-1')
      expect(nodes[0].type).toBe('agent')
      expect(nodes[0].data).toEqual(steps[0])
      expect(nodes[1].type).toBe('tool')
    })

    it('infers node type from step key', () => {
      const steps = [
        { id: '1', stepKey: 'agent-planning', status: 'succeeded' },
        { id: '2', stepKey: 'tool-call-api', status: 'running' },
        { id: '3', stepKey: 'approval-gate', status: 'pending' },
        { id: '4', stepKey: 'unknown-step', status: 'pending' },
      ]

      const nodes = stepsToNodes(steps)

      expect(nodes[0].type).toBe('agent')
      expect(nodes[1].type).toBe('tool')
      expect(nodes[2].type).toBe('approval')
      expect(nodes[3].type).toBe('agent') // default
    })
  })

  describe('stepsToEdges', () => {
    it('creates edges between sequential steps', () => {
      const steps = [
        { id: 'step-1', status: 'succeeded' },
        { id: 'step-2', status: 'running' },
        { id: 'step-3', status: 'pending' },
      ]

      const edges = stepsToEdges(steps)

      expect(edges).toHaveLength(2)
      expect(edges[0].source).toBe('step-1')
      expect(edges[0].target).toBe('step-2')
      expect(edges[1].source).toBe('step-2')
      expect(edges[1].target).toBe('step-3')
    })

    it('marks running step edges as animated', () => {
      const steps = [
        { id: 'step-1', status: 'running' },
        { id: 'step-2', status: 'pending' },
      ]

      const edges = stepsToEdges(steps)

      expect(edges[0].animated).toBe(true)
    })

    it('returns empty array for single step', () => {
      const steps = [{ id: 'step-1', status: 'succeeded' }]
      const edges = stepsToEdges(steps)
      expect(edges).toHaveLength(0)
    })
  })

  describe('getLayoutedElements', () => {
    it('applies dagre layout to nodes', () => {
      const nodes: Node[] = [
        { id: '1', position: { x: 0, y: 0 }, data: {} },
        { id: '2', position: { x: 0, y: 0 }, data: {} },
      ]
      const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }]

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toHaveLength(2)
      expect(result.nodes[0].position.x).toBeDefined()
      expect(result.nodes[0].position.y).toBeDefined()
      // Dagre should position them vertically
      expect(result.nodes[1].position.y).toBeGreaterThan(result.nodes[0].position.y)
    })

    it('handles empty nodes and edges', () => {
      const result = getLayoutedElements([], [])
      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })
  })

  describe('calculateStepDuration', () => {
    it('calculates duration between start and end timestamps', () => {
      const duration = calculateStepDuration('2026-10-28T10:00:00Z', '2026-10-28T10:05:00Z')
      expect(duration).toBe(300000) // 5 minutes in ms
    })

    it('returns undefined when startedAt is null', () => {
      const duration = calculateStepDuration(null, '2026-10-28T10:05:00Z')
      expect(duration).toBeUndefined()
    })

    it('calculates duration to now when completedAt is null', () => {
      const startedAt = new Date(Date.now() - 5000).toISOString()
      const duration = calculateStepDuration(startedAt, null)

      expect(duration).toBeGreaterThanOrEqual(4000)
      expect(duration).toBeLessThanOrEqual(6000)
    })
  })
})
