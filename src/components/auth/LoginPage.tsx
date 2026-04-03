'use client'

import { useState } from 'react'
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAppStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authApi.login(email, password)
      if (result.success && result.data) {
        login(result.data.user || result.data)
        toast.success('Welcome back!', {
          description: `Signed in as ${result.data.user?.name || result.data.name}`,
        })
      } else {
        setError(result.error || 'Invalid credentials. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail('admin@olives.co.ke')
    setPassword('admin123')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* School Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 shadow-lg shadow-teal-200 mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Olives School</h1>
          <p className="text-slate-500 text-sm mt-1">Nurturing Excellence, Building Futures</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-slate-200/60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center mb-2">Demo Credentials</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-slate-600 border-dashed"
                onClick={fillDemo}
                disabled={loading}
              >
                Use Demo Account
              </Button>
              <div className="mt-2 text-center text-xs text-slate-400">
                <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">admin@olives.co.ke</span>
                {' / '}
                <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">admin123</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
