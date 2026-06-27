// ============================================================================
// db.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the single database connection, shared by the whole
// backend. It uses Prisma, an ORM (a tool that lets you read/write the database
// with JavaScript objects instead of raw SQL). Every controller imports this
// `prisma` object to query the database.
// ============================================================================

const { PrismaClient } = require('@prisma/client')

// Shared Prisma client. Importing PrismaClient repeatedly across controllers
// works because Node caches require, but a named singleton is the canonical
// pattern and makes hot-reload (nodemon) behaviour predictable.
//
// In plain terms: we want exactly ONE database connection for the app. In dev,
// the server restarts often (nodemon), so we stash the client on `global` and
// reuse it instead of opening a new connection on every restart.
const prisma = global.__prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma

module.exports = prisma   // export it so other files can do: const prisma = require('../db')
