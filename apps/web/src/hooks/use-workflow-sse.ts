import { useQueryClient } from '@tanstack/react-query'

import { useEffect, useState } from 'react'

import { API_BASE_URL, getAuthToken } from '../lib/api-client'

export function useWorkflowSSE(runId: string) {
  const [connected, setConnected] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      console.warn('No auth token available for SSE')
      return
    }

    // EventSource doesn't support custom headers, so we pass token as query param
    const url = `${API_BASE_URL}/api/workflows/runs/${runId}/events/stream?token=${token}`
    const eventSource = new EventSource(url)

    eventSource.onopen = () => {
      setConnected(true)
      console.log('[SSE] Connected to workflow events stream')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[SSE] Event received:', data)

        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['workflow-run', runId] })
        queryClient.invalidateQueries({ queryKey: ['workflow-steps', runId] })
      } catch (error) {
        console.error('[SSE] Failed to parse event data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error)
      setConnected(false)
      // EventSource will automatically attempt to reconnect
    }

    return () => {
      console.log('[SSE] Closing connection')
      eventSource.close()
      setConnected(false)
    }
  }, [runId, queryClient])

  return { connected }
}
