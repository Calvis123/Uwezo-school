import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function generatePin(): string {
  const min = 100000
  const max = 999999
  return String(Math.floor(Math.random() * (max - min + 1)) + min)
}

async function main() {
  const students = await db.student.findMany({
    where: { resultsPin: null },
  })

  if (students.length === 0) {
    console.log('All students already have PINs assigned.')
    return
  }

  const existingPins = new Set(
    (await db.student.findMany({
      where: { resultsPin: { not: null } },
      select: { resultsPin: true },
    })).map(s => s.resultsPin!)
  )

  let assigned = 0
  for (const student of students) {
    let pin = generatePin()
    let attempts = 0
    while (existingPins.has(pin) && attempts < 100) {
      pin = generatePin()
      attempts++
    }
    existingPins.add(pin)
    await db.student.update({
      where: { id: student.id },
      data: { resultsPin: pin },
    })
    assigned++
    console.log(`Assigned PIN ${pin} to ${student.firstName} ${student.lastName} (${student.admissionNumber})`)
  }

  console.log(`\nDone! Assigned PINs to ${assigned} students.`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
