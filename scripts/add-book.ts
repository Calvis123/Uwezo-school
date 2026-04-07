import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  await db.libraryBook.create({
    data: {
      title: "A Grain of Wheat",
      author: "Ngugi wa Thiong'o",
      category: 'FICTION',
      publisher: 'Heinemann',
      year: 2017,
      totalCopies: 5,
      availableCopies: 5,
      shelfLocation: 'F1-02',
      isbn: '978-0143106766',
      status: 'AVAILABLE',
    },
  })
  console.log('Added 25th book')
  const count = await db.libraryBook.count()
  console.log(`Total books now: ${count}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
