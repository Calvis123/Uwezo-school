'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GraduationCap,
  School,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  trend?: { value: number; direction: 'up' | 'down' }
  delay?: number
  loading?: boolean
}

export function StatCard({ title, value, subtitle, icon, color, bgColor, borderColor, trend, delay = 0, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 overflow-hidden bg-white dark:bg-slate-800">
        <div className={cn('h-1', borderColor)} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-11 w-11 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all duration-200 overflow-hidden bg-white dark:bg-slate-800">
        <div className={cn('h-1', borderColor)} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
              <div className="flex items-center gap-2">
                {trend && (
                  <div className={cn(
                    'flex items-center gap-0.5 text-[11px] font-semibold',
                    trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  )}>
                    {trend.direction === 'up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(trend.value)}%
                  </div>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
                )}
              </div>
            </div>
            <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shadow-sm', bgColor)}>
              <span className={color}>{icon}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface StatsCardsProps {
  stats: {
    totalStudents: number
    totalClasses: number
    feeCollection: number
    attendanceRate: number
    activeStudents: number
    feeCollectionRate?: number
    feeOutstanding?: number
    activeTerm?: string | null
  } | null
  loading: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Students"
        value={stats?.totalStudents ?? 0}
        subtitle={stats ? `${stats.activeStudents} active` : undefined}
        icon={<GraduationCap className="w-5 h-5" />}
        color="text-teal-600 dark:text-teal-400"
        bgColor="bg-teal-50 dark:bg-teal-900/40"
        borderColor="bg-gradient-to-r from-teal-400 to-teal-600"
        trend={{ value: 3.2, direction: 'up' }}
        delay={0}
        loading={loading}
      />
      <StatCard
        title="Total Classes"
        value={stats?.totalClasses ?? 0}
        subtitle="Across all levels"
        icon={<School className="w-5 h-5" />}
        color="text-sky-600 dark:text-sky-400"
        bgColor="bg-sky-50 dark:bg-sky-900/40"
        borderColor="bg-gradient-to-r from-sky-400 to-sky-600"
        delay={0.1}
        loading={loading}
      />
      <StatCard
        title="Fee Collection"
        value={stats ? `KES ${(stats.feeCollection || 0).toLocaleString()}` : '0'}
        subtitle={stats?.feeCollectionRate ? `${stats.feeCollectionRate}% collected` : 'This term'}
        icon={<DollarSign className="w-5 h-5" />}
        color="text-amber-600 dark:text-amber-400"
        bgColor="bg-amber-50 dark:bg-amber-900/40"
        borderColor="bg-gradient-to-r from-amber-400 to-amber-600"
        trend={stats?.feeCollectionRate ? { value: stats.feeCollectionRate, direction: stats.feeCollectionRate >= 50 ? 'up' : 'down' } : undefined}
        delay={0.2}
        loading={loading}
      />
      <StatCard
        title="Attendance Rate"
        value={stats ? `${(stats.attendanceRate || 0).toFixed(1)}%` : '0%'}
        subtitle="Overall this month"
        icon={<TrendingUp className="w-5 h-5" />}
        color="text-green-600 dark:text-green-400"
        bgColor="bg-green-50 dark:bg-green-900/40"
        borderColor="bg-gradient-to-r from-green-400 to-green-600"
        trend={stats?.attendanceRate ? { value: stats.attendanceRate, direction: stats.attendanceRate >= 80 ? 'up' : 'down' } : undefined}
        delay={0.3}
        loading={loading}
      />
    </div>
  )
}
