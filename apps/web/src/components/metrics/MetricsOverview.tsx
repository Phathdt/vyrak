import { MetricsSummaryDto } from '../../api/generated/models'

interface MetricsOverviewProps {
  metrics: MetricsSummaryDto
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const formatDuration = (durationField: unknown) => {
    if (!durationField || typeof durationField !== 'number') return 'N/A'

    const seconds = durationField
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${Math.floor(seconds % 60)}s`
    }
    return `${seconds.toFixed(1)}s`
  }

  return (
    <div className='metrics-overview'>
      <div className='metric-card'>
        <div className='metric-icon'>📊</div>
        <div className='metric-content'>
          <label>Total Runs</label>
          <h2>{metrics.totalRuns.toLocaleString()}</h2>
        </div>
      </div>

      <div className='metric-card'>
        <div className='metric-icon'>✅</div>
        <div className='metric-content'>
          <label>Success Rate</label>
          <h2>{(metrics.successRate * 100).toFixed(1)}%</h2>
        </div>
      </div>

      <div className='metric-card'>
        <div className='metric-icon'>⏱️</div>
        <div className='metric-content'>
          <label>Avg Duration</label>
          <h2>{formatDuration(metrics.avgDurationSeconds)}</h2>
        </div>
      </div>

      <div className='metric-card'>
        <div className='metric-icon'>🔄</div>
        <div className='metric-content'>
          <label>Active</label>
          <h2>{metrics.running}</h2>
        </div>
      </div>
    </div>
  )
}
