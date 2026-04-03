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
  delay?: number
  loading?: boolean
}

export function StatCard({ title, value, subtitle, icon, color, bgColor, delay = 0, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
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
      <Card className="shadow-sm border-slate-200/60 hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">{title}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              {subtitle && (
                <p className={cn('text-xs font-medium', color)}>{subtitle}</p>
              )}
            </div>
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', bgColor)}>
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
        color="text-teal-600"
        bgColor="bg-teal-50"
        delay={0}
        loading={loading}
      />
      <StatCard
        title="Total Classes"
        value={stats?.totalClasses ?? 0}
        subtitle="Across all levels"
        icon={<School className="w-5 h-5" />}
        color="text-blue-600"
        bgColor="bg-blue-50"
        delay={0.1}
        loading={loading}
      />
      <StatCard
        title="Fee Collection"
        value={stats ? `KES ${(stats.feeCollection || 0).toLocaleString()}` : '0'}
        subtitle="This term"
        icon={<DollarSign className="w-5 h-5" />}
        color="text-amber-600"
        bgColor="bg-amber-50"
        delay={0.2}
        loading={loading}
      />
      <StatCard
        title="Attendance Rate"
        value={stats ? `${(stats.attendanceRate || 0).toFixed(1)}%` : '0%'}
        subtitle="Overall this month"
        icon={<TrendingUp className="w-5 h-5" />}
        color="text-green-600"
        bgColor="bg-green-50"
        delay={0.3}
        loading={loading}
      />
    </div>
  )
}
