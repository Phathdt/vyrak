import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { TimeSeriesDataPointDto } from '../../api/generated/models'

interface WorkflowRunsChartProps {
  data: TimeSeriesDataPointDto[]
}

export function WorkflowRunsChart({ data }: WorkflowRunsChartProps) {
  const formatDate = (timestamp: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp))
  }

  const chartData = data.map((item) => ({
    date: formatDate(item.timestamp),
    total: item.totalRuns,
    completed: item.succeeded,
    failed: item.failed,
  }))

  return (
    <div className='chart-card'>
      <h3>Workflow Runs Over Time</h3>
      <ResponsiveContainer width='100%' height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--surface-3))' />
          <XAxis dataKey='date' stroke='hsl(var(--text-secondary))' tick={{ fill: 'hsl(var(--text-secondary))' }} />
          <YAxis stroke='hsl(var(--text-secondary))' tick={{ fill: 'hsl(var(--text-secondary))' }} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--surface-2))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius-md)',
              color: 'hsl(var(--text-primary))',
            }}
          />
          <Line type='monotone' dataKey='total' stroke='hsl(var(--accent-cyan))' strokeWidth={2} name='Total' />
          <Line type='monotone' dataKey='completed' stroke='hsl(120, 60%, 50%)' strokeWidth={2} name='Completed' />
          <Line type='monotone' dataKey='failed' stroke='hsl(var(--destructive))' strokeWidth={2} name='Failed' />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
