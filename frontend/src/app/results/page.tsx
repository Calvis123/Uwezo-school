'use client'

import { useState } from 'react'
import { GraduationCap, Search, Printer, RotateCcw, ShieldCheck, Award, CalendarCheck, DollarSign, ChevronRight } from 'lucide-react'
import { readJson } from '@/lib/read-json'

type ResultsData = {
  student: {
    name: string
    admissionNumber: string
    className: string
    gender: string
  }
  exam: {
    name: string
    term: string
    results: Array<{
      subject: string
      marks: number
      grade: string
      remarks: string
    }>
  }
  summary: {
    totalMarks: number
    meanMarks: number
    meanGrade: string
    position: number
    totalInClass: number
  }
  attendance: {
    rate: number
  }
  fees: {
    outstandingBalance: number
  }
}

export default function ResultsPage() {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ResultsData | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResults(null)

    if (!pin.trim() || pin.trim().length !== 6 || !/^\d+$/.test(pin.trim())) {
      setError('Please enter a valid 6-digit PIN')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/public/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      })
      const data = await readJson<any>(res)

      if (!data.success) {
        if (res.status === 429) {
          setError('Too many attempts. Please wait a minute and try again.')
        } else {
          setError(data.error || 'PIN not found. Please check and try again.')
        }
      } else {
        setResults(data.data)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPin('')
    setError('')
    setResults(null)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - teal gradient */}
      <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Uwezo School</h1>
              <p className="text-teal-100 text-sm">Excellence in Education</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 text-center">
            <h2 className="text-lg sm:text-xl font-semibold">Student Results Portal</h2>
            <p className="text-teal-100 text-sm mt-1">Enter your PIN to view your report card</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {!results ? (
          /* PIN Entry Form */
          <div className="animate-in fade-in-0 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-full bg-teal-50 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Enter Your Results PIN</h3>
                  <p className="text-sm text-gray-500">
                    Your 6-digit PIN was provided by the school
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="pin-input" className="sr-only">Results PIN</label>
                  <input
                    id="pin-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setPin(val)
                      if (error) setError('')
                    }}
                    placeholder="Enter 6-digit PIN"
                    className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold h-16 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-gray-900 placeholder:text-gray-300 placeholder:tracking-wider placeholder:text-lg"
                    autoFocus
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || pin.length !== 6}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-base"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Looking up results...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      View Results
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              If you don&apos;t have a PIN, please contact the school administration
            </p>
          </div>
        ) : (
          /* Results Display */
          <div className="space-y-4 print:space-y-2">
            {/* Action buttons - hidden when printing */}
            <div className="flex gap-2 no-print">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Report Card
              </button>
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Check Another PIN
              </button>
            </div>

            {/* Student Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 print:rounded-none print:border-none print:shadow-none">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-white">
                    {results.student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{results.student.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    <span className="font-mono text-xs">{results.student.admissionNumber}</span>
                    <span>{results.student.className}</span>
                    <span>{results.student.gender === 'MALE' ? 'Male' : 'Female'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:rounded-none print:border-none print:shadow-none">
              <div className="bg-teal-600 text-white px-5 py-3">
                <h4 className="font-bold">{results.exam.name}</h4>
                <p className="text-teal-100 text-sm">{results.exam.term}</p>
              </div>

              {/* Report Card Table */}
              {results.exam.results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Subject</th>
                        <th className="text-center px-3 py-3 font-semibold text-gray-600 w-16">Marks</th>
                        <th className="text-center px-3 py-3 font-semibold text-gray-600 w-16">Grade</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.exam.results.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-5 py-3 font-medium text-gray-900">{r.subject}</td>
                          <td className="px-3 py-3 text-center font-bold text-gray-900">{r.marks}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                              r.marks >= 80 ? 'bg-green-100 text-green-700' :
                              r.marks >= 60 ? 'bg-blue-100 text-blue-700' :
                              r.marks >= 40 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {r.grade}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{r.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-8 text-center text-gray-400">
                  <p>No exam results available yet</p>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center print:rounded-none print:border-none">
                <div className="flex items-center justify-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center">
                    <Award className="h-4 w-4 text-teal-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{results.summary.totalMarks}</p>
                <p className="text-xs text-gray-500 mt-1">Total Marks</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center print:rounded-none print:border-none">
                <div className="flex items-center justify-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-600">{results.summary.meanGrade}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{results.summary.meanMarks}</p>
                <p className="text-xs text-gray-500 mt-1">Mean Score</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center print:rounded-none print:border-none">
                <div className="flex items-center justify-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {results.summary.position > 0 ? `${results.summary.position}/${results.summary.totalInClass}` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Class Position</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center print:rounded-none print:border-none">
                <div className="flex items-center justify-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center">
                    <CalendarCheck className="h-4 w-4 text-sky-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{results.attendance.rate}%</p>
                <p className="text-xs text-gray-500 mt-1">Attendance</p>
              </div>
            </div>

            {/* Fee Balance */}
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${
              results.fees.outstandingBalance > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            } print:rounded-none`}>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                results.fees.outstandingBalance > 0
                  ? 'bg-red-100'
                  : 'bg-green-100'
              }`}>
                <DollarSign className={`h-5 w-5 ${
                  results.fees.outstandingBalance > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Fee Balance</p>
                <p className={`text-lg font-bold ${
                  results.fees.outstandingBalance > 0
                    ? 'text-red-700'
                    : 'text-green-700'
                }`}>
                  {results.fees.outstandingBalance > 0
                    ? `KES ${results.fees.outstandingBalance.toLocaleString()} outstanding`
                    : 'No outstanding balance'
                  }
                </p>
              </div>
            </div>

            {/* Footer note */}
            <div className="text-center text-xs text-gray-400 pt-2 no-print">
              <p>Results retrieved from Uwezo School Management System</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-gray-100 border-t border-gray-200 py-4 no-print">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Uwezo School &mdash; Results Portal
          </p>
        </div>
      </footer>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          header {
            background: #0d9488 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-teal-600 {
            background-color: #0d9488 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
