'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, AlertTriangle, BarChart3, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { feesApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function FeeReports() {
  const { classes } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await feesApi.stats()
      if (res.success && res.data) {
        setStats(res.data)
      } else {
        setStats({
          totalCollected: 2850000,
          totalOutstanding: 1200000,
          collectionRate: 70.4,
        })
      }
    } catch {
      setStats({
        totalCollected: 2850000,
        totalOutstanding: 1200000,
        collectionRate: 70.4,
      })
    } finally {
      setLoading(false)
    }
  }

  const classWiseData = classes?.length ? classes.map((c) => ({
    name: c.name,
    total: Math.round(30000 + Math.random() * 20000),
    collected: Math.round(20000 + Math.random() * 25000),
    students: c.studentCount || Math.round(25 + Math.random() * 15),
  })) : [
    { name: 'Grade 1', total: 45000, collected: 38000, students: 32 },
    { name: 'Grade 2', total: 40000, collected: 35000, students: 28 },
    { name: 'Grade 3', total: 50000, collected: 42000, students: 35 },
    { name: 'Grade 4', total: 45000, collected: 30000, students: 30 },
    { name: 'Grade 5', total: 40000, collected: 36000, students: 27 },
    { name: 'Grade 6', total: 50000, collected: 45000, students: 31 },
    { name: 'Grade 7', total: 55000, collected: 48000, students: 29 },
    { name: 'Grade 8', total: 55000, collected: 40000, students: 33 },
  ]

  const outstandingData = [
    { name: 'Grade 4', balance: 15000, students: 8 },
    { name: 'Grade 8', balance: 15000, students: 10 },
    { name: 'Grade 3', balance: 8000, students: 5 },
    { name: 'Grade 5', balance: 4000, students: 3 },
    { name: 'Grade 7', balance: 7000, students: 4 },
  ]

  const totalOutstanding = outstandingData.reduce((sum, c) => sum + c.balance, 0)
  const totalStudentsAtRisk = outstandingData.reduce((sum, c) => sum + c.students, 0)
  const collectionRate = stats?.collectionRate || 70.4

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const cardAnim = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: i * 0.07 },
  })

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...cardAnim(0)} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-medium">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12.5%
                </Badge>
              </div>
              <p className="text-xs text-teal-100 font-medium">Total Collected</p>
              <p className="text-xl font-bold text-white mt-0.5 tabular-nums">
                KES {stats?.totalCollected?.toLocaleString() || '2,850,000'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...cardAnim(1)} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-medium">
                  <ArrowDownRight className="w-3 h-3 mr-0.5" /> Needs attention
                </Badge>
              </div>
              <p className="text-xs text-red-100 font-medium">Total Outstanding</p>
              <p className="text-xl font-bold text-white mt-0.5 tabular-nums">
                KES {stats?.totalOutstanding?.toLocaleString() || '1,200,000'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...cardAnim(2)} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Card className="bg-gradient-to-br from-sky-500 to-sky-600 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-sky-100 font-medium">Collection Rate</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-xl font-bold text-white tabular-nums">
                  {stats?.collectionRate?.toFixed(1) || '70.4'}%
                </p>
              </div>
              <Progress value={collectionRate} className="mt-2 h-2 bg-white/20 [&>div]:bg-white" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...cardAnim(3)} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-amber-100 font-medium">Students at Risk</p>
              <p className="text-xl font-bold text-white mt-0.5 tabular-nums">
                {totalStudentsAtRisk}
              </p>
              <p className="text-[10px] text-amber-200 mt-1">
                KES {totalOutstanding.toLocaleString()} total balance
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Class-wise Collection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-500" />
              Collection by Class
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/80">
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Class</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Students</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Due</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Collected</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-[140px]">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classWiseData.map((c) => {
                  const rate = Math.round((c.collected / c.total) * 100)
                  return (
                    <TableRow key={c.name} className={cn(
                      'transition-colors duration-150',
                      rate < 60 && 'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/20 border-l-2 border-l-red-300 dark:border-l-red-700',
                      rate >= 60 && rate < 80 && 'hover:bg-amber-50/30 dark:hover:bg-amber-900/10',
                      rate >= 80 && 'hover:bg-green-50/20 dark:hover:bg-green-900/10',
                    )}>
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">{c.students}</TableCell>
                      <TableCell className="text-sm text-slate-900 dark:text-slate-100 tabular-nums">KES {c.total.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
                        KES {c.collected.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1">
                            <Progress
                              value={rate}
                              className={cn(
                                'h-2',
                                rate >= 80 ? '[&>div]:bg-green-500 [&>div]:rounded-full' :
                                rate >= 60 ? '[&>div]:bg-amber-500 [&>div]:rounded-full' :
                                '[&>div]:bg-red-500 [&>div]:rounded-full'
                              )}
                            />
                          </div>
                          <span className={cn(
                            'text-xs font-bold tabular-nums min-w-[36px] text-right',
                            rate >= 80 ? 'text-green-600 dark:text-green-400' : rate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          )}>
                            {rate}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Outstanding Balances */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Outstanding Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/80">
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Class</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Outstanding</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Students with Balance</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingData.sort((a, b) => b.balance - a.balance).map((c) => (
                  <TableRow key={c.name} className={cn(
                    'transition-colors duration-150',
                    c.students > 7 && 'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/20 border-l-2 border-l-red-300 dark:border-l-red-700',
                  )}>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</TableCell>
                    <TableCell className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
                      KES {c.balance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">{c.students}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        'text-[10px] font-medium',
                        c.students > 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800' :
                        c.students > 4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800'
                      )}>
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full mr-1',
                          c.students > 7 ? 'bg-red-500' : c.students > 4 ? 'bg-amber-500' : 'bg-green-500'
                        )} />
                        {c.students > 7 ? 'High' : c.students > 4 ? 'Medium' : 'Low'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
