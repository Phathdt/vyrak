import { useEffect, useState } from 'react'

/**
 * Hook that returns a live duration counter in milliseconds
 * Updates every 1 second when isActive is true
 */
export function useDurationCounter(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
  isActive: boolean
): number | null {
  const [duration, setDuration] = useState<number | null>(() => {
    if (!startedAt) return null
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    return end - start
  })

  useEffect(() => {
    if (!startedAt) {
      setDuration(null)
      return
    }

    const start = new Date(startedAt).getTime()

    // Update duration immediately
    const calculateDuration = () => {
      const end = completedAt ? new Date(completedAt).getTime() : Date.now()
      return end - start
    }

    setDuration(calculateDuration())

    // Only set interval if workflow is active
    if (!isActive) return

    const interval = setInterval(() => {
      setDuration(calculateDuration())
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, completedAt, isActive])

  return duration
}
