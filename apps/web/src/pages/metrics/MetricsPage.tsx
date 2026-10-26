import { useState } from 'react'

import { MetricsOverview } from '../../components/metrics/MetricsOverview'
import { SuccessRateChart } from '../../components/metrics/SuccessRateChart'
import { WorkflowRunsChart } from '../../components/metrics/WorkflowRunsChart'
import { useWorkflowMetrics } from '../../hooks/use-workflow-metrics'

export function MetricsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })

  const { data: metrics, isLoading, error, refetch } = useWorkflowMetrics(dateRange)

  return (
    <div className='metrics-page'>
      <header className='page-header'>
        <h1>Metrics</h1>
        <div className='header-actions'>
          <input
            type='date'
            value={dateRange.from}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            className='date-input'
          />
          <span>to</span>
          <input
            type='date'
            value={dateRange.to}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            className='date-input'
          />
          <button onClick={() => refetch()} className='btn-primary'>
            Refresh
          </button>
        </div>
      </header>

      {isLoading && (
        <div className='page-loading'>
          <div className='loading-spinner' />
          <p>Loading metrics...</p>
        </div>
      )}

      {error && (
        <div className='page-error'>
          <p>Error loading metrics: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      )}

      {metrics && (
        <>
          <MetricsOverview metrics={metrics.summary} />

          <div className='charts-grid'>
            <WorkflowRunsChart data={metrics.timeSeries} />
            <SuccessRateChart
              data={{
                completed: metrics.summary.succeeded,
                failed: metrics.summary.failed,
                cancelled: metrics.summary.cancelled,
                running: metrics.summary.running,
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
