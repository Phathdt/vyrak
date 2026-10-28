import '@xyflow/react/dist/style.css'
import { Background, MiniMap, type Node, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { calculateStepDuration, getLayoutedElements, stepsToEdges, stepsToNodes } from '../../lib/utils/workflow-layout'
import { DiagramControls } from './diagram-controls'
import { AgentNode } from './nodes/agent-node'
import { ApprovalNode } from './nodes/approval-node'
import { ToolNode } from './nodes/tool-node'

import type { StepRunResponseDto } from '../../api/generated/models'

interface WorkflowDiagramProps {
  steps: StepRunResponseDto[]
  onStepClick?: (stepId: string) => void
  className?: string
}

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  approval: ApprovalNode,
}

export function WorkflowDiagram({ steps, onStepClick, className = '' }: WorkflowDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showMinimap, setShowMinimap] = useState(false)

  // Convert steps to nodes and edges with layout
  useEffect(() => {
    if (!steps.length) {
      setNodes([])
      setEdges([])
      return
    }

    // Transform steps to include duration
    const transformedSteps = steps.map((step) => ({
      ...step,
      duration: calculateStepDuration(step.startedAt, step.completedAt),
    }))

    // Create nodes and edges
    const initialNodes = stepsToNodes(transformedSteps)
    const initialEdges = stepsToEdges(transformedSteps)

    // Apply dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges, {
      direction: 'TB',
      nodeWidth: 280,
      nodeHeight: 120,
      rankSep: 80,
      nodeSep: 60,
    })

    setNodes(layoutedNodes as never[])
    setEdges(layoutedEdges as never[])
  }, [steps, setNodes, setEdges])

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onStepClick) {
        onStepClick(node.id)
      }
    },
    [onStepClick]
  )

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'f' || event.key === 'F') {
      // Fit view handled by DiagramControls
      event.preventDefault()
    }
  }, [])

  // Minimap node color based on status
  const minimapNodeColor = useCallback((node: Node) => {
    const status = node.data?.status
    if (status === 'running' || status === 'waiting_approval') return 'hsl(var(--accent-cyan))'
    if (status === 'succeeded') return 'hsl(142 76% 36%)'
    if (status === 'failed') return 'hsl(0 84% 60%)'
    return 'hsl(var(--border))'
  }, [])

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  if (!steps.length) {
    return (
      <div className={`flex h-full items-center justify-center ${className}`}>
        <div className='text-center'>
          <p className='text-sm text-muted-foreground'>No steps available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative h-full w-full ${className}`} onKeyDown={handleKeyDown}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 300 }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          style: { strokeWidth: 2 },
          type: 'smoothstep',
        }}
        proOptions={proOptions}
        className='bg-surface-1'
      >
        <Background color='hsl(var(--border))' gap={20} size={1} />

        {showMinimap && (
          <MiniMap
            nodeColor={minimapNodeColor}
            nodeStrokeWidth={3}
            zoomable
            pannable
            className='!bg-surface-2 !border !border-border rounded-lg shadow-lg'
            style={{
              bottom: 20,
              left: 20,
            }}
          />
        )}

        <DiagramControls showMinimap={showMinimap} onToggleMinimap={() => setShowMinimap((prev) => !prev)} />
      </ReactFlow>

      {/* Screen reader announcement */}
      <div className='sr-only' role='status' aria-live='polite' aria-atomic='true'>
        Workflow diagram with {steps.length} steps. Use arrow keys to navigate and Enter to select.
      </div>
    </div>
  )
}
