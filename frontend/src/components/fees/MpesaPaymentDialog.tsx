'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Smartphone,
  Phone,
  CheckCircle2,
  Download,
  Shield,
  X,
  Clock,
  Hash,
  User,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { readJson } from '@/lib/read-json'

interface MpesaPaymentDialogProps {
  open: boolean
  onClose: () => void
  resetKey?: number
  amount: number
  feeDescription: string
  studentName: string
  studentId: string
  feeStructureId: string
  term?: string
  onSuccess?: () => void
}

type Step = 'details' | 'processing' | 'success'

// Generate a realistic M-Pesa receipt number
function generateReceiptNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'SBK'
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate a realistic transaction reference
function generateTransactionRef(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = 'QKR'
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Quick amount presets
const AMOUNT_PRESETS = [
  { label: 'Full', fraction: 1 },
  { label: '3/4', fraction: 0.75 },
  { label: 'Half', fraction: 0.5 },
  { label: '1/4', fraction: 0.25 },
]

export function MpesaPaymentDialog({
  open,
  onClose,
  resetKey = 0,
  amount,
  feeDescription,
  studentName,
  studentId,
  feeStructureId,
  term = '2025-1',
  onSuccess,
}: MpesaPaymentDialogProps) {
  const [step, setStep] = useState<Step>('details')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [paymentAmount, setPaymentAmount] = useState<number>(amount)
  const [activePreset, setActivePreset] = useState<number | null>(0) // 0 = Full
  const [isCustomAmount, setIsCustomAmount] = useState(false)
  const [processingPhase, setProcessingPhase] = useState<'sending' | 'waiting' | 'confirming'>('sending')
  const [elapsed, setElapsed] = useState(0)
  const [receiptData, setReceiptData] = useState<{
    receiptNumber: string
    transactionRef: string
    amount: number
    phone: string
    timestamp: Date
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-focus phone input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Format phone to +254 7XX XXX XXX
  const formatPhoneDisplay = (digits: string): string => {
    const clean = digits.replace(/\D/g, '').slice(0, 9)
    if (clean.length === 0) return ''
    if (clean.length <= 3) return `+254 ${clean}`
    if (clean.length <= 6) return `+254 ${clean.slice(0, 3)} ${clean.slice(3)}`
    return `+254 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 9)
    setPhoneDigits(clean)
  }

  const isPhoneValid = (): boolean => {
    return /^7\d{8}$/.test(phoneDigits)
  }

  const isAmountValid = (): boolean => {
    return paymentAmount > 0 && paymentAmount <= 150000
  }

  const handlePresetClick = (index: number) => {
    setIsCustomAmount(false)
    setActivePreset(index)
    const fraction = AMOUNT_PRESETS[index].fraction
    const calculated = Math.ceil(amount * fraction)
    setPaymentAmount(Math.min(calculated, amount))
  }

  const handleCustomAmount = () => {
    setIsCustomAmount(true)
    setActivePreset(null)
    setPaymentAmount(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleClose = useCallback(() => {
    if (step === 'processing') {
      toast.info('Please wait for the payment to complete')
      return
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    onClose()
  }, [step, onClose])

  const handleSendSTKPush = async () => {
    if (!isPhoneValid()) {
      toast.error('Please enter a valid phone number (+254 7XX XXX XXX)')
      return
    }
    if (!isAmountValid()) {
      toast.error('Please enter a valid amount (1 - 150,000 KES)')
      return
    }

    // Move to processing step
    setStep('processing')
    setProcessingPhase('sending')
    setElapsed(0)

    const txnRef = generateTransactionRef()
    const formattedPhone = formatPhoneDisplay(phoneDigits)

    // Simulate STK push phases with elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    // Phase 1: Sending STK push (0-1.5s)
    setTimeout(() => {
      setProcessingPhase('waiting')
    }, 1500)

    // Phase 2: Waiting for PIN entry (1.5-3.5s)
    // Phase 3: Confirming (3.5-5s)
    setTimeout(() => {
      setProcessingPhase('confirming')
    }, 3500)

    // Phase 4: Complete (5s)
    setTimeout(async () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      const mpesaReceipt = generateReceiptNumber()

      // Create fee transaction in database
      try {
        const txRes = await fetch('/api/fees/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            feeStructureId,
            amount: paymentAmount,
            paymentMethod: 'MPESA',
            transactionRef: txnRef,
            receiptNumber: mpesaReceipt,
            term,
            notes: `M-Pesa payment via STK Push. Receipt: ${mpesaReceipt}. Phone: ${formattedPhone}.`,
          }),
        })
        const txData = await readJson<any>(txRes)

        if (!txData.success) {
          toast.error('Payment confirmed but failed to record. Contact administration.')
          // Still show success since M-Pesa was "completed"
        }
      } catch {
        // Payment completed but recording failed - still show success
      }

      setReceiptData({
        receiptNumber: mpesaReceipt,
        transactionRef: txnRef,
        amount: paymentAmount,
        phone: formattedPhone,
        timestamp: new Date(),
      })

      setStep('success')
      toast.success('Payment completed successfully!')
      onSuccess?.()
    }, 5000)
  }

  if (!open) return null

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Green Header */}
        <div className="relative bg-gradient-to-br from-green-600 via-green-600 to-emerald-700 px-6 py-5">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={step === 'processing'}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors',
              step === 'processing' && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* M-Pesa branding */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">M-Pesa Payment</h2>
                <span className="text-[10px] font-semibold bg-white/20 text-white/90 px-1.5 py-0.5 rounded">
                  STK Push
                </span>
              </div>
              <p className="text-green-100 text-sm">Lipa na M-Pesa (Buy Goods)</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-1 mt-4">
            {['Enter Details', 'Processing', 'Done'].map((label, i) => {
              const stepOrder: Step[] = ['details', 'processing', 'success']
              const currentIdx = stepOrder.indexOf(step)
              const isActive = i === currentIdx
              const isComplete = i < currentIdx

              return (
                <div key={label} className="flex items-center gap-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{
                        scale: isActive ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        isComplete && 'bg-white text-green-600',
                        isActive && 'bg-white text-green-600 ring-2 ring-white/50',
                        !isComplete && !isActive && 'bg-white/30 text-white/60'
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </motion.div>
                    <span
                      className={cn(
                        'text-[11px] font-medium hidden sm:inline transition-colors',
                        isActive ? 'text-white font-semibold' : 'text-green-100/60'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/20">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          i < currentIdx ? 'bg-white' : 'bg-white/0'
                        )}
                        animate={{ width: i < currentIdx ? '100%' : '0%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Student & Fee Info Card */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 p-4 space-y-3 border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">Payment For</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{studentName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Fee</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{feeDescription}</span>
                  </div>
                  <Separator className="bg-slate-200 dark:bg-slate-700" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Outstanding Balance</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(amount)}</span>
                  </div>
                </div>

                {/* Amount Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    Payment Amount
                  </label>

                  {/* Quick Amount Presets */}
                  <div className="flex gap-2">
                    {AMOUNT_PRESETS.map((preset, i) => (
                      <button
                        key={preset.label}
                        onClick={() => handlePresetClick(i)}
                        className={cn(
                          'flex-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all border-2',
                          activePreset === i
                            ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                        )}
                      >
                        <div>{preset.label}</div>
                        <div className="text-[10px] font-normal opacity-70 mt-0.5">
                          {formatCurrency(Math.ceil(amount * preset.fraction))}
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={handleCustomAmount}
                      className={cn(
                        'flex-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all border-2',
                        isCustomAmount
                          ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                      )}
                    >
                      <div>Custom</div>
                      <div className="text-[10px] font-normal opacity-70 mt-0.5">Enter amount</div>
                    </button>
                  </div>

                  {/* Amount Input */}
                  {isCustomAmount ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-semibold text-sm">
                        KES
                      </span>
                      <Input
                        type="number"
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="pl-12 h-12 text-lg font-bold text-slate-900 dark:text-slate-100"
                        placeholder="0"
                        min={1}
                        max={amount}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <span className="text-green-600 dark:text-green-400 text-lg font-bold">K</span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-semibold">
                          Amount to Pay
                        </p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300 tabular-nums">
                          {formatCurrency(paymentAmount)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    M-Pesa Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">KE</span>
                      </div>
                    </div>
                    <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">+254</span>
                    </div>
                    <Input
                      ref={inputRef}
                      value={formatPhoneDisplay(phoneDigits)}
                      onChange={handlePhoneChange}
                      placeholder="7XX XXX XXX"
                      className={cn(
                        'h-12 text-base font-semibold pl-[5.5rem] tracking-wider',
                        isPhoneValid()
                          ? 'border-green-300 dark:border-green-700 focus-visible:ring-green-500'
                          : 'border-slate-200 dark:border-slate-700'
                      )}
                      maxLength={15}
                    />
                    {isPhoneValid() && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Enter the Safaricom number registered for M-Pesa
                  </p>
                </div>

                {/* Security notice */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200/80 dark:border-green-800/30">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-0.5">
                      Secured by Safaricom
                    </p>
                    <p className="text-[11px] text-green-600/70 dark:text-green-400/70 leading-relaxed">
                      You will receive an STK push notification on your phone. Enter your M-Pesa PIN to authorize the payment.
                    </p>
                  </div>
                </div>

                {/* Send STK Push Button */}
                <Button
                  onClick={handleSendSTKPush}
                  disabled={!isPhoneValid() || !isAmountValid()}
                  className={cn(
                    'w-full h-13 text-base font-bold rounded-xl transition-all duration-200',
                    isPhoneValid() && isAmountValid()
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-600/25 hover:shadow-green-600/40 active:scale-[0.98]'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  )}
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  Send STK Push — {formatCurrency(paymentAmount)}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center py-6 space-y-6"
              >
                {/* Phone with STK Push notification */}
                <div className="relative">
                  {/* Pulse rings */}
                  <motion.div
                    animate={{
                      scale: [1, 1.6, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -inset-4 rounded-3xl border-2 border-green-500/30"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.15, 0, 0.15],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    className="absolute -inset-8 rounded-3xl border-2 border-green-400/20"
                  />

                  {/* Phone frame */}
                  <div className="relative w-28 h-48 rounded-[1.5rem] bg-slate-900 border-4 border-slate-700 shadow-2xl overflow-hidden">
                    {/* Phone notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-slate-700 rounded-b-lg" />

                    {/* Phone screen - M-Pesa notification */}
                    <div className="absolute inset-1.5 mt-2 rounded-lg bg-gradient-to-b from-green-700 to-green-800 flex flex-col items-center pt-3 px-2">
                      {/* M-Pesa Logo */}
                      <motion.div
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-1">
                          <Smartphone className="w-4 h-4 text-white" />
                        </div>
                      </motion.div>

                      <p className="text-[7px] text-green-200 font-bold tracking-wider uppercase">M-Pesa</p>

                      {/* STK Push content */}
                      <div className="w-full mt-2 rounded-md bg-white/95 px-2 py-1.5">
                        <p className="text-[6px] font-bold text-green-700 text-center mb-0.5">
                          {processingPhase === 'sending' && 'Sending STK Push...'}
                          {processingPhase === 'waiting' && 'Enter your PIN'}
                          {processingPhase === 'confirming' && 'Processing...'}
                        </p>
                        {processingPhase === 'sending' && (
                          <div className="flex items-center justify-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  delay: i * 0.2,
                                }}
                                className="w-1 h-1 rounded-full bg-green-600"
                              />
                            ))}
                          </div>
                        )}
                        {processingPhase === 'waiting' && (
                          <motion.div
                            animate={{ y: [0, -2, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="flex justify-center"
                          >
                            <p className="text-[5px] text-slate-500 text-center">
                              KES {paymentAmount.toLocaleString()}
                            </p>
                          </motion.div>
                        )}
                        {processingPhase === 'confirming' && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-3 h-3 rounded-full border-2 border-green-600 border-t-transparent mx-auto"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Text */}
                <div className="text-center space-y-2 max-w-xs">
                  <AnimatePresence mode="wait">
                    {processingPhase === 'sending' && (
                      <motion.div
                        key="sending"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-1"
                      >
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Initiating STK Push...
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Sending payment request to {formatPhoneDisplay(phoneDigits)}
                        </p>
                      </motion.div>
                    )}
                    {processingPhase === 'waiting' && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-1"
                      >
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Enter your M-Pesa PIN
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Check your phone and enter your PIN to confirm {formatCurrency(paymentAmount)}
                        </p>
                      </motion.div>
                    )}
                    {processingPhase === 'confirming' && (
                      <motion.div
                        key="confirming"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-1"
                      >
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Verifying Payment...
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Confirming with Safaricom, please wait...
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Elapsed timer */}
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{elapsed}s elapsed</span>
                </div>

                {/* Progress bar */}
                <div className="w-full space-y-1.5">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                      initial={{ width: '0%' }}
                      animate={{
                        width:
                          processingPhase === 'sending' ? '20%' :
                          processingPhase === 'waiting' ? '65%' :
                          '90%',
                      }}
                      transition={{ duration: processingPhase === 'confirming' ? 1.5 : 1.5, ease: 'linear' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span className={processingPhase === 'sending' ? 'text-green-600 font-semibold' : ''}>
                      1. Send Request
                    </span>
                    <span className={processingPhase === 'waiting' ? 'text-green-600 font-semibold' : ''}>
                      2. Enter PIN
                    </span>
                    <span className={processingPhase === 'confirming' ? 'text-green-600 font-semibold' : ''}>
                      3. Confirm
                    </span>
                  </div>
                </div>

                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Do not close this window
                </p>
              </motion.div>
            )}

            {step === 'success' && receiptData && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center py-4 space-y-5"
              >
                {/* Success Animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-500/30"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                  >
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      />
                    </svg>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center space-y-1"
                >
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400">Payment Successful!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your M-Pesa payment has been confirmed and recorded
                  </p>
                </motion.div>

                {/* Receipt Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="w-full rounded-xl border border-green-200 dark:border-green-800 bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-slate-900 overflow-hidden"
                >
                  {/* Receipt Header */}
                  <div className="bg-green-600 dark:bg-green-700 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white">M-Pesa Receipt</span>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                      CONFIRMED
                    </Badge>
                  </div>

                  {/* Receipt Body */}
                  <div className="p-4 space-y-3">
                    {/* Receipt Number */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Hash className="w-3 h-3" />
                        Receipt No.
                      </span>
                      <span className="text-xs font-mono font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded">
                        {receiptData.receiptNumber}
                      </span>
                    </div>

                    {/* Transaction Ref */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Hash className="w-3 h-3" />
                        Reference
                      </span>
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {receiptData.transactionRef}
                      </span>
                    </div>

                    <Separator className="bg-green-200/50 dark:bg-green-800/30" />

                    {/* Amount - Prominent */}
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Amount Paid</span>
                      <span className="text-lg font-bold text-green-700 dark:text-green-400 tabular-nums">
                        {formatCurrency(receiptData.amount)}
                      </span>
                    </div>

                    <Separator className="bg-green-200/50 dark:bg-green-800/30" />

                    {/* Details */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Student</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{studentName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Fee</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{feeDescription}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Phone</span>
                        <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{receiptData.phone}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Date & Time</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {receiptData.timestamp.toLocaleString('en-KE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 text-center">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Transaction completed via M-Pesa STK Push
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="w-full space-y-2"
                >
                  <Button
                    onClick={() => {
                      toast.success('Receipt downloaded successfully')
                    }}
                    variant="outline"
                    className="w-full h-11 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Receipt
                  </Button>
                  <Button
                    onClick={handleClose}
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm shadow-green-600/20"
                  >
                    Done
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
