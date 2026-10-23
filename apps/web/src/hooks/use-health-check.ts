import { useQuery } from '@tanstack/react-query'

interface HealthCheck {
  status: string
  timestamp: string
}

export function useHealthCheck() {
  return useQuery<HealthCheck>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3000')
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}
