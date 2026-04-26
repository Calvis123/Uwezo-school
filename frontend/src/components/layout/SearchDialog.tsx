'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Search,
  GraduationCap,
  Users,
  BookOpen,
  ArrowRight,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { readJson } from '@/lib/read-json'

interface SearchResult {
  id: string
  name: string
  subtitle: string
  type: 'student' | 'user' | 'class'
  href: string
  className?: string
  role?: string
  level?: string
}

interface SearchResponse {
  success: boolean
  data?: {
    students: SearchResult[]
    users: SearchResult[]
    classes: SearchResult[]
  }
}

const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  student: {
    icon: GraduationCap,
    label: 'Students',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/30',
  },
  user: {
    icon: Users,
    label: 'Users',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
  },
  class: {
    icon: BookOpen,
    label: 'Classes',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
  },
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { navigateTo } = useAppStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const flatResults = results?.data
    ? [
        ...(results.data.students || []),
        ...(results.data.users || []),
        ...(results.data.classes || []),
      ]
    : []

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setSelectedIdx(-1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpenChange])

  // Debounced search
  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
      setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data: SearchResponse = await readJson<SearchResponse>(res)
      if (data.success) {
        setResults(data)
        setSelectedIdx(-1)
      }
    } catch {
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.min(prev + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && flatResults[selectedIdx]) {
        handleSelect(flatResults[selectedIdx])
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  const handleSelect = (result: SearchResult) => {
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
    }
  }

  const hasResults = results?.data && (
    (results.data.students?.length || 0) +
    (results.data.users?.length || 0) +
    (results.data.classes?.length || 0)
  ) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, users, classes..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null) }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {query.length < 2 && (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Type at least 2 characters to search</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Search across students, staff, and classes
              </p>
            </div>
          )}

          {query.length >= 2 && loading && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-teal-500 rounded-full animate-spin" />
                Searching...
              </div>
            </div>
          )}

          {query.length >= 2 && !loading && !hasResults && (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No results found for &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try different keywords
              </p>
            </div>
          )}

          {hasResults && results.data && (
            <div className="py-2">
              {(['students', 'users', 'classes'] as const).map((category) => {
                const items = results.data![category]
                if (!items || items.length === 0) return null

                const config = categoryConfig[category]
                const CategoryIcon = config.icon
                const globalStartIdx = flatResults.findIndex((r) => r.type === items[0]?.type)

                return (
                  <div key={category} className="mb-1">
                    {/* Category header */}
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <CategoryIcon className={cn('w-3.5 h-3.5', config.color)} />
                      <span className={cn('text-[11px] font-semibold uppercase tracking-wider', config.color)}>
                        {config.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500">
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
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIdx(flatIdx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-900/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          )}
                        >
                          {/* Icon */}
                          <div className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            config.bg
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
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {item.subtitle}
                              </p>
                              {item.className && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">· {item.className}</span>
                              )}
                              {item.role && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                  {item.role}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <ArrowRight className={cn(
                            'w-4 h-4 flex-shrink-0 transition-colors',
                            isSelected
                              ? 'text-teal-500'
                              : 'text-slate-300 dark:text-slate-600'
                          )} />
                        </motion.button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {query.length >= 2 && hasResults && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 font-mono text-[10px]">
                <ArrowRight className="w-2.5 h-2.5 rotate-90" />
              </kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <kbd className="inline-flex h-5 items-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 font-mono text-[10px]">
                ↵
              </kbd>
              <span>select</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <kbd className="inline-flex h-5 items-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 font-mono text-[10px]">
                esc
              </kbd>
              <span>close</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
