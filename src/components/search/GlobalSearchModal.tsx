'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  Search,
  GraduationCap,
  Users,
  BookOpen,
  Megaphone,
  ArrowRight,
  X,
  CircleDot,
  LayoutDashboard,
  DollarSign,
  FileText,
  ClipboardCheck,
  Bell,
  Settings,
  Clock,
  Trash2,
  Sparkles,
  School,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { searchApi } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────

interface StudentSearchResult {
  id: string
  name: string
  subtitle: string
  type: 'student'
  href: string
  className: string
  gender: string
  feeBalance: number
  feeTotal: number
  feePaid: number
}

interface GenericSearchResult {
  id: string
  name: string
  subtitle: string
  type: 'user' | 'class' | 'notice'
  href: string
  role?: string
  level?: string
  category?: string
  publishedAt?: string | null
}

type SearchResultItem = StudentSearchResult | GenericSearchResult

interface NavigationItem {
  id: string
  label: string
  icon: React.ElementType
  viewId: string
  keywords: string[]
}

interface SearchResponse {
  success: boolean
  data?: {
    students: SearchResultItem[]
    users: SearchResultItem[]
    classes: SearchResultItem[]
    notices: SearchResultItem[]
  }
  error?: string
}

interface RecentSearch {
  query: string
  timestamp: number
}

// ── Constants ─────────────────────────────────────────────────────

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    viewId: 'dashboard',
    keywords: ['home', 'overview', 'main', 'stats', 'summary'],
  },
  {
    id: 'nav-students',
    label: 'Students',
    icon: GraduationCap,
    viewId: 'students',
    keywords: ['pupil', 'learner', 'enroll', 'admission', 'register'],
  },
  {
    id: 'nav-classes',
    label: 'Class Management',
    icon: School,
    viewId: 'classes',
    keywords: ['classroom', 'stream', 'form', 'grade'],
  },
  {
    id: 'nav-fees',
    label: 'Fees Management',
    icon: DollarSign,
    viewId: 'fees',
    keywords: ['payment', 'transaction', 'balance', 'invoice', 'mpesa', 'money'],
  },
  {
    id: 'nav-exams',
    label: 'Exams & Results',
    icon: FileText,
    viewId: 'exams',
    keywords: ['test', 'assessment', 'marks', 'scores', 'grade', 'cat', 'report'],
  },
  {
    id: 'nav-attendance',
    label: 'Attendance',
    icon: ClipboardCheck,
    viewId: 'attendance',
    keywords: ['present', 'absent', 'late', 'register', 'daily'],
  },
  {
    id: 'nav-notices',
    label: 'Notices',
    icon: Bell,
    viewId: 'notices',
    keywords: ['announcement', 'bulletin', 'news', 'circular', 'memo'],
  },
  {
    id: 'nav-settings',
    label: 'Settings',
    icon: Settings,
    viewId: 'settings',
    keywords: ['config', 'preference', 'admin', 'system'],
  },
]

const RECENT_SEARCHES_KEY = 'olives-search-recent'
const MAX_RECENT_SEARCHES = 5

// ── Category config ───────────────────────────────────────────────

const categoryConfig: Record<string, {
  icon: React.ElementType
  label: string
  color: string
  bg: string
  badgeBg: string
}> = {
  navigation: {
    icon: Sparkles,
    label: 'Quick Navigate',
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    badgeBg: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  },
  recent: {
    icon: Clock,
    label: 'Recent',
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  },
  students: {
    icon: GraduationCap,
    label: 'Students',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/30',
    badgeBg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  },
  users: {
    icon: Users,
    label: 'Users',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  },
  classes: {
    icon: BookOpen,
    label: 'Classes',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  notices: {
    icon: Megaphone,
    label: 'Notices',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  },
}

const API_CATEGORY_ORDER = ['students', 'users', 'classes', 'notices'] as const

// ── Helpers ───────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount === 0) return 'Paid'
  return `KES ${amount.toLocaleString()}`
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}

function loadRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    const existing = loadRecentSearches()
    const filtered = existing.filter(r => r.query.toLowerCase() !== query.toLowerCase())
    const updated = [{ query, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // Silently fail - localStorage might be unavailable
  }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // Silently fail
  }
}

// ── Component ─────────────────────────────────────────────────────

interface GlobalSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const { navigateTo } = useAppStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Filter navigation items by query ──────────────────────────
  const filteredNavItems = useMemo(() => {
    if (!query.trim()) return NAVIGATION_ITEMS
    const lower = query.toLowerCase()
    return NAVIGATION_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.keywords.some((kw) => kw.includes(lower))
    )
  }, [query])

  // ── Filtered recent searches ──────────────────────────────────
  const filteredRecentSearches = useMemo(() => {
    if (!query.trim()) return recentSearches
    const lower = query.toLowerCase()
    return recentSearches.filter((r) => r.query.toLowerCase().includes(lower))
  }, [query, recentSearches])

  // ── Flat list for keyboard navigation ─────────────────────────
  const flatResults = useMemo(() => {
    const items: Array<{ type: string; id: string; label: string; action: () => void }> = []

    // Navigation items
    for (const nav of filteredNavItems) {
      items.push({
        type: 'navigation',
        id: nav.id,
        label: nav.label,
        action: () => {
          navigateTo(nav.viewId)
          onOpenChange(false)
        },
      })
    }

    // Recent searches
    for (const recent of filteredRecentSearches) {
      items.push({
        type: 'recent',
        id: `recent-${recent.query}`,
        label: recent.query,
        action: () => {
          setQuery(recent.query)
          // The useEffect watching query will trigger a search
        },
      })
    }

    // API results
    if (results) {
      for (const cat of API_CATEGORY_ORDER) {
        const catItems = results[cat] || []
        for (const item of catItems) {
          items.push({
            type: item.type,
            id: item.id,
            label: item.name,
            action: () => handleSelect(item),
          })
        }
      }
    }

    return items
  }, [filteredNavItems, filteredRecentSearches, results, navigateTo, onOpenChange])

  // ── Load recent searches from localStorage ───────────────────
  useEffect(() => {
    if (open) {
      setRecentSearches(loadRecentSearches())
    }
  }, [open])

  // ── Focus input when dialog opens ────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setSelectedIdx(-1)
      setError(null)
      setLoading(false)
      setRecentSearches(loadRecentSearches())
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpenChange, open])

  // ── Debounced search ──────────────────────────────────────────
  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await searchApi.global(searchQuery)
      if (res.success && res.data) {
        setResults(res.data)
        setSelectedIdx(-1)
      } else {
        setError(res.error || 'Search failed')
        setResults(null)
      }
    } catch {
      setError('Network error')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  // ── Scroll selected item into view ────────────────────────────
  useEffect(() => {
    if (selectedIdx < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-result-idx]')
    if (items[selectedIdx]) {
      (items[selectedIdx] as HTMLElement).scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIdx])

  // ── Handle API result selection ───────────────────────────────
  const handleSelect = (result: SearchResultItem) => {
    // Save to recent searches
    saveRecentSearch(result.name)

    onOpenChange(false)
    switch (result.type) {
      case 'student':
        navigateTo('student-detail', { studentId: result.id })
        break
      case 'user':
        navigateTo('users')
        break
      case 'class':
        navigateTo('students')
        break
      case 'notice':
        navigateTo('notices')
        break
    }
  }

  // ── Keyboard navigation ───────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.min(prev + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && flatResults[selectedIdx]) {
        flatResults[selectedIdx].action()
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  // ── Total API result count ────────────────────────────────────
  const totalApiResults = results
    ? API_CATEGORY_ORDER.reduce((sum, cat) => sum + (results[cat]?.length || 0), 0)
    : 0

  // ── Has any results to display ────────────────────────────────
  const hasAnyContent = filteredNavItems.length > 0 || filteredRecentSearches.length > 0 || totalApiResults > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-xl [&>button]:hidden">
        <DialogTitle className="sr-only">Global Search</DialogTitle>

        {/* ── Search Input ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
          <Search className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, classes, navigate anywhere..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-0 focus:ring-0 transition-all duration-300"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-slate-200 dark:border-slate-600 border-t-teal-500 rounded-full animate-spin flex-shrink-0" />
          )}
          {query && !loading && (
            <button
              onClick={() => { setQuery(''); setResults(null); setError(null) }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 shadow-sm">
            ESC
          </kbd>
        </div>

        {/* ── Results Area ─────────────────────────────────────── */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ── Empty initial state (no query) ──────────────── */}
            {!query.trim() && (
              <motion.div
                key="empty-initial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Navigation suggestions */}
                {filteredNavItems.length > 0 && (
                  <NavigationGroup
                    items={filteredNavItems}
                    selectedIdx={selectedIdx}
                    flatResults={flatResults}
                    onSelect={(item) => {
                      navigateTo(item.viewId)
                      onOpenChange(false)
                    }}
                    onMouseEnter={(idx) => setSelectedIdx(idx)}
                  />
                )}

                {/* Recent searches */}
                {filteredRecentSearches.length > 0 && (
                  <RecentSearchGroup
                    searches={filteredRecentSearches}
                    selectedIdx={selectedIdx}
                    flatResults={flatResults}
                    onClearAll={clearRecentSearches}
                    onSelect={(query) => setQuery(query)}
                    onMouseEnter={(idx) => setSelectedIdx(idx)}
                  />
                )}

                {/* Placeholder when no recent searches */}
                {filteredRecentSearches.length === 0 && (
                  <div className="px-4 py-3">
                    <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 py-8 text-center">
                      <Search className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Type at least 2 characters to search
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Search across students, staff, classes, and notices
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Loading state ─────────────────────────────────── */}
            {loading && query.length >= 2 && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="py-4 px-4 space-y-3"
              >
                {/* Navigation skeleton */}
                <div className="space-y-1 mb-3">
                  <Skeleton className="h-4 w-24 mb-2" />
                  {[0, 1].map((i) => (
                    <div key={`nav-${i}`} className="flex items-center gap-3 py-1.5">
                      <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Student skeleton */}
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20 mb-2" />
                  {[0, 1, 2].map((i) => (
                    <div key={`stu-${i}`} className="flex items-center gap-3 py-1.5">
                      <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-[60%]" />
                        <Skeleton className="h-3 w-[40%]" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Error state ───────────────────────────────────── */}
            {!loading && error && query.length >= 2 && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="py-14 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                  <CircleDot className="w-5 h-5 text-red-400 dark:text-red-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Something went wrong
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {error}
                </p>
              </motion.div>
            )}

            {/* ── No results state ──────────────────────────────── */}
            {!loading && !error && query.length >= 2 && !hasAnyContent && (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="py-14 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No results found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Try different keywords or check the spelling
                </p>
              </motion.div>
            )}

            {/* ── Results with query ───────────────────────────── */}
            {query.length >= 2 && !loading && !error && hasAnyContent && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="py-2"
              >
                {/* Navigation matches */}
                {filteredNavItems.length > 0 && (
                  <NavigationGroup
                    items={filteredNavItems}
                    selectedIdx={selectedIdx}
                    flatResults={flatResults}
                    onSelect={(item) => {
                      navigateTo(item.viewId)
                      onOpenChange(false)
                    }}
                    onMouseEnter={(idx) => setSelectedIdx(idx)}
                  />
                )}

                {/* API result categories */}
                {results && API_CATEGORY_ORDER.map((category) => {
                  const items = results[category]
                  if (!items || items.length === 0) return null

                  const config = categoryConfig[category]
                  const CategoryIcon = config.icon
                  const globalStartIdx = flatResults.findIndex(
                    (r) => r.type === items[0]?.type && r.id === items[0]?.id
                  )

                  return (
                    <div key={category} className="mb-1">
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-4 py-1.5">
                        <CategoryIcon className={cn('w-3.5 h-3.5', config.color)} />
                        <span className={cn('text-[11px] font-semibold uppercase tracking-wider', config.color)}>
                          {config.label}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] h-4 px-1.5 font-medium', config.badgeBg)}
                        >
                          {items.length}
                        </Badge>
                      </div>

                      {/* Category items */}
                      {items.map((item, idx) => {
                        const flatIdx = globalStartIdx + idx
                        const isSelected = flatIdx === selectedIdx

                        return (
                          <motion.button
                            key={item.id}
                            data-result-idx={flatIdx}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.025, duration: 0.15 }}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIdx(flatIdx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100',
                              isSelected
                                ? 'bg-teal-50 dark:bg-teal-900/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                          >
                            {/* Icon */}
                            <div className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                              config.bg,
                              isSelected && 'ring-1 ring-teal-200 dark:ring-teal-700'
                            )}>
                              <CategoryIcon className={cn('w-4 h-4', config.color)} />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-medium truncate',
                                isSelected
                                  ? 'text-teal-700 dark:text-teal-300'
                                  : 'text-slate-900 dark:text-slate-100'
                              )}>
                                <HighlightedText text={item.name} query={query} />
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {item.type === 'student' && (
                                  <>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {item.subtitle}
                                    </span>
                                    {item.className && (
                                      <>
                                        <span className="text-slate-300 dark:text-slate-600">·</span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                          {item.className}
                                        </span>
                                      </>
                                    )}
                                  </>
                                )}
                                {item.type !== 'student' && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right side badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Student fee balance badge */}
                              {item.type === 'student' && 'feeBalance' in item && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px] h-5 px-2 font-medium tabular-nums hidden sm:inline-flex',
                                    item.feeBalance === 0
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  )}
                                >
                                  {item.feeBalance === 0 ? '✓ Paid' : formatCurrency(item.feeBalance)}
                                </Badge>
                              )}

                              {/* Gender indicator for students */}
                              {item.type === 'student' && 'gender' in item && (
                                <span className={cn(
                                  'text-xs',
                                  item.gender === 'MALE'
                                    ? 'text-sky-500 dark:text-sky-400'
                                    : 'text-pink-500 dark:text-pink-400'
                                )}>
                                  {item.gender === 'MALE' ? '♂' : '♀'}
                                </span>
                              )}

                              {/* Role badge for users */}
                              {item.type === 'user' && 'role' in item && item.role && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-medium hidden sm:inline-flex">
                                  {item.role.replace('_', ' ')}
                                </Badge>
                              )}

                              {/* Category badge for notices */}
                              {item.type === 'notice' && 'category' in item && item.category && (
                                <Badge variant="secondary" className={cn('text-[9px] h-4 px-1.5 font-medium hidden sm:inline-flex', config.badgeBg)}>
                                  {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                                </Badge>
                              )}

                              {/* Arrow */}
                              <ArrowRight className={cn(
                                'w-3.5 h-3.5 transition-all duration-100',
                                isSelected
                                  ? 'text-teal-500 translate-x-0.5'
                                  : 'text-slate-300 dark:text-slate-600'
                              )} />
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )
                })}

                {/* Recent searches matching query */}
                {!loading && query.trim() && filteredRecentSearches.length > 0 && results && totalApiResults > 0 && (
                  <RecentSearchGroup
                    searches={filteredRecentSearches}
                    selectedIdx={selectedIdx}
                    flatResults={flatResults}
                    onClearAll={clearRecentSearches}
                    onSelect={(q) => setQuery(q)}
                    onMouseEnter={(idx) => setSelectedIdx(idx)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        {query.length >= 2 && !loading && hasAnyContent && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {totalApiResults > 0
                ? `${totalApiResults} result${totalApiResults !== 1 ? 's' : ''} found`
                : 'Navigate to a page'}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-1 font-mono text-[9px]">
                  ↑↓
                </kbd>
                <span>navigate</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <kbd className="inline-flex h-4 items-center rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-1 font-mono text-[9px]">
                  ↵
                </kbd>
                <span>open</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <kbd className="inline-flex h-4 items-center rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-1 font-mono text-[9px]">
                  esc
                </kbd>
                <span>close</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function NavigationGroup({
  items,
  selectedIdx,
  flatResults,
  onSelect,
  onMouseEnter,
}: {
  items: NavigationItem[]
  selectedIdx: number
  flatResults: Array<{ type: string; id: string; label: string }>
  onSelect: (item: NavigationItem) => void
  onMouseEnter: (idx: number) => void
}) {
  const config = categoryConfig.navigation

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Sparkles className={cn('w-3.5 h-3.5', config.color)} />
        <span className={cn('text-[11px] font-semibold uppercase tracking-wider', config.color)}>
          {config.label}
        </span>
      </div>
      {items.map((item, idx) => {
        const flatIdx = flatResults.findIndex(
          (r) => r.type === 'navigation' && r.id === item.id
        )
        const isSelected = flatIdx === selectedIdx
        const Icon = item.icon

        return (
          <motion.button
            key={item.id}
            data-result-idx={flatIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.025, duration: 0.15 }}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onMouseEnter(flatIdx)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100',
              isSelected
                ? 'bg-teal-50 dark:bg-teal-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
              config.bg,
              isSelected && 'ring-1 ring-teal-200 dark:ring-teal-700'
            )}>
              <Icon className={cn('w-4 h-4', config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                isSelected
                  ? 'text-teal-700 dark:text-teal-300'
                  : 'text-slate-900 dark:text-slate-100'
              )}>
                {item.label}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Go to {item.label.toLowerCase()}
              </p>
            </div>
            <ArrowRight className={cn(
              'w-3.5 h-3.5 transition-all duration-100',
              isSelected
                ? 'text-teal-500 translate-x-0.5'
                : 'text-slate-300 dark:text-slate-600'
            )} />
          </motion.button>
        )
      })}
    </div>
  )
}

function RecentSearchGroup({
  searches,
  selectedIdx,
  flatResults,
  onClearAll,
  onSelect,
  onMouseEnter,
}: {
  searches: RecentSearch[]
  selectedIdx: number
  flatResults: Array<{ type: string; id: string; label: string }>
  onClearAll: () => void
  onSelect: (query: string) => void
  onMouseEnter: (idx: number) => void
}) {
  const config = categoryConfig.recent

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2">
          <Clock className={cn('w-3.5 h-3.5', config.color)} />
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider', config.color)}>
            {config.label}
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>
      {searches.map((recent, idx) => {
        const flatIdx = flatResults.findIndex(
          (r) => r.type === 'recent' && r.id === `recent-${recent.query}`
        )
        const isSelected = flatIdx === selectedIdx

        return (
          <motion.button
            key={recent.query}
            data-result-idx={flatIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.025, duration: 0.15 }}
            onClick={() => onSelect(recent.query)}
            onMouseEnter={() => onMouseEnter(flatIdx)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-100',
              isSelected
                ? 'bg-teal-50 dark:bg-teal-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0',
              config.bg
            )}>
              <Clock className={cn('w-3.5 h-3.5', config.color)} />
            </div>
            <p className={cn(
              'text-sm truncate flex-1',
              isSelected
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-slate-600 dark:text-slate-300'
            )}>
              {recent.query}
            </p>
            <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
          </motion.button>
        )
      })}
    </div>
  )
}
