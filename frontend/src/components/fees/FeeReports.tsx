'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, AlertTriangle, BarChart3, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi } from '@/lib/api'
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

export function FeeReports({ termId }: { termId?: string }) {
  const { terms, setTerms } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [classSummary, setClassSummary] = useState<any>(null)

  useEffect(() => {
    if (terms.length > 0) return
    refApi.terms().then((res) => {
      if (res.success && res.data) setTerms(res.data)
    })
  }, [terms.length, setTerms])

  const selectedYear = (() => {
    if (!terms.length) return undefined
    if (termId) {
      const selectedTerm = terms.find((term: any) => term.id === termId)
      if (selectedTerm?.year) return Number(selectedTerm.year)
    }
    const currentYear = new Date().getFullYear()
    const years = terms.map((term: any) => Number(term.year) || 0).filter((year: number) => year > 0)
    const latestYear = years.includes(currentYear) ? currentYear : Math.max(...years)
    return Number.isFinite(latestYear) && latestYear > 0 ? latestYear : undefined
  })()

  useEffect(() => {
    loadStats()
  }, [termId, selectedYear])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [statsRes, summaryRes] = await Promise.all([
        feesApi.stats(termId),
        feesApi.classSummary({
          ...(selectedYear ? { year: selectedYear } : {}),
        }),
      ])

      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      else setStats(null)

      if (summaryRes.success && summaryRes.data) setClassSummary(summaryRes.data)
      else setClassSummary(null)
    } catch {
      setStats(null)
      setClassSummary(null)
    } finally {
      setLoading(false)
    }
  }

  const classWiseData = (() => {
    const summaryClasses = classSummary?.classes || []
    if (!summaryClasses.length) return []
    const selectedTermId =
      termId ||
      classSummary?.terms?.[0]?.id

    return summaryClasses.map((c: any) => {
      const stat = c.termSummary?.find((s: any) => s.termId === selectedTermId) || c.termSummary?.[0]
      return {
        name: c.name,
        total: Number(stat?.expected || 0),
        collected: Number(stat?.paid || 0),
        students: Number(c.studentCount || 0),
      }
    })
  })()

  const outstandingData = classWiseData
    .map((c: any) => ({ name: c.name, balance: Math.max(0, c.total - c.collected), students: c.students }))
    .filter((c: any) => c.balance > 0)

  const totalOutstanding = outstandingData.reduce((sum, c) => sum + c.balance, 0)
  const totalStudentsAtRisk = outstandingData.reduce((sum, c) => sum + c.students, 0)
  const collectionRate = stats?.collectionRate || 0

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
                KES {stats?.totalCollected?.toLocaleString() || '0'}
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
                KES {stats?.totalOutstanding?.toLocaleString() || '0'}
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
                  {stats?.collectionRate?.toFixed(1) || '0.0'}%
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
                  const rate = c.total > 0 ? Math.round((c.collected / c.total) * 100) : 0
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
