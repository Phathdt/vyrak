import { Cell, Legend, Pie, PieChart, PieLabelRenderProps, ResponsiveContainer, Tooltip } from 'recharts'

interface SuccessRateChartProps {
  data: {
    completed: number
    failed: number
    cancelled: number
    running: number
  }
}

export function SuccessRateChart({ data }: SuccessRateChartProps) {
  const chartData = [
    { name: 'Completed', value: data.completed, color: 'hsl(120, 60%, 50%)' },
    { name: 'Failed', value: data.failed, color: 'hsl(var(--destructive))' },
    { name: 'Cancelled', value: data.cancelled, color: 'hsl(25, 95%, 53%)' },
    { name: 'Running', value: data.running, color: 'hsl(var(--accent-cyan))' },
  ].filter((item) => item.value > 0)

  const renderLabel = (props: PieLabelRenderProps) => {
    const { name, percent } = props
    if (!name || !percent) return ''
    return `${name}: ${(percent * 100).toFixed(0)}%`
  }

  return (
    <div className='chart-card'>
      <h3>Status Distribution</h3>
      <ResponsiveContainer width='100%' height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx='50%'
            cy='50%'
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill='#8884d8'
            dataKey='value'
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--surface-2))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius-md)',
              color: 'hsl(var(--text-primary))',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
