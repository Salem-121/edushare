// ============================================================================
// user.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the admin logic for managing user accounts. Same CRUD
// shape as the other controllers, but with one extra safety habit: every
// response is run through `safeUser` so the password hash is never sent out.
// ============================================================================

const bcrypt = require('bcryptjs')
const prisma = require('../db')

// Pick ONLY the safe fields to return to the client (never the password!).
const safeUser = (u) => ({
  id: u.id, email: u.email, firstName: u.firstName,
  lastName: u.lastName, role: u.role, createdAt: u.createdAt,
  filiereId: u.filiereId, filiere: u.filiere || null,
})

// GET /api/users — list users, with optional ?role= and ?search= filters.
const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query
    const where = {}                              // the database filter we build up
    if (role) where.role = role                   // filter by role if asked
    if (search) {
      // "OR" = match if the text appears in the first name, last name, OR email.
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ]
    }
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },             // newest first
      include: { filiere: { select: { id: true, name: true, code: true } } },
    })
    res.json(users.map(safeUser))                 // strip passwords before sending
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/users/:id — one user (or 404).
const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(safeUser(user))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/users (admin creates user)
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, filiereId } = req.body
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ message: 'Email already in use' })
    const hashed = await bcrypt.hash(password, 10)   // hash before storing
    const user = await prisma.user.create({
      data: {
        email, password: hashed, firstName, lastName,
        role: role || 'STUDENT',                       // default to STUDENT if not given
        filiereId: filiereId ? Number(filiereId) : null,
      },
      include: { filiere: { select: { id: true, name: true, code: true } } },
    })
    res.status(201).json(safeUser(user))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/users/:id — update only the supplied fields.
const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, role, password, filiereId } = req.body
    const data = {}                                  // only include what was sent
    if (firstName) data.firstName = firstName
    if (lastName) data.lastName = lastName
    if (email) data.email = email
    if (role) data.role = role
    if (password) data.password = await bcrypt.hash(password, 10)   // re-hash if changing password
    if (filiereId !== undefined) data.filiereId = filiereId ? Number(filiereId) : null

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      include: { filiere: { select: { id: true, name: true, code: true } } },
    })
    res.json(safeUser(user))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/users/:id — remove a user.
const deleteUser = async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser }
