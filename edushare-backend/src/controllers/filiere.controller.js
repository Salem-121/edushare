// ============================================================================
// filiere.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic for managing filières (fields of study). This is
// a classic "CRUD" controller — Create, Read, Update, Delete — and the module
// controller follows the exact same shape.
// ============================================================================

const prisma = require('../db')

// GET /api/filieres — list all filières, each with how many users/quizzes use it.
const getFilieres = async (req, res) => {
  try {
    const filieres = await prisma.filiere.findMany({
      orderBy: { name: 'asc' },                                       // alphabetical
      include: { _count: { select: { users: true, quizzes: true } } },// attach counts
    })
    res.json(filieres)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/filieres/:id — one filière by its id (or 404 if not found).
const getFiliereById = async (req, res) => {
  try {
    const filiere = await prisma.filiere.findUnique({
      where: { id: Number(req.params.id) },   // :id from the URL, turned into a number
      include: { _count: { select: { users: true, quizzes: true } } },
    })
    if (!filiere) return res.status(404).json({ message: 'Filiere not found' })
    res.json(filiere)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/filieres — create a new filière from the request body.
const createFiliere = async (req, res) => {
  try {
    const { name, code, description } = req.body              // read the submitted fields
    if (!name || !code) return res.status(400).json({ message: 'Name and code are required' })
    const filiere = await prisma.filiere.create({ data: { name, code, description } })
    res.status(201).json(filiere)                            // 201 = "Created"
  } catch (err) {
    // P2002 is Prisma's "unique constraint failed" code — here, a duplicate code.
    if (err.code === 'P2002') return res.status(400).json({ message: 'Filiere code already exists' })
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/filieres/:id — update only the fields that were provided.
const updateFiliere = async (req, res) => {
  try {
    const { name, code, description, active } = req.body
    // Build the update object with ONLY the fields the caller actually sent,
    // so unspecified fields are left untouched.
    const data = {}
    if (name !== undefined) data.name = name
    if (code !== undefined) data.code = code
    if (description !== undefined) data.description = description
    if (active !== undefined) data.active = active
    const filiere = await prisma.filiere.update({ where: { id: Number(req.params.id) }, data })
    res.json(filiere)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/filieres/:id — remove a filière.
const deleteFiliere = async (req, res) => {
  try {
    await prisma.filiere.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Filiere deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getFilieres, getFiliereById, createFiliere, updateFiliere, deleteFiliere }
