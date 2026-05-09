'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { FeeStructures } from './FeeStructures'
import { FeePayments } from './FeePayments'
import { FeeReports } from './FeeReports'
import { useAppStore } from '@/lib/store'
import { refApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { BarChart3, CreditCard, Layers3 } from 'lucide-react'
import { cn } from '@/lib/utils'

function sortTermsBySequence(a: any, b: any) {
  const aNum = Number(String(a.name).match(/\d+/)?.[0] || '99')
  const bNum = Number(String(b.name).match(/\d+/)?.[0] || '99')
  return aNum - bNum
}

function pickLatestYearTerm(terms: any[]) {
  if (!terms.length) return null
  const currentYear = new Date().getFullYear()
  const years = terms.map((term: any) => Number(term.year) || 0).filter((year: number) => year > 0)
  const preferredYear = years.includes(currentYear) ? currentYear : Math.max(...years)
  const inLatestYear = terms
    .filter((term: any) => Number(term.year) === preferredYear)
    .sort(sortTermsBySequence)
  return inLatestYear.find((term: any) => term.status === 'ACTIVE') || inLatestYear[0] || null
}

export function FeesPage() {
  const { user, terms, setTerms } = useAppStore()
  const isBursar = user?.role === 'BURSAR'
  const [selectedTermId, setSelectedTermId] = useState('')
  const [activeSection, setActiveSection] = useState<'structures' | 'payments' | 'reports'>(
    'structures'
  )

  useEffect(() => {
    if (terms.length > 0) return
    refApi.terms().then((res) => {
      if (res.success && res.data) setTerms(res.data)
    })
  }, [terms.length, setTerms])

  const termTabs = useMemo(() => {
    if (!terms.length) return []
    const currentYear = new Date().getFullYear()
    const years = terms.map((term: any) => Number(term.year) || 0).filter((year: number) => year > 0)
    const year = years.includes(currentYear) ? currentYear : Math.max(...years)
    const inYear = terms
      .filter((term: any) => Number(term.year) === year)
      .sort(sortTermsBySequence)
    return inYear.slice(0, 3)
  }, [terms])

  const fallbackTermId = pickLatestYearTerm(termTabs)?.id || ''
  const effectiveTermId = selectedTermId || fallbackTermId
  const selectedTerm = termTabs.find((term: any) => term.id === effectiveTermId)
  const sectionCards = [
    {
      id: 'structures' as const,
      title: 'Fee Structures',
      description: 'Set class and term fees',
      icon: Layers3,
      activeClass: 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    },
    {
      id: 'payments' as const,
      title: 'Payments',
      description: 'Record and track payments',
      icon: CreditCard,
      activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    {
      id: 'reports' as const,
      title: 'Reports',
      description: 'View summaries and gaps',
      icon: BarChart3,
      activeClass: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    },
  ]
  const selectedSection = sectionCards.find((section) => section.id === activeSection)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fees Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isBursar
            ? 'Track class fees by term, update student payments, and keep clean payment records.'
            : 'Manage fee structures, payments, and reports'}
        </p>
      </div>
      {termTabs.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2 px-1">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Term Navigation
            </p>
            {selectedTerm && (
              <Badge variant="outline" className="text-[11px]">
                {selectedTerm.name} {selectedTerm.year}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {termTabs.map((term: any) => (
              <button
                key={term.id}
                onClick={() => setSelectedTermId(term.id)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  effectiveTermId === term.id
                    ? 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`}
              >
                <p className="text-sm font-semibold">{term.name}</p>
                <p className="text-[11px] opacity-80">{term.year}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="sticky top-2 z-20">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-2 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Quick Navigation
            </p>
            <Badge variant="outline" className="text-[11px]">
              {selectedTerm ? `${selectedTerm.name} ${selectedTerm.year}` : 'All Terms'} ·{' '}
              {selectedSection?.title || 'Section'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {sectionCards.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-left transition',
                    isActive
                      ? section.activeClass
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <p className="text-xs sm:text-sm font-semibold">{section.title}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as 'structures' | 'payments' | 'reports')}>
        <TabsContent value="structures" className="mt-4">
          <FeeStructures initialStructureTermId={effectiveTermId || undefined} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <FeePayments termId={effectiveTermId || undefined} />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <FeeReports termId={effectiveTermId || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
