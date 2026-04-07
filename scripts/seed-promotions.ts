import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding historical promotion records...')

  // Find the first admin user as promotedBy
  const admin = await db.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
  })

  if (!admin) {
    console.error('❌ No admin user found. Run the main seed first.')
    process.exit(1)
  }

  // Find classes by name pattern (since levels are not per-grade)
  const nursery = await db.schoolClass.findFirst({ where: { level: 'NURSERY', status: 'ACTIVE' } })
  const grade1A = await db.schoolClass.findFirst({ where: { name: 'Grade 1 A', status: 'ACTIVE' } })
  const grade1B = await db.schoolClass.findFirst({ where: { name: 'Grade 1 B', status: 'ACTIVE' } })
  const grade4A = await db.schoolClass.findFirst({ where: { name: 'Grade 4 A', status: 'ACTIVE' } })
  const grade5A = await db.schoolClass.findFirst({ where: { name: 'Grade 5 A', status: 'ACTIVE' } })
  const grade6A = await db.schoolClass.findFirst({ where: { level: 'JUNIOR_SECONDARY', stream: 'A', status: 'ACTIVE' } })

  if (!grade1A || !grade4A || !grade5A) {
    console.error('❌ Required classes not found.')
    process.exit(1)
  }

  // Get students from target classes (they were already promoted, so these are "current" students)
  const studentsFromG1A = await db.student.findMany({
    where: { classId: grade1A.id, status: 'ACTIVE' },
    take: 3,
  })

  const studentsFromG4A = await db.student.findMany({
    where: { classId: grade4A.id, status: 'ACTIVE' },
    take: 3,
  })

  const studentsFromG5A = await db.student.findMany({
    where: { classId: grade5A.id, status: 'ACTIVE' },
    take: 2,
  })

  const studentsFromNursery = nursery
    ? await db.student.findMany({ where: { classId: nursery.id, status: 'ACTIVE' }, take: 2 })
    : []

  // Check for existing promotions
  const existingCount = await db.promotionRecord.count()
  if (existingCount > 0) {
    console.log(`ℹ️  Found ${existingCount} existing promotion records. Skipping seed.`)
    process.exit(0)
  }

  const records = [
    // 2024 Term 3 - Nursery to Grade 1 (COMPLETED)
    ...(nursery ? studentsFromNursery.map(s => ({
      studentId: s.id,
      fromClassId: nursery.id,
      toClassId: grade1B?.id || grade1A.id,
      academicYear: '2024',
      term: 'TERM_3',
      status: 'COMPLETED',
      promotedBy: admin.id,
      notes: 'End of year promotion 2024 - Nursery to Grade 1',
      completedAt: new Date('2024-11-28T14:00:00.000Z'),
    })) : []),

    // 2024 Term 3 - Grade 1 to Grade 2 equivalent (COMPLETED)
    ...(studentsFromG1A.map(s => ({
      studentId: s.id,
      fromClassId: nursery?.id || grade1B?.id || grade1A.id,
      toClassId: grade1A.id,
      academicYear: '2024',
      term: 'TERM_3',
      status: 'COMPLETED',
      promotedBy: admin.id,
      notes: 'End of year promotion 2024',
      completedAt: new Date('2024-11-30T10:00:00.000Z'),
    }))),

    // 2024 Term 3 - Grade 4 to Grade 5 (COMPLETED)
    ...(studentsFromG4A.map(s => ({
      studentId: s.id,
      fromClassId: grade4A.id,
      toClassId: grade5A.id,
      academicYear: '2024',
      term: 'TERM_3',
      status: 'COMPLETED',
      promotedBy: admin.id,
      notes: 'Promoted to Grade 5',
      completedAt: new Date('2024-12-01T09:00:00.000Z'),
    }))),

    // 2024 Term 3 - Grade 5 to Grade 6/7 (APPROVED, not yet completed)
    ...(studentsFromG5A.map(s => ({
      studentId: s.id,
      fromClassId: grade5A.id,
      toClassId: grade6A?.id || grade5A.id,
      academicYear: '2024',
      term: 'TERM_3',
      status: 'APPROVED',
      promotedBy: admin.id,
      notes: 'Awaiting final clearance for 2025 term',
      completedAt: null,
    }))),
  ]

  // Insert all records
  for (const p of records) {
    await db.promotionRecord.create({ data: p })
  }

  const completed = records.filter(r => r.status === 'COMPLETED').length
  const approved = records.filter(r => r.status === 'APPROVED').length

  console.log(`✅ Created ${records.length} historical promotion records`)
  console.log(`   - ${completed} COMPLETED`)
  console.log(`   - ${approved} APPROVED`)
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect())
