/**
 * Script to seed realistic messages between users in the Uwezo School Management System
 * Run with: bun run scripts/seed-messages.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// User IDs (looked up from the system)
const USERS = {
  superAdmin: 'cmnojgith0000nmixej2vvm2f',  // Allan Kimeli - SUPER_ADMIN
  admin: 'cmnojgitk0004nmixr6hn4h9g',       // Mary Wanjiku - ADMIN
  teacher1: 'cmnojgiti0003nmix9iahk1dt',     // John Mwangi - TEACHER
  teacher2: 'cmnojgitk0005nmixdi1j403z',     // Grace Akinyi - TEACHER
  parent1: 'cmnojgith0001nmixtjceb5id',      // Peter Otieno - PARENT
  parent2: 'cmnojgith0002nmixkeo3ol82',      // Agnes Wambui - PARENT
} as const;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

interface SeedMessage {
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

async function main() {
  console.log('📬 Seeding messages...\n');

  // Clear existing messages first
  const deleted = await prisma.message.deleteMany({});
  console.log(`Cleared ${deleted.count} existing messages\n`);

  const messages: SeedMessage[] = [
    // === Admin to Teachers: Meetings, Schedules, Policies ===
    {
      senderId: USERS.superAdmin,
      receiverId: USERS.teacher1,
      subject: 'Staff Meeting Tomorrow at 8:00 AM',
      content: 'Dear John,\n\nThis is a reminder about the staff meeting scheduled for tomorrow, Monday, at 8:00 AM in the staffroom. Agenda items include:\n\n1. Term 1 exam timetable review\n2. CBC curriculum implementation updates\n3. Parent-teacher conference scheduling\n4. End of term report card deadlines\n\nPlease prepare a brief update on your class progress. Attendance is mandatory.\n\nRegards,\nAllan Kimeli\nSuper Admin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(1),
    },
    {
      senderId: USERS.superAdmin,
      receiverId: USERS.teacher2,
      subject: 'Staff Meeting Tomorrow at 8:00 AM',
      content: 'Dear Grace,\n\nThis is a reminder about the staff meeting scheduled for tomorrow, Monday, at 8:00 AM in the staffroom. Agenda items include:\n\n1. Term 1 exam timetable review\n2. CBC curriculum implementation updates\n3. Parent-teacher conference scheduling\n4. End of term report card deadlines\n\nPlease prepare a brief update on your class progress. Attendance is mandatory.\n\nRegards,\nAllan Kimeli\nSuper Admin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(1),
    },
    {
      senderId: USERS.admin,
      receiverId: USERS.teacher1,
      subject: 'Updated Term 1 Exam Schedule',
      content: 'Hello John,\n\nPlease find below the updated Term 1 exam schedule for your class:\n\n- CAT 1: March 10-14, 2025\n- CAT 2: April 7-11, 2025\n- End of Term Exam: May 5-16, 2025\n\nEnsure all mark sheets are submitted within 3 days of the last exam. Report cards must be ready by May 23rd. Let me know if you have any concerns about the timetable.\n\nBest regards,\nMary Wanjiku\nAdmin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(5),
    },
    {
      senderId: USERS.admin,
      receiverId: USERS.teacher2,
      subject: 'Updated Term 1 Exam Schedule',
      content: 'Hello Grace,\n\nPlease find below the updated Term 1 exam schedule for your class:\n\n- CAT 1: March 10-14, 2025\n- CAT 2: April 7-11, 2025\n- End of Term Exam: May 5-16, 2025\n\nEnsure all mark sheets are submitted within 3 days of the last exam. Report cards must be ready by May 23rd. Let me know if you have any concerns about the timetable.\n\nBest regards,\nMary Wanjiku\nAdmin, Uwezo School',
      isRead: false,
      createdAt: daysAgo(4),
    },
    {
      senderId: USERS.superAdmin,
      receiverId: USERS.teacher1,
      subject: 'New School Uniform Policy',
      content: 'Dear John,\n\nThe school board has approved a new uniform policy effective from Term 2. Key changes include:\n\n- All students must wear the school crest on the left pocket\n- P.E. kit is now mandatory on Wednesdays and Fridays\n- New navy blue sweaters will replace the current grey ones\n\nPlease communicate this to parents during the upcoming parent-teacher conferences. Detailed guidelines will be shared in the next staff meeting.\n\nThank you,\nAllan Kimeli',
      isRead: false,
      createdAt: daysAgo(2),
    },
    {
      senderId: USERS.superAdmin,
      receiverId: USERS.teacher2,
      subject: 'New School Uniform Policy',
      content: 'Dear Grace,\n\nThe school board has approved a new uniform policy effective from Term 2. Key changes include:\n\n- All students must wear the school crest on the left pocket\n- P.E. kit is now mandatory on Wednesdays and Fridays\n- New navy blue sweaters will replace the current grey ones\n\nPlease communicate this to parents during the upcoming parent-teacher conferences. Detailed guidelines will be shared in the next staff meeting.\n\nThank you,\nAllan Kimeli',
      isRead: true,
      createdAt: daysAgo(2),
    },

    // === Teacher to Admin: Class Issues, Resource Requests ===
    {
      senderId: USERS.teacher1,
      receiverId: USERS.superAdmin,
      subject: 'Request for Mathematics Textbooks',
      content: 'Dear Allan,\n\nI would like to request additional Mathematics textbooks for my class. Currently we have 30 textbooks for 40 students, which means some students have to share during lessons.\n\nI recommend:\n- 15 copies of "Primary Mathematics Book 4" (KLB)\n- 10 copies of "Maths Made Easy" supplementary\n\nEstimated cost: KES 18,500. This will greatly improve the quality of instruction and allow every student to follow along during lessons.\n\nThank you for considering this request.\n\nJohn Mwangi',
      isRead: true,
      createdAt: daysAgo(7),
    },
    {
      senderId: USERS.teacher2,
      receiverId: USERS.admin,
      subject: 'Classroom Furniture Needs Repair',
      content: 'Dear Mary,\n\nI wanted to bring to your attention that the desks in my classroom are in poor condition. Several desks have broken legs and wobble during lessons, making it difficult for students to write properly.\n\nI have identified 12 desks that need repair or replacement. This is affecting the students\' concentration and the overall learning environment.\n\nCould the maintenance team please look into this before the end of term exams?\n\nThank you,\nGrace Akinyi',
      isRead: false,
      createdAt: daysAgo(3),
    },
    {
      senderId: USERS.teacher1,
      receiverId: USERS.admin,
      subject: 'Attendance Concern - High Absenteeism This Week',
      content: 'Dear Mary,\n\nI am concerned about the high rate of absenteeism in my class this week. Out of 38 students, 7 have been absent for 3 or more days.\n\nThe affected students are:\n- Peter Rotich (3 days)\n- Faith Chebet (4 days)\n- Brian Kiprop (3 days)\n- Irene Njeri (5 days)\n\nI have tried reaching out to some parents via phone but have not received responses. Could we send official notification letters to these parents?\n\nRegards,\nJohn Mwangi',
      isRead: true,
      createdAt: daysAgo(6),
    },
    {
      senderId: USERS.teacher2,
      receiverId: USERS.superAdmin,
      subject: 'Request for Science Lab Materials',
      content: 'Dear Allan,\n\nAs we prepare for the practical science assessments next term, I would like to request the following materials for the science lab:\n\n- Magnifying glasses (20 pieces)\n- Thermometers (10 pieces)\n- Measuring cylinders (10 pieces)\n- pH indicator paper (5 packs)\n- Safety goggles (20 pieces)\n\nThese are essential for the CBC science activities and will be used across multiple classes. Estimated budget: KES 24,000.\n\nI can provide supplier details if needed.\n\nBest regards,\nGrace Akinyi',
      isRead: true,
      createdAt: daysAgo(10),
    },
    {
      senderId: USERS.teacher1,
      receiverId: USERS.admin,
      subject: 'Report Card Printing Supplies Running Low',
      content: 'Dear Mary,\n\nPlease note that we are running low on report card printing supplies:\n\n- A4 card paper: 2 reams remaining\n- Report card covers: 50 remaining\n- School seal stamps: Ink is running low\n\nWe need these for approximately 400+ report cards before the end of this term. Could you please place an order for these items at your earliest convenience?\n\nThank you,\nJohn Mwangi',
      isRead: false,
      createdAt: daysAgo(1),
    },

    // === Parent to Admin: Fee Inquiries, Student Progress ===
    {
      senderId: USERS.parent1,
      receiverId: USERS.admin,
      subject: 'Fee Balance Inquiry for Peter Rotich',
      content: 'Dear Sir/Madam,\n\nI am writing to inquire about the current fee balance for my son, Peter Rotich (Admission No. OLVS-2024-001). I made a payment of KES 15,000 last month but the system still shows an outstanding balance.\n\nCould you please send me a detailed fee statement showing:\n- Total fees for Term 1\n- Amount paid to date\n- Remaining balance\n- Any additional charges\n\nI would like to clear the balance before the end of term exams.\n\nThank you,\nPeter Otieno\nParent/Guardian',
      isRead: true,
      createdAt: daysAgo(8),
    },
    {
      senderId: USERS.parent2,
      receiverId: USERS.admin,
      subject: 'Fee Payment Receipt Not Received',
      content: 'Dear Admin,\n\nI made a fee payment of KES 20,000 via M-Pesa on 15th January 2025 for my daughter\'s school fees. The M-Pesa confirmation code is SBK3FGH7IJ.\n\nHowever, I have not received the official payment receipt from the school. Could you please confirm the payment was received and send me the receipt?\n\nThank you,\nAgnes Wambui',
      isRead: true,
      createdAt: daysAgo(14),
    },
    {
      senderId: USERS.parent1,
      receiverId: USERS.superAdmin,
      subject: 'Request for Student Progress Report',
      content: 'Dear Allan,\n\nI would like to request an update on my son Peter Rotich\'s academic progress this term. I noticed his performance in the last CAT dropped compared to Term 3 of last year.\n\nCould you please share:\n1. His current class attendance record\n2. Performance in recent assessments\n3. Any areas where he may need additional support\n4. Teacher\'s recommendations\n\nI would appreciate a meeting with his class teacher if possible.\n\nBest regards,\nPeter Otieno',
      isRead: false,
      createdAt: daysAgo(3),
    },
    {
      senderId: USERS.parent2,
      receiverId: USERS.admin,
      subject: 'School Transport Inquiry',
      content: 'Dear Admin,\n\nI wanted to inquire about the school transport services for next term. Currently my daughter is being dropped off at home by a private matatu, which is becoming unreliable.\n\nCould you provide information about:\n1. Available school bus routes\n2. Pick-up and drop-off times\n3. Transport fee per term\n4. Whether there is space on the route covering Eldoret Town area\n\nThank you for your assistance.\n\nAgnes Wambui',
      isRead: true,
      createdAt: daysAgo(12),
    },

    // === Admin to Parent: School Events, Reminders ===
    {
      senderId: USERS.admin,
      receiverId: USERS.parent1,
      subject: 'Upcoming Parent-Teacher Conference',
      content: 'Dear Mr. Otieno,\n\nYou are cordially invited to the Term 1 Parent-Teacher Conference scheduled for:\n\n📅 Date: Saturday, 22nd March 2025\n🕐 Time: 9:00 AM - 1:00 PM\n📍 Venue: Uwezo School Main Hall\n\nDuring the conference, you will have the opportunity to:\n- Meet with your child\'s class teacher\n- Review academic progress reports\n- Discuss the upcoming term exams\n- View your child\'s classwork and projects\n\nPlease confirm your attendance by replying to this message or calling the school office.\n\nWe look forward to seeing you!\n\nBest regards,\nMary Wanjiku\nAdmin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(9),
    },
    {
      senderId: USERS.admin,
      receiverId: USERS.parent2,
      subject: 'Upcoming Parent-Teacher Conference',
      content: 'Dear Ms. Wambui,\n\nYou are cordially invited to the Term 1 Parent-Teacher Conference scheduled for:\n\n📅 Date: Saturday, 22nd March 2025\n🕐 Time: 9:00 AM - 1:00 PM\n📍 Venue: Uwezo School Main Hall\n\nDuring the conference, you will have the opportunity to:\n- Meet with your child\'s class teacher\n- Review academic progress reports\n- Discuss the upcoming term exams\n- View your child\'s classwork and projects\n\nPlease confirm your attendance by replying to this message or calling the school office.\n\nWe look forward to seeing you!\n\nBest regards,\nMary Wanjiku\nAdmin, Uwezo School',
      isRead: false,
      createdAt: daysAgo(9),
    },
    {
      senderId: USERS.superAdmin,
      receiverId: USERS.parent1,
      subject: 'Term 1 Fee Reminder - Balance Outstanding',
      content: 'Dear Mr. Otieno,\n\nThis is a gentle reminder that your fee balance for Term 1 is still outstanding.\n\nStudent: Peter Rotich (Admission No. OLVS-2024-001)\nTerm 1 Total Fees: KES 32,000\nAmount Paid: KES 15,000\nOutstanding Balance: KES 17,000\n\nThe deadline for full fee payment is April 30, 2025. Please make the payment at the school office or via M-Pesa to Paybill No. 123456 (Account: OLVS-2024-001).\n\nA clearance certificate will be issued upon full payment.\n\nThank you for your prompt attention.\n\nAllan Kimeli\nSuper Admin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(11),
    },
    {
      senderId: USERS.superAdmin,
      receiverId: USERS.parent2,
      subject: 'School Sports Day 2025',
      content: 'Dear Ms. Wambui,\n\nWe are pleased to invite you and your family to the Uwezo School Annual Sports Day!\n\n📅 Date: Friday, 28th February 2025\n🕐 Time: 8:30 AM - 4:00 PM\n📍 Venue: Uwezo School Sports Ground\n\nActivities include:\n- Track and field events (100m, 200m, 400m)\n- Relay races\n- Sack race and three-legged race\n- Tug of war\n- Football and netball matches\n- Prize giving ceremony\n\nParents are welcome to participate in the special parents\' race! Refreshments will be available.\n\nPlease come and cheer our students on!\n\nWarm regards,\nAllan Kimeli\nSuper Admin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(15),
    },
    {
      senderId: USERS.admin,
      receiverId: USERS.parent1,
      subject: 'Term 1 Closing Date Reminder',
      content: 'Dear Mr. Otieno,\n\nPlease note the following important dates for the end of Term 1:\n\n- Last day of school: Friday, 23rd May 2025\n- Report card collection: Monday, 26th May 2025\n- Term 2 opening date: Monday, 2nd June 2025\n\nImportant reminders:\n1. Clear any outstanding fee balance before closing day\n2. Collect all your child\'s books and personal items\n3. Review the holiday assignment pack\n4. Ensure your child has the correct uniform for Term 2\n\nWishing you and your family a blessed holiday.\n\nMary Wanjiku\nAdmin, Uwezo School',
      isRead: false,
      createdAt: daysAgo(0),
    },
    {
      senderId: USERS.admin,
      receiverId: USERS.parent2,
      subject: 'End of Term Holiday Programmes',
      content: 'Dear Ms. Wambui,\n\nWe are excited to announce that Uwezo School will be offering holiday programmes during the April holiday break:\n\n📚 Academic Programme\n- Remedial classes for Grades 4-6\n- CBC activity sessions\n- Computer basics (free for all students)\n\n🎨 Creative Programme\n- Art and craft workshops\n- Music and drama classes\n- Public speaking training\n\nThe programmes will run from April 28 - May 2, 2025 (9:00 AM - 12:00 PM). Registration forms are available at the school office.\n\nLimited spaces available. Register early!\n\nMary Wanjiku\nAdmin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(13),
    },

    // === Additional cross-role messages ===
    {
      senderId: USERS.teacher2,
      receiverId: USERS.parent1,
      subject: 'Peter\'s Excellent Performance in Science',
      content: 'Dear Mr. Otieno,\n\nI am pleased to inform you that Peter has shown remarkable improvement in Science this term. In the recent CAT, he scored 85%, placing him among the top performers in the class.\n\nPeter has shown great interest in practical experiments and consistently submits his assignments on time. His curiosity and dedication are commendable.\n\nI encourage you to continue supporting his learning at home, especially with the science project he will be working on next week.\n\nKind regards,\nGrace Akinyi\nScience Teacher, Uwezo School',
      isRead: true,
      createdAt: daysAgo(6),
    },
    {
      senderId: USERS.parent2,
      receiverId: USERS.teacher1,
      subject: 'Homework Help Request',
      content: 'Dear Mr. Mwangi,\n\nI hope this message finds you well. My daughter has been struggling with the Mathematics homework on fractions and decimals. She is finding it difficult to understand the concept of converting between the two.\n\nCould you kindly:\n1. Provide some extra practice exercises she can work on\n2. Recommend any learning resources or apps that might help\n3. Let me know if there are any tutoring options available at the school\n\nI want to ensure she does well in the upcoming exams. Thank you for your dedication to our children\'s education.\n\nBest regards,\nAgnes Wambui',
      isRead: false,
      createdAt: daysAgo(4),
    },
    {
      senderId: USERS.teacher1,
      receiverId: USERS.teacher2,
      subject: 'Collaborative Lesson Plan - Interdisciplinary Project',
      content: 'Hi Grace,\n\nI had an idea for a collaborative project between our classes. Since you teach Science and I handle Mathematics, we could create an interdisciplinary project on "Data Analysis in Science".\n\nThe project would involve:\n1. Students collecting data from science experiments\n2. Using mathematical tools to analyze and graph the data\n3. Writing a joint report\n\nThis aligns well with the CBC competency-based approach. Let me know what you think and if you are available to discuss this further during the lunch break tomorrow.\n\nBest,\nJohn',
      isRead: true,
      createdAt: daysAgo(18),
    },
    {
      senderId: USERS.admin,
      receiverId: USERS.teacher1,
      subject: 'Mid-Term Break Schedule',
      content: 'Dear John,\n\nPlease note the mid-term break schedule for Term 1:\n\n- Break dates: Thursday 20th - Sunday 23rd February 2025\n- Classes resume: Monday 24th February 2025\n\nPlease ensure:\n1. All homework assignments are given before the break\n2. The classroom is properly secured\n3. Students take home all holiday revision materials\n4. Any pending marks are entered into the system\n\nEnjoy the break!\n\nMary Wanjiku',
      isRead: true,
      createdAt: daysAgo(20),
    },
    {
      senderId: USERS.superAdmin,
      receiverId: USERS.parent2,
      subject: 'Fee Payment Confirmation Received',
      content: 'Dear Ms. Wambui,\n\nWe confirm receipt of your fee payment of KES 20,000 via M-Pesa (Transaction ID: SBK3FGH7IJ) for your daughter\'s Term 1 fees.\n\nPayment details:\n- Amount: KES 20,000\n- Date: 15th January 2025\n- Method: M-Pesa\n- Receipt No: OLVS-FEE-2025-0847\n\nYour updated fee balance is KES 12,000. Please clear the remaining balance before April 30, 2025.\n\nA printed receipt is available for collection at the school office during working hours.\n\nThank you.\n\nAllan Kimeli\nSuper Admin, Uwezo School',
      isRead: true,
      createdAt: daysAgo(13),
    },
    {
      senderId: USERS.parent1,
      receiverId: USERS.admin,
      subject: 'Change of Emergency Contact Details',
      content: 'Dear Admin,\n\nI would like to update the emergency contact details for my son, Peter Rotich:\n\nNew emergency contact:\n- Name: Jane Otieno (Mother)\n- Phone: +254 723 456 789\n- Relationship: Mother\n\nPlease update the school records accordingly. The previous contact number is no longer in use.\n\nThank you,\nPeter Otieno',
      isRead: false,
      createdAt: daysAgo(2),
    },
  ];

  // Seed all messages
  let created = 0;
  for (const msg of messages) {
    await prisma.message.create({
      data: {
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        subject: msg.subject,
        content: msg.content,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        updatedAt: msg.createdAt,
      },
    });
    created++;
  }

  console.log(`✅ Successfully seeded ${created} messages\n`);

  // Summary
  const readCount = messages.filter(m => m.isRead).length;
  const unreadCount = messages.filter(m => !m.isRead).length;
  console.log(`📊 Summary:`);
  console.log(`   Total messages: ${created}`);
  console.log(`   Read: ${readCount}`);
  console.log(`   Unread: ${unreadCount}`);
  console.log(`   Date range: ${daysAgo(20).toLocaleDateString()} to ${new Date().toLocaleDateString()}\n`);

  // Per-user inbox summary
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true },
  });

  console.log('📬 Inbox summary per user:');
  for (const user of users) {
    const inbox = await prisma.message.count({
      where: { receiverId: user.id },
    });
    const sent = await prisma.message.count({
      where: { senderId: user.id },
    });
    const unread = await prisma.message.count({
      where: { receiverId: user.id, isRead: false },
    });
    console.log(`   ${user.name.padEnd(20)} | Inbox: ${String(inbox).padStart(2)} (${unread} unread) | Sent: ${String(sent).padStart(2)}`);
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
