'use client'

import React from 'react'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional custom fallback UI — receives the error and reset fn */
  fallback?: (error: Error, reset: () => void) => React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React class component that catches render errors in its child tree
 * and displays a friendly error recovery UI.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }

    // Custom fallback
    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset)
    }

    // Default fallback UI
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md border-red-200 dark:border-red-900/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-md shadow-red-500/25">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              An unexpected error occurred while rendering this section. You can try again or return to the dashboard.
            </p>

            {/* Show error message in a subtle box */}
            {this.state.error.message && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-3 text-left">
                <p className="text-xs font-mono text-red-700 dark:text-red-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button
                onClick={this.reset}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '/'
                }}
                className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
