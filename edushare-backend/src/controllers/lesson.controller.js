// ============================================================================
// lesson.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic for lessons — browsing, uploading, editing,
// deleting, and downloading the actual files. Because real files on disk are
// involved, it also carefully guards against path-traversal tricks (a malicious
// filename trying to escape the uploads folder).
// ============================================================================

const prisma = require('../db')
const path = require('path')
const fs = require('fs')

// GET /api/lessons  (students & teachers browse)
// Supports query: ?moduleId=&search=&take=&cursor=&minefiliereOnly=1
const getLessons = async (req, res) => {
  try {
    const { moduleId, search, take = '50', cursor, mineFiliereOnly } = req.query
    const where = {}                                  // database filter, built from the query params
    if (moduleId) where.moduleId = Number(moduleId)   // filter by module
    if (search) {
      where.OR = [                                    // match title OR description
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    // If the caller explicitly asks for "my filière only", restrict by the
    // teachers who share the student's filière (best-effort: we filter
    // lessons whose teacher's filiereId matches). This is opt-in so the
    // existing "browse everything" UX stays intact.
    if (mineFiliereOnly === '1' && req.user?.role === 'STUDENT' && req.user?.filiereId) {
      where.teacher = { filiereId: req.user.filiereId }
    }

    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 50, 100),        // page size (capped at 100)
      ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),  // cursor pagination
      include: {                                      // also fetch related info to display
        teacher: { select: { id: true, firstName: true, lastName: true } },
        module: { select: { id: true, name: true, code: true } },
        _count: { select: { summaries: true } },      // how many summaries each lesson has
      },
    })
    res.json(lessons)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/lessons/my  (teacher's own lessons)
const getMyLessons = async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: req.user.id },              // only lessons this teacher uploaded
      orderBy: { createdAt: 'desc' },
      include: {
        module: { select: { id: true, name: true, code: true } },
        _count: { select: { summaries: true } },
      },
    })
    res.json(lessons)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/lessons/:id — one lesson, plus its APPROVED summaries.
const getLessonById = async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        module: { select: { id: true, name: true, code: true } },
        summaries: {
          where: { status: 'APPROVED' },              // only published summaries
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })
    res.json(lesson)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/lessons  (teacher uploads a lesson)
// The actual file is handled by the upload middleware and arrives as req.file.
const createLesson = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' })

    const { title, description, moduleName, moduleId } = req.body
    if (!title) return res.status(400).json({ message: 'Title is required' })
    if (!moduleId && !moduleName) return res.status(400).json({ message: 'Module is required' })

    // Accept moduleId (sent by frontend) OR moduleName (fallback: find/create)
    let module
    if (moduleId) {
      module = await prisma.module.findUnique({ where: { id: Number(moduleId) } })
      if (!module) return res.status(400).json({ message: 'Module not found' })
    } else {
      // Exact case-insensitive match — substring match (`contains`) used to
      // pick the wrong module (typing "Math" could resolve to "Discrete Math").
      const trimmed = moduleName.trim()
      const candidates = await prisma.module.findMany({
        where: { name: { contains: trimmed } },
      })
      module = candidates.find(m => m.name.toLowerCase() === trimmed.toLowerCase()) || null
      if (!module) {
        // No match -> create the module on the fly with a generated unique code.
        const code = trimmed.toUpperCase().replace(/\s+/g, '_').slice(0, 10) + '_' + Date.now()
        module = await prisma.module.create({
          data: { name: trimmed, code, description: 'Auto-created' },
        })
      }
    }

    // Work out the file type from the original name, e.g. "notes.pdf" -> "PDF".
    const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase()

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description: description || null,
        filePath: req.file.filename,                  // the safe name multer saved it under
        fileType: ext,
        fileSize: req.file.size,
        teacherId: req.user.id,                       // the uploader
        moduleId: module.id,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        module: { select: { id: true, name: true } },
      },
    })

    res.status(201).json(lesson)
  } catch (err) {
    console.error('Create lesson error:', err)
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/lessons/:id — edit a lesson's title/description/module.
const updateLesson = async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: Number(req.params.id) } })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })

    // Only teacher who owns it or admin can edit
    if (req.user.role !== 'ADMIN' && lesson.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const { title, description, moduleId } = req.body
    const data = {}                                   // only update what was sent
    if (title) data.title = title
    if (description !== undefined) data.description = description
    if (moduleId) data.moduleId = Number(moduleId)

    const updated = await prisma.lesson.update({ where: { id: Number(req.params.id) }, data })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/lessons/:id — delete the database row AND the file on disk.
const deleteLesson = async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: Number(req.params.id) } })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })

    // Owner or admin only.
    if (req.user.role !== 'ADMIN' && lesson.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Delete physical file
    const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads')
    const filePath = path.join(uploadDir, lesson.filePath)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)   // remove the file if it's there

    await prisma.lesson.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Lesson deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/lessons/:id/download — stream the file back to the browser.
const downloadLesson = async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: Number(req.params.id) } })
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' })

    const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads')
    // path.basename + resolve check defends against any stored traversal
    // payload in lesson.filePath (e.g. legacy rows from before upload sanitization)
    const safeStoredName = path.basename(lesson.filePath)    // strip any folder parts
    const filePath = path.join(uploadDir, safeStoredName)
    // Double-check the final path is still inside the uploads folder.
    if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) {
      return res.status(400).json({ message: 'Invalid file path' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' })
    }

    // Title is user-controlled — strip CR/LF and quotes that could corrupt
    // the Content-Disposition header.
    const safeTitle = (lesson.title || 'lesson').replace(/[\r\n"]/g, '').slice(0, 120) || 'lesson'
    res.download(filePath, `${safeTitle}.${lesson.fileType.toLowerCase()}`)   // sends the file as a download
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getLessons, getMyLessons, getLessonById, createLesson, updateLesson, deleteLesson, downloadLesson }
