import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

const kenyanFirstNamesMale = ['Brian', 'Kevin', 'Ian', 'Dennis', 'Evan', 'Ryan', 'Ethan', 'Mark', 'Steve', 'Paul', 'Joseph', 'Daniel', 'David', 'Samuel', 'Peter', 'James', 'John', 'Michael', 'Robert', 'William', 'Thomas', 'Alex', 'Nathan', 'Joshua', 'Luke', 'Andrew', 'Isaac', 'Aaron', 'Adam', 'Noah'];
const kenyanFirstNamesFemale = ['Faith', 'Grace', 'Hope', 'Mercy', 'Joy', 'Blessing', 'Sarah', 'Mary', 'Esther', 'Naomi', 'Ruth', 'Rebecca', 'Rachel', 'Hannah', 'Abigail', 'Lydia', 'Priscilla', 'Tabitha', 'Agnes', 'Wangari', 'Wanjiku', 'Nyambura', 'Akinyi', 'Achieng', 'Chebet', 'Cherono', 'Jepkosgei', 'Kipchumba', 'Cynthia', 'Diana'];
const kenyanLastNames = ['Kipchoge', 'Kemboi', 'Rotich', 'Kibet', 'Cheruiyot', 'Koech', 'Yego', 'Bett', 'Kimutai', 'Kosgei', 'Rono', 'Ngugi', 'Wanjiru', 'Ochieng', 'Otieno', 'Odhiambo', 'Mwangi', 'Kamau', 'Njoroge', 'Muthoni', 'Wambui', 'Njeri', 'Gitau', 'Macharia', 'Kariuki', 'Ndegwa', 'Muriithi', 'Kirimi', 'Barasa', 'Wekesa'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAdmissionNumber(index: number): string {
  const year = 2025;
  return `ADM/${year}/${String(index).padStart(4, '0')}`;
}

function generateReceiptNumber(): string {
  return `RCP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function getCBCGrade(score: number, level: string): string {
  if (['PRE_NURSERY', 'NURSERY', 'GRADE_1', 'GRADE_2', 'GRADE_3'].includes(level)) {
    if (score >= 80) return 'EE';
    if (score >= 65) return 'ME';
    if (score >= 50) return 'AE';
    return 'BE';
  } else {
    if (score >= 80) return '1';
    if (score >= 65) return '2';
    if (score >= 50) return '3';
    return '4';
  }
}

function getRemarks(grade: string): string {
  const remarks: Record<string, string> = {
    'EE': 'Excellent',
    'ME': 'Very Good',
    'AE': 'Good',
    'BE': 'Needs Improvement',
    '1': 'Excellent',
    '2': 'Very Good',
    '3': 'Good',
    '4': 'Needs Improvement',
  };
  return remarks[grade] || '';
}

async function main() {
  console.log('🌱 Seeding Olives School Management System...\n');

  // Clean existing data
  await prisma.examMark.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.feeTransaction.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.studentGuardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.schoolNotice.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.term.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.schoolClass.deleteMany();
  await prisma.user.deleteMany();

  // ==================== USERS ====================
  console.log('Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Allan Kimeli',
        email: 'admin@olives.co.ke',
        password: hashSync('admin123', 10),
        phone: '+254712345678',
        role: 'SUPER_ADMIN',
        gender: 'MALE',
        status: 'ACTIVE',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Mary Wanjiku',
        email: 'admin2@olives.co.ke',
        password: hashSync('admin123', 10),
        phone: '+254712345679',
        role: 'ADMIN',
        gender: 'FEMALE',
        status: 'ACTIVE',
      }
    }),
    prisma.user.create({
      data: {
        name: 'John Mwangi',
        email: 'teacher@olives.co.ke',
        password: hashSync('teacher123', 10),
        phone: '+254723456789',
        role: 'TEACHER',
        gender: 'MALE',
        status: 'ACTIVE',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Grace Akinyi',
        email: 'teacher2@olives.co.ke',
        password: hashSync('teacher123', 10),
        phone: '+254723456790',
        role: 'TEACHER',
        gender: 'FEMALE',
        status: 'ACTIVE',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Peter Otieno',
        email: 'parent@olives.co.ke',
        password: hashSync('parent123', 10),
        phone: '+254734567890',
        role: 'PARENT',
        gender: 'MALE',
        status: 'ACTIVE',
      }
    }),
    prisma.user.create({
      data: {
        name: 'Agnes Wambui',
        email: 'parent2@olives.co.ke',
        password: hashSync('parent123', 10),
        phone: '+254734567891',
        role: 'PARENT',
        gender: 'FEMALE',
        status: 'ACTIVE',
      }
    }),
  ]);

  // ==================== CLASSES ====================
  console.log('Creating classes...');
  const classData = [
    { name: 'Pre-Nursery', level: 'PRE_NURSERY', stream: null, capacity: 30 },
    { name: 'Nursery', level: 'NURSERY', stream: null, capacity: 35 },
    { name: 'Grade 1', level: 'PRIMARY', stream: 'A', capacity: 40 },
    { name: 'Grade 1', level: 'PRIMARY', stream: 'B', capacity: 40 },
    { name: 'Grade 2', level: 'PRIMARY', stream: 'A', capacity: 40 },
    { name: 'Grade 2', level: 'PRIMARY', stream: 'B', capacity: 40 },
    { name: 'Grade 3', level: 'PRIMARY', stream: 'A', capacity: 40 },
    { name: 'Grade 3', level: 'PRIMARY', stream: 'B', capacity: 40 },
    { name: 'Grade 4', level: 'PRIMARY', stream: 'A', capacity: 40 },
    { name: 'Grade 4', level: 'PRIMARY', stream: 'B', capacity: 40 },
    { name: 'Grade 5', level: 'PRIMARY', stream: 'A', capacity: 40 },
    { name: 'Grade 5', level: 'PRIMARY', stream: 'B', capacity: 40 },
    { name: 'Grade 6', level: 'PRIMARY', stream: 'A', capacity: 40 },
    { name: 'Grade 6', level: 'PRIMARY', stream: 'B', capacity: 40 },
    { name: 'Grade 7', level: 'JUNIOR_SECONDARY', stream: 'A', capacity: 45 },
    { name: 'Grade 7', level: 'JUNIOR_SECONDARY', stream: 'B', capacity: 45 },
    { name: 'Grade 8', level: 'JUNIOR_SECONDARY', stream: 'A', capacity: 45 },
    { name: 'Grade 8', level: 'JUNIOR_SECONDARY', stream: 'B', capacity: 45 },
    { name: 'Grade 9', level: 'JUNIOR_SECONDARY', stream: 'A', capacity: 45 },
  ];

  const classes = await Promise.all(
    classData.map((c, i) =>
      prisma.schoolClass.create({
        data: {
          name: `${c.name}${c.stream ? ' ' + c.stream : ''}`,
          level: c.level,
          stream: c.stream,
          teacherId: i % 2 === 0 ? users[2].id : users[3].id,
          capacity: c.capacity,
        }
      })
    )
  );

  // ==================== SUBJECTS ====================
  console.log('Creating subjects...');
  const subjectData = [
    { name: 'English', code: 'P-ENG', level: 'PRIMARY' },
    { name: 'Kiswahili', code: 'P-KIS', level: 'PRIMARY' },
    { name: 'Mathematics', code: 'P-MATH', level: 'PRIMARY' },
    { name: 'Science & Technology', code: 'P-SCI', level: 'PRIMARY' },
    { name: 'Social Studies', code: 'P-SST', level: 'PRIMARY' },
    { name: 'Christian Religious Education', code: 'P-CRE', level: 'PRIMARY' },
    { name: 'Physical Health Education', code: 'P-PHE', level: 'PRIMARY' },
    { name: 'Art & Craft', code: 'P-ART', level: 'PRIMARY' },
    { name: 'Music', code: 'P-MUS', level: 'PRIMARY' },
    { name: 'Mathematics', code: 'JS-MATH', level: 'JUNIOR_SECONDARY' },
    { name: 'English', code: 'JS-ENG', level: 'JUNIOR_SECONDARY' },
    { name: 'Kiswahili', code: 'JS-KIS', level: 'JUNIOR_SECONDARY' },
    { name: 'Integrated Science', code: 'JS-INTSCI', level: 'JUNIOR_SECONDARY' },
    { name: 'Social Studies', code: 'JS-SST', level: 'JUNIOR_SECONDARY' },
    { name: 'CRE', code: 'JS-CRE', level: 'JUNIOR_SECONDARY' },
    { name: 'Agriculture', code: 'JS-AGR', level: 'JUNIOR_SECONDARY' },
    { name: 'Pre-Primary Activities', code: 'PP-PPA', level: 'PRE_PRIMARY' },
    { name: 'Language Activities', code: 'PP-LA', level: 'PRE_PRIMARY' },
    { name: 'Mathematical Activities', code: 'PP-MA', level: 'PRE_PRIMARY' },
    { name: 'Environmental Activities', code: 'PP-EA', level: 'PRE_PRIMARY' },
  ];

  const subjects = await Promise.all(
    subjectData.map((s) =>
      prisma.subject.create({ data: s })
    )
  );

  // ==================== TERMS ====================
  console.log('Creating terms...');
  const terms = await Promise.all([
    prisma.term.create({
      data: {
        name: 'Term 1',
        year: 2025,
        startDate: new Date('2025-01-27'),
        endDate: new Date('2025-04-04'),
        status: 'COMPLETED',
      }
    }),
    prisma.term.create({
      data: {
        name: 'Term 2',
        year: 2025,
        startDate: new Date('2025-05-05'),
        endDate: new Date('2025-08-01'),
        status: 'ACTIVE',
      }
    }),
    prisma.term.create({
      data: {
        name: 'Term 3',
        year: 2025,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-11-28'),
        status: 'UPCOMING',
      }
    }),
  ]);

  // ==================== STUDENTS (571 total) ====================
  console.log('Creating 571 students...');
  const students: any[] = [];
  let admIndex = 1;

  for (let i = 0; i < 571; i++) {
    const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
    const firstName = gender === 'MALE' ? randomItem(kenyanFirstNamesMale) : randomItem(kenyanFirstNamesFemale);
    const lastName = randomItem(kenyanLastNames);

    // Distribute students across classes
    const classIndex = Math.floor(i / 30) % classes.length;

    const student = await prisma.student.create({
      data: {
        admissionNumber: generateAdmissionNumber(admIndex++),
        firstName,
        lastName,
        dateOfBirth: new Date(
          2015 + randomInt(-4, 4),
          randomInt(0, 11),
          randomInt(1, 28)
        ),
        gender,
        classId: classes[classIndex].id,
        status: Math.random() > 0.05 ? 'ACTIVE' : randomItem(['TRANSFERRED', 'GRADUATED']),
        admissionDate: new Date(
          2020 + randomInt(0, 5),
          randomInt(0, 11),
          randomInt(1, 28)
        ),
      }
    });
    students.push(student);
  }

  // ==================== GUARDIAN LINKS ====================
  console.log('Linking students to guardians...');
  for (let i = 0; i < students.length; i++) {
    const parent = i % 2 === 0 ? users[4] : users[5];
    await prisma.studentGuardian.create({
      data: {
        studentId: students[i].id,
        guardianId: parent.id,
        relationship: Math.random() > 0.5 ? 'FATHER' : 'MOTHER',
        isPrimary: true,
      }
    });
  }

  // ==================== FEE STRUCTURES ====================
  console.log('Creating fee structures...');
  const feeCategories = [
    { name: 'Tuition Fee', category: 'TUITION', amounts: { PRE_NURSERY: 8000, NURSERY: 10000, PRIMARY: 15000, JUNIOR_SECONDARY: 20000 } },
    { name: 'Transport Fee', category: 'TRANSPORT', amounts: { PRE_NURSERY: 3000, NURSERY: 3000, PRIMARY: 4000, JUNIOR_SECONDARY: 5000 } },
    { name: 'Lunch Program', category: 'BOARDING', amounts: { PRE_NURSERY: 2000, NURSERY: 2000, PRIMARY: 3000, JUNIOR_SECONDARY: 3500 } },
    { name: 'Computer Lab', category: 'EXTRACURRICULAR', amounts: { PRE_NURSERY: 0, NURSERY: 500, PRIMARY: 1000, JUNIOR_SECONDARY: 1500 } },
  ];

  const feeStructures: any[] = [];
  for (const term of terms) {
    for (const cls of classes) {
      for (const cat of feeCategories) {
        const amount = cat.amounts[cls.level as keyof typeof cat.amounts] || 0;
        if (amount > 0) {
          const fs = await prisma.feeStructure.create({
            data: {
              name: `${cat.name} - ${cls.name}`,
              classId: cls.id,
              termId: term.id,
              amount,
              category: cat.category,
            }
          });
          feeStructures.push({ ...fs, className: cls.name, level: cls.level });
        }
      }
    }
  }

  // ==================== FEE TRANSACTIONS ====================
  console.log('Creating fee transactions...');
  const methods = ['CASH', 'BANK', 'MPESA'];
  let receiptNum = 1000;

  for (let i = 0; i < students.length; i++) {
    if (students[i].status !== 'ACTIVE') continue;

    const studentFs = feeStructures.filter(
      f => f.classId === students[i].classId && f.termId === terms[1].id // Current term
    );

    const numPayments = randomInt(1, Math.min(3, studentFs.length));
    for (let j = 0; j < numPayments; j++) {
      const fs = studentFs[j % studentFs.length];
      if (!fs) continue;

      const isPaid = Math.random() > 0.3;
      await prisma.feeTransaction.create({
        data: {
          studentId: students[i].id,
          feeStructureId: fs.id,
          amount: isPaid ? fs.amount : fs.amount * (randomInt(30, 90) / 100),
          paymentMethod: randomItem(methods),
          transactionRef: methods.includes('MPESA') ? `QJK${randomInt(1000, 9999)}${randomItem(kenyanLastNames).substring(0, 4).toUpperCase()}` : null,
          receiptNumber: `RCP${String(receiptNum++).padStart(6, '0')}`,
          status: isPaid ? 'COMPLETED' : 'COMPLETED',
          term: '2025-2',
          createdAt: new Date(2025, randomInt(4, 7), randomInt(1, 28)),
        }
      });
    }
  }

  // ==================== EXAMS ====================
  console.log('Creating exams...');
  const exams = await Promise.all([
    // Term 1 exams
    prisma.exam.create({
      data: {
        name: 'Term 1 CAT 1',
        termId: terms[0].id,
        classId: classes[2].id, // Grade 1A
        type: 'CAT_1',
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-20'),
        status: 'COMPLETED',
      }
    }),
    prisma.exam.create({
      data: {
        name: 'Term 1 End Term',
        termId: terms[0].id,
        classId: classes[2].id,
        type: 'END_TERM',
        startDate: new Date('2025-03-25'),
        endDate: new Date('2025-04-02'),
        status: 'COMPLETED',
      }
    }),
    // Term 2 exams
    prisma.exam.create({
      data: {
        name: 'Term 2 CAT 1',
        termId: terms[1].id,
        classId: classes[2].id,
        type: 'CAT_1',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-20'),
        status: 'ACTIVE',
      }
    }),
    prisma.exam.create({
      data: {
        name: 'Term 2 CAT 1',
        termId: terms[1].id,
        classId: classes[4].id, // Grade 2A
        type: 'CAT_1',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-20'),
        status: 'ACTIVE',
      }
    }),
    prisma.exam.create({
      data: {
        name: 'Term 2 CAT 1',
        termId: terms[1].id,
        classId: classes[8].id, // Grade 4A
        type: 'CAT_1',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-20'),
        status: 'ACTIVE',
      }
    }),
    prisma.exam.create({
      data: {
        name: 'Term 2 CAT 1',
        termId: terms[1].id,
        classId: classes[14].id, // Grade 7A
        type: 'CAT_1',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-20'),
        status: 'ACTIVE',
      }
    }),
    prisma.exam.create({
      data: {
        name: 'Term 2 End Term',
        termId: terms[1].id,
        classId: classes[2].id,
        type: 'END_TERM',
        startDate: new Date('2025-07-20'),
        endDate: new Date('2025-07-30'),
        status: 'DRAFT',
      }
    }),
  ]);

  // ==================== EXAM MARKS ====================
  console.log('Creating exam marks...');
  const primarySubjects = subjects.filter(s => s.level === 'PRIMARY');
  const jsSubjects = subjects.filter(s => s.level === 'JUNIOR_SECONDARY');

  for (const exam of exams) {
    const examClass = await prisma.schoolClass.findUnique({
      where: { id: exam.classId },
    });
    if (!examClass) continue;

    const examStudents = await prisma.student.findMany({
      where: { classId: exam.classId, status: 'ACTIVE' },
    });

    const examSubjects = examClass.level === 'JUNIOR_SECONDARY' ? jsSubjects : primarySubjects;

    for (const student of examStudents) {
      for (const subject of examSubjects.slice(0, 6)) {
        const score = randomInt(20, 100);
        const grade = getCBCGrade(score, examClass.level);
        await prisma.examMark.create({
          data: {
            examId: exam.id,
            studentId: student.id,
            subjectId: subject.id,
            marks: score,
            grade,
            remarks: getRemarks(grade),
            enteredBy: users[2].id,
          }
        });
      }
    }
  }

  // ==================== ATTENDANCE ====================
  console.log('Creating attendance records...');
  const currentTerm = terms[1];
  const startDate = new Date(currentTerm.startDate);
  const endDate = new Date(Math.min(Date.now(), currentTerm.endDate.getTime()));

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    for (const cls of classes.slice(0, 6)) { // First 6 classes only for attendance
      const classStudents = await prisma.student.findMany({
        where: { classId: cls.id, status: 'ACTIVE' },
      });

      for (const student of classStudents) {
        const rand = Math.random();
        let status = 'PRESENT';
        if (rand > 0.92) status = 'ABSENT';
        else if (rand > 0.88) status = 'LATE';
        else if (rand > 0.85) status = 'EXCUSED';

        if (status === 'PRESENT' && Math.random() > 0.15) continue; // Skip some present records to keep DB small

        await prisma.attendance.create({
          data: {
            studentId: student.id,
            classId: cls.id,
            termId: currentTerm.id,
            date: new Date(d),
            status,
            reason: status !== 'PRESENT' ? randomItem(['Sick', 'Family matter', 'Medical appointment', 'Weather', 'Transport issue', '']) : null,
            markedBy: users[2].id,
          }
        });
      }
    }
  }

  // ==================== SCHOOL NOTICES ====================
  console.log('Creating school notices...');
  await prisma.schoolNotice.createMany({
    data: [
      {
        title: 'Term 2 Mid-Term Break',
        content: 'Please note that the Term 2 mid-term break will be from June 26th to June 30th. All students should be picked up by 12:00 PM on June 26th and report back on July 1st by 8:00 AM.',
        category: 'ACADEMIC',
        targetRoles: 'ALL',
        isPublished: true,
        publishedAt: new Date('2025-06-15'),
        expiresAt: new Date('2025-07-05'),
      },
      {
        title: 'Parent-Teacher Conference',
        content: 'The Term 2 Parent-Teacher Conference is scheduled for July 12th from 9:00 AM to 4:00 PM. All parents are encouraged to attend to discuss their children\'s academic progress.',
        category: 'EVENTS',
        targetRoles: 'PARENT',
        isPublished: true,
        publishedAt: new Date('2025-06-20'),
        expiresAt: new Date('2025-07-15'),
      },
      {
        title: 'Fee Payment Reminder',
        content: 'This is a gentle reminder to all parents that Term 2 fees should be fully paid by end of July. Please visit the accounts office for any payment queries or to arrange a payment plan.',
        category: 'GENERAL',
        targetRoles: 'PARENT',
        isPublished: true,
        publishedAt: new Date('2025-06-18'),
        expiresAt: new Date('2025-08-01'),
      },
      {
        title: 'Inter-School Sports Day',
        content: 'Our annual inter-school sports competition will be held on August 10th at the school grounds. Students interested in participating should register with their class teacher by July 25th.',
        category: 'EVENTS',
        targetRoles: 'ALL',
        isPublished: true,
        publishedAt: new Date('2025-06-22'),
        expiresAt: new Date('2025-08-15'),
      },
      {
        title: 'New Curriculum Update - CBC',
        content: 'As per the Ministry of Education guidelines, we will be implementing the updated CBC curriculum activities starting next term. Teachers will receive training during the August holiday.',
        category: 'ACADEMIC',
        targetRoles: 'TEACHER',
        isPublished: true,
        publishedAt: new Date('2025-06-25'),
        expiresAt: new Date('2025-08-30'),
      },
    ]
  });

  // ==================== SYSTEM SETTINGS ====================
  console.log('Creating system settings...');
  await prisma.systemSetting.createMany({
    data: [
      { key: 'school_name', value: 'Olives Schools' },
      { key: 'school_motto', value: 'Nurturing Excellence, Building Character' },
      { key: 'school_address', value: 'Eldoret, Uasin Gishu County, Kenya' },
      { key: 'school_phone', value: '+254700123456' },
      { key: 'school_email', value: 'info@olivesschools.co.ke' },
      { key: 'school_logo', value: '/logo.svg' },
      { key: 'current_term_id', value: terms[1].id },
      { key: 'currency', value: 'KES' },
      { key: 'academic_year', value: '2025' },
    ]
  });

  // ==================== CALENDAR EVENTS ====================
  console.log('Creating calendar events...');
  await prisma.calendarEvent.createMany({
    data: [
      // Term dates
      { title: 'Term 1 Opening Day', description: 'First day of Term 1 - All students report', startDate: new Date('2025-01-27'), endDate: new Date('2025-01-27'), eventType: 'EVENT', targetRoles: 'ALL', isAllDay: true, color: 'teal' },
      { title: 'Term 1 Closing Day', description: 'Last day of Term 1', startDate: new Date('2025-04-04'), endDate: new Date('2025-04-04'), eventType: 'EVENT', targetRoles: 'ALL', isAllDay: true, color: 'teal' },
      { title: 'Term 2 Opening Day', description: 'First day of Term 2 - All students report', startDate: new Date('2025-05-05'), endDate: new Date('2025-05-05'), eventType: 'EVENT', targetRoles: 'ALL', isAllDay: true, color: 'teal' },
      { title: 'Term 2 Closing Day', description: 'Last day of Term 2', startDate: new Date('2025-08-01'), endDate: new Date('2025-08-01'), eventType: 'EVENT', targetRoles: 'ALL', isAllDay: true, color: 'teal' },
      { title: 'Term 3 Opening Day', description: 'First day of Term 3 - All students report', startDate: new Date('2025-09-01'), endDate: new Date('2025-09-01'), eventType: 'EVENT', targetRoles: 'ALL', isAllDay: true, color: 'teal' },
      { title: 'Term 3 Closing Day', description: 'Last day of Term 3 - End of academic year', startDate: new Date('2025-11-28'), endDate: new Date('2025-11-28'), eventType: 'EVENT', targetRoles: 'ALL', isAllDay: true, color: 'teal' },

      // Kenyan National Holidays
      { title: 'New Year\'s Day', description: 'Public Holiday', startDate: new Date('2025-01-01'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Good Friday', description: 'Public Holiday', startDate: new Date('2025-04-18'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Easter Monday', description: 'Public Holiday', startDate: new Date('2025-04-21'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Labour Day', description: 'Public Holiday - Madaraka Day', startDate: new Date('2025-05-01'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Madaraka Day', description: 'Public Holiday', startDate: new Date('2025-06-01'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Mashujaa Day', description: 'Public Holiday - Heroes Day', startDate: new Date('2025-10-20'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Jamhuri Day', description: 'Public Holiday - Republic Day', startDate: new Date('2025-12-12'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Christmas Day', description: 'Public Holiday', startDate: new Date('2025-12-25'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Boxing Day', description: 'Public Holiday', startDate: new Date('2025-12-26'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },

      // School Holidays / Breaks
      { title: 'April Holiday', description: 'Term 1 break - 3 weeks holiday', startDate: new Date('2025-04-05'), endDate: new Date('2025-04-25'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'August Holiday', description: 'Term 2 break - 4 weeks holiday', startDate: new Date('2025-08-02'), endDate: new Date('2025-08-29'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'December Holiday', description: 'End of year holiday - 2 months', startDate: new Date('2025-11-29'), endDate: new Date('2026-01-25'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },
      { title: 'Term 2 Mid-Term Break', description: 'Mid-term break for Term 2', startDate: new Date('2025-06-26'), endDate: new Date('2025-06-30'), eventType: 'HOLIDAY', targetRoles: 'ALL', isAllDay: true, color: 'amber' },

      // Exam Periods
      { title: 'Term 1 CAT 1 Exams', description: 'Continuous Assessment Test 1 for all classes', startDate: new Date('2025-02-15'), endDate: new Date('2025-02-20'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },
      { title: 'Term 1 End Term Exams', description: 'End of Term 1 examinations for all classes', startDate: new Date('2025-03-25'), endDate: new Date('2025-04-02'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },
      { title: 'Term 2 CAT 1 Exams', description: 'Continuous Assessment Test 1 for all classes', startDate: new Date('2025-06-15'), endDate: new Date('2025-06-20'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },
      { title: 'Term 2 CAT 2 Exams', description: 'Continuous Assessment Test 2 for all classes', startDate: new Date('2025-07-14'), endDate: new Date('2025-07-18'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },
      { title: 'Term 2 End Term Exams', description: 'End of Term 2 examinations for all classes', startDate: new Date('2025-07-21'), endDate: new Date('2025-07-30'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },
      { title: 'Term 3 CAT 1 Exams', description: 'Continuous Assessment Test 1 for all classes', startDate: new Date('2025-10-06'), endDate: new Date('2025-10-10'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },
      { title: 'Term 3 End Term Exams', description: 'End of Term 3 / End of Year examinations', startDate: new Date('2025-11-10'), endDate: new Date('2025-11-21'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },
      { title: 'KPSEA Exams (Grade 6)', description: 'Kenya Primary School Education Assessment for Grade 6', startDate: new Date('2025-10-27'), endDate: new Date('2025-10-31'), eventType: 'EXAM', targetRoles: 'STUDENTS', isAllDay: true, color: 'red' },

      // Sports Events
      { title: 'Inter-House Sports Day', description: 'Annual inter-house athletics and games competition', startDate: new Date('2025-03-08'), startTime: '08:00', endTime: '16:00', location: 'School Sports Field', eventType: 'SPORTS', targetRoles: 'ALL', isAllDay: false, color: 'green' },
      { title: 'Inter-School Sports Day', description: 'Compete against other schools in the region', startDate: new Date('2025-08-10'), startTime: '08:00', endTime: '17:00', location: 'County Stadium, Eldoret', eventType: 'SPORTS', targetRoles: 'ALL', isAllDay: false, color: 'green' },
      { title: 'Swimming Gala', description: 'Annual school swimming competition', startDate: new Date('2025-05-23'), startTime: '09:00', endTime: '13:00', location: 'Olives Swimming Pool', eventType: 'SPORTS', targetRoles: 'ALL', isAllDay: false, color: 'green' },
      { title: 'Cross Country Run', description: 'School cross country championship', startDate: new Date('2025-10-04'), startTime: '07:00', endTime: '12:00', location: 'School Grounds', eventType: 'SPORTS', targetRoles: 'ALL', isAllDay: false, color: 'green' },

      // Meetings
      { title: 'Parent-Teacher Conference Term 1', description: 'Discuss student progress and academic performance', startDate: new Date('2025-02-08'), startTime: '09:00', endTime: '16:00', location: 'School Hall', eventType: 'MEETING', targetRoles: 'PARENTS', isAllDay: false, color: 'blue' },
      { title: 'Parent-Teacher Conference Term 2', description: 'Discuss student progress and academic performance', startDate: new Date('2025-07-12'), startTime: '09:00', endTime: '16:00', location: 'School Hall', eventType: 'MEETING', targetRoles: 'PARENTS', isAllDay: false, color: 'blue' },
      { title: 'Parent-Teacher Conference Term 3', description: 'End of year parent-teacher meeting and report card collection', startDate: new Date('2025-11-24'), startTime: '09:00', endTime: '16:00', location: 'School Hall', eventType: 'MEETING', targetRoles: 'PARENTS', isAllDay: false, color: 'blue' },
      { title: 'Staff Meeting - Term Planning', description: 'Teachers meeting to plan Term 2 activities', startDate: new Date('2025-04-28'), startTime: '08:00', endTime: '12:00', location: 'Staff Room', eventType: 'MEETING', targetRoles: 'STAFF', isAllDay: false, color: 'blue' },
      { title: 'Board of Governors Meeting', description: 'Quarterly board meeting for school governance', startDate: new Date('2025-03-15'), startTime: '10:00', endTime: '13:00', location: 'Conference Room', eventType: 'MEETING', targetRoles: 'STAFF', isAllDay: false, color: 'blue' },
      { title: 'CBC Training Workshop', description: 'Teacher training on updated Competency-Based Curriculum', startDate: new Date('2025-08-11'), endDate: new Date('2025-08-15'), startTime: '08:30', endTime: '16:30', location: 'School Hall', eventType: 'MEETING', targetRoles: 'TEACHERS', isAllDay: false, color: 'blue' },

      // Cultural Events
      { title: 'International Day', description: 'Celebrate cultural diversity with performances and food', startDate: new Date('2025-02-21'), startTime: '09:00', endTime: '15:00', location: 'School Hall', eventType: 'CULTURAL', targetRoles: 'ALL', isAllDay: false, color: 'purple' },
      { title: 'Music Festival', description: 'Annual school music and drama festival', startDate: new Date('2025-06-07'), startTime: '09:00', endTime: '17:00', location: 'School Hall', eventType: 'CULTURAL', targetRoles: 'ALL', isAllDay: false, color: 'purple' },
      { title: 'Prize Giving Day', description: 'Annual award ceremony for academic and co-curricular excellence', startDate: new Date('2025-12-05'), startTime: '10:00', endTime: '13:00', location: 'School Hall', eventType: 'CULTURAL', targetRoles: 'ALL', isAllDay: false, color: 'purple' },
      { title: 'Jubilee Celebrations', description: 'School anniversary celebration and alumni gathering', startDate: new Date('2025-06-14'), startTime: '10:00', endTime: '18:00', location: 'School Grounds', eventType: 'CULTURAL', targetRoles: 'ALL', isAllDay: false, color: 'purple' },
      { title: 'Science Fair', description: 'Annual science and innovation exhibition', startDate: new Date('2025-09-19'), startTime: '09:00', endTime: '15:00', location: 'School Hall', eventType: 'CULTURAL', targetRoles: 'ALL', isAllDay: false, color: 'purple' },

      // General Events
      { title: 'School Opening Preparation', description: 'Staff prepare for the new academic year', startDate: new Date('2025-01-20'), endDate: new Date('2025-01-24'), eventType: 'EVENT', targetRoles: 'STAFF', isAllDay: true, color: 'teal' },
      { title: 'Admissions Day', description: 'New student enrollment and admissions', startDate: new Date('2025-01-24'), startTime: '08:00', endTime: '16:00', location: 'Admin Block', eventType: 'EVENT', targetRoles: 'PARENTS', isAllDay: false, color: 'teal' },
      { title: 'Career Day', description: 'Career guidance and counseling for students', startDate: new Date('2025-07-05'), startTime: '09:00', endTime: '14:00', location: 'School Hall', eventType: 'EVENT', targetRoles: 'STUDENTS', isAllDay: false, color: 'teal' },
      { title: 'Founders Day', description: 'Celebrate the founding of Olives Schools', startDate: new Date('2025-09-12'), startTime: '10:00', endTime: '15:00', location: 'School Grounds', eventType: 'EVENT', targetRoles: 'ALL', isAllDay: false, color: 'teal' },
      { title: 'Tree Planting Day', description: 'Environmental conservation activity', startDate: new Date('2025-11-07'), startTime: '09:00', endTime: '12:00', location: 'School Compound', eventType: 'EVENT', targetRoles: 'ALL', isAllDay: false, color: 'teal' },
    ]
  });

  console.log('\n✅ Seeding completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   Users: ${users.length}`);
  console.log(`   Classes: ${classes.length}`);
  console.log(`   Subjects: ${subjects.length}`);
  console.log(`   Terms: ${terms.length}`);
  console.log(`   Students: ${students.length}`);
  console.log(`   Fee Structures: ${feeStructures.length}`);
  console.log(`   Exams: ${exams.length}`);
  console.log(`   Notices: 5`);
  console.log(`   Calendar Events: 42`);

  console.log('\n🔑 Demo Login Credentials:');
  console.log('   Super Admin: admin@olives.co.ke / admin123');
  console.log('   Admin:       admin2@olives.co.ke / admin123');
  console.log('   Teacher:     teacher@olives.co.ke / teacher123');
  console.log('   Parent:      parent@olives.co.ke / parent123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
