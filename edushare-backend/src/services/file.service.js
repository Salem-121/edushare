// ============================================================================
// file.service.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the "read text out of a document" helper. Given an uploaded
// PDF or DOCX, it returns the plain text inside so the AI can read it. It caps
// the output at ~8000 words so we never feed an enormous document to the AI.
// ============================================================================

const fs = require('fs')
const path = require('path')

// Extract text from a file based on its type
// (Picks the right extractor for PDFs vs Word docs.)
const extractText = async (filePath, fileType) => {
  const type = fileType.toLowerCase()

  if (type === 'pdf') {
    return extractFromPDF(filePath)
  } else if (type === 'docx' || type === 'doc') {
    return extractFromDOCX(filePath)
  } else {
    return 'File type not supported for text extraction.'   // e.g. PPTX isn't parsed here
  }
}

// Read text from a PDF using the "pdf-parse" library.
const extractFromPDF = async (filePath) => {
  try {
    const pdfParse = require('pdf-parse')
    const buffer = fs.readFileSync(filePath)        // read the raw file bytes
    const data = await pdfParse(buffer)             // parse out the text
    // Limit to ~8000 words to avoid huge Claude API calls
    const words = data.text.split(/\s+/).slice(0, 8000)   // keep the first 8000 words
    return words.join(' ')
  } catch (err) {
    console.error('PDF extraction error:', err.message)
    return 'Could not extract text from this PDF.'   // e.g. a scanned, image-only PDF
  }
}

// Read text from a Word .docx using the "mammoth" library.
const extractFromDOCX = async (filePath) => {
  try {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })
    const words = result.value.split(/\s+/).slice(0, 8000)   // same 8000-word cap
    return words.join(' ')
  } catch (err) {
    console.error('DOCX extraction error:', err.message)
    return 'Could not extract text from this DOCX file.'
  }
}

module.exports = { extractText }
