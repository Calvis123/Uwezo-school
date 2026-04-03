'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeeStructures } from './FeeStructures'
import { FeePayments } from './FeePayments'
import { FeeReports } from './FeeReports'
import { DollarSign } from 'lucide-react'

export function FeesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Fees Management</h2>
        <p className="text-sm text-slate-500">Manage fee structures, payments, and reports</p>
      </div>
      <Tabs defaultValue="structures">
        <TabsList className="bg-white border border-slate-200 p-0 h-auto">
          <TabsTrigger value="structures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm px-4 py-2">
            Fee Structures
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm px-4 py-2">
            Payments
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm px-4 py-2">
            Reports
          </TabsTrigger>
        </TabsList>
        <TabsContent value="structures" className="mt-4">
          <FeeStructures />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <FeePayments />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <FeeReports />
        </TabsContent>
      </Tabs>
    </div>
  )
}
