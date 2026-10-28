import { useQueryClient } from '@tanstack/react-query'

import { useEffect, useRef, useState } from 'react'

import { API_BASE_URL, getAuthToken } from '../lib/api-client'

export type SSEConnectionState = 'connected' | 'connecting' | 'disconnected'

export interface UseWorkflowSSEResult {
  connected: boolean // Backward compatibility
  connectionState: SSEConnectionState
  reconnecting: boolean
  error: string | null
}

export function useWorkflowSSE(runId: string): UseWorkflowSSEResult {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      console.warn('[SSE] No auth token available')
      setConnectionState('disconnected')
      setError('Authentication required')
      return
    }

    let eventSource: EventSource | null = null
    let mounted = true

    const connect = () => {
      if (!mounted) return

      setConnectionState('connecting')
      setError(null)

      const url = `${API_BASE_URL}/api/workflows/runs/${runId}/events/stream?token=${token}`
      eventSource = new EventSource(url)

      eventSource.onopen = () => {
        if (!mounted) return
        setConnectionState('connected')
        setReconnectAttempt(0)
        console.log('[SSE] Connection established for run:', runId)
      }

      eventSource.onmessage = (event) => {
        if (!mounted) return

        try {
          JSON.parse(event.data)

          // Invalidate queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['workflow-run', runId] })
          queryClient.invalidateQueries({ queryKey: ['workflow-steps', runId] })
        } catch (error) {
          console.error('[SSE] Failed to parse event data:', error)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error:', err)

        if (!mounted) return

        setConnectionState('disconnected')
        setError('Connection lost')

        // Exponential backoff: 2s, 4s, 8s, max 30s
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempt), 30000)

        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1})`)

        reconnectTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            setReconnectAttempt((prev) => prev + 1)
            connect()
          }
        }, delay)
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSource) {
        eventSource.close()
      }
      setConnectionState('disconnected')
    }
  }, [runId, queryClient, reconnectAttempt])

  return {
    connected: connectionState === 'connected',
    connectionState,
    reconnecting: reconnectAttempt > 0,
    error,
  }
}
