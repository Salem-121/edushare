// ============================================================================
// add-users.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: another one-off loader script that bulk-adds a set of demo
// students, teachers, and admins. Like seed.js it's idempotent (re-running it
// won't duplicate anyone, because it upserts by email).
//   Run it with:  node prisma/add-users.js
// ============================================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// The lists of people to create. Each entry is just name + email; the role and
// password are applied in bulk below.
const students = [
  { firstName: 'Ahmed',   lastName: 'Al-Mansouri',  email: 'ahmed@edushare.com' },
  { firstName: 'Fatima',  lastName: 'Al-Zahrani',   email: 'fatima@edushare.com' },
  { firstName: 'Omar',    lastName: 'Hassan',       email: 'omar@edushare.com' },
  { firstName: 'Layla',   lastName: 'Khalil',       email: 'layla@edushare.com' },
  { firstName: 'Youssef', lastName: 'Saleh',        email: 'youssef@edushare.com' },
  { firstName: 'Mariam',  lastName: 'Abdullah',     email: 'mariam@edushare.com' },
  { firstName: 'Karim',   lastName: 'Nasser',       email: 'karim@edushare.com' },
  { firstName: 'Nour',    lastName: 'El-Sayed',     email: 'nour@edushare.com' },
  { firstName: 'Hamza',   lastName: 'Rahman',       email: 'hamza@edushare.com' },
  { firstName: 'Salma',   lastName: 'Bouazizi',     email: 'salma@edushare.com' },
  { firstName: 'Tariq',   lastName: 'Haddad',       email: 'tariq@edushare.com' },
  { firstName: 'Yasmin',  lastName: 'Farouk',       email: 'yasmin@edushare.com' },
  { firstName: 'Bilal',   lastName: 'Cherif',       email: 'bilal@edushare.com' },
  { firstName: 'Aisha',   lastName: 'Mahmoud',      email: 'aisha@edushare.com' },
  { firstName: 'Khaled',  lastName: 'Ben-Ali',      email: 'khaled@edushare.com' },
  { firstName: 'Rania',   lastName: 'Trabelsi',     email: 'rania@edushare.com' },
  { firstName: 'Zain',    lastName: 'Qureshi',      email: 'zain@edushare.com' },
  { firstName: 'Lina',    lastName: 'Idrissi',      email: 'lina@edushare.com' },
  { firstName: 'Adam',    lastName: 'Othmani',      email: 'adam@edushare.com' },
  { firstName: 'Hana',    lastName: 'Bennani',      email: 'hana@edushare.com' },
]

const teachers = [
  { firstName: 'Mohammed', lastName: 'Al-Rashid',  email: 'mohammed@edushare.com' },
  { firstName: 'Amina',    lastName: 'Belhaj',     email: 'amina@edushare.com' },
  { firstName: 'Youssra',  lastName: 'Hammami',    email: 'youssra@edushare.com' },
  { firstName: 'Rachid',   lastName: 'Kaddouri',   email: 'rachid@edushare.com' },
  { firstName: 'Samira',   lastName: 'El-Amrani',  email: 'samira@edushare.com' },
  { firstName: 'Hicham',   lastName: 'Ouazzani',   email: 'hicham@edushare.com' },
  { firstName: 'Nadia',    lastName: 'Berrada',    email: 'nadia@edushare.com' },
  { firstName: 'Ismail',   lastName: 'Chaouki',    email: 'ismail@edushare.com' },
  { firstName: 'Houda',    lastName: 'Lahlou',     email: 'houda@edushare.com' },
  { firstName: 'Anas',     lastName: 'Tazi',       email: 'anas@edushare.com' },
]

const admins = [
  { firstName: 'Yassine', lastName: 'Benjelloun', email: 'yassine.admin@edushare.com' },
]

async function main() {
  console.log('🌱 Adding users...')

  // Hash each role's shared demo password once.
  const studentPassword = await bcrypt.hash('student123', 10)
  const teacherPassword = await bcrypt.hash('teacher123', 10)
  const adminPassword   = await bcrypt.hash('admin123',   10)

  // Helper: create one user (or do nothing if the email already exists).
  const insert = (u, role, password) =>
    prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password, role },   // spread name+email, then add password+role
    })

  // Insert each list with its role, logging as we go.
  for (const u of students) {
    await insert(u, 'STUDENT', studentPassword)
    console.log(`  + STUDENT ${u.firstName} ${u.lastName} <${u.email}>`)
  }
  for (const u of teachers) {
    await insert(u, 'TEACHER', teacherPassword)
    console.log(`  + TEACHER ${u.firstName} ${u.lastName} <${u.email}>`)
  }
  for (const u of admins) {
    await insert(u, 'ADMIN', adminPassword)
    console.log(`  + ADMIN   ${u.firstName} ${u.lastName} <${u.email}>`)
  }

  // Tally up how many users of each role now exist, for a quick sanity check.
  const counts = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } })
  console.log('\n📊 Totals in DB:', counts.map(c => `${c.role}=${c._count._all}`).join('  '))
  console.log('\n🔑 Passwords: student123 / teacher123 / admin123')
}

// Run, report any error, and always disconnect at the end.
main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
