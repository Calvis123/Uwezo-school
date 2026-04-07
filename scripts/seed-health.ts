import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('🌱 Seeding health records...')

  // Get some students to seed records for
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, admissionNumber: true },
    take: 60,
  })

  if (students.length === 0) {
    console.log('❌ No students found. Seed students first.')
    return
  }

  // Shuffle and pick a subset for health records
  const shuffled = [...students].sort(() => Math.random() - 0.5)
  const recordStudents = shuffled.slice(0, 35)
  const conditionStudents = shuffled.slice(0, 15)

  // ============ HEALTH RECORDS ============
  const healthRecords: any[] = []

  // Allergy records
  const allergies = [
    { title: 'Penicillin Allergy', desc: 'Severe allergic reaction to penicillin-based antibiotics. Causes hives and swelling.', severity: 'SEVERE' },
    { title: 'Dust Allergy', desc: 'Mild allergic reaction to dust. Causes sneezing and itchy eyes.', severity: 'MILD' },
    { title: 'Peanut Allergy', desc: 'Allergic to peanuts and peanut products. Can cause anaphylaxis.', severity: 'CRITICAL' },
    { title: 'Pollen Allergy', desc: 'Seasonal pollen allergy causing runny nose and watery eyes during dry season.', severity: 'MILD' },
    { title: 'Egg Allergy', desc: 'Mild reaction to eggs. Causes stomach discomfort.', severity: 'MILD' },
    { title: 'Milk Allergy', desc: 'Lactose intolerance causing stomach upset after consuming dairy.', severity: 'MODERATE' },
  ]

  // Illness records
  const illnesses = [
    { title: 'Malaria', desc: 'Treated with antimalarial medication. Full recovery after 5 days.', treatedBy: 'Dr. Kipchoge - Eldoret Hospital', severity: 'MODERATE', status: 'RESOLVED' },
    { title: 'Typhoid Fever', desc: 'Confirmed typhoid from contaminated water source. Antibiotic treatment administered.', treatedBy: 'Dr. Wanjiku - Moi Teaching Hospital', severity: 'MODERATE', status: 'RESOLVED' },
    { title: 'Influenza (Flu)', desc: 'Seasonal flu with fever, body aches, and cough. Prescribed rest and paracetamol.', treatedBy: 'School Nurse Mary', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Chickenpox', desc: 'Mild chickenpox infection. Isolated for 2 weeks. Full recovery.', treatedBy: 'Dr. Ochieng - Local Clinic', severity: 'MODERATE', status: 'RESOLVED' },
    { title: 'Upper Respiratory Infection', desc: 'Persistent cough and sore throat. Prescribed antibiotics.', treatedBy: 'Dr. Kimani - Eldoret Clinic', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Stomach Bug', desc: 'Vomiting and diarrhea for 2 days. Given oral rehydration salts.', treatedBy: 'School Nurse Mary', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Conjunctivitis', desc: 'Pink eye infection in both eyes. Contagious, isolated for 3 days.', treatedBy: 'Dr. Mwangi', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Pneumonia', desc: 'Diagnosed with mild pneumonia after persistent cough. Hospitalized for 3 days.', treatedBy: 'Dr. Kiptoo - Moi Teaching Hospital', severity: 'SEVERE', status: 'RESOLVED' },
  ]

  // Injury records
  const injuries = [
    { title: 'Cut on Hand', desc: 'Sustained a cut on left hand during outdoor play. Cleaned and bandaged.', treatedBy: 'School Nurse Mary', severity: 'MILD' },
    { title: 'Ankle Sprain', desc: 'Twisted right ankle during football practice. RICE treatment applied.', treatedBy: 'Dr. Ochieng - Local Clinic', severity: 'MODERATE', status: 'RESOLVED' },
    { title: 'Fractured Arm', desc: 'Fractured left arm after falling from playground equipment. Cast applied for 6 weeks.', treatedBy: 'Dr. Kipchoge - Eldoret Hospital', severity: 'SEVERE', status: 'RESOLVED' },
    { title: 'Bruised Knee', desc: 'Bruised knee during PE class. Ice pack applied, monitored for swelling.', treatedBy: 'School Nurse Mary', severity: 'MILD' },
    { title: 'Head Bump', desc: 'Bumped head on desk. Monitored for concussion symptoms. No complications.', treatedBy: 'School Nurse Mary', severity: 'MILD' },
  ]

  // Checkup records
  const checkups = [
    { title: 'Annual Health Checkup', desc: 'Routine annual health examination. All vitals normal. Height and weight within expected range.', treatedBy: 'Dr. Wanjiku - School Health Program', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Dental Checkup', desc: 'Routine dental examination. No cavities found. Advice on proper brushing technique.', treatedBy: 'Dr. Omondi - Smile Dental Clinic', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Eye Examination', desc: 'Routine vision screening. Normal vision in both eyes. No corrective lenses needed.', treatedBy: 'Dr. Akello - Vision Center Eldoret', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Growth Monitoring', desc: 'Height and weight check. BMI within healthy range for age.', treatedBy: 'School Nurse Mary', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Hearing Test', desc: 'Routine audiometric screening. Normal hearing in both ears.', treatedBy: 'Audiologist - Eldoret ENT Clinic', severity: 'MILD', status: 'RESOLVED' },
    { title: 'Dental Cleaning', desc: 'Professional dental cleaning and fluoride treatment.', treatedBy: 'Dr. Omondi - Smile Dental Clinic', severity: 'MILD', status: 'RESOLVED' },
  ]

  // Vaccination records
  const vaccinations = [
    { title: 'BCG Vaccine', desc: 'Bacillus Calmette-Guérin vaccine administered at birth.', treatedBy: 'Eldoret County Hospital', status: 'RESOLVED' },
    { title: 'OPV (Polio) - Dose 3', desc: 'Third dose of oral polio vaccine.', treatedBy: 'Eldoret County Hospital', status: 'RESOLVED' },
    { title: 'DPT Booster', desc: 'Diphtheria, Pertussis, Tetanus booster shot.', treatedBy: 'School Health Program', status: 'RESOLVED' },
    { title: 'Measles Vaccine', desc: 'Measles vaccination administered.', treatedBy: 'Eldoret County Hospital', status: 'RESOLVED' },
    { title: 'HPV Vaccine - Dose 1', desc: 'First dose of Human Papillomavirus vaccine (school-based program).', treatedBy: 'School Health Program - Ministry of Health', status: 'RESOLVED' },
    { title: 'COVID-19 Vaccine', desc: 'Pfizer COVID-19 vaccine administered as part of national rollout.', treatedBy: 'Eldoret Vaccination Center', status: 'RESOLVED' },
    { title: 'Yellow Fever Vaccine', desc: 'Yellow fever vaccination for travel certificate.', treatedBy: 'Eldoret Port Health Office', status: 'RESOLVED' },
    { title: 'Hepatitis B Vaccine', desc: 'Hepatitis B vaccination series completed.', treatedBy: 'Eldoret County Hospital', status: 'RESOLVED' },
  ]

  // Helper to create records
  let count = 0
  for (const student of recordStudents) {
    // Each student gets 1-3 records
    const numRecords = Math.floor(Math.random() * 3) + 1

    for (let i = 0; i < numRecords; i++) {
      const category = randomItem(['allergies', 'illnesses', 'injuries', 'checkups', 'vaccinations'] as const)
      let record: any

      switch (category) {
        case 'allergies': {
          const a = randomItem(allergies)
          const daysAgo = Math.floor(Math.random() * 365)
          record = {
            studentId: student.id,
            recordType: 'ALLERGY',
            title: a.title,
            description: a.desc,
            date: new Date(Date.now() - daysAgo * 86400000),
            severity: a.severity,
            status: randomItem(['ACTIVE', 'ONGOING', 'MONITORING']),
            treatedBy: 'Dr. Kamau - Allergy Specialist',
          }
          break
        }
        case 'illnesses': {
          const il = randomItem(illnesses)
          const daysAgo = Math.floor(Math.random() * 180)
          record = {
            studentId: student.id,
            recordType: 'ILLNESS',
            title: il.title,
            description: il.desc,
            date: new Date(Date.now() - daysAgo * 86400000),
            severity: il.severity,
            status: il.status || 'RESOLVED',
            treatedBy: il.treatedBy,
            followUpDate: Math.random() > 0.7 ? new Date(Date.now() + (Math.floor(Math.random() * 30) + 7) * 86400000) : null,
          }
          break
        }
        case 'injuries': {
          const inj = randomItem(injuries)
          const daysAgo = Math.floor(Math.random() * 120)
          record = {
            studentId: student.id,
            recordType: 'INJURY',
            title: inj.title,
            description: inj.desc,
            date: new Date(Date.now() - daysAgo * 86400000),
            severity: inj.severity,
            status: inj.status || randomItem(['RESOLVED', 'MONITORING']),
            treatedBy: inj.treatedBy,
            followUpDate: Math.random() > 0.6 ? new Date(Date.now() + (Math.floor(Math.random() * 14) + 3) * 86400000) : null,
          }
          break
        }
        case 'checkups': {
          const ch = randomItem(checkups)
          const recordType = ch.title.includes('Dental') ? 'DENTAL' : ch.title.includes('Eye') ? 'EYE_EXAM' : 'CHECKUP'
          const daysAgo = Math.floor(Math.random() * 300)
          record = {
            studentId: student.id,
            recordType,
            title: ch.title,
            description: ch.desc,
            date: new Date(Date.now() - daysAgo * 86400000),
            severity: 'MILD',
            status: 'RESOLVED',
            treatedBy: ch.treatedBy,
          }
          break
        }
        case 'vaccinations': {
          const v = randomItem(vaccinations)
          const daysAgo = Math.floor(Math.random() * 500) + 30
          record = {
            studentId: student.id,
            recordType: 'VACCINATION',
            title: v.title,
            description: v.desc,
            date: new Date(Date.now() - daysAgo * 86400000),
            severity: 'MILD',
            status: 'RESOLVED',
            treatedBy: v.treatedBy,
          }
          break
        }
      }

      if (record) {
        healthRecords.push(record)
        count++
      }
    }
  }

  // Insert records in batches
  for (let i = 0; i < healthRecords.length; i += 20) {
    const batch = healthRecords.slice(i, i + 20)
    await prisma.healthRecord.createMany({ data: batch })
  }

  console.log(`✅ Created ${count} health records`)

  // ============ HEALTH CONDITIONS ============
  const conditionTemplates = [
    { condition: 'ASTHMA', description: 'Chronic asthma managed with inhaler. Triggered by dust and cold weather.', severity: 'MODERATE', isChronic: true },
    { condition: 'ASTHMA', description: 'Mild intermittent asthma. Uses reliever inhaler as needed.', severity: 'MILD', isChronic: true },
    { condition: 'DIABETES', description: 'Type 1 diabetes. Requires daily insulin injections. Blood sugar monitoring required.', severity: 'SEVERE', isChronic: true },
    { condition: 'SICKLE_CELL', description: 'Sickle cell disease. Requires regular monitoring and folic acid supplements.', severity: 'SEVERE', isChronic: true },
    { condition: 'EPILEPSY', description: 'Well-controlled epilepsy with medication. Last seizure 8 months ago.', severity: 'MODERATE', isChronic: true },
    { condition: 'ALLERGY', description: 'Multiple food allergies including peanuts and shellfish. EpiPen available at school.', severity: 'SEVERE', isChronic: true },
    { condition: 'VISION', description: 'Mild myopia. Requires corrective lenses for reading and board work.', severity: 'MILD', isChronic: true },
    { condition: 'HEARING', description: 'Mild hearing loss in left ear. Hearing aid recommended but not yet obtained.', severity: 'MODERATE', isChronic: true },
    { condition: 'ADHD', description: 'Attention deficit hyperactivity disorder. Managed with behavioral therapy and medication.', severity: 'MODERATE', isChronic: true },
    { condition: 'HEART_CONDITION', description: 'Congenital heart murmur. Regular cardiology checkups required. No physical activity restrictions.', severity: 'MODERATE', isChronic: true },
    { condition: 'ASTHMA', description: 'Exercise-induced asthma. Needs inhaler before physical activities.', severity: 'MILD', isChronic: true },
    { condition: 'ALLERGY', description: 'Severe dust mite allergy. Antihistamines prescribed during dry season.', severity: 'MODERATE', isChronic: true },
    { condition: 'DIABETES', description: 'Type 2 diabetes managed with diet and metformin. Regular blood sugar checks.', severity: 'MODERATE', isChronic: true },
  ]

  const healthConditions = conditionStudents.map((student, idx) => {
    const template = conditionTemplates[idx % conditionTemplates.length]
    return {
      studentId: student.id,
      condition: template.condition,
      description: template.description,
      severity: template.severity,
      isChronic: template.isChronic,
      diagnosedDate: randomDate(new Date('2020-01-01'), new Date('2024-12-31')),
      notes: idx < 5 ? 'Requires special attention during physical activities' : '',
    }
  })

  // Remove duplicates (same student + condition)
  const uniqueConditions: any[] = []
  const seen = new Set<string>()
  for (const c of healthConditions) {
    const key = `${c.studentId}-${c.condition}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueConditions.push(c)
    }
  }

  await prisma.healthCondition.createMany({ data: uniqueConditions })
  console.log(`✅ Created ${uniqueConditions.length} health conditions`)
  console.log('🎉 Health seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
