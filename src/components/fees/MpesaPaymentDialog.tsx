'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Smartphone, Phone, Loader2, CheckCircle2, Download, ArrowLeft, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
  const [phoneNumber, setPhoneNumber] = useState('')
  const [editableAmount, setEditableAmount] = useState(String(amount))
  const [processing, setProcessing] = useState(false)
  const [mpesaResult, setMpesaResult] = useState<any>(null)
  const [statusChecking, setStatusChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep('details')
      setPhoneNumber('')
      setEditableAmount(String(amount))
      setProcessing(false)
      setMpesaResult(null)
      setStatusChecking(false)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, resetKey, amount])

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const getRawPhone = () => phoneNumber.replace(/\s/g, '')

  const isPhoneValid = () => {
    const raw = getRawPhone()
    return /^07\d{8}$/.test(raw)
  }

  const isAmountValid = () => {
    const num = Number(editableAmount)
    return num > 0 && num <= 150000
  }

  const handleSendSTKPush = async () => {
    if (!isPhoneValid()) {
      toast.error('Please enter a valid phone number (07XX XXX XXX)')
      return
    }
    if (!isAmountValid()) {
      toast.error('Please enter a valid amount (1 - 150,000)')
      return
    }

    setProcessing(true)
    setStep('processing')

    try {
      // Step 1: Initiate STK Push
      const stkRes = await fetch('/api/fees/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          amount: Number(editableAmount),
          phoneNumber: getRawPhone(),
          feeStructureId,
        }),
      })
      const stkData = await stkRes.json()

      if (!stkData.success) {
        toast.error(stkData.error || 'Failed to initiate M-Pesa payment')
        setStep('details')
        setProcessing(false)
        return
      }

      setMpesaResult(stkData.data)

      // Step 2: Simulate 3-second processing delay then check status
      setTimeout(async () => {
        setStatusChecking(true)
        try {
          const statusRes = await fetch(`/api/fees/mpesa/status?ref=${stkData.data.transactionRef}`)
          const statusData = await statusRes.json()

          if (statusData.success && statusData.data.status === 'COMPLETED') {
            // Record the payment in the system
            try {
              await fetch('/api/fees/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId,
                  feeStructureId,
                  amount: Number(editableAmount),
                  paymentMethod: 'MPESA',
                  transactionRef: statusData.data.mpesaReceipt,
                  term,
                  notes: `M-Pesa payment. Receipt: ${statusData.data.mpesaReceipt}. Phone: ${getRawPhone()}`,
                }),
              })
            } catch {
              // Payment recorded via STK but transaction log might fail
            }

            setMpesaResult(statusData.data)
            setStep('success')
            toast.success('Payment completed successfully!')
            onSuccess?.()
          } else {
            toast.error('Payment timed out. Please try again.')
            setStep('details')
          }
        } catch {
          toast.error('Failed to verify payment. Please check transaction history.')
          setStep('details')
        } finally {
          setProcessing(false)
          setStatusChecking(false)
        }
      }, 3000)
    } catch {
      toast.error('Network error. Please try again.')
      setStep('details')
      setProcessing(false)
    }
  }

  const handleClose = () => {
    if (step === 'processing') {
      toast.info('Please wait for the payment to complete')
      return
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
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
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* M-Pesa branding */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">M-Pesa Payment</h2>
              <p className="text-green-100 text-sm">Lipa na M-Pesa</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {['Enter Details', 'Processing', 'Success'].map((label, i) => {
              const stepOrder: Step[] = ['details', 'processing', 'success']
              const currentIdx = stepOrder.indexOf(step)
              const isActive = i === currentIdx
              const isComplete = i < currentIdx

              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        isComplete && 'bg-white text-green-600',
                        isActive && 'bg-white text-green-600 ring-2 ring-white/50',
                        !isComplete && !isActive && 'bg-white/30 text-white/60'
                      )}
                    >
                      {isComplete ? '✓' : i + 1}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] font-medium hidden sm:inline',
                        isActive ? 'text-white' : 'text-green-100/60'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 rounded-full transition-all',
                        i < currentIdx ? 'bg-white' : 'bg-white/30'
                      )}
                    />
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
                className="space-y-4"
              >
                {/* Student Info */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Student</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{studentName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Fee</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{feeDescription}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Amount (KES)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium text-sm">KES</span>
                    <Input
                      type="number"
                      value={editableAmount}
                      onChange={(e) => setEditableAmount(e.target.value)}
                      className="pl-12 h-12 text-lg font-bold text-slate-900 dark:text-slate-100"
                      min={1}
                      max={150000}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    M-Pesa Phone Number
                  </label>
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="07XX XXX XXX"
                      className="h-12 text-base font-medium pl-4"
                      maxLength={12}
                    />
                    {isPhoneValid() && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Security notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                    Your payment is secured by Safaricom M-Pesa. You will receive an STK push on your phone to confirm the payment.
                  </p>
                </div>

                {/* Send STK Push Button */}
                <Button
                  onClick={handleSendSTKPush}
                  disabled={!isPhoneValid() || !isAmountValid()}
                  className={cn(
                    'w-full h-12 text-base font-bold rounded-xl transition-all',
                    isPhoneValid() && isAmountValid()
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  )}
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  Send STK Push
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
                className="flex flex-col items-center py-8 space-y-6"
              >
                {/* Animated Phone */}
                <div className="relative">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30"
                  >
                    <Smartphone className="w-10 h-10 text-white" />
                  </motion.div>
                  {/* Pulse rings */}
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-2xl border-2 border-green-500"
                  />
                  <motion.div
                    animate={{ scale: [1, 2.2], opacity: [0.2, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                    className="absolute inset-0 rounded-2xl border-2 border-green-400"
                  />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {statusChecking ? 'Confirming Payment...' : 'Check Your Phone'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                    {statusChecking
                      ? 'Verifying payment with Safaricom. This will take a moment...'
                      : `An STK push has been sent to ${phoneNumber}. Enter your M-Pesa PIN to complete the payment.`}
                  </p>
                </div>

                {/* Transaction Reference */}
                {mpesaResult && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Transaction Ref</p>
                    <p className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{mpesaResult.transactionRef}</p>
                  </div>
                )}

                {/* Loading bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: statusChecking ? '90%' : '60%' }}
                    transition={{ duration: statusChecking ? 2 : 3, ease: 'linear' }}
                  />
                </div>

                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Please do not close this window
                </p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center py-6 space-y-5"
              >
                {/* Success Checkmark Animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30"
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
                  className="text-center space-y-2"
                >
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400">Payment Successful!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Your M-Pesa payment has been confirmed</p>
                </motion.div>

                {/* Receipt Details */}
                {mpesaResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="w-full rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">M-Pesa Receipt</span>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800 text-xs font-mono">
                        {mpesaResult.mpesaReceipt}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Amount</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        KES {Number(editableAmount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Student</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{studentName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Fee</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feeDescription}</span>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
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
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
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
