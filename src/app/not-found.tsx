'use client'

import { GraduationCap, Home, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

export default function NotFound() {
  const { isAuthenticated, setCurrentView } = useAppStore()

  const handleGoHome = () => {
    if (isAuthenticated) {
      setCurrentView('dashboard')
    } else {
      setCurrentView('login')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="text-center space-y-8 max-w-md">
        {/* School branding */}
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-xl shadow-teal-500/25">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Olives School
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Management System
            </p>
          </div>
        </div>

        {/* 404 display */}
        <div className="space-y-3">
          <h1 className="text-7xl font-extrabold tracking-tighter bg-gradient-to-r from-teal-500 to-teal-700 dark:from-teal-400 dark:to-teal-600 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Page Not Found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back on track.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleGoHome}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
          {!isAuthenticated && (
            <Button
              onClick={() => setCurrentView('login')}
              variant="outline"
              className="gap-2 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 px-6"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
