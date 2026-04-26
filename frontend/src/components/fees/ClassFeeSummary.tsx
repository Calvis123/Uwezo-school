'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock3, ReceiptText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { feesApi } from '@/lib/api'
import { refApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'

interface TermSummary {
  termId: string
  termName: string
  expected: number
  paid: number
  balance: number
  collectionRate: number
}

interface StudentTerm {
  termId: string
  termName: string
  expected: number
  paid: number
  balance: number
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
  paymentCount: number
  lastPaymentAt: string | null
  lastPaymentMethod: string | null
  lastPaymentAmount: number
  suggestedFeeStructureId: string | null
}

interface StudentRow {
  id: string
  name: string
  admissionNumber: string
  perTerm: StudentTerm[]
  overall: {
    expected: number
    paid: number
    balance: number
  }
  overallStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
  nextDueTermId: string | null
}

interface ClassSummary {
  id: string
  name: string
  stream?: string | null
  studentCount: number
  termSummary: TermSummary[]
  students: StudentRow[]
}

interface ClassFeeSummaryData {
  year: number
  terms: { id: string; name: string; year: number }[]
  classes: ClassSummary[]
}

interface ClassFeeSummaryProps {
  classId?: string
  termId?: string
  mode?: 'compact' | 'detailed'
  onUpdateStudent?: (payload: {
    studentId: string
    studentName: string
    classId?: string
    termId: string | null
    suggestedFeeStructureId?: string | null
  }) => void
}

function fmt(amount: number) {
  return `KES ${Math.round(amount).toLocaleString()}`
}

export function ClassFeeSummary({
  classId,
  termId,
  mode = 'detailed',
  onUpdateStudent,
}: ClassFeeSummaryProps) {
  const { terms: storeTerms, setTerms } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<ClassFeeSummaryData | null>(null)

  useEffect(() => {
    if (storeTerms.length > 0) return
    refApi.terms().then((res) => {
      if (res.success && res.data) setTerms(res.data)
    })
  }, [storeTerms.length, setTerms])

  const selectedYear = useMemo(() => {
    if (!storeTerms.length) return undefined
    if (termId) {
      const selectedTerm = storeTerms.find((term: any) => term.id === termId)
      if (selectedTerm?.year) return Number(selectedTerm.year)
    }
    const currentYear = new Date().getFullYear()
    const years = storeTerms.map((term: any) => Number(term.year) || 0).filter((year: number) => year > 0)
    const latestYear = years.includes(currentYear) ? currentYear : Math.max(...years)
    return Number.isFinite(latestYear) && latestYear > 0 ? latestYear : undefined
  }, [termId, storeTerms])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await feesApi.classSummary({
          classId,
          ...(selectedYear ? { year: selectedYear } : {}),
        })
        if (res.success && res.data) setData(res.data as ClassFeeSummaryData)
        else setData(null)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [classId, selectedYear])

  const displayTerms = useMemo(() => {
    const allTerms = data?.terms || []
    if (termId) return allTerms.filter((term) => term.id === termId)
    return allTerms.slice(0, 3)
  }, [data?.terms, termId])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-red-600 dark:text-red-300">
          Failed to load class fee summary.
        </CardContent>
      </Card>
    )
  }

  if (!data || data.classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-slate-500 dark:text-slate-400">
          No class summary available.
        </CardContent>
      </Card>
    )
  }

  if (mode === 'compact') {
    return (
      <Card className="border-slate-200/80 dark:border-slate-700/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Class Summary by Term ({data.year})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.classes.map((cls) => (
            <div
              key={cls.id}
              className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 p-3 bg-white/70 dark:bg-slate-900/30"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {cls.name} {cls.stream || ''}
                </p>
                <Badge variant="secondary">{cls.studentCount} students</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {displayTerms.map((term) => {
                  const stat = cls.termSummary.find((item) => item.termId === term.id)
                  const rate = stat?.collectionRate || 0
                  return (
                    <div
                      key={term.id}
                      className="rounded-md bg-slate-50 dark:bg-slate-800 px-2.5 py-2 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{term.name}</p>
                        <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400">{rate.toFixed(1)}%</span>
                      </div>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Paid: {fmt(stat?.paid || 0)}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Balance: {fmt(stat?.balance || 0)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 dark:border-slate-700/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-teal-600" />
            Class Fees by Term ({data.year}) — Paid vs Balance per Student
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Payment statistics are shown per term for each student.
          </p>
        </CardHeader>
      </Card>

      {data.classes.map((cls) => (
        <Card key={cls.id} className="border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">
                {cls.name} {cls.stream || ''} ({cls.studentCount} students)
              </CardTitle>
              <div className="flex gap-1.5 flex-wrap">
                {displayTerms.map((term) => {
                  const stat = cls.termSummary.find((item) => item.termId === term.id)
                  return (
                    <Badge
                      key={term.id}
                      className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border"
                    >
                      {term.name}: {fmt(stat?.balance || 0)} balance
                    </Badge>
                  )
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission</TableHead>
                  {displayTerms.map((term) => (
                    <TableHead key={term.id}>{term.name} (Paid / Balance)</TableHead>
                  ))}
                  <TableHead>Last Payment Record</TableHead>
                  <TableHead className="w-28">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cls.students.map((student) => {
                  const allTermEntries = student.perTerm.filter((entry) => entry.lastPaymentAt)
                  const recent = allTermEntries.sort((a, b) => {
                    return new Date(b.lastPaymentAt || 0).getTime() - new Date(a.lastPaymentAt || 0).getTime()
                  })[0]
                  const dueTerm =
                    student.perTerm.find((entry) => entry.termId === student.nextDueTermId) || student.perTerm[0]
                  const cleared = student.overallStatus === 'PAID'

                  return (
                    <TableRow key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cleared ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          )}
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {student.overallStatus === 'UNPAID'
                                ? 'Unpaid'
                                : student.overallStatus === 'PARTIAL'
                                  ? 'Partially paid'
                                  : 'Fee cleared'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{student.admissionNumber}</TableCell>
                      {displayTerms.map((term) => {
                        const info = student.perTerm.find((entry) => entry.termId === term.id)
                        return (
                          <TableCell key={term.id}>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">{fmt(info?.paid || 0)}</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">{fmt(info?.balance || 0)}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {info?.paymentCount || 0} payment(s)
                            </p>
                          </TableCell>
                        )
                      })}
                      <TableCell>
                        {recent?.lastPaymentAt ? (
                          <div className="text-xs leading-5">
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {fmt(recent.lastPaymentAmount)} via {recent.lastPaymentMethod}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              {format(new Date(recent.lastPaymentAt), 'dd MMM yyyy, HH:mm')}
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock3 className="w-3 h-3" />
                              {recent.paymentCount} payment(s) in {recent.termName}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No payment record yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-900/30"
                          onClick={() =>
                            onUpdateStudent?.({
                              studentId: student.id,
                              studentName: student.name,
                              classId: cls.id,
                              termId: dueTerm?.termId || null,
                              suggestedFeeStructureId: dueTerm?.suggestedFeeStructureId || null,
                            })
                          }
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>

          <CardContent className="pt-4">
            <div className="rounded-lg border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-900/10">
              <div className="px-4 py-3 border-b border-amber-200/70 dark:border-amber-800/40">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Pending Amounts per Student (Term-wise)
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {cls.name} {cls.stream || ''} — students with outstanding balances only.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission</TableHead>
                      {displayTerms.map((term) => (
                        <TableHead key={term.id}>{term.name} Pending</TableHead>
                      ))}
                      <TableHead>Total Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cls.students.filter((student) => student.overallStatus !== 'PAID').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3 + displayTerms.length} className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                          No pending balances in this class.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cls.students
                        .filter((student) => student.overallStatus !== 'PAID')
                        .map((student) => (
                          <TableRow
                            key={`${student.id}-pending`}
                            className="hover:bg-amber-50/40 dark:hover:bg-amber-900/10"
                          >
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-xs text-slate-500">{student.admissionNumber}</TableCell>
                            {displayTerms.map((term) => {
                              const info = student.perTerm.find((entry) => entry.termId === term.id)
                              const pending = info?.balance || 0
                              return (
                                <TableCell key={term.id}>
                                  {info?.paymentStatus === 'UNPAID' ? (
                                    <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Unpaid</span>
                                  ) : pending > 0 ? (
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{fmt(pending)}</span>
                                  ) : (
                                    <span className="text-xs text-emerald-700 dark:text-emerald-300">Cleared</span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell>
                              {student.overallStatus === 'UNPAID' ? (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  Unpaid
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  {fmt(student.overall.balance)}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
