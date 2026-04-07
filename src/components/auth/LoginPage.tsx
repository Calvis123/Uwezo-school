'use client'

import { useState } from 'react'
import { GraduationCap, Eye, EyeOff, Loader2, Shield, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const demoCredentials = [
  { role: 'Super Admin', email: 'admin@olives.co.ke', password: 'admin123', color: 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-300' },
  { role: 'Teacher', email: 'teacher@olives.co.ke', password: 'teacher123', color: 'bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-900/30 dark:border-sky-800/50 dark:text-sky-300' },
  { role: 'Parent', email: 'parent@olives.co.ke', password: 'parent123', color: 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/50 dark:text-amber-300' },
]

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
        const userData = result.data.user || result.data
        login({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatar,
        })
        toast.success('Welcome back!', {
          description: `Signed in as ${userData.name}`,
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

  const loginAsDemo = async (demoEmail: string, demoPass: string) => {
    // Fill in form fields for visual feedback
    setEmail(demoEmail)
    setPassword(demoPass)
    setLoading(true)
    setError('')
    try {
      const result = await authApi.login(demoEmail, demoPass)
      if (result.success && result.data) {
        const userData = result.data.user || result.data
        login({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatar,
        })
        toast.success('Welcome back!', {
          description: `Signed in as ${userData.name}`,
        })
      } else {
        setError(result.error || 'Invalid credentials.')
      }
    } catch (err) {
      console.error('Demo login error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-teal-100/40 dark:bg-teal-900/20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-100/30 dark:bg-amber-900/15 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-teal-50/60 dark:bg-teal-900/10 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 right-1/3 w-32 h-32 rounded-full bg-amber-50/50 dark:bg-amber-900/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* School Building Illustration - CSS Shapes */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none opacity-[0.07] dark:opacity-[0.04] hidden sm:block">
        {/* Main building */}
        <div className="relative w-[400px] h-[200px]">
          {/* Base */}
          <div className="absolute bottom-0 left-[50px] w-[300px] h-[140px] bg-teal-800 rounded-t-lg" />
          {/* Roof */}
          <div className="absolute bottom-[140px] left-[30px] w-0 h-0 border-l-[170px] border-r-[170px] border-b-[60px] border-l-transparent border-r-transparent border-b-teal-700" />
          {/* Windows row 1 */}
          {[0, 1, 2, 3].map((i) => (
            <div key={`w1-${i}`} className="absolute bottom-[70px] bg-white/30 w-[40px] h-[35px] rounded-sm" style={{ left: `${80 + i * 65}px` }} />
          ))}
          {/* Windows row 2 */}
          {[0, 1, 2, 3].map((i) => (
            <div key={`w2-${i}`} className="absolute bottom-[25px] bg-white/30 w-[40px] h-[35px] rounded-sm" style={{ left: `${80 + i * 65}px` }} />
          ))}
          {/* Door */}
          <div className="absolute bottom-0 left-[175px] w-[50px] h-[55px] bg-teal-600 rounded-t-md" />
          {/* Flag pole */}
          <div className="absolute bottom-[195px] left-[200px] w-[2px] h-[40px] bg-slate-400" />
          <div className="absolute bottom-[225px] left-[202px] w-[25px] h-[15px] bg-teal-500 rounded-r" />
          {/* Left wing */}
          <div className="absolute bottom-0 left-0 w-[55px] h-[100px] bg-teal-800/80 rounded-tl-lg" />
          {/* Right wing */}
          <div className="absolute bottom-0 right-0 w-[55px] h-[100px] bg-teal-800/80 rounded-tr-lg" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* School Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/50 mb-4 relative">
            <GraduationCap className="w-10 h-10 text-white" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
              <span className="text-[8px] text-white font-bold">✓</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Olives School</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Nurturing Excellence, Building Futures</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-slate-200/60 dark:border-slate-700/60 shadow-slate-200/50 dark:shadow-slate-950/50 bg-white dark:bg-slate-800">
          <CardHeader className="text-center pb-2 pt-6 px-6">
            <CardTitle className="text-xl text-slate-900 dark:text-slate-100">Welcome Back</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm rounded-lg p-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline"
                    tabIndex={-1}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200',
                      'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
                      'hover:bg-slate-100 dark:hover:bg-slate-700',
                      showPassword && 'text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                    )}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-medium shadow-md shadow-teal-200/50 dark:shadow-teal-900/50 transition-all"
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

            {/* Divider with "or" */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">or try a demo</span>
              </div>
            </div>

            {/* Demo credentials */}
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mb-2 font-medium uppercase tracking-wider">
                Quick Access
              </p>
              {demoCredentials.map((demo) => (
                <motion.button
                  key={demo.role}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => loginAsDemo(demo.email, demo.password)}
                  disabled={loading}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all hover:shadow-sm',
                    demo.color,
                    'cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{demo.role}</p>
                    <p className="text-[11px] font-mono opacity-75 truncate">{demo.email}</p>
                  </div>
                  <span className="text-[10px] font-mono opacity-60 hidden sm:block">{demo.password}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer with version */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © 2025 Olives Schools — Eldoret, Kenya
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400" />
              Version 3.0
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-600">•</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">School Management System</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
