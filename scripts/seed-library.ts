import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding library data...')

  // Clean existing data
  await db.bookIssue.deleteMany()
  await db.libraryBook.deleteMany()

  // 25 books — Kenyan CBC curriculum textbooks + storybooks
  const books = [
    // CBC Textbooks
    { title: 'Mathematics Grade 1', author: 'KLB', category: 'TEXTBOOK', publisher: 'Kenya Literature Bureau', year: 2023, copies: 10, shelf: 'A1-01' },
    { title: 'Mathematics Grade 2', author: 'KLB', category: 'TEXTBOOK', publisher: 'Kenya Literature Bureau', year: 2023, copies: 8, shelf: 'A1-02' },
    { title: 'Mathematics Grade 3', author: 'KLB', category: 'TEXTBOOK', publisher: 'Kenya Literature Bureau', year: 2023, copies: 8, shelf: 'A1-03' },
    { title: 'Mathematics Grade 4', author: 'KLB', category: 'TEXTBOOK', publisher: 'Kenya Literature Bureau', year: 2023, copies: 6, shelf: 'A1-04' },
    { title: 'English Grade 1', author: 'Oxford', category: 'TEXTBOOK', publisher: 'Oxford University Press', year: 2023, copies: 10, shelf: 'A2-01' },
    { title: 'English Grade 2', author: 'Oxford', category: 'TEXTBOOK', publisher: 'Oxford University Press', year: 2023, copies: 8, shelf: 'A2-02' },
    { title: 'English Grade 3', author: 'Oxford', category: 'TEXTBOOK', publisher: 'Oxford University Press', year: 2023, copies: 8, shelf: 'A2-03' },
    { title: 'Kiswahili Grade 1', author: 'Jomo Kenyatta Foundation', category: 'TEXTBOOK', publisher: 'Jomo Kenyatta Foundation', year: 2023, copies: 10, shelf: 'A3-01' },
    { title: 'Kiswahili Grade 2', author: 'Jomo Kenyatta Foundation', category: 'TEXTBOOK', publisher: 'Jomo Kenyatta Foundation', year: 2023, copies: 8, shelf: 'A3-02' },
    { title: 'Science and Technology Grade 4', author: 'KLB', category: 'TEXTBOOK', publisher: 'Kenya Literature Bureau', year: 2023, copies: 6, shelf: 'A4-01' },
    { title: 'Social Studies Grade 4', author: 'Oxford', category: 'TEXTBOOK', publisher: 'Oxford University Press', year: 2023, copies: 6, shelf: 'A4-02' },
    { title: 'Christian Religious Education Grade 4', author: 'Moran', category: 'TEXTBOOK', publisher: 'Moran Publishers', year: 2023, copies: 5, shelf: 'A5-01' },

    // Reference
    { title: 'Oxford Advanced Learners Dictionary', author: 'Hornby A.S.', category: 'REFERENCE', publisher: 'Oxford University Press', year: 2022, copies: 3, shelf: 'R1-01', isbn: '978-0194799485' },
    { title: 'Kamusi ya Kiswahili Sanifu', author: 'TAALIFA', category: 'REFERENCE', publisher: 'Jomo Kenyatta Foundation', year: 2021, copies: 3, shelf: 'R1-02', isbn: '978-9966228810' },
    { title: 'World Atlas for Kenyan Schools', author: 'Longhorn', category: 'REFERENCE', publisher: 'Longhorn Publishers', year: 2022, copies: 4, shelf: 'R2-01', isbn: '978-9966251627' },

    // Storybooks
    { title: 'Safari ya Elimu', author: 'Eliud W. Kariuki', category: 'STORYBOOK', publisher: 'Jomo Kenyatta Foundation', year: 2020, copies: 5, shelf: 'S1-01' },
    { title: 'Hadithi za Abunuwasi', author: 'Said Ahmed Mohamed', category: 'STORYBOOK', publisher: 'Longhorn Publishers', year: 2019, copies: 4, shelf: 'S1-02', isbn: '978-9966250835' },
    { title: 'The River and the Source', author: 'Margaret Ogola', category: 'STORYBOOK', publisher: 'EAEP', year: 2018, copies: 5, shelf: 'S1-03', isbn: '978-9966467921' },
    { title: 'Hare na Fisi', author: 'Ezekiel Alembi', category: 'STORYBOOK', publisher: 'Oxford University Press', year: 2020, copies: 4, shelf: 'S1-04' },
    { title: 'Juma the Fisherman', author: 'Muthoni Likimani', category: 'STORYBOOK', publisher: 'Jomo Kenyatta Foundation', year: 2019, copies: 4, shelf: 'S2-01' },

    // Non-Fiction
    { title: 'The Boy Who Harnessed the Wind', author: 'William Kamkwamba', category: 'NON_FICTION', publisher: 'HarperCollins', year: 2015, copies: 5, shelf: 'N1-01', isbn: '978-0062360574' },
    { title: 'Wangari Maathai: The Woman Who Planted Millions of Trees', author: 'Franck Prévot', category: 'NON_FICTION', publisher: 'Charlesbridge', year: 2015, copies: 4, shelf: 'N1-02', isbn: '978-1580896269' },
    { title: 'Discovering Kenya: A Children\'s Guide', author: 'Kamau Kiarie', category: 'NON_FICTION', publisher: 'Kenya Literature Bureau', year: 2021, copies: 5, shelf: 'N1-03', isbn: '978-9966182850' },

    // Fiction
    { title: 'The Balek Family', author: 'Heinrich Böll', category: 'FICTION', publisher: 'EAEP', year: 2018, copies: 3, shelf: 'F1-01', isbn: '978-9966464357' },
  ]

  for (const b of books) {
    await db.libraryBook.create({
      data: {
        title: b.title,
        author: b.author,
        isbn: b.isbn || null,
        category: b.category,
        publisher: b.publisher,
        year: b.year,
        totalCopies: b.copies,
        availableCopies: b.copies,
        shelfLocation: b.shelf,
        status: b.copies <= 3 ? 'LOW_STOCK' : 'AVAILABLE',
      },
    })
  }

  console.log(`✅ Created ${books.length} books`)

  // Get real students for linking book issues
  const students = await db.student.findMany({
    where: { status: 'ACTIVE' },
    take: 10,
    orderBy: { admissionNumber: 'asc' },
  })

  if (students.length < 10) {
    console.log('⚠️  Not enough students to create all issues')
    return
  }

  // Get some books for linking
  const allBooks = await db.libraryBook.findMany()

  // 10 book issues with various statuses
  const now = new Date()
  const issueData = [
    // Issued books
    { bookIdx: 0, studentIdx: 0, daysAgo: 5, dueInDays: 14, status: 'ISSUED' },
    { bookIdx: 4, studentIdx: 1, daysAgo: 3, dueInDays: 14, status: 'ISSUED' },
    { bookIdx: 7, studentIdx: 2, daysAgo: 7, dueInDays: 14, status: 'ISSUED' },
    { bookIdx: 16, studentIdx: 3, daysAgo: 2, dueInDays: 14, status: 'ISSUED' },
    // Returned books
    { bookIdx: 1, studentIdx: 4, daysAgo: 20, dueInDays: 14, status: 'RETURNED', returnedDaysAgo: 2 },
    { bookIdx: 5, studentIdx: 5, daysAgo: 25, dueInDays: 14, status: 'RETURNED', returnedDaysAgo: 7 },
    { bookIdx: 12, studentIdx: 6, daysAgo: 30, dueInDays: 14, status: 'RETURNED', returnedDaysAgo: 10 },
    // Overdue books
    { bookIdx: 2, studentIdx: 7, daysAgo: 30, dueInDays: 14, status: 'OVERDUE' },
    { bookIdx: 8, studentIdx: 8, daysAgo: 25, dueInDays: 14, status: 'OVERDUE' },
    { bookIdx: 15, studentIdx: 9, daysAgo: 20, dueInDays: 14, status: 'OVERDUE' },
  ]

  for (const issue of issueData) {
    const book = allBooks[issue.bookIdx]
    const student = students[issue.studentIdx]
    const issueDate = new Date(now)
    issueDate.setDate(issueDate.getDate() - issue.daysAgo)
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + issue.dueInDays)

    await db.bookIssue.create({
      data: {
        bookId: book.id,
        studentId: student.id,
        issueDate,
        dueDate,
        returnDate: issue.returnedDaysAgo
          ? (() => {
              const d = new Date(now)
              d.setDate(d.getDate() - issue.returnedDaysAgo!)
              return d
            })()
          : null,
        status: issue.status,
      },
    })

    // Adjust available copies
    if (issue.status === 'ISSUED' || issue.status === 'OVERDUE') {
      await db.libraryBook.update({
        where: { id: book.id },
        data: { availableCopies: { decrement: 1 } },
      })
    }
  }

  console.log(`✅ Created ${issueData.length} book issues`)

  // Update book statuses based on available copies
  const allBooksAfter = await db.libraryBook.findMany()
  for (const b of allBooksAfter) {
    let newStatus = 'AVAILABLE'
    if (b.availableCopies === 0) newStatus = 'OUT_OF_STOCK'
    else if (b.availableCopies <= 3) newStatus = 'LOW_STOCK'
    if (newStatus !== b.status) {
      await db.libraryBook.update({
        where: { id: b.id },
        data: { status: newStatus },
      })
    }
  }

  console.log('✅ Updated book statuses')

  // Final stats
  const bookCount = await db.libraryBook.count()
  const issueCount = await db.bookIssue.count()
  const issuedCount = await db.bookIssue.count({ where: { status: 'ISSUED' } })
  const overdueCount = await db.bookIssue.count({ where: { status: 'OVERDUE' } })
  console.log(`\n📊 Library Stats:`)
  console.log(`   Total Books: ${bookCount}`)
  console.log(`   Total Issues: ${issueCount}`)
  console.log(`   Currently Issued: ${issuedCount}`)
  console.log(`   Overdue: ${overdueCount}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
