// ============================================================================
// module.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic for managing modules (subjects that lessons
// belong to). It's the SAME create/read/update/delete pattern as the filière
// controller — see filiere.controller.js for the fuller line-by-line comments.
// ============================================================================

const prisma = require('../db')

// GET /api/modules — list modules, each with its lesson count.
const getModules = async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { lessons: true } } },   // attach "how many lessons"
    })
    res.json(modules)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/modules/:id — one module (or 404).
const getModuleById = async (req, res) => {
  try {
    const module = await prisma.module.findUnique({
      where: { id: Number(req.params.id) },
      include: { _count: { select: { lessons: true } } },
    })
    if (!module) return res.status(404).json({ message: 'Module not found' })
    res.json(module)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/modules — create a module.
const createModule = async (req, res) => {
  try {
    const { name, code, description } = req.body
    if (!name || !code) return res.status(400).json({ message: 'Name and code are required' })
    const module = await prisma.module.create({ data: { name, code, description } })
    res.status(201).json(module)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Module code already exists' })  // duplicate code
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/modules/:id — update only the supplied fields.
const updateModule = async (req, res) => {
  try {
    const { name, code, description, active } = req.body
    const data = {}                                  // collect only what was sent
    if (name !== undefined) data.name = name
    if (code !== undefined) data.code = code
    if (description !== undefined) data.description = description
    if (active !== undefined) data.active = active
    const module = await prisma.module.update({ where: { id: Number(req.params.id) }, data })
    res.json(module)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/modules/:id — remove a module.
const deleteModule = async (req, res) => {
  try {
    await prisma.module.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Module deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getModules, getModuleById, createModule, updateModule, deleteModule }
