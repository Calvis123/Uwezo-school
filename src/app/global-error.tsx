'use client'

import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-md">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-xl shadow-red-500/20">
              <AlertTriangle className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Something went wrong
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                A critical error occurred. Please reload the page to continue.
              </p>
            </div>

            {error.message && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
                {error.message}
              </p>
            )}

            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
