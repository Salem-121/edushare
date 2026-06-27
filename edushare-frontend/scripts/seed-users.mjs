#!/usr/bin/env node
/**
 * Seed 32 users with Arabic names: 2 admins, 10 teachers, 20 students.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL="your-admin@school.edu"; `
 *   $env:ADMIN_PASSWORD="your-admin-password"; `
 *   node scripts/seed-users.mjs
 *
 * Usage (bash):
 *   ADMIN_EMAIL=your-admin@school.edu ADMIN_PASSWORD=... node scripts/seed-users.mjs
 *
 * Optional env:
 *   API_URL          (default: http://localhost:4000/api)
 *   DEFAULT_PASSWORD (default: changeme123)
 *
 * Requires Node 18+ (uses native fetch). The script logs in as the admin you
 * provide and POSTs each user to /users — so you need ONE existing admin first.
 */

const API_URL          = process.env.API_URL          || 'http://localhost:4000/api'
const ADMIN_EMAIL      = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'changeme123'

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('\nMissing ADMIN_EMAIL / ADMIN_PASSWORD env vars.\n')
  console.error('PowerShell:')
  console.error('  $env:ADMIN_EMAIL="admin@school.edu"; $env:ADMIN_PASSWORD="..."; node scripts/seed-users.mjs\n')
  console.error('Bash:')
  console.error('  ADMIN_EMAIL=admin@school.edu ADMIN_PASSWORD=... node scripts/seed-users.mjs\n')
  process.exit(1)
}

const users = [
  // ── Admins (2) ──────────────────────────────────────────
  { firstName: 'عبدالله', lastName: 'الرشيد',   role: 'ADMIN'   },
  { firstName: 'فاطمة',   lastName: 'الزهراء',  role: 'ADMIN'   },

  // ── Teachers (10) ────────────────────────────────────────
  { firstName: 'محمد',    lastName: 'العمري',   role: 'TEACHER' },
  { firstName: 'أحمد',    lastName: 'الهاشمي',  role: 'TEACHER' },
  { firstName: 'عائشة',   lastName: 'الصديق',   role: 'TEACHER' },
  { firstName: 'خديجة',   lastName: 'المنصوري', role: 'TEACHER' },
  { firstName: 'علي',     lastName: 'البخاري',  role: 'TEACHER' },
  { firstName: 'مريم',    lastName: 'الشريف',   role: 'TEACHER' },
  { firstName: 'يوسف',    lastName: 'القرشي',   role: 'TEACHER' },
  { firstName: 'زينب',    lastName: 'الحسيني',  role: 'TEACHER' },
  { firstName: 'عمر',     lastName: 'الفاروق',  role: 'TEACHER' },
  { firstName: 'سارة',    lastName: 'العنزي',   role: 'TEACHER' },

  // ── Students (20) ────────────────────────────────────────
  { firstName: 'حسن',     lastName: 'الجابري',  role: 'STUDENT' },
  { firstName: 'ليلى',    lastName: 'الكندي',   role: 'STUDENT' },
  { firstName: 'كريم',    lastName: 'العباسي',  role: 'STUDENT' },
  { firstName: 'نور',     lastName: 'البلوشي',  role: 'STUDENT' },
  { firstName: 'سلمى',    lastName: 'الخوري',   role: 'STUDENT' },
  { firstName: 'طارق',    lastName: 'الأنصاري', role: 'STUDENT' },
  { firstName: 'هدى',     lastName: 'الراشد',   role: 'STUDENT' },
  { firstName: 'سامي',    lastName: 'الحربي',   role: 'STUDENT' },
  { firstName: 'ياسمين',  lastName: 'الدوسري',  role: 'STUDENT' },
  { firstName: 'خالد',    lastName: 'الغامدي',  role: 'STUDENT' },
  { firstName: 'رنا',     lastName: 'السيد',    role: 'STUDENT' },
  { firstName: 'مالك',    lastName: 'التميمي',  role: 'STUDENT' },
  { firstName: 'لينا',    lastName: 'الشمري',   role: 'STUDENT' },
  { firstName: 'زياد',    lastName: 'القحطاني', role: 'STUDENT' },
  { firstName: 'ريم',     lastName: 'النعيمي',  role: 'STUDENT' },
  { firstName: 'باسل',    lastName: 'الزعبي',   role: 'STUDENT' },
  { firstName: 'هناء',    lastName: 'الخطيب',   role: 'STUDENT' },
  { firstName: 'أنس',     lastName: 'الحلبي',   role: 'STUDENT' },
  { firstName: 'دانة',    lastName: 'المطيري',  role: 'STUDENT' },
  { firstName: 'وسيم',    lastName: 'النجار',   role: 'STUDENT' },
]

// Romanise Arabic letters → ASCII so we can build a sensible email
const arabicToLatin = {
  'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j',
  'ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh',
  'ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q',
  'ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a',
  'ة':'h','ء':'','ؤ':'w','ئ':'y',
  'َ':'','ُ':'','ِ':'','ّ':'','ْ':'','ـ':'','ً':'','ٌ':'','ٍ':'',
}
const transliterate = (s) =>
  s.split('').map(c => arabicToLatin[c] ?? c).join('').replace(/[^a-z]/gi, '').toLowerCase()

const emailFor = (u, i) =>
  `${transliterate(u.firstName)}.${transliterate(u.lastName)}.${String(i + 1).padStart(2, '0')}@edushare.local`

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Login failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  if (!data.token) throw new Error('Login response had no token')
  return data.token
}

async function createUser(token, payload) {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try { detail = JSON.parse(text)?.message || text } catch {}
    const err = new Error(`HTTP ${res.status}: ${detail}`)
    err.status = res.status
    err.detail = detail
    throw err
  }
  try { return JSON.parse(text) } catch { return text }
}

async function main() {
  console.log(`\nAPI:    ${API_URL}`)
  console.log(`Admin:  ${ADMIN_EMAIL}\n`)

  let token
  try {
    token = await login()
    console.log('Login OK. Creating 32 users…\n')
  } catch (err) {
    console.error('Could not log in. Make sure your backend is running and credentials are right.')
    console.error(err.message)
    process.exit(1)
  }

  let created = 0, skipped = 0, failed = 0
  for (const [i, u] of users.entries()) {
    const email = emailFor(u, i)
    const payload = { ...u, email, password: DEFAULT_PASSWORD }
    const label = `[${u.role.padEnd(7)}] ${u.firstName} ${u.lastName}`.padEnd(34)
    try {
      await createUser(token, payload)
      console.log(`  ✓ ${label} → ${email}`)
      created++
    } catch (err) {
      const msg = (err.detail || err.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('exist') || err.status === 409) {
        console.log(`  · ${label} → ${email}  (already exists, skipped)`)
        skipped++
      } else {
        console.error(`  ✕ ${label} → ${email}  ${err.message}`)
        failed++
      }
    }
  }

  const counts = users.reduce((acc, u) => (acc[u.role] = (acc[u.role] || 0) + 1, acc), {})
  console.log(`\nDone.`)
  console.log(`  Created: ${created}   Skipped: ${skipped}   Failed: ${failed}`)
  console.log(`  Total:   ${users.length}  (Admins: ${counts.ADMIN}, Teachers: ${counts.TEACHER}, Students: ${counts.STUDENT})`)
  console.log(`  Default password for every new account: ${DEFAULT_PASSWORD}\n`)
  if (failed) process.exit(1)
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })
