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
import { Users, PieChartIcon, TrendingUp, FileBarChart } from 'lucide-react'

const TEAL_PALETTE = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#0f766e', '#115e59', '#134e4a']
const COMPLEMENTARY = ['#0d9488', '#f59e0b', '#22c55e', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316']

interface ChartsProps {
  classData: { name: string; students: number }[]
  genderData: { name: string; value: number }[]
  feeTrendData: { month: string; collected: number; outstanding: number }[]
  loading: boolean
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
          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill || TEAL_PALETTE[0] }} />
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

function ChartSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="skeleton-shimmer h-52 rounded-xl" />
        <div className="flex justify-center gap-6 mt-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardCharts({ classData, genderData, feeTrendData, loading }: ChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  const displayClassData = classData.slice(0, 10)

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
        <Card className="shadow-sm hover:shadow-lg border-slate-200/60 dark:border-slate-700/60 h-full transition-all duration-300 bg-gradient-to-br from-white via-white to-teal-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-teal-950/20 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Students per Class</CardTitle>
              </div>
              <button className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium flex items-center gap-1 transition-colors">
                <FileBarChart className="w-3 h-3" />
                View Report
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={truncatedClassData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13, 148, 136, 0.06)', radius: 4 }} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="students" name="Students" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={20} />
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
        <Card className="shadow-sm hover:shadow-lg border-slate-200/60 dark:border-slate-700/60 h-full transition-all duration-300 bg-gradient-to-br from-white via-white to-teal-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-teal-950/20 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <PieChartIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gender Distribution</CardTitle>
              </div>
              <button className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium flex items-center gap-1 transition-colors">
                <FileBarChart className="w-3 h-3" />
                View Report
              </button>
            </div>
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
                        fill={TEAL_PALETTE[index % TEAL_PALETTE.length]}
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
                      style={{ backgroundColor: TEAL_PALETTE[index % TEAL_PALETTE.length] }}
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
        <Card className="shadow-sm hover:shadow-lg border-slate-200/60 dark:border-slate-700/60 h-full transition-all duration-300 bg-gradient-to-br from-white via-white to-teal-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-teal-950/20 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fee Collection Trend</CardTitle>
              </div>
              <button className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium flex items-center gap-1 transition-colors">
                <FileBarChart className="w-3 h-3" />
                View Report
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={feeTrendData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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
