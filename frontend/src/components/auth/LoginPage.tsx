'use client'

import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Info,
  UserCircle,
  Users,
  Phone,
  UserRound,
  Building2,
  GraduationCap,
  MapPin,
  LockKeyhole,
  CheckCircle2,
  Headset,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import { markTabAuthenticated } from '@/lib/tab-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [parentLoginName, setParentLoginName] = useState('')
  const [parentLoginPhone, setParentLoginPhone] = useState('')
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
        markTabAuthenticated()
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

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authApi.parentLogin(parentLoginName, parentLoginPhone)
      if (result.success && result.data) {
        const userData = result.data.user || result.data
        markTabAuthenticated()
        login({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatar,
        })
        toast.success('Welcome to Parent Portal', {
          description: `Signed in as ${userData.name}`,
        })
      } else {
        setError(result.error || 'Unable to sign in parent portal.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#eef7f4_0%,#f8fbff_54%,#fff8ed_100%)] dark:bg-[linear-gradient(140deg,#020617_0%,#0f172a_52%,#111827_100%)] p-4 sm:p-6 lg:p-10 relative overflow-hidden flex items-center justify-center">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none opacity-[0.07] dark:opacity-[0.04] hidden sm:block">
        <div className="relative w-[400px] h-[200px]">
          <div className="absolute bottom-0 left-[50px] w-[300px] h-[140px] bg-teal-800 rounded-t-lg" />
          <div className="absolute bottom-[140px] left-[30px] w-0 h-0 border-l-[170px] border-r-[170px] border-b-[60px] border-l-transparent border-r-transparent border-b-teal-700" />
          {[0, 1, 2, 3].map((i) => (
            <div key={`w1-${i}`} className="absolute bottom-[70px] bg-white/30 w-[40px] h-[35px] rounded-sm" style={{ left: `${80 + i * 65}px` }} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <div key={`w2-${i}`} className="absolute bottom-[25px] bg-white/30 w-[40px] h-[35px] rounded-sm" style={{ left: `${80 + i * 65}px` }} />
          ))}
          <div className="absolute bottom-0 left-[175px] w-[50px] h-[55px] bg-teal-600 rounded-t-md" />
          <div className="absolute bottom-[195px] left-[200px] w-[2px] h-[40px] bg-slate-400" />
          <div className="absolute bottom-[225px] left-[202px] w-[25px] h-[15px] bg-teal-500 rounded-r" />
          <div className="absolute bottom-0 left-0 w-[55px] h-[100px] bg-teal-800/80 rounded-tl-lg" />
          <div className="absolute bottom-0 right-0 w-[55px] h-[100px] bg-teal-800/80 rounded-tr-lg" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="grid lg:grid-cols-[1.06fr_1fr] gap-6 lg:gap-0 rounded-lg border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/65 backdrop-blur-xl shadow-[0_35px_80px_-35px_rgba(2,6,23,0.35)] overflow-hidden">
          <section className="hidden lg:flex flex-col justify-between p-10 xl:p-12 bg-[linear-gradient(155deg,#0f766e_0%,#0f766e_55%,#115e59_100%)] text-white relative overflow-hidden">
            <div className="relative z-10 text-center">
              <img src="/logo.png" alt="Uwezo School" className="w-24 h-24 rounded-lg bg-white/90 p-2.5 object-contain shadow-2xl mx-auto" />
              <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight">Uwezo School</h1>
              <p className="mt-2 text-white/80 text-base">Nurturing Excellence, Building Futures</p>

              <div className="mt-8 space-y-3 text-sm flex flex-col items-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
                  <Building2 className="h-4 w-4" />
                  School Management System
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
                  <GraduationCap className="h-4 w-4" />
                  Staff and Parent Portal
                </div>
              </div>

              <div className="mt-8 space-y-2.5 text-sm text-white/90 flex flex-col items-center">
                <p className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  Real-time academic and finance operations
                </p>
                <p className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  Secure role-based access control
                </p>
                <p className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  Connected staff and parent experience
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-2 text-sm text-white/80">
              <MapPin className="h-4 w-4" />
              Eldoret, Kenya
            </div>
          </section>

          <section className="p-5 sm:p-8 lg:p-10 xl:p-12">
            <div className="lg:hidden mb-6 text-center">
              <img src="/logo.png" alt="Uwezo School" className="w-16 h-16 rounded-lg bg-white p-1.5 object-contain shadow-md mx-auto" />
              <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">Uwezo School</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Nurturing Excellence, Building Futures</p>
            </div>

            <Card className="rounded-lg border-slate-200/70 dark:border-slate-700/70 shadow-xl bg-white/95 dark:bg-slate-900/85">
              <CardHeader className="text-center pb-3 pt-6 px-6">
                <CardTitle className="text-2xl text-slate-900 dark:text-slate-100">Welcome Back</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Sign in to continue to your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm rounded-lg p-3 flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  <span>Secure access for staff and registered guardians.</span>
                </div>

                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full bg-slate-100 dark:bg-slate-800/80 p-1 h-12 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                    <TabsTrigger
                      value="signin"
                      className="h-10 font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100"
                    >
                      Staff Login
                    </TabsTrigger>
                    <TabsTrigger
                      value="parent"
                      className="h-10 font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100"
                    >
                      Parent Login
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="mt-5">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email or Phone</Label>
                        <div className="relative group">
                          <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <Input
                            id="email"
                            type="text"
                            placeholder="you@email.com or 0712345678"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-12 pl-10 border-slate-200 dark:border-slate-700 focus-visible:ring-teal-500/70"
                            disabled={loading}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Use your staff email address or registered phone number.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</Label>
                          <button
                            type="button"
                            onClick={() => toast.info('Please contact the school admin to reset your password.')}
                            className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
                            tabIndex={-1}
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative group">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-12 pr-12 border-slate-200 dark:border-slate-700 focus-visible:ring-teal-500/70"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Password is case-sensitive.</p>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-teal-500/20"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            <LockKeyhole className="w-4 h-4 mr-2" />
                            Sign In
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="parent" className="mt-5">
                    <div className="rounded-lg border border-teal-100 dark:border-teal-900/60 bg-gradient-to-r from-teal-50/80 to-cyan-50/70 dark:from-teal-900/20 dark:to-cyan-900/10 p-3 text-xs text-slate-600 dark:text-slate-300 mb-4 flex gap-2">
                      <Users className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-100">Auto-linked parent access</p>
                        <p>Guardian access uses the details saved in student records.</p>
                      </div>
                    </div>

                    <form onSubmit={handleParentLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="parentLoginName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Guardian Name</Label>
                        <div className="relative group">
                          <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <Input
                            id="parentLoginName"
                            type="text"
                            placeholder="e.g. Jane Njeri"
                            value={parentLoginName}
                            onChange={(e) => setParentLoginName(e.target.value)}
                            required
                            className="h-12 pl-10 border-slate-200 dark:border-slate-700 focus-visible:ring-teal-500/70"
                            disabled={loading}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Enter the guardian full name as saved in student records.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="parentLoginPhone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Guardian Phone</Label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <Input
                            id="parentLoginPhone"
                            type="text"
                            placeholder="0712345678"
                            value={parentLoginPhone}
                            onChange={(e) => setParentLoginPhone(e.target.value)}
                            required
                            className="h-12 pl-10 border-slate-200 dark:border-slate-700 focus-visible:ring-teal-500/70"
                            disabled={loading}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Use the same number provided during student registration.</p>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-teal-500/20"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Open Parent Portal'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/60 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  <Headset className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  Need help signing in? Contact the school administration desk.
                </div>
              </CardContent>
            </Card>

            <div className="mt-5 text-center space-y-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                (c) {new Date().getFullYear()} Uwezo School - Eldoret, Kenya
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-teal-200/70 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Version 4.0
                </span>
                <span>-</span>
                <span>School Management System</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Powered by Uwezo School Tech</p>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
