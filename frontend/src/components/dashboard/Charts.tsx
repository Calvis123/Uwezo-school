'use client'

import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react'
import { useTheme } from 'next-themes'

const COLORS = ['#0d9488', '#f59e0b', '#22c55e', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316']

// Gender-specific colors (teal for boys, rose for girls)
const GENDER_COLORS = ['#0d9488', '#f43f5e']

interface ChartsProps {
  classData: { name: string; students: number }[]
  genderData: { name: string; value: number }[]
  feeTrendData: { month: string; collected: number; outstanding: number }[]
  loading: boolean
}

// Format large numbers: 150000 → 150K, 1500000 → 1.5M
function formatYAxis(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(value)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[140px]">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-slate-500 dark:text-slate-400">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const GenderTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0)
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill || COLORS[0] }} />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{data.name}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-slate-100">{data.value.toLocaleString()}</span> students ({percentage}%)
        </p>
      </div>
    )
  }
  return null
}

export function DashboardCharts({ classData, genderData, feeTrendData, loading }: ChartsProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Theme-aware colors for SVG elements
  const gridStroke = isDark ? '#334155' : '#f1f5f9'
  const axisTickFill = isDark ? '#64748b' : '#94a3b8'
  const axisLineStroke = isDark ? '#334155' : '#e2e8f0'
  const cursorFill = isDark ? '#1e293b' : '#f8fafc'

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  const displayClassData = classData.slice(0, 10)

  // Empty state when no data
  const hasNoData = displayClassData.length === 0 && genderData.length === 0 && feeTrendData.length === 0

  if (hasNoData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[{ icon: BarChart3, label: 'Students per Class' }, { icon: PieChartIcon, label: 'Gender Distribution' }, { icon: TrendingUp, label: 'Fee Collection Trend' }].map((chart, i) => (
          <motion.div
            key={chart.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
          >
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 h-full transition-all duration-300 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">{chart.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-3">
                  <chart.icon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">No data available</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }

  const truncatedClassData = displayClassData.map((c) => ({
    ...c,
    name: c.name.length > 10 ? c.name.slice(0, 9) + '…' : c.name,
  }))

  const totalGender = genderData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Students per class bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="shadow-sm hover:shadow-lg border-slate-200/60 dark:border-slate-700/60 h-full transition-all duration-300 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Students per Class</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={truncatedClassData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: axisTickFill }}
                    axisLine={{ stroke: axisLineStroke }}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11, fill: axisTickFill }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFill, radius: 4 }} />
                  <Bar dataKey="students" name="Students" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gender distribution pie chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="shadow-sm hover:shadow-lg border-slate-200/60 dark:border-slate-700/60 h-full transition-all duration-300 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {genderData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<GenderTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Gender legend with numbers and percentages */}
            <div className="flex justify-center gap-6 -mt-2">
              {genderData.map((entry, index) => {
                const percentage = totalGender > 0 ? ((entry.value / totalGender) * 100).toFixed(1) : '0'
                return (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: GENDER_COLORS[index % GENDER_COLORS.length] }}
                    />
                    <div className="text-left">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{entry.name}</span>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                        {entry.value.toLocaleString()} ({percentage}%)
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fee collection trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="shadow-sm hover:shadow-lg border-slate-200/60 dark:border-slate-700/60 h-full transition-all duration-300 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fee Collection Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={feeTrendData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: axisTickFill }}
                    axisLine={{ stroke: axisLineStroke }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: axisTickFill }} axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']}
                  />
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#0d9488" fill="url(#colorCollected)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f59e0b" fill="url(#colorOutstanding)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-6 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-teal-500 shadow-sm" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Collected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Outstanding</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
