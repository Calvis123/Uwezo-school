'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-9 w-9 relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors',
        className
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun
        className={cn(
          'w-[18px] h-[18px] transition-all duration-300',
          isDark ? 'rotate-90 scale-0 opacity-0 absolute' : 'rotate-0 scale-100 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'w-[18px] h-[18px] transition-all duration-300',
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0 absolute'
        )}
      />
    </Button>
  )
}
