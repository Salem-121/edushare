/**
 * One-shot loader: inserts 2 admins, 10 teachers, and 30 students.
 *
 * Idempotent — uses `upsert` on email, so re-running won't create duplicates
 * (existing rows are left untouched).
 *
 * Run:  node prisma/add-users-batch.js
 *
 * WHAT THIS FILE IS (beginner note): a bigger version of add-users.js. The extra
 * twist is that it spreads the new teachers/students evenly across the existing
 * filières ("round-robin"), because students need a filière to see quizzes.
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// The people to create, grouped by role (name + email only).
const admins = [
  { firstName: 'Sara',   lastName: 'El-Idrissi', email: 'sara.admin@edushare.com' },
  { firstName: 'Mehdi',  lastName: 'Bouhlal',    email: 'mehdi.admin@edushare.com' },
]

const teachers = [
  { firstName: 'Khalid',   lastName: 'Tahiri',     email: 'khalid.t@edushare.com' },
  { firstName: 'Imane',    lastName: 'Lamrini',    email: 'imane.l@edushare.com' },
  { firstName: 'Yacine',   lastName: 'Sefrioui',   email: 'yacine.s@edushare.com' },
  { firstName: 'Soukaina', lastName: 'Ait-Bella',  email: 'soukaina.a@edushare.com' },
  { firstName: 'Othmane',  lastName: 'Chraibi',    email: 'othmane.c@edushare.com' },
  { firstName: 'Latifa',   lastName: 'Skalli',     email: 'latifa.s@edushare.com' },
  { firstName: 'Tarik',    lastName: 'Naciri',     email: 'tarik.n@edushare.com' },
  { firstName: 'Wafa',     lastName: 'Mansouri',   email: 'wafa.m@edushare.com' },
  { firstName: 'Reda',     lastName: 'Ouali',      email: 'reda.o@edushare.com' },
  { firstName: 'Kenza',    lastName: 'Berrabah',   email: 'kenza.b@edushare.com' },
]

const students = [
  { firstName: 'Ayoub',   lastName: 'Ennaciri',  email: 'ayoub.e@edushare.com' },
  { firstName: 'Meriem',  lastName: 'Zaki',      email: 'meriem.z@edushare.com' },
  { firstName: 'Nizar',   lastName: 'Boukhari',  email: 'nizar.b@edushare.com' },
  { firstName: 'Iman',    lastName: 'Karam',     email: 'iman.k@edushare.com' },
  { firstName: 'Sami',    lastName: 'Drissi',    email: 'sami.d@edushare.com' },
  { firstName: 'Asmae',   lastName: 'Filali',    email: 'asmae.f@edushare.com' },
  { firstName: 'Marouane',lastName: 'Hilali',    email: 'marouane.h@edushare.com' },
  { firstName: 'Dounia',  lastName: 'Sabri',     email: 'dounia.s@edushare.com' },
  { firstName: 'Ilyas',   lastName: 'Jaouhari',  email: 'ilyas.j@edushare.com' },
  { firstName: 'Najwa',   lastName: 'El-Khattabi',email: 'najwa.e@edushare.com' },
  { firstName: 'Mounir',  lastName: 'Belkadi',   email: 'mounir.b@edushare.com' },
  { firstName: 'Ghita',   lastName: 'Rachidi',   email: 'ghita.r@edushare.com' },
  { firstName: 'Anouar',  lastName: 'Sebti',     email: 'anouar.s@edushare.com' },
  { firstName: 'Salwa',   lastName: 'Mahjoubi',  email: 'salwa.m@edushare.com' },
  { firstName: 'Zakaria', lastName: 'Bennis',    email: 'zakaria.b@edushare.com' },
  { firstName: 'Houda',   lastName: 'Lazrak',    email: 'houda.l@edushare.com' },
  { firstName: 'Walid',   lastName: 'Cherkaoui', email: 'walid.c@edushare.com' },
  { firstName: 'Sanae',   lastName: 'Touimi',    email: 'sanae.t@edushare.com' },
  { firstName: 'Jad',     lastName: 'Mekouar',   email: 'jad.m@edushare.com' },
  { firstName: 'Lamia',   lastName: 'Hajji',     email: 'lamia.h@edushare.com' },
  { firstName: 'Soufiane',lastName: 'Boutaleb',  email: 'soufiane.b@edushare.com' },
  { firstName: 'Maryam',  lastName: 'Slaoui',    email: 'maryam.s@edushare.com' },
  { firstName: 'Hicham',  lastName: 'Ammar',     email: 'hicham.a@edushare.com' },
  { firstName: 'Chaimae', lastName: 'El-Othmani',email: 'chaimae.e@edushare.com' },
  { firstName: 'Ayman',   lastName: 'Guessous',  email: 'ayman.g@edushare.com' },
  { firstName: 'Rim',     lastName: 'Tazi',      email: 'rim.t@edushare.com' },
  { firstName: 'Mehdi',   lastName: 'Alami',     email: 'mehdi.s@edushare.com' },
  { firstName: 'Inès',    lastName: 'Bouayad',   email: 'ines.b@edushare.com' },
  { firstName: 'Adil',    lastName: 'Hamdoune',  email: 'adil.h@edushare.com' },
  { firstName: 'Sara',    lastName: 'Loudiyi',   email: 'sara.l@edushare.com' },
]

async function main() {
  console.log('🌱 Adding 2 admins, 10 teachers, 30 students…\n')

  // Active filières are assigned round-robin if any exist; otherwise leave null
  // so the admin can edit later. Students need a filière to see quizzes.
  const filieres = await prisma.filiere.findMany({ where: { active: true }, orderBy: { id: 'asc' } })
  // pick(i): returns a filière id, cycling through the list as i grows.
  // The `% ` (modulo / remainder) wraps the index back to the start.
  const pick = (i) => (filieres.length === 0 ? null : filieres[i % filieres.length].id)

  const studentPassword = await bcrypt.hash('student123', 10)
  const teacherPassword = await bcrypt.hash('teacher123', 10)
  const adminPassword   = await bcrypt.hash('admin123',   10)

  // Insert one user unless their email already exists. Tracks added vs skipped.
  let added = 0, skipped = 0
  const upsert = async (u, role, password, filiereId) => {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) { skipped++; return false }     // already there -> skip
    await prisma.user.create({
      data: { ...u, password, role, filiereId },
    })
    added++; return true                          // newly created
  }

  // Admins get no filière (null). Teachers and students get one via pick(i),
  // where `i` is their position in the list (entries() gives [index, item]).
  for (const u of admins) {
    const made = await upsert(u, 'ADMIN', adminPassword, null)
    console.log(`  ${made ? '+' : '·'} ADMIN   ${u.firstName} ${u.lastName} <${u.email}>${made ? '' : ' (skipped — exists)'}`)
  }
  for (const [i, u] of teachers.entries()) {
    const fid = pick(i)                            // round-robin filière for this teacher
    const made = await upsert(u, 'TEACHER', teacherPassword, fid)
    console.log(`  ${made ? '+' : '·'} TEACHER ${u.firstName} ${u.lastName} <${u.email}>${made ? '' : ' (skipped — exists)'}`)
  }
  for (const [i, u] of students.entries()) {
    const fid = pick(i)
    const made = await upsert(u, 'STUDENT', studentPassword, fid)
    console.log(`  ${made ? '+' : '·'} STUDENT ${u.firstName} ${u.lastName} <${u.email}>${made ? '' : ' (skipped — exists)'}`)
  }

  const counts = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } })
  console.log(`\n📊 Inserted ${added}, skipped ${skipped} (already present)`)
  console.log(`   Totals in DB: ${counts.map(c => `${c.role}=${c._count._all}`).join('  ')}`)
  if (filieres.length === 0) {
    console.log('\nℹ️  No active filières exist yet, so all new users have filiereId = null.')
    console.log('   Open the admin → Users page to assign filières before students can see quizzes.')
  } else {
    console.log(`\n   Filière assignment (round-robin across ${filieres.length} active filière${filieres.length === 1 ? '' : 's'}): ${filieres.map(f => f.code).join(', ')}`)
  }
  console.log('\n🔑 Default passwords: admin123 / teacher123 / student123')
}

// Run, report any error, and always disconnect at the end.
main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
