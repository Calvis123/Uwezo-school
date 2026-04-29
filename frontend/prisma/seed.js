/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { hashSync } = require("bcryptjs");

const prisma = new PrismaClient();

const kenyanFirstNamesMale = [
  "Brian",
  "Kevin",
  "Ian",
  "Dennis",
  "Evan",
  "Ryan",
  "Ethan",
  "Mark",
  "Steve",
  "Paul",
  "Joseph",
  "Daniel",
  "David",
  "Samuel",
  "Peter",
  "James",
  "John",
  "Michael",
  "Robert",
  "William",
  "Thomas",
  "Alex",
  "Nathan",
  "Joshua",
  "Luke",
  "Andrew",
  "Isaac",
  "Aaron",
  "Adam",
  "Noah",
];
const kenyanFirstNamesFemale = [
  "Faith",
  "Grace",
  "Hope",
  "Mercy",
  "Joy",
  "Blessing",
  "Sarah",
  "Mary",
  "Esther",
  "Naomi",
  "Ruth",
  "Rebecca",
  "Rachel",
  "Hannah",
  "Abigail",
  "Lydia",
  "Priscilla",
  "Tabitha",
  "Agnes",
  "Wangari",
  "Wanjiku",
  "Nyambura",
  "Akinyi",
  "Achieng",
  "Chebet",
  "Cherono",
  "Jepkosgei",
  "Kipchumba",
  "Cynthia",
  "Diana",
];
const kenyanLastNames = [
  "Kipchoge",
  "Kemboi",
  "Rotich",
  "Kibet",
  "Cheruiyot",
  "Koech",
  "Yego",
  "Bett",
  "Kimutai",
  "Kosgei",
  "Rono",
  "Ngugi",
  "Wanjiru",
  "Ochieng",
  "Otieno",
  "Odhiambo",
  "Mwangi",
  "Kamau",
  "Njoroge",
  "Muthoni",
  "Wambui",
  "Njeri",
  "Gitau",
  "Macharia",
  "Kariuki",
  "Ndegwa",
  "Muriithi",
  "Kirimi",
  "Barasa",
  "Wekesa",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAdmissionNumber(index) {
  const year = 2025;
  return `ADM/${year}/${String(index).padStart(4, "0")}`;
}

function generateReceiptNumber() {
  return `RCP${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;
}

function getCBCGrade(score, level) {
  if (["PRE_NURSERY", "NURSERY", "GRADE_1", "GRADE_2", "GRADE_3"].includes(level)) {
    if (score >= 80) return "EE";
    if (score >= 65) return "ME";
    if (score >= 50) return "AE";
    return "BE";
  }
  if (score >= 80) return "1";
  if (score >= 65) return "2";
  if (score >= 50) return "3";
  return "4";
}

function getRemarks(grade) {
  const remarks = {
    EE: "Excellent",
    ME: "Very Good",
    AE: "Good",
    BE: "Needs Improvement",
    1: "Excellent",
    2: "Very Good",
    3: "Good",
    4: "Needs Improvement",
  };
  return remarks[grade] || "";
}

async function main() {
  console.log("Seeding Uwezo School Management System...\n");

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

  console.log("Creating users...");
  const createdUsers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Allan Kimeli",
        email: "admin@uwezoschool.co.ke",
        password: hashSync("admin123", 10),
        phone: "+254712345678",
        role: "SUPER_ADMIN",
        gender: "MALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Rose Chepkoech",
        email: "headteacher@uwezoschool.co.ke",
        password: hashSync("head123", 10),
        phone: "+254712345670",
        role: "HEADTEACHER",
        gender: "FEMALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Daniel Kiprotich",
        email: "dos@uwezoschool.co.ke",
        password: hashSync("dos123", 10),
        phone: "+254712345671",
        role: "DOS",
        gender: "MALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Lucy Wanjiru",
        email: "secretary@uwezoschool.co.ke",
        password: hashSync("secret123", 10),
        phone: "+254712345672",
        role: "SECRETARY",
        gender: "FEMALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "James Rotich",
        email: "bursar@uwezoschool.co.ke",
        password: hashSync("bursar123", 10),
        phone: "+254712345673",
        role: "BURSAR",
        gender: "MALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Mary Wanjiku",
        email: "teacher@uwezoschool.co.ke",
        password: hashSync("teacher123", 10),
        phone: "+254723456789",
        role: "TEACHER",
        gender: "FEMALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "John Mwangi",
        email: "teacher2@uwezoschool.co.ke",
        password: hashSync("teacher123", 10),
        phone: "+254723456790",
        role: "TEACHER",
        gender: "MALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Ruth Akinyi",
        email: "teacher3@uwezoschool.co.ke",
        password: hashSync("teacher123", 10),
        phone: "+254723456791",
        role: "TEACHER",
        gender: "FEMALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Peter Otieno",
        email: "parent@uwezoschool.co.ke",
        password: hashSync("parent123", 10),
        phone: "+254734567890",
        role: "PARENT",
        gender: "MALE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Agnes Wambui",
        email: "parent2@uwezoschool.co.ke",
        password: hashSync("parent123", 10),
        phone: "+254734567891",
        role: "PARENT",
        gender: "FEMALE",
        status: "ACTIVE",
      },
    }),
  ]);

  const users = {
    superAdmin: createdUsers[0],
    headteacher: createdUsers[1],
    dos: createdUsers[2],
    secretary: createdUsers[3],
    bursar: createdUsers[4],
    teachers: [createdUsers[5], createdUsers[6], createdUsers[7]],
    parents: [createdUsers[8], createdUsers[9]],
  };

  console.log("Creating classes...");
  const classNames = [
    { name: "PP1", level: "PP1" },
    { name: "PP2", level: "PP2" },
    { name: "Grade 1", level: "GRADE_1" },
    { name: "Grade 2", level: "GRADE_2" },
    { name: "Grade 3", level: "GRADE_3" },
    { name: "Grade 4", level: "GRADE_4" },
    { name: "Grade 5", level: "GRADE_5" },
    { name: "Grade 6", level: "GRADE_6" },
    { name: "Grade 7", level: "GRADE_7" },
    { name: "Grade 8", level: "GRADE_8" },
    { name: "Grade 9", level: "GRADE_9" },
  ];

  const classes = await Promise.all(
    classNames.map((c, i) =>
      prisma.schoolClass.create({
        data: {
          name: c.name,
          level: c.level,
          stream: ["A", "B"][i % 2],
          teacherId: users.teachers[i % users.teachers.length]?.id,
          capacity: 40,
          status: "ACTIVE",
        },
      })
    )
  );

  console.log("Creating subjects...");
  const subjectList = [
    { name: "Mathematics", code: "MATH", level: "PRIMARY" },
    { name: "English", code: "ENG", level: "PRIMARY" },
    { name: "Kiswahili", code: "KIS", level: "PRIMARY" },
    { name: "Science", code: "SCI", level: "PRIMARY" },
    { name: "Social Studies", code: "SST", level: "PRIMARY" },
  ];

  const subjects = await Promise.all(subjectList.map((s) => prisma.subject.create({ data: s })));

  console.log("Creating terms...");
  const terms = await Promise.all([
    prisma.term.create({
      data: {
        name: "Term 1",
        year: 2025,
        startDate: new Date("2025-01-06"),
        endDate: new Date("2025-04-04"),
        status: "ACTIVE",
      },
    }),
    prisma.term.create({
      data: {
        name: "Term 2",
        year: 2025,
        startDate: new Date("2025-04-28"),
        endDate: new Date("2025-08-01"),
        status: "UPCOMING",
      },
    }),
    prisma.term.create({
      data: {
        name: "Term 3",
        year: 2025,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-11-28"),
        status: "UPCOMING",
      },
    }),
  ]);

  console.log("Creating students...");
  const students = [];
  for (let i = 1; i <= 40; i += 1) {
    const gender = i % 2 === 0 ? "FEMALE" : "MALE";
    const firstName =
      gender === "MALE" ? randomItem(kenyanFirstNamesMale) : randomItem(kenyanFirstNamesFemale);
    const lastName = randomItem(kenyanLastNames);
    const classId = randomItem(classes).id;

    const student = await prisma.student.create({
      data: {
        admissionNumber: generateAdmissionNumber(i),
        firstName,
        lastName,
        gender,
        classId,
        status: "ACTIVE",
        admissionDate: new Date("2025-01-06"),
      },
    });
    students.push(student);

    const parent = users.parents[i % users.parents.length];
    await prisma.studentGuardian.create({
      data: {
        studentId: student.id,
        guardianId: parent.id,
        relationship: "PARENT",
        isPrimary: true,
      },
    });
  }

  console.log("Creating fee structures...");
  const feeStructures = [];
  for (const term of terms) {
    for (const cls of classes) {
      const fs = await prisma.feeStructure.create({
        data: {
          name: `${term.name} Tuition`,
          classId: cls.id,
          termId: term.id,
          amount: 15000,
          category: "TUITION",
          status: "ACTIVE",
        },
      });
      feeStructures.push(fs);
    }
  }

  console.log("Creating fee transactions...");
  for (let i = 0; i < 60; i += 1) {
    const student = randomItem(students);
    const fs = randomItem(feeStructures);
    await prisma.feeTransaction.create({
      data: {
        studentId: student.id,
        feeStructureId: fs.id,
        amount: randomInt(500, 5000),
        paymentMethod: ["CASH", "BANK", "MPESA"][i % 3],
        receiptNumber: generateReceiptNumber(),
        status: "COMPLETED",
        term: "2025-1",
      },
    });
  }

  console.log("Creating exams and marks...");
  const examTemplates = [
    { name: "CAT 1", type: "CAT_1" },
    { name: "CAT 2", type: "CAT_2" },
    { name: "End Term", type: "END_TERM" },
  ];

  const exams = [];
  for (const cls of classes.slice(2)) {
    for (const e of examTemplates) {
      const exam = await prisma.exam.create({
        data: {
          name: `${e.name} - ${cls.name}`,
          termId: terms[0].id,
          classId: cls.id,
          type: e.type,
          startDate: new Date("2025-03-10"),
          endDate: new Date("2025-03-14"),
          status: "ACTIVE",
          totalMarks: 100,
        },
      });
      exams.push(exam);
    }
  }

  for (const exam of exams) {
    const examClass = await prisma.schoolClass.findUnique({ where: { id: exam.classId } });
    if (!examClass) continue;
    const examStudents = await prisma.student.findMany({ where: { classId: examClass.id } });
    for (const s of examStudents) {
      for (const subj of subjects) {
        const marks = randomInt(30, 99);
        const grade = getCBCGrade(marks, examClass.level);
        await prisma.examMark.create({
          data: {
            examId: exam.id,
            studentId: s.id,
            subjectId: subj.id,
            marks,
            grade,
            remarks: getRemarks(grade),
            enteredBy: users.teachers[0].id,
          },
        });
      }
    }
  }

  console.log("Creating attendance...");
  for (const cls of classes) {
    const classStudents = await prisma.student.findMany({ where: { classId: cls.id } });
    for (const s of classStudents) {
      await prisma.attendance.create({
        data: {
          studentId: s.id,
          classId: cls.id,
          termId: terms[0].id,
          date: new Date("2025-02-03"),
          status: Math.random() > 0.05 ? "PRESENT" : "ABSENT",
        },
      });
    }
  }

  console.log("Creating notices...");
  await prisma.schoolNotice.createMany({
    data: [
      {
        title: "Welcome Back",
        content: "Welcome back to a new term.",
        category: "GENERAL",
        targetRoles: "ALL",
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        title: "Fee Payment Reminder",
        content: "Please clear fee balances by end of month.",
        category: "URGENT",
        targetRoles: "PARENTS",
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        title: "Exam Schedule",
        content: "CAT exams start next week.",
        category: "ACADEMIC",
        targetRoles: "STUDENTS",
        isPublished: true,
        publishedAt: new Date(),
      },
    ],
  });

  console.log("Creating system settings...");
  await prisma.systemSetting.createMany({
    data: [
      { key: "SCHOOL_NAME", value: "Uwezo School" },
      { key: "SCHOOL_PHONE", value: "+254700000000" },
      { key: "SCHOOL_EMAIL", value: "info@uwezoschool.co.ke" },
    ],
  });

  console.log("Creating calendar events...");
  await prisma.calendarEvent.createMany({
    data: [
      {
        title: "Staff Meeting",
        description: "Weekly staff sync",
        startDate: new Date("2025-01-24"),
        startTime: "08:00",
        endTime: "10:00",
        location: "Staff Room",
        eventType: "MEETING",
        targetRoles: "STAFF",
        isAllDay: false,
        color: "blue",
      },
    ],
  });

  console.log("\nSeeding completed successfully!");
  console.log("\nDemo Login Credentials:");
  console.log("  Super Admin: admin@uwezoschool.co.ke / admin123");
  console.log("  Headteacher: headteacher@uwezoschool.co.ke / head123");
  console.log("  DOS:         dos@uwezoschool.co.ke / dos123");
  console.log("  Secretary:   secretary@uwezoschool.co.ke / secret123");
  console.log("  Bursar:      bursar@uwezoschool.co.ke / bursar123");
  console.log("  Teacher:     teacher@uwezoschool.co.ke / teacher123");
  console.log("  Teacher 2:   teacher2@uwezoschool.co.ke / teacher123");
  console.log("  Teacher 3:   teacher3@uwezoschool.co.ke / teacher123");
  console.log("  Parent:      parent@uwezoschool.co.ke / parent123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
