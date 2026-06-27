// ============================================================================
// upload.middleware.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the file-upload handler, used on routes that accept a file
// (lessons, quiz generation). It uses "multer", the standard Express library
// for handling uploaded files. It decides WHERE files are saved, what they're
// NAMED, which TYPES are allowed, and the maximum SIZE.
// ============================================================================

const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Make sure uploads folder exists
const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })   // create it (and parents) if missing
}

// Where + how to store each uploaded file on disk.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)            // save everything into the uploads folder
  },
  filename: (req, file, cb) => {
    // Strip directory components and unsafe characters from the user-supplied
    // name. Without this, a file named "../../etc/passwd" or one containing
    // path separators could escape the uploads directory.
    const base = path.basename(file.originalname).replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_')
    const safe = base.slice(0, 120) || 'file'    // cap the length, never empty
    cb(null, `${Date.now()}-${safe}`)            // prefix with a timestamp so names never collide
  },
})

// Reject anything that isn't a document we support (by its MIME type).
const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',                                                                  // .pdf
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',          // .docx
    'application/msword',                                                               // .doc
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',        // .pptx
  ]
  if (allowed.includes(file.mimetype)) {
    cb(null, true)    // accept
  } else {
    cb(new Error('Only PDF, DOCX, and PPTX files are allowed'), false)   // reject
  }
}

// Put it all together into the `upload` middleware used by routes.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
})

module.exports = upload
