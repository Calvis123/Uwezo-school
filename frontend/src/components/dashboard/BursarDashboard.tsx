'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bus,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  FileDown,
  LineChart,
  Receipt,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi, transportApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClassFeeSummary } from '@/components/fees/ClassFeeSummary'

interface BursarStats {
  totalCollected: number
  totalExpected: number
  totalOutstanding: number
  collectionRate: number
  totalStudents: number
  fullyPaid: number
}

interface TransportFeeSummary {
  termLabel: string
  paidStudents: number
  assignedStudents: number
  unassignedStudents: number
  totalPaid: number
}

export function BursarDashboard() {
  const { navigateTo } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [stats, setStats] = useState<BursarStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [transportSummary, setTransportSummary] = useState<TransportFeeSummary | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const [statsRes, txRes, eligibleRes, termsRes] = await Promise.all([
        feesApi.stats(),
        feesApi.transactions({}),
        transportApi.eligibleStudents(),
        refApi.terms(),
      ])

      if (statsRes.success && statsRes.data) {
        setStats({
          totalCollected: statsRes.data.totalCollected || 0,
          totalExpected: statsRes.data.totalExpected || 0,
          totalOutstanding: statsRes.data.totalOutstanding || 0,
          collectionRate: statsRes.data.collectionRate || 0,
          totalStudents: statsRes.data.studentSummary?.totalStudents || 0,
          fullyPaid: statsRes.data.studentSummary?.fullyPaid || 0,
        })
      } else {
        setStats(null)
      }

      const txItems = txRes.success ? txRes.data?.items || txRes.data || [] : []
      setRecentPayments(txItems.slice(0, 8))

      if (eligibleRes.success) {
        const eligibleStudents = eligibleRes.data || []
        const paidStudents = eligibleStudents.length
        const assignedStudents = eligibleStudents.filter((student: any) => student.assigned).length
        const totalPaid = eligibleStudents.reduce(
          (sum: number, student: any) => sum + Number(student.paidTransport || 0),
          0
        )
        const termId = (eligibleRes as any).meta?.termId
        const matchedTerm = termsRes.success
          ? (termsRes.data || []).find((term: any) => term.id === termId)
          : null
        const termLabel = matchedTerm ? `${matchedTerm.name} ${matchedTerm.year}` : 'Active Term'

        setTransportSummary({
          termLabel,
          paidStudents,
          assignedStudents,
          unassignedStudents: Math.max(0, paidStudents - assignedStudents),
          totalPaid,
        })
      } else {
        setTransportSummary(null)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const today = useMemo(() => format(new Date(), 'EEEE, MMMM d, yyyy'), [])
  const expectedAmount = stats?.totalExpected || 0
  const progressValue = expectedAmount > 0 ? Math.min(100, ((stats?.totalCollected || 0) / expectedAmount) * 100) : 0

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-5 text-white shadow-lg md:p-6"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-sm" />
        <div className="absolute -bottom-4 -right-2 h-24 w-24 rounded-full bg-white/10 blur-sm" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/90">Bursar</p>
              <h2 className="mt-0.5 text-xl font-semibold">Finance Operations Dashboard</h2>
              <p className="mt-1 text-sm text-emerald-100">
                Fee collection, receipts, balances, and class-by-term payment control.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-200">
                <CalendarDays className="h-3.5 w-3.5" />
                {today}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge className="border-white/20 bg-white/15 text-white">Finance Workspace</Badge>
              <Badge className="border-white/20 bg-white/10 text-emerald-50">
                <Sparkles className="mr-1 h-3 w-3" />
                Bursar View
              </Badge>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-emerald-100">Collection Progress</span>
              <span className="font-semibold text-white">{progressValue.toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-100">
              <span>Expected: KES {expectedAmount.toLocaleString()}</span>
              <span>Collected: KES {(stats?.totalCollected || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <HeroMini label="Outstanding" value={`KES ${(stats?.totalOutstanding || 0).toLocaleString()}`} />
            <HeroMini label="Students Cleared" value={`${stats?.fullyPaid || 0}/${stats?.totalStudents || 0}`} />
          </div>
        </div>
      </motion.div>

      {error && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Could not load bursar dashboard data.</p>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading || !stats ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard
              icon={Wallet}
              label="Collected"
              value={`KES ${stats.totalCollected.toLocaleString()}`}
              iconClassName="from-emerald-500 to-green-500"
              toneClassName="from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800"
            />
            <StatCard
              icon={DollarSign}
              label="Outstanding"
              value={`KES ${stats.totalOutstanding.toLocaleString()}`}
              iconClassName="from-amber-500 to-orange-500"
              toneClassName="from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800"
            />
            <StatCard
              icon={LineChart}
              label="Collection Rate"
              value={`${stats.collectionRate}%`}
              iconClassName="from-sky-500 to-blue-500"
              toneClassName="from-sky-50 to-white dark:from-sky-900/20 dark:to-slate-800"
            />
            <StatCard
              icon={CreditCard}
              label="Fully Paid Students"
              value={`${stats.fullyPaid}/${stats.totalStudents}`}
              iconClassName="from-violet-500 to-indigo-500"
              toneClassName="from-violet-50 to-white dark:from-violet-900/20 dark:to-slate-800"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-emerald-200/60 bg-gradient-to-b from-white to-emerald-50/30 dark:border-emerald-800/40 dark:from-slate-800 dark:to-slate-800 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Bursar Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickButton icon={Receipt} label="Record Payment" onClick={() => navigateTo('fees')} />
            <QuickButton icon={FileDown} label="Export Fee Report" onClick={() => navigateTo('export')} />
            <QuickButton icon={CircleDollarSign} label="Open Fee Ledger" onClick={() => navigateTo('fees')} />
            <QuickButton icon={Bus} label="Check Bus Assignments" onClick={() => navigateTo('transport')} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800 md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                Recent Fee Transactions
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigateTo('fees')}>
                Open Fees <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 rounded-md" />)
            ) : recentPayments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent payments recorded.</p>
            ) : (
              recentPayments.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/70 px-3 py-2 transition-colors hover:bg-slate-50/80 dark:border-slate-700/70 dark:hover:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800 dark:text-slate-200">
                      {tx.student ? `${tx.student.firstName} ${tx.student.lastName}` : 'Unknown student'}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {tx.receiptNumber} | {tx.paymentMethod} | {format(new Date(tx.createdAt), 'dd MMM, HH:mm')}
                    </p>
                  </div>
                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    KES {Number(tx.amount || 0).toLocaleString()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-sky-200/60 dark:border-sky-800/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bus className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Transport Fee Status
            </CardTitle>
            <Badge variant="outline" className="text-[11px]">
              {transportSummary?.termLabel || 'Active Term'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 rounded-lg" />
          ) : !transportSummary ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No transport payment data available for the active term yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MiniMetric label="Paid Students" value={transportSummary.paidStudents} tone="emerald" />
              <MiniMetric label="Bus Assigned" value={transportSummary.assignedStudents} tone="sky" />
              <MiniMetric label="Pending Assignment" value={transportSummary.unassignedStudents} tone="amber" />
              <MiniMetric
                label="Transport Collected"
                value={`KES ${transportSummary.totalPaid.toLocaleString()}`}
                tone="teal"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ClassFeeSummary mode="compact" />
    </div>
  )
}

function HeroMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-emerald-100">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconClassName,
  toneClassName,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  iconClassName?: string
  toneClassName?: string
}) {
  return (
    <Card
      className={`border-slate-200/70 bg-gradient-to-br shadow-sm dark:border-slate-700/70 ${toneClassName || 'from-white to-slate-50 dark:from-slate-800 dark:to-slate-800'}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300">{label}</p>
            <p className="text-sm font-bold text-slate-900 tabular-nums dark:text-slate-100 lg:text-base">{value}</p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${iconClassName || 'from-emerald-500 to-green-500'}`}
          >
            <Icon className="h-4.5 w-4.5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      className="h-10 justify-start border-slate-200/80 bg-white/80 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700/80 dark:bg-slate-900/40 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

function MiniMetric({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: string | number
  tone?: 'slate' | 'emerald' | 'sky' | 'amber' | 'teal'
}) {
  const toneClasses: Record<string, string> = {
    slate: 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/70',
    emerald: 'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200/70 dark:border-emerald-800/40',
    sky: 'bg-sky-50/70 dark:bg-sky-900/20 border-sky-200/70 dark:border-sky-800/40',
    amber: 'bg-amber-50/70 dark:bg-amber-900/20 border-amber-200/70 dark:border-amber-800/40',
    teal: 'bg-teal-50/70 dark:bg-teal-900/20 border-teal-200/70 dark:border-teal-800/40',
  }

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

