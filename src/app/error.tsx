'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Copy, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useState } from 'react'
import { toast } from 'sonner'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    console.error('[ErrorPage]', error)
  }, [error])

  const handleCopyError = async () => {
    const text = [
      `Error: ${error.message}`,
      error.digest ? `Digest: ${error.digest}` : '',
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Stack:\n${error.stack || 'N/A'}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Error details copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy error details')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <Card className="w-full max-w-lg border-teal-200 dark:border-teal-900/50 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-400 via-red-500 to-teal-500 shadow-lg">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
            An unexpected error occurred. Please try again or report this issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details */}
          {error.message && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={reset}
              className="flex-1 gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={handleCopyError}
              variant="outline"
              className="flex-1 gap-2 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
            >
              {copied ? (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Report This Error
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
