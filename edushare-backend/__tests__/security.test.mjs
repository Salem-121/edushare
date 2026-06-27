// Regression tests for the issues the audit fixed.
// Pure-function focused so they don't need a live DB.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import { spawnSync } from 'child_process'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'

const require = createRequire(import.meta.url)

// ── upload filename sanitization (path traversal) ──
describe('upload filename sanitization', () => {
  // Inline replica of upload.middleware.js's filename function.
  const sanitize = (originalname) => {
    const base = path.basename(originalname).replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_')
    return base.slice(0, 120) || 'file'
  }

  it('strips ../ traversal segments', () => {
    expect(sanitize('../../etc/passwd')).not.toContain('..')
    expect(sanitize('../../etc/passwd')).not.toMatch(/[\\/]/)
  })

  it('strips backslashes (Windows traversal)', () => {
    expect(sanitize('..\\..\\Windows\\System32\\evil.dll')).not.toContain('\\')
  })

  it('handles plain filenames with spaces becoming underscores', () => {
    expect(sanitize('lecture 1.pdf')).toBe('lecture_1.pdf')
  })

  it('caps overly long names', () => {
    expect(sanitize('a'.repeat(500) + '.pdf').length).toBeLessThanOrEqual(120)
  })

  it('falls back to "file" when input collapses to empty', () => {
    expect(sanitize('////')).toBe('file')
  })
})

// ── Content-Disposition header sanitization (lesson title) ──
describe('download filename title sanitization', () => {
  const safe = (title) => (title || 'lesson').replace(/[\r\n"]/g, '').slice(0, 120) || 'lesson'

  it('strips CR/LF from a malicious title', () => {
    const evil = 'foo\r\nContent-Type: text/html\r\n\r\n<script>alert(1)</script>'
    expect(safe(evil)).not.toMatch(/[\r\n]/)
  })

  it('strips double quotes that would close the Content-Disposition value', () => {
    expect(safe('a"b')).toBe('ab')
  })

  it('falls back when title is empty', () => {
    expect(safe('')).toBe('lesson')
  })
})

// ── Notification IDOR fix ──
// Verifies the ownership check before update. The controller is CommonJS,
// so we monkey-patch require.cache for ../src/db before loading it.
describe('notification.markAsRead ownership', () => {
  const dbPath = require.resolve('../src/db')
  const ctrlPath = require.resolve('../src/controllers/notification.controller')

  beforeEach(() => {
    delete require.cache[ctrlPath]
    delete require.cache[dbPath]
  })

  const installFakeDb = (fake) => {
    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: fake,
      children: [],
      paths: [],
    }
  }

  it('returns 403 when the notification belongs to a different user', async () => {
    const update = vi.fn()
    installFakeDb({
      notification: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, userId: 999, read: false }),
        update,
      },
    })
    const { markAsRead } = require('../src/controllers/notification.controller')
    const req = { user: { id: 42 }, params: { id: '1' } }
    let status, body
    const res = {
      status(s) { status = s; return this },
      json(b)   { body = b; return this },
    }
    await markAsRead(req, res)
    expect(status).toBe(403)
    expect(body.message).toMatch(/not your/i)
    expect(update).not.toHaveBeenCalled()
  })

  it('returns 404 when notification is missing', async () => {
    installFakeDb({
      notification: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    })
    const { markAsRead } = require('../src/controllers/notification.controller')
    const req = { user: { id: 42 }, params: { id: '999' } }
    let status
    const res = { status(s) { status = s; return this }, json() { return this } }
    await markAsRead(req, res)
    expect(status).toBe(404)
  })

  it('updates when ownership matches', async () => {
    const updated = { id: 1, userId: 42, read: true }
    installFakeDb({
      notification: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, userId: 42, read: false }),
        update: vi.fn().mockResolvedValue(updated),
      },
    })
    const { markAsRead } = require('../src/controllers/notification.controller')
    const req = { user: { id: 42 }, params: { id: '1' } }
    let body
    const res = { status() { return this }, json(b) { body = b; return this } }
    await markAsRead(req, res)
    expect(body).toEqual(updated)
  })
})

// ── JWT secret validation ──
// jwt.utils calls process.exit at import, so we spawn a child to test it.
describe('jwt.utils boot validation', () => {
  const utilsPath = path.resolve('src/utils/jwt.utils').replace(/\\/g, '/')

  it('refuses to load with a weak JWT_SECRET', () => {
    const r = spawnSync(process.execPath, ['-e',
      `process.env.JWT_SECRET='too-short';try{require('${utilsPath}');}catch(e){}`,
    ], { encoding: 'utf8' })
    expect(r.status).toBe(1)
  })

  it('refuses the well-known placeholder secret', () => {
    const r = spawnSync(process.execPath, ['-e',
      `process.env.JWT_SECRET='edushare_super_secret_jwt_key_change_in_production_2025';try{require('${utilsPath}');}catch(e){}`,
    ], { encoding: 'utf8' })
    expect(r.status).toBe(1)
  })

  it('accepts a strong secret', () => {
    const r = spawnSync(process.execPath, ['-e',
      `process.env.JWT_SECRET=require('crypto').randomBytes(64).toString('hex');require('${utilsPath}');`,
    ], { encoding: 'utf8' })
    expect(r.status).toBe(0)
  })
})
