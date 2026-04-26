/**
 * Script to properly link parent@olives.co.ke to exactly 3 random active students
 * Run with: npx tsx scripts/link-parent.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing parent guardian links...\n');

  // 1. Find parent user
  const parent = await prisma.user.findUnique({
    where: { email: 'parent@olives.co.ke' },
  });

  if (!parent) {
    console.error('❌ Parent user (parent@olives.co.ke) not found!');
    return;
  }
  console.log(`Found parent: ${parent.name} (${parent.email})`);

  // 2. Delete all existing guardian links for this parent
  const deleted = await prisma.studentGuardian.deleteMany({
    where: { guardianId: parent.id },
  });
  console.log(`Deleted ${deleted.count} existing guardian links`);

  // 3. Find 3 random active students from different classes
  const allActiveStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    include: { class: true },
  });

  // Pick 3 students from different classes for variety
  const usedClasses = new Set<string>();
  const selectedStudents: typeof allActiveStudents = [];

  for (const student of allActiveStudents) {
    if (!usedClasses.has(student.classId) && selectedStudents.length < 3) {
      usedClasses.add(student.classId);
      selectedStudents.push(student);
    }
  }

  console.log(`\nSelected 3 students from different classes:`);

  // 4. Create guardian links
  const relationships = ['FATHER', 'MOTHER', 'GUARDIAN'];

  for (let i = 0; i < selectedStudents.length; i++) {
    const student = selectedStudents[i];
    await prisma.studentGuardian.create({
      data: {
        studentId: student.id,
        guardianId: parent.id,
        relationship: relationships[i] || 'GUARDIAN',
        isPrimary: true,
      },
    });

    console.log(`  ✓ ${student.firstName} ${student.lastName} (${student.class?.name}) - ${relationships[i]}`);
  }

  console.log(`\n✅ Done! Parent ${parent.name} is now linked to ${selectedStudents.length} students.`);

  // Also link parent2@olives.co.ke to 2 different students
  const parent2 = await prisma.user.findUnique({
    where: { email: 'parent2@olives.co.ke' },
  });

  if (parent2) {
    const deleted2 = await prisma.studentGuardian.deleteMany({
      where: { guardianId: parent2.id },
    });
    console.log(`\nCleaned up ${deleted2.count} links for parent2`);

    const parent2Students = allActiveStudents.filter(
      (s) => !usedClasses.has(s.classId)
    ).slice(0, 2);

    for (let i = 0; i < parent2Students.length; i++) {
      const student = parent2Students[i];
      await prisma.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: parent2.id,
          relationship: i === 0 ? 'MOTHER' : 'GUARDIAN',
          isPrimary: true,
        },
      });
      console.log(`  ✓ Parent2: ${student.firstName} ${student.lastName} (${student.class?.name})`);
    }
    console.log(`\n✅ Parent2 linked to ${parent2Students.length} students.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
