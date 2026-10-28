import dagre from 'dagre'

import type { Edge, Node } from '@xyflow/react'

export interface LayoutOptions {
  direction?: 'TB' | 'LR' // Top-to-Bottom or Left-to-Right
  nodeWidth?: number
  nodeHeight?: number
  rankSep?: number // Vertical spacing
  nodeSep?: number // Horizontal spacing
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'TB',
  nodeWidth: 280,
  nodeHeight: 120,
  rankSep: 80,
  nodeSep: 60,
}

/**
 * Calculate auto-layout positions for workflow nodes using dagre
 * @param nodes - ReactFlow nodes
 * @param edges - ReactFlow edges
 * @param options - Layout configuration
 * @returns Nodes with calculated positions
 */
export function getLayoutedElements<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node<T>[]; edges: Edge[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Create dagre graph
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
  })

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    })
  })

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run dagre layout algorithm
  dagre.layout(dagreGraph)

  // Map dagre positions back to ReactFlow nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)

    return {
      ...node,
      position: {
        // Dagre returns center positions, adjust to top-left
        x: nodeWithPosition.x - opts.nodeWidth / 2,
        y: nodeWithPosition.y - opts.nodeHeight / 2,
      },
    }
  })

  return {
    nodes: layoutedNodes,
    edges,
  }
}

/**
 * Convert workflow steps to ReactFlow nodes
 */
export function stepsToNodes<T extends Record<string, unknown> & { id: string; stepKey: string; status: string }>(
  steps: T[]
): Node<T>[] {
  return steps.map((step, index) => ({
    id: step.id,
    type: inferNodeType(step.stepKey),
    position: { x: 0, y: index * 200 }, // Temporary position, will be layouted
    data: step,
  }))
}

/**
 * Convert workflow steps to ReactFlow edges
 */
export function stepsToEdges(steps: { id: string; status: string }[]): Edge[] {
  return steps.slice(0, -1).map((step, index) => {
    const nextStep = steps[index + 1]
    return {
      id: `${step.id}-${nextStep.id}`,
      source: step.id,
      target: nextStep.id,
      animated: step.status === 'running',
      style: {
        stroke: step.status === 'running' ? 'hsl(var(--accent-cyan))' : 'hsl(var(--border))',
        strokeWidth: 2,
      },
    }
  })
}

/**
 * Infer node type from step key
 * Rules:
 * - Contains 'approval' or 'review' -> approval
 * - Contains 'tool', 'call', 'execute' -> tool
 * - Default -> agent
 */
function inferNodeType(stepKey: string): 'agent' | 'tool' | 'approval' {
  const key = stepKey.toLowerCase()

  if (key.includes('approval') || key.includes('review') || key.includes('gate')) {
    return 'approval'
  }

  if (key.includes('tool') || key.includes('call') || key.includes('execute')) {
    return 'tool'
  }

  return 'agent'
}

/**
 * Calculate duration in milliseconds from start and end timestamps
 */
export function calculateStepDuration(startedAt: string | null, completedAt: string | null): number | undefined {
  if (!startedAt) return undefined

  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()

  return end - start
}
