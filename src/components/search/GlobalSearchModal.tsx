'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Search,
  GraduationCap,
  Users,
  BookOpen,
  Megaphone,
  ArrowRight,
  X,
  CircleDot,
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

interface SearchResultItem {
  id: string
  name: string
  subtitle: string
  type: 'student' | 'user' | 'class' | 'notice'
  href: string
  className?: string
  role?: string
  level?: string
  category?: string
  publishedAt?: string | null
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

// ── Category config ───────────────────────────────────────────────

const categoryConfig: Record<string, {
  icon: React.ElementType
  label: string
  color: string
  bg: string
  badgeBg: string
}> = {
  student: {
    icon: GraduationCap,
    label: 'Students',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/30',
    badgeBg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  },
  user: {
    icon: Users,
    label: 'Users',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  },
  class: {
    icon: BookOpen,
    label: 'Classes',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  notice: {
    icon: Megaphone,
    label: 'Notices',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  },
}

const categoryOrder = ['students', 'users', 'classes', 'notices'] as const

// ── Component ─────────────────────────────────────────────────────

interface GlobalSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const { navigateTo, setCurrentView } = useAppStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build flat list for keyboard navigation
  const flatResults: SearchResultItem[] = results
    ? categoryOrder.flatMap((cat) => results[cat] || [])
    : []

  // ── Focus input when dialog opens ──────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setSelectedIdx(-1)
      setError(null)
      setLoading(false)
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
        handleSelect(flatResults[selectedIdx])
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  // ── Handle result selection ───────────────────────────────────
  const handleSelect = (result: SearchResultItem) => {
    onOpenChange(false)
    switch (result.type) {
      case 'student':
        navigateTo('student-detail', { studentId: result.id })
        break
      case 'user':
        setCurrentView('users')
        break
      case 'class':
        setCurrentView('students')
        break
      case 'notice':
        setCurrentView('notices')
        break
    }
  }

  // ── Total result count ────────────────────────────────────────
  const totalResults = results
    ? categoryOrder.reduce((sum, cat) => sum + (results[cat]?.length || 0), 0)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-xl">
        <DialogTitle className="sr-only">Global Search</DialogTitle>

        {/* ── Search Input ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
          <Search className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, staff, classes, notices..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
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
        <div ref={listRef} className="max-h-[380px] overflow-y-auto">
          {/* Empty initial state */}
          <AnimatePresence mode="wait">
            {query.length < 2 && !results && (
              <motion.div
                key="empty-initial"
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
                  Search for anything
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px] mx-auto">
                  Type at least 2 characters to search across students, staff, classes, and notices
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  {categoryOrder.map((cat) => {
                    const config = categoryConfig[cat]
                    const Icon = config.icon
                    return (
                      <div key={cat} className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                        <Icon className={cn('w-3 h-3', config.color)} />
                        <span>{config.label}</span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Loading state */}
            {loading && query.length >= 2 && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="py-4 px-4 space-y-3"
              >
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-[60%]" />
                      <Skeleton className="h-3 w-[40%]" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                ))}
              </motion.div>
            )}

            {/* Error state */}
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

            {/* No results state */}
            {!loading && !error && query.length >= 2 && totalResults === 0 && (
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

            {/* Results list */}
            {!loading && !error && totalResults > 0 && results && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="py-2"
              >
                {categoryOrder.map((category) => {
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
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {item.subtitle}
                                </p>
                                {item.type === 'student' && item.className && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                    · {item.className}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Category badge + arrow */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.type === 'user' && item.role && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-medium hidden sm:inline-flex">
                                  {item.role.replace('_', ' ')}
                                </Badge>
                              )}
                              {item.type === 'notice' && item.category && (
                                <Badge variant="secondary" className={cn('text-[9px] h-4 px-1.5 font-medium hidden sm:inline-flex', config.badgeBg)}>
                                  {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                                </Badge>
                              )}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        {query.length >= 2 && !loading && totalResults > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
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
