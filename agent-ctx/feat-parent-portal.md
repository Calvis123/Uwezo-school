---
## Task ID: feat-parent-portal - Full-stack Developer
### Work Task
Build a Parent Portal feature that shows when a PARENT user logs in, including API routes, frontend dashboard, role-based navigation, and seed data.

### Work Summary

#### Files Created (5)
1. `/scripts/link-parent.ts` — One-time script to link parent to 3 demo students
2. `/src/app/api/parent/children/route.ts` — GET: Returns children with class, fees, attendance, exam results
3. `/src/app/api/parent/dashboard/route.ts` — GET: Returns full dashboard data for parent
4. `/src/app/api/parent/fee-ledger/[studentId]/route.ts` — GET: Returns fee ledger with term breakdown
5. `/src/components/parent/ParentDashboard.tsx` — Comprehensive parent dashboard UI component

#### Files Modified (3)
1. `/src/lib/api.ts` — Added `parentApi` with children(), dashboard(), feeLedger()
2. `/src/components/dashboard/DashboardHome.tsx` — Added role check: PARENT → ParentDashboard
3. `/src/components/layout/DashboardLayout.tsx` — Added staffOnly nav filtering, parent header title

#### Seed Data
- parent@olives.co.ke linked to 3 students: Peter Rotich (Pre-Nursery), David Macharia (Nursery), John Bett (Grade 1 A)
- parent2@olives.co.ke linked to 2 students

#### Lint Status
- `npm run lint` passes with zero errors, zero warnings
