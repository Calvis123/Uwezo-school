'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Phone, CheckCircle2, XCircle, FileDown, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type PaymentStep = 'form' | 'sending' | 'awaiting_pin' | 'processing' | 'success' | 'failed'

function generateTransactionId(): string {
  const prefix = 'QEF'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

function generateReceiptNumber(): string {
  const prefix = 'RCT'
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${dateStr}-${random}`
}

interface MpesaPaymentContentProps {
  amount: number
  feeDescription: string
  studentName: string
  studentId: string
  feeStructureId: string
  term: string
  onClose: () => void
  onSuccess?: (transactionId: string) => void
}

function MpesaPaymentContent({
  amount,
  feeDescription,
  studentName,
  studentId,
  feeStructureId,
  term,
  onClose,
  onSuccess,
}: MpesaPaymentContentProps) {
  const [step, setStep] = useState<PaymentStep>('form')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [editAmount, setEditAmount] = useState(String(amount))
  const [countdown, setCountdown] = useState(60)
  const [transactionId, setTransactionId] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      // Any active intervals will be cleaned up by the step useEffect
    }
  }, [])

  // Countdown timer effect
  useEffect(() => {
    if (step === 'awaiting_pin') {
      const intervalId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId)
            setStep('failed')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(intervalId)
    }
  }, [step])

  const validatePhone = useCallback((phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setPhoneError('Phone number must be 10 digits')
      return false
    }
    if (!cleaned.startsWith('7') && !cleaned.startsWith('1')) {
      setPhoneError('Enter a valid Kenyan phone number')
      return false
    }
    setPhoneError('')
    return true
  }, [])

  const handleSendSTKPush = useCallback(() => {
    if (!validatePhone(phoneNumber)) return

    const parsedAmount = parseFloat(editAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setStep('sending')
    setTimeout(() => {
      setStep('awaiting_pin')
      setCountdown(60)
    }, 2000)
  }, [phoneNumber, editAmount, validatePhone])

  const handleCancelPayment = useCallback(() => {
    setStep('failed')
  }, [])

  const handleSimulateSuccess = useCallback(() => {
    setStep('processing')

    setTimeout(async () => {
      const txId = generateTransactionId()
      const rcptNum = generateReceiptNumber()
      setTransactionId(txId)
      setReceiptNumber(rcptNum)

      try {
        const res = await fetch('/api/fees/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            feeStructureId,
            amount: parseFloat(editAmount),
            paymentMethod: 'MPESA',
            transactionRef: txId,
            term,
            notes: `M-Pesa payment from ${phoneNumber}`,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setReceiptNumber(data.data?.receiptNumber || rcptNum)
          }
        }
      } catch {
        // Continue to success state even if DB save fails (it's a simulation)
      }

      setStep('success')
      toast.success('Payment completed successfully!')
      onSuccess?.(txId)
    }, 2000)
  }, [editAmount, studentId, feeStructureId, term, phoneNumber, onSuccess])

  const handleDownloadReceipt = useCallback(() => {
    window.open(`/api/fees/receipt/${receiptNumber || transactionId}`, '_blank')
  }, [receiptNumber, transactionId])

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* M-Pesa Green Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-white text-lg font-bold">M-Pesa Payment</DialogTitle>
            <p className="text-green-100 text-xs">Lipa na M-Pesa (STK Push)</p>
          </div>
          <Badge className="ml-auto bg-white/20 text-white border-white/30 hover:bg-white/30">
            M-Pesa
          </Badge>
        </div>
      </div>

      <div className="px-6 py-5">
        <AnimatePresence mode="wait">
          {/* FORM STEP */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Student & Fee Info */}
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Student</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{studentName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Fee</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{feeDescription}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Amount Due</span>
                  <span className="font-bold text-green-600 dark:text-green-400 text-base">
                    KES {parseFloat(editAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="mpesa-phone" className="text-sm font-medium">
                  M-Pesa Phone Number
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    +254
                  </span>
                  <Input
                    id="mpesa-phone"
                    type="tel"
                    placeholder="7XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setPhoneNumber(val)
                      if (phoneError) setPhoneError('')
                    }}
                    className={cn(
                      'pl-14 h-11',
                      phoneError && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    maxLength={10}
                  />
                </div>
                {phoneError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500"
                  >
                    {phoneError}
                  </motion.p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="mpesa-amount" className="text-sm font-medium">
                  Amount (KES)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    KES
                  </span>
                  <Input
                    id="mpesa-amount"
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="pl-14 h-11"
                    min={1}
                  />
                </div>
              </div>

              <Button
                onClick={handleSendSTKPush}
                disabled={!phoneNumber || !!phoneError}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold text-base transition-all"
              >
                <Phone className="w-5 h-5 mr-2" />
                Send STK Push
              </Button>
            </motion.div>
          )}

          {/* SENDING STEP */}
          {step === 'sending' && (
            <motion.div
              key="sending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-12 h-12 text-green-500" />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Sending request to M-Pesa...
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Initiating STK Push to +254{phoneNumber}
                </p>
              </div>
            </motion.div>
          )}

          {/* AWAITING PIN STEP */}
          {step === 'awaiting_pin' && (
            <motion.div
              key="awaiting_pin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-6 space-y-5"
            >
              {/* Phone animation */}
              <motion.div
                className="relative"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-20 h-20 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center border-2 border-green-200 dark:border-green-800">
                  <Smartphone className="w-10 h-10 text-green-500" />
                </div>
                {/* Notification dot */}
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <span className="text-[10px] text-white font-bold">1</span>
                </motion.div>
              </motion.div>

              <div className="text-center space-y-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                  Enter PIN on your phone
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  An STK Push prompt has been sent to <span className="font-semibold text-slate-700 dark:text-slate-300">+254{phoneNumber}</span>. Please enter your M-Pesa PIN to complete the payment.
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <motion.div
                  className="w-3 h-3 rounded-full bg-amber-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {formatCountdown(countdown)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">remaining</span>
              </div>

              {/* Amount display */}
              <div className="text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Amount
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  KES {parseFloat(editAmount).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={handleCancelPayment}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSimulateSuccess}
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white"
                >
                  Simulate Success
                </Button>
              </div>
            </motion.div>
          )}

          {/* PROCESSING STEP */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-12 h-12 text-green-500" />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Processing payment...
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Confirming with M-Pesa servers
                </p>
              </div>
            </motion.div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col items-center justify-center py-4 space-y-4"
            >
              {/* Animated Checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="relative"
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </motion.div>
                </motion.div>
                {/* Ring animation */}
                <motion.div
                  className="absolute inset-0 w-20 h-20 rounded-full border-2 border-green-300 dark:border-green-700"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center space-y-1"
              >
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  Payment Successful!
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your payment has been processed
                </p>
              </motion.div>

              {/* Transaction Details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 space-y-3"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    {transactionId}
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Amount Paid</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    KES {parseFloat(editAmount).toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Receipt Number</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    {receiptNumber}
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Student</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {studentName}
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-2 w-full"
              >
                <Button
                  onClick={handleDownloadReceipt}
                  variant="outline"
                  className="w-full h-11"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
                <Button
                  onClick={onClose}
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                >
                  Done
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* FAILED STEP */}
          {step === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              >
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                  >
                    <XCircle className="w-12 h-12 text-red-500" />
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center space-y-1"
              >
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  Payment Cancelled
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  The M-Pesa payment request was cancelled or timed out.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex gap-3 w-full"
              >
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-11"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setStep('form')
                    setCountdown(60)
                  }}
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white"
                >
                  Try Again
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

interface MpesaPaymentDialogProps {
  open: boolean
  onClose: () => void
  amount: number
  feeDescription: string
  studentName: string
  studentId: string
  feeStructureId: string
  term: string
  /** Pass a unique key from the parent to reset internal state on each open */
  resetKey?: number
  onSuccess?: (transactionId: string) => void
}

export function MpesaPaymentDialog({
  open,
  onClose,
  amount,
  feeDescription,
  studentName,
  studentId,
  feeStructureId,
  term,
  resetKey,
  onSuccess,
}: MpesaPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>M-Pesa Payment</DialogTitle>
        </DialogHeader>
        {open && (
          <MpesaPaymentContent
            key={resetKey}
            amount={amount}
            feeDescription={feeDescription}
            studentName={studentName}
            studentId={studentId}
            feeStructureId={feeStructureId}
            term={term}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
