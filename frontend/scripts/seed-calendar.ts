/**
 * Seed Calendar Events for Uwezo School Management System
 * Creates realistic Kenyan school calendar events for 2025 and 2026
 *
 * Run with: bun run scripts/seed-calendar.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing existing calendar events...');
  const deleted = await prisma.calendarEvent.deleteMany();
  console.log(`   Deleted ${deleted.count} existing events\n`);

  const events = [
    // ===================== ACADEMIC EVENTS (EXAM) =====================

    {
      title: 'Term 1 CAT 1 Examinations',
      description: 'Continuous Assessment Test 1 for all classes. Students should revise thoroughly and come prepared with all necessary materials.',
      startDate: new Date('2025-02-24T08:00:00'),
      endDate: new Date('2025-02-28T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Various Classrooms',
      eventType: 'EXAM',
      targetRoles: 'STUDENTS',
      isAllDay: false,
      color: 'red',
    },
    {
      title: 'Term 1 End Term Examinations',
      description: 'End of Term 1 examinations for all classes. Covers all subjects taught during Term 1. Parents to ensure students arrive on time.',
      startDate: new Date('2025-04-07T08:00:00'),
      endDate: new Date('2025-04-11T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Examination Hall & Classrooms',
      eventType: 'EXAM',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'red',
    },
    {
      title: 'Term 2 CAT 2 Examinations',
      description: 'Continuous Assessment Test 2 for Term 2. Mid-term evaluation covering syllabus completed so far.',
      startDate: new Date('2025-07-14T08:00:00'),
      endDate: new Date('2025-07-18T16:00:00'),
      startTime: '08:00',
      endTime: '15:00',
      location: 'Various Classrooms',
      eventType: 'EXAM',
      targetRoles: 'STUDENTS',
      isAllDay: false,
      color: 'red',
    },
    {
      title: 'Term 2 End Term Examinations',
      description: 'End of Term 2 examinations. Results will be available during opening day of Term 3.',
      startDate: new Date('2025-08-11T08:00:00'),
      endDate: new Date('2025-08-15T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Examination Hall & Classrooms',
      eventType: 'EXAM',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'red',
    },
    {
      title: 'KCPE/KCSE Mock Examinations',
      description: 'National examination mock tests for candidate classes (Grade 8 and Form 4). Conducted under strict examination conditions to prepare students for the final national exams.',
      startDate: new Date('2025-10-06T08:00:00'),
      endDate: new Date('2025-10-17T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Main Hall',
      eventType: 'EXAM',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'red',
    },
    {
      title: 'Term 3 End Term Examinations',
      description: 'Final term examinations for the academic year. All students must complete these assessments.',
      startDate: new Date('2025-11-24T08:00:00'),
      endDate: new Date('2025-11-28T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Examination Hall & Classrooms',
      eventType: 'EXAM',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'red',
    },

    // ===================== SCHOOL EVENTS (EVENT) =====================

    {
      title: 'Opening Day — Term 1 2025',
      description: 'School reopens for the new academic year. All students to report by 7:30 AM. Parents welcome to accompany their children. Form 1 orientation will take place in the main hall.',
      startDate: new Date('2025-01-27T07:30:00'),
      endDate: null,
      startTime: '07:30',
      endTime: '13:00',
      location: 'School Compound',
      eventType: 'EVENT',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'teal',
    },
    {
      title: 'Sports Day 2025',
      description: 'Annual inter-house sports competition featuring athletics, field events, and relay races. Parents and guardians are invited to attend and cheer their children. Food stalls available.',
      startDate: new Date('2025-03-21T08:00:00'),
      endDate: new Date('2025-03-21T17:00:00'),
      startTime: '08:00',
      endTime: '17:00',
      location: 'School Sports Field',
      eventType: 'EVENT',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'teal',
    },
    {
      title: 'Cultural Festival 2025',
      description: 'A celebration of Kenyan cultural diversity. Students will showcase traditional dances, songs, poetry, and art from various Kenyan communities. Traditional attire encouraged.',
      startDate: new Date('2025-06-13T09:00:00'),
      endDate: new Date('2025-06-13T16:00:00'),
      startTime: '09:00',
      endTime: '16:00',
      location: 'School Hall & Grounds',
      eventType: 'EVENT',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'purple',
    },
    {
      title: "Parents' Day — Term 2",
      description: 'Open day for parents to visit the school, meet teachers, and discuss their children\'s academic progress. One-on-one sessions available with class teachers.',
      startDate: new Date('2025-05-16T09:00:00'),
      endDate: new Date('2025-05-16T15:00:00'),
      startTime: '09:00',
      endTime: '15:00',
      location: 'Various Classrooms',
      eventType: 'EVENT',
      targetRoles: 'PARENTS',
      isAllDay: false,
      color: 'teal',
    },
    {
      title: 'Prize Giving Day 2025',
      description: 'Annual prize giving ceremony to honour top-performing students in academics, sports, and co-curricular activities. Chief guest to be announced. All parents invited.',
      startDate: new Date('2025-12-05T10:00:00'),
      endDate: new Date('2025-12-05T13:00:00'),
      startTime: '10:00',
      endTime: '13:00',
      location: 'Main School Hall',
      eventType: 'EVENT',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'teal',
    },
    {
      title: 'Opening Day — Term 2 2025',
      description: 'School reopens for Term 2. Students to report with complete stationery. Term 2 fee balance must be cleared by end of first week.',
      startDate: new Date('2025-05-05T07:30:00'),
      endDate: null,
      startTime: '07:30',
      endTime: '13:00',
      location: 'School Compound',
      eventType: 'EVENT',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'teal',
    },
    {
      title: 'Opening Day — Term 3 2025',
      description: 'School reopens for Term 3. KCPE/KCSE candidates to report early for intensive revision programme.',
      startDate: new Date('2025-09-01T07:30:00'),
      endDate: null,
      startTime: '07:30',
      endTime: '13:00',
      location: 'School Compound',
      eventType: 'EVENT',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'teal',
    },

    // ===================== HOLIDAYS (HOLIDAY) =====================

    {
      title: 'Term 1 Break',
      description: 'End of Term 1 holidays. School closes at noon. Boarders to be picked up by 2:00 PM. School reopens on 5th May for Term 2.',
      startDate: new Date('2025-04-25T12:00:00'),
      endDate: new Date('2025-05-04T23:59:00'),
      startTime: null,
      endTime: null,
      location: null,
      eventType: 'HOLIDAY',
      targetRoles: 'ALL',
      isAllDay: true,
      color: 'amber',
    },
    {
      title: 'Term 2 Break',
      description: 'End of Term 2 holidays. School reopens on 1st September for Term 3. Students encouraged to read and complete holiday assignments.',
      startDate: new Date('2025-08-22T12:00:00'),
      endDate: new Date('2025-08-31T23:59:00'),
      startTime: null,
      endTime: null,
      location: null,
      eventType: 'HOLIDAY',
      targetRoles: 'ALL',
      isAllDay: true,
      color: 'amber',
    },
    {
      title: 'Christmas & New Year Holiday',
      description: 'End of year holidays. School closes for the Christmas break. Opening date for 2026 academic year will be communicated via SMS and school notice board.',
      startDate: new Date('2025-12-19T12:00:00'),
      endDate: new Date('2026-01-26T23:59:00'),
      startTime: null,
      endTime: null,
      location: null,
      eventType: 'HOLIDAY',
      targetRoles: 'ALL',
      isAllDay: true,
      color: 'amber',
    },
    {
      title: 'Madaraka Day — Public Holiday',
      description: 'School closed for Madaraka Day celebrations. National holiday observed across Kenya.',
      startDate: new Date('2025-06-01T00:00:00'),
      endDate: null,
      startTime: null,
      endTime: null,
      location: null,
      eventType: 'HOLIDAY',
      targetRoles: 'ALL',
      isAllDay: true,
      color: 'amber',
    },
    {
      title: 'Mashujaa Day — Public Holiday',
      description: 'School closed for Mashujaa Day (Heroes\' Day). National holiday to honour Kenya\'s heroes and heroines.',
      startDate: new Date('2025-10-20T00:00:00'),
      endDate: null,
      startTime: null,
      endTime: null,
      location: null,
      eventType: 'HOLIDAY',
      targetRoles: 'ALL',
      isAllDay: true,
      color: 'amber',
    },
    {
      title: 'Jamhuri Day — Public Holiday',
      description: 'School closed for Jamhuri Day (Republic Day). Celebrating Kenya\'s independence.',
      startDate: new Date('2025-12-12T00:00:00'),
      endDate: null,
      startTime: null,
      endTime: null,
      location: null,
      eventType: 'HOLIDAY',
      targetRoles: 'ALL',
      isAllDay: true,
      color: 'amber',
    },

    // ===================== MEETINGS (MEETING) =====================

    {
      title: 'Term 1 Staff Meeting',
      description: 'Mandatory staff meeting to plan Term 1 activities. Agenda includes: academic calendar review, department planning, new curriculum updates (CBC), and student welfare matters.',
      startDate: new Date('2025-01-20T08:00:00'),
      endDate: null,
      startTime: '08:00',
      endTime: '12:00',
      location: 'Staff Room',
      eventType: 'MEETING',
      targetRoles: 'TEACHERS',
      isAllDay: false,
      color: 'blue',
    },
    {
      title: 'Parent-Teacher Conference',
      description: 'Mid-year parent-teacher conference to discuss student progress, upcoming examinations, and school development plans. Each session is 15 minutes per student.',
      startDate: new Date('2025-07-25T09:00:00'),
      endDate: new Date('2025-07-25T16:00:00'),
      startTime: '09:00',
      endTime: '16:00',
      location: 'School Hall & Classrooms',
      eventType: 'MEETING',
      targetRoles: 'PARENTS',
      isAllDay: false,
      color: 'blue',
    },
    {
      title: 'Board of Management Meeting',
      description: 'Quarterly Board of Management meeting to review school performance, approve budget allocations, and discuss strategic development plans for the coming term.',
      startDate: new Date('2025-09-15T10:00:00'),
      endDate: null,
      startTime: '10:00',
      endTime: '13:00',
      location: 'Board Room',
      eventType: 'MEETING',
      targetRoles: 'STAFF',
      isAllDay: false,
      color: 'blue',
    },
    {
      title: 'Term 2 Staff Meeting',
      description: 'Staff meeting to review Term 1 results and plan Term 2 activities. Discussion on CBC implementation progress and co-curricular calendar.',
      startDate: new Date('2025-05-02T08:00:00'),
      endDate: null,
      startTime: '08:00',
      endTime: '12:00',
      location: 'Staff Room',
      eventType: 'MEETING',
      targetRoles: 'TEACHERS',
      isAllDay: false,
      color: 'blue',
    },

    // ===================== SPORTS (SPORTS) =====================

    {
      title: 'Inter-House Athletics Competition',
      description: 'Annual inter-house athletics meet featuring track events (100m, 200m, 400m, 800m, 1500m) and field events (long jump, high jump, shot put, javelin). Points contribute to the house championship.',
      startDate: new Date('2025-03-10T08:00:00'),
      endDate: new Date('2025-03-14T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'School Sports Field',
      eventType: 'SPORTS',
      targetRoles: 'STUDENTS',
      isAllDay: false,
      color: 'green',
    },
    {
      title: 'Swimming Gala 2025',
      description: 'Annual swimming competition for all classes. Events include freestyle, backstroke, breaststroke, and relay races. All students must participate. Swimming costumes mandatory.',
      startDate: new Date('2025-05-23T09:00:00'),
      endDate: new Date('2025-05-23T15:00:00'),
      startTime: '09:00',
      endTime: '15:00',
      location: 'School Swimming Pool',
      eventType: 'SPORTS',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'green',
    },
    {
      title: 'Inter-School Football Tournament',
      description: 'Uwezo School will host the annual inter-school football tournament. Teams from 8 neighbouring schools will participate. Both boys and girls categories.',
      startDate: new Date('2025-09-19T09:00:00'),
      endDate: new Date('2025-09-20T17:00:00'),
      startTime: '09:00',
      endTime: '17:00',
      location: 'School Sports Field',
      eventType: 'SPORTS',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'green',
    },

    // ===================== CULTURAL (CULTURAL) =====================

    {
      title: 'Kenya Music Festival — Regional',
      description: 'Uwezo School participates in the Kenya Music Festival regional competition. Categories include choral verse, solo singing, traditional dances, and instrumental music.',
      startDate: new Date('2025-06-16T08:00:00'),
      endDate: new Date('2025-06-20T17:00:00'),
      startTime: '08:00',
      endTime: '17:00',
      location: 'County Hall, Eldoret',
      eventType: 'CULTURAL',
      targetRoles: 'STUDENTS',
      isAllDay: false,
      color: 'purple',
    },
    {
      title: 'Drama & Theatre Festival',
      description: 'Annual school drama festival featuring plays, skits, and spoken word performances by students from all classes. Theme: "Our Heritage, Our Future."',
      startDate: new Date('2025-10-22T10:00:00'),
      endDate: new Date('2025-10-23T16:00:00'),
      startTime: '10:00',
      endTime: '16:00',
      location: 'School Hall',
      eventType: 'CULTURAL',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'purple',
    },
    {
      title: 'International Day Celebration',
      description: 'A celebration of global cultures with food, music, and performances from around the world. Each class represents a different country.',
      startDate: new Date('2025-07-04T09:00:00'),
      endDate: new Date('2025-07-04T15:00:00'),
      startTime: '09:00',
      endTime: '15:00',
      location: 'School Grounds',
      eventType: 'CULTURAL',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'purple',
    },

    // ===================== 2026 EVENTS =====================

    {
      title: 'Opening Day — Term 1 2026',
      description: 'School reopens for the 2026 academic year. New students to report with all required documents. Returning students to come with completed holiday assignments.',
      startDate: new Date('2026-01-27T07:30:00'),
      endDate: null,
      startTime: '07:30',
      endTime: '13:00',
      location: 'School Compound',
      eventType: 'EVENT',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'teal',
    },
    {
      title: 'Term 1 2026 — CAT 1 Examinations',
      description: 'First Continuous Assessment Test for the 2026 academic year. Covers Term 1 syllabus content.',
      startDate: new Date('2026-02-23T08:00:00'),
      endDate: new Date('2026-02-27T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Various Classrooms',
      eventType: 'EXAM',
      targetRoles: 'STUDENTS',
      isAllDay: false,
      color: 'red',
    },
    {
      title: 'Sports Day 2026',
      description: 'Annual inter-house sports day featuring athletics, team games, and fun races for all students. Parents and alumni invited.',
      startDate: new Date('2026-03-20T08:00:00'),
      endDate: new Date('2026-03-20T17:00:00'),
      startTime: '08:00',
      endTime: '17:00',
      location: 'School Sports Field',
      eventType: 'SPORTS',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'green',
    },
    {
      title: 'Term 1 2026 — End Term Examinations',
      description: 'End of Term 1 examinations for 2026. All students must complete assessments in all subjects.',
      startDate: new Date('2026-04-06T08:00:00'),
      endDate: new Date('2026-04-10T16:00:00'),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Examination Hall & Classrooms',
      eventType: 'EXAM',
      targetRoles: 'ALL',
      isAllDay: false,
      color: 'red',
    },
    {
      title: 'Term 1 2026 Break',
      description: 'End of Term 1 holidays. School closes at noon. Reopens in May for Term 2.',
      startDate: new Date('2026-04-24T12:00:00'),
      endDate: new Date('2026-05-04T23:59:00'),
      startTime: null,
      endTime: null,
      location: null,
      eventType: 'HOLIDAY',
      targetRoles: 'ALL',
      isAllDay: true,
      color: 'amber',
    },
    {
      title: "Parents' Day — Term 1 2026",
      description: 'Parent-teacher engagement day for Term 1 2026. Parents collect Term 1 results and discuss academic progress.',
      startDate: new Date('2026-05-15T09:00:00'),
      endDate: new Date('2026-05-15T15:00:00'),
      startTime: '09:00',
      endTime: '15:00',
      location: 'Various Classrooms',
      eventType: 'EVENT',
      targetRoles: 'PARENTS',
      isAllDay: false,
      color: 'teal',
    },
  ];

  console.log(`📝 Seeding ${events.length} calendar events...\n`);

  const result = await prisma.calendarEvent.createMany({
    data: events,
  });

  console.log(`✅ Successfully seeded ${result.count} calendar events!\n`);

  // Print summary by type
  const typeCounts: Record<string, number> = {};
  for (const event of events) {
    typeCounts[event.eventType] = (typeCounts[event.eventType] || 0) + 1;
  }

  console.log('📊 Events by type:');
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`   ${type.padEnd(12)} : ${count} events`);
  }

  // Print summary by year
  const yearCounts: Record<string, number> = {};
  for (const event of events) {
    const year = event.startDate.getFullYear().toString();
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  }

  console.log('\n📊 Events by year:');
  for (const [year, count] of Object.entries(yearCounts)) {
    console.log(`   ${year.padEnd(8)} : ${count} events`);
  }

  console.log(`\n🎉 Calendar seeding complete!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding calendar events:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
