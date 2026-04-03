'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeeStructures } from './FeeStructures'
import { FeePayments } from './FeePayments'
import { FeeReports } from './FeeReports'

export function FeesPage() {
  return (
    <Tabs defaultValue="structures">
      <TabsList className="bg-white border border-slate-200 p-0 h-auto">
        <TabsTrigger value="structures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">
          Fee Structures
        </TabsTrigger>
        <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">
          Payments
        </TabsTrigger>
        <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">
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
  )
}
