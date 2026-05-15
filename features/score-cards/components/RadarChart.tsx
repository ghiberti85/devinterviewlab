'use client'

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'

interface RadarData {
  correctness: number
  completeness: number
  clarity: number
  depth: number
}

interface Props {
  data: RadarData
  size?: number
}

export function RadarChart({ data, size = 260 }: Props) {
  const chartData = [
    { subject: 'Correctness', value: data.correctness },
    { subject: 'Completeness', value: data.completeness },
    { subject: 'Clarity', value: data.clarity },
    { subject: 'Depth', value: data.depth },
  ]

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RechartsRadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="Score"
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.35}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  )
}
