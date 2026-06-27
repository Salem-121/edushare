// ============================================================================
// auth.controller.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the logic for registering, logging in, and "who am I?".
// Key security idea: we NEVER store the raw password. We hash it with bcrypt
// (a one-way scramble) on register, and on login we compare the typed password
// against that hash. We also hand back a signed token to prove identity later.
// ============================================================================

const bcrypt = require('bcryptjs')                  // password hashing library
const prisma = require('../db')
const { signToken } = require('../utils/jwt.utils') // makes the login token

// POST /api/auth/register — create a new account and return a login token.
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, filiereId } = req.body

    // --- Validate the input -------------------------------------------------
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {           // basic email shape check
      return res.status(400).json({ message: 'Invalid email address' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Reject if the email is already taken.
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    // Only allow STUDENT or TEACHER from public register
    // (You can't make yourself an ADMIN through the public sign-up form.)
    const allowedRoles = ['STUDENT', 'TEACHER']
    const userRole = allowedRoles.includes(role) ? role : 'STUDENT'

    // Hash the password before saving — "10" is the cost/strength factor.
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,                                  // store the HASH, never the raw password
        firstName,
        lastName,
        role: userRole,
        filiereId: filiereId ? Number(filiereId) : null,
      },
    })

    const token = signToken(user.id)   // create the "you're logged in" token

    // Send back the token + safe user fields (note: password is NOT included).
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        filiereId: user.filiereId,
      },
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ message: 'Server error during registration' })
  }
}

// POST /api/auth/login — check credentials and return a token.
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    // Note: we give the SAME error whether the email or the password is wrong,
    // so attackers can't tell which emails exist.
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Compare the typed password against the stored hash.
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = signToken(user.id)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        filiereId: user.filiereId,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Server error during login' })
  }
}

// GET /api/auth/me — return the current user.
// The `protect` middleware already loaded them onto req.user, so just echo it.
const getMe = async (req, res) => {
  res.json(req.user)
}

module.exports = { register, login, getMe }
