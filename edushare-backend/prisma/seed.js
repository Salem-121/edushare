// ============================================================================
// seed.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: a "seed" script — a one-off program you run to fill a fresh
// database with starter data (a few test accounts + some modules), so you have
// something to log in with during development.
//   Run it with:  node prisma/seed.js   (or via the package.json db:seed script)
//
// It uses `upsert` (update-or-insert): if a row already exists it leaves it
// alone, so running this twice never creates duplicates.
// ============================================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()   // its own DB connection (this runs outside the server)

// `main` is the whole script; it's async because every DB call returns a promise.
async function main() {
  console.log('🌱 Seeding database...')

  // Create users
  // Hash the demo passwords first (we never store raw passwords — see auth.controller).
  const adminPassword = await bcrypt.hash('admin123', 10)
  const teacherPassword = await bcrypt.hash('teacher123', 10)
  const studentPassword = await bcrypt.hash('student123', 10)

  // upsert = "create this user if the email is new, otherwise do nothing".
  const admin = await prisma.user.upsert({
    where: { email: 'admin@edushare.com' },
    update: {},
    create: {
      email: 'admin@edushare.com',
      password: adminPassword,
      firstName: 'Frank',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  })

  const teacher1 = await prisma.user.upsert({
    where: { email: 'bob@edushare.com' },
    update: {},
    create: {
      email: 'bob@edushare.com',
      password: teacherPassword,
      firstName: 'Bob',
      lastName: 'Martinez',
      role: 'TEACHER',
    },
  })

  const teacher2 = await prisma.user.upsert({
    where: { email: 'david@edushare.com' },
    update: {},
    create: {
      email: 'david@edushare.com',
      password: teacherPassword,
      firstName: 'David',
      lastName: 'Kim',
      role: 'TEACHER',
    },
  })

  const student1 = await prisma.user.upsert({
    where: { email: 'alice@edushare.com' },
    update: {},
    create: {
      email: 'alice@edushare.com',
      password: studentPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'STUDENT',
    },
  })

  const student2 = await prisma.user.upsert({
    where: { email: 'eva@edushare.com' },
    update: {},
    create: {
      email: 'eva@edushare.com',
      password: studentPassword,
      firstName: 'Eva',
      lastName: 'Rossi',
      role: 'STUDENT',
    },
  })

  // Create modules
  // Promise.all upserts all of them at once. Each is keyed by its unique code.
  const modules = await Promise.all([
    prisma.module.upsert({ where: { code: 'MATH101' }, update: {}, create: { name: 'Mathematics', code: 'MATH101', description: 'Core mathematics' } }),
    prisma.module.upsert({ where: { code: 'PHYS101' }, update: {}, create: { name: 'Physics', code: 'PHYS101', description: 'Fundamental physics' } }),
    prisma.module.upsert({ where: { code: 'CHEM101' }, update: {}, create: { name: 'Chemistry', code: 'CHEM101', description: 'General chemistry' } }),
    prisma.module.upsert({ where: { code: 'BIO101' }, update: {}, create: { name: 'Biology', code: 'BIO101', description: 'Life sciences' } }),
    prisma.module.upsert({ where: { code: 'LIT101' }, update: {}, create: { name: 'Literature', code: 'LIT101', description: 'Literary studies' } }),
    prisma.module.upsert({ where: { code: 'HIST101' }, update: {}, create: { name: 'History', code: 'HIST101', description: 'World history' } }),
    prisma.module.upsert({ where: { code: 'CS101' }, update: {}, create: { name: 'Computer Science', code: 'CS101', description: 'Programming and algorithms' } }),
  ])

  console.log('✅ Seed complete!')
  console.log('\n📋 Test accounts:')
  console.log('  Admin:   admin@edushare.com  / admin123')
  console.log('  Teacher: bob@edushare.com    / teacher123')
  console.log('  Teacher: david@edushare.com  / teacher123')
  console.log('  Student: alice@edushare.com  / student123')
  console.log('  Student: eva@edushare.com    / student123')
}

// Run the script: on error, print it and exit with a failure code; either way,
// always close the database connection at the end.
main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
